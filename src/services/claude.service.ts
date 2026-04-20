import config from '../config/environment';
import logger from '../utils/logger';
import messageService from './message.service';
import emotionService from './emotion.service';
import valueService from './value.service';
import actionService from './action.service';
import boundaryService from './boundary.service';
import { containsCrisisKeywords, getCrisisResources } from '../utils/helpers';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

class ClaudeService {
  private readonly MAX_CONTEXT_MESSAGES = 10;

  constructor() {
    if (!config.openrouter.apiKey) {
      logger.warn('OpenRouter API key not configured - AI features will be disabled');
    }
  }

  /**
   * Call OpenRouter chat completions endpoint
   */
  private async callOpenRouter(
    messages: OpenRouterMessage[],
    maxTokens?: number
  ): Promise<string> {
    if (!config.openrouter.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.openrouter.siteUrl,
        'X-Title': config.openrouter.siteName,
      },
      body: JSON.stringify({
        model: config.openrouter.model,
        max_tokens: maxTokens ?? config.openrouter.maxTokens,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    return content;
  }

  /**
   * Send a chat message with full user context
   */
  async sendMessage(userId: string, userMessage: string): Promise<string> {
    try {
      // Crisis detection
      if (containsCrisisKeywords(userMessage)) {
        logger.warn('Crisis keywords detected', { userId });
        return this.handleCrisisMessage(userMessage);
      }

      // Build user profile context
      const userContext = await this.buildUserContext(userId);

      // Get recent conversation history
      const recentMessages = await messageService.getRecentMessages(userId, this.MAX_CONTEXT_MESSAGES);

      // Build message array: system prompt first, then history, then new message
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: this.createSystemPrompt(userContext) },
        ...recentMessages.map((msg): OpenRouterMessage => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const assistantMessage = await this.callOpenRouter(messages);

      // Save both messages to database
      await messageService.create(userId, 'user', userMessage);
      await messageService.create(userId, 'assistant', assistantMessage);

      return assistantMessage;
    } catch (error) {
      logger.error('OpenRouter chat error', error);
      throw new Error('Failed to communicate with AI companion');
    }
  }

  /**
   * Generate acceptance guidance for emotions
   */
  async generateAcceptanceGuidance(
    emotions: string[],
    intensity: number,
    bodySensations: string,
    context: string
  ): Promise<string> {
    try {
      const prompt = `A user is experiencing the following emotions: ${emotions.join(', ')}
with an intensity of ${intensity}/10.

Body sensations: ${bodySensations || 'none reported'}
Context: ${context || 'not provided'}

Provide a brief ACT-based acceptance response (2-3 sentences) that:
1. Validates the emotion as normal and human
2. Encourages observing the feeling without judgment
3. Reminds them emotions are temporary visitors
4. Gently asks if they can make room for this feeling while moving toward their values

Be warm, compassionate, and avoid toxic positivity. Don't try to fix or eliminate the emotion.`;

      return await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        200
      );
    } catch (error) {
      logger.error('Generate acceptance guidance error', error);
      return "It makes sense that you're feeling this way. Emotions are natural responses. Can you notice this feeling without needing to change it right now?";
    }
  }

  /**
   * Generate micro-steps for committed actions
   */
  async generateMicroSteps(action: string, valueContext?: string): Promise<string[]> {
    try {
      const prompt = `Break this committed action into 5-7 very small, specific micro-steps that each take less than 5 minutes and feel manageable.

Action: "${action}"
${valueContext ? `This action aligns with the value: ${valueContext}` : ''}

Make each step:
- Extremely specific and concrete
- Quick (under 5 minutes)
- Easy to start
- Observable/measurable

Return ONLY the steps as a numbered list, nothing else.`;

      const stepsText = await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        500
      );

      return this.parseStepsFromResponse(stepsText);
    } catch (error) {
      logger.error('Generate micro-steps error', error);
      return [
        'Choose a specific time to start',
        'Prepare any materials needed',
        'Take the first small action',
        'Notice how it feels',
        'Celebrate the step taken',
      ];
    }
  }

  /**
   * Analyze and coach boundary setting
   */
  async analyzeBoundaryResponse(
    scenario: string,
    userResponse: string,
    boundaryType: string
  ): Promise<{
    style: 'passive' | 'aggressive' | 'assertive';
    feedback: string;
    betterVersion?: string;
  }> {
    try {
      const prompt = `A user wants to set this ${boundaryType} boundary:

Scenario: "${scenario}"
Their response: "${userResponse}"

Analyze this boundary-setting attempt:
1. Is it passive, aggressive, or assertive?
2. Provide constructive feedback
3. If not assertive, suggest a better phrasing that is:
   - Clear and direct
   - Kind and respectful
   - Firm without over-explaining
   - Free of apologies (unless truly needed)

Format your response as:
STYLE: [passive/aggressive/assertive]
FEEDBACK: [your analysis]
BETTER VERSION: [improved phrasing, only if needed]`;

      const analysisText = await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        400
      );

      return this.parseBoundaryAnalysis(analysisText);
    } catch (error) {
      logger.error('Analyze boundary response error', error);
      return {
        style: 'assertive',
        feedback: 'Great job setting a boundary! Keep practicing clear, kind communication.',
      };
    }
  }

  /**
   * Daily check-in for lonely users
   */
  async generateDailyCheckIn(userId: string): Promise<string> {
    try {
      const userContext = await this.buildUserContext(userId);
      const recentMessages = await messageService.getRecentMessages(userId, 3);

      const lastConversationContext = recentMessages.length > 0
        ? `Last conversation topics: ${recentMessages.map(m => m.content.substring(0, 100)).join('; ')}`
        : 'This is their first check-in';

      const prompt = `Generate a warm, brief check-in message for a user who may be experiencing loneliness.

User context:
${userContext}

${lastConversationContext}

The message should:
1. Acknowledge them as a person with genuine warmth
2. Ask about their day or how they're feeling
3. Reference something from past conversations if available
4. Offer to listen or suggest a small values-aligned action
5. Be brief (2-3 sentences)
6. Feel like a friend checking in, not a therapist

Avoid:
- Being overly clinical or formal
- Toxic positivity
- Generic "how are you" without warmth`;

      return await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        200
      );
    } catch (error) {
      logger.error('Generate daily check-in error', error);
      return 'Hi! I was thinking about you. How has your day been?';
    }
  }

  /**
   * Reflective listening response
   */
  async reflectiveListening(userMessage: string): Promise<string> {
    try {
      const prompt = `User said: "${userMessage}"

Respond with empathetic active listening using these principles:
1. Reflect back what you heard in your own words
2. Validate their experience without judgment
3. Ask ONE gentle follow-up question to understand deeper
4. Don't try to fix, solve, or give advice unless explicitly asked
5. Help them feel truly heard and less alone

Be warm, genuine, and human. This may be the only conversation they have today.`;

      return await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        300
      );
    } catch (error) {
      logger.error('Reflective listening error', error);
      return "I hear you. That sounds really difficult. Would you like to tell me more about what you're experiencing?";
    }
  }

  /**
   * Identify boundary-value conflicts
   */
  async identifyBoundaryValueConflicts(userId: string): Promise<string> {
    try {
      const values = await valueService.getAll(userId, 1, 10);
      const emotions = await emotionService.getAll(userId, 1, 20);

      const prompt = `Analyze where poor boundaries might be blocking this user's values.

User's top values:
${values.values.map(v => `- ${v.category} (importance: ${v.importance}/10, alignment: ${v.alignment}/10)`).join('\n')}

Recent emotional patterns:
${emotions.emotions.map(e => `- ${e.emotions.join(', ')} (intensity: ${e.intensity}/10)`).join('\n')}

Identify:
1. Which values have low alignment despite high importance?
2. What emotions might signal boundary violations?
3. Specific boundary work that could improve value alignment

Be specific and insightful. Format as actionable insights.`;

      return await this.callOpenRouter(
        [{ role: 'user', content: prompt }],
        600
      );
    } catch (error) {
      logger.error('Identify boundary-value conflicts error', error);
      throw error;
    }
  }

  /**
   * Build comprehensive user context for AI
   */
  private async buildUserContext(userId: string): Promise<string> {
    try {
      const [values, recentEmotions, recentActions, recentBoundaries] = await Promise.all([
        valueService.getAll(userId, 1, 5),
        emotionService.getAll(userId, 1, 3),
        actionService.getAll(userId, 1, 3),
        boundaryService.getAll(userId, 1, 3),
      ]);

      const context = [];

      if (values.values.length > 0) {
        context.push(`User's Core Values (importance/alignment):\n${
          values.values.map(v => `- ${v.category}: ${v.importance}/10 importance, ${v.alignment}/10 current alignment`).join('\n')
        }`);
      }

      if (recentEmotions.emotions.length > 0) {
        context.push(`Recent Emotional Experiences:\n${
          recentEmotions.emotions.map(e => `- ${e.emotions.join(', ')} (intensity: ${e.intensity}/10, accepted: ${e.accepted})`).join('\n')
        }`);
      }

      if (recentActions.actions.length > 0) {
        context.push(`Current Committed Actions:\n${
          recentActions.actions.map(a => `- ${a.action} (${a.completed ? 'completed' : 'in progress'})`).join('\n')
        }`);
      }

      if (recentBoundaries.boundaries.length > 0) {
        context.push(`Boundary Work:\n${
          recentBoundaries.boundaries.map(b => `- ${b.boundaryType} boundary (confidence: ${b.confidence}/10)`).join('\n')
        }`);
      }

      return context.join('\n\n') || 'User is just getting started with their ACT journey.';
    } catch (error) {
      logger.error('Build user context error', error);
      return 'User context unavailable';
    }
  }

  /**
   * Create system prompt with ACT principles
   */
  private createSystemPrompt(userContext: string): string {
    return `You are a compassionate AI companion trained in Acceptance and Commitment Therapy (ACT) principles. Your role is to support users in living meaningful lives aligned with their values.

CORE ACT PRINCIPLES:
1. **Acceptance**: Help users make room for difficult emotions rather than fighting them
2. **Cognitive Defusion**: Separate thoughts/feelings from actions - "I'm noticing anxiety AND I can still act"
3. **Present Moment**: Encourage mindful awareness without judgment
4. **Self as Context**: Users are more than their thoughts and feelings
5. **Values**: Guide toward what truly matters to them
6. **Committed Action**: Support small, values-aligned steps despite discomfort

YOUR APPROACH:
- Be warm, genuine, and human (not clinical or robotic)
- Validate emotions without trying to fix or eliminate them
- Ask thoughtful questions more than giving advice
- Help users identify values-aligned actions
- Support boundary setting with kindness and firmness
- Recognize that some users may have limited social support
- Practice active listening and make them feel heard

AVOID:
- Toxic positivity ("just think positive!")
- Minimizing their struggles
- Over-explaining or being preachy
- Replacing professional therapy
- Making promises about outcomes

CURRENT USER CONTEXT:
${userContext}

Remember: You're here to support, not replace, professional mental health care. If you detect crisis language, direct them to crisis resources.`;
  }

  /**
   * Handle crisis messages
   */
  private handleCrisisMessage(_message: string): string {
    const resources = getCrisisResources();

    return `I'm really concerned about what you're sharing. You deserve immediate support from trained professionals who can help right now.

${resources}

These services are confidential, free, and available 24/7. Please reach out to them - your life matters, and there are people who want to help.

I'm here to listen, but I'm not equipped to provide crisis support. Would you be willing to contact one of these resources?`;
  }

  /**
   * Parse steps from response
   */
  private parseStepsFromResponse(response: string): string[] {
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const steps: string[] = [];

    for (const line of lines) {
      const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
      if (cleaned) {
        steps.push(cleaned);
      }
    }

    return steps.length > 0 ? steps : [response];
  }

  /**
   * Parse boundary analysis response
   */
  private parseBoundaryAnalysis(response: string): {
    style: 'passive' | 'aggressive' | 'assertive';
    feedback: string;
    betterVersion?: string;
  } {
    const styleMatch = response.match(/STYLE:\s*(passive|aggressive|assertive)/i);
    const feedbackMatch = response.match(/FEEDBACK:\s*(.+?)(?=BETTER VERSION:|$)/is);
    const betterMatch = response.match(/BETTER VERSION:\s*(.+?)$/is);

    return {
      style: (styleMatch?.[1]?.toLowerCase() as any) || 'assertive',
      feedback: feedbackMatch?.[1]?.trim() || response,
      betterVersion: betterMatch?.[1]?.trim(),
    };
  }
}

export default new ClaudeService();

import { Response } from 'express';
import { AuthRequest } from '../types';
import claudeService from '../services/claude.service';
import messageService from '../services/message.service';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

/**
 * Send a chat message to AI companion
 * POST /api/ai/chat
 */
export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      sendError(res, 'Message is required', 400);
      return;
    }

    const response = await claudeService.sendMessage(userId, message.trim());

    sendSuccess(res, {
      message: response,
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error('AI chat error', error);
    sendError(res, 'Failed to communicate with AI companion', 500);
  }
}

/**
 * Get conversation history
 * GET /api/ai/conversations
 */
export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await messageService.getConversationHistory(userId, limit);

    sendSuccess(res, { messages });
  } catch (error: any) {
    logger.error('Get conversations error', error);
    sendError(res, 'Failed to get conversation history', 500);
  }
}

/**
 * Delete conversation history
 * DELETE /api/ai/conversations
 */
export async function deleteConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    await messageService.deleteConversation(userId);

    sendSuccess(res, null, 'Conversation history deleted');
  } catch (error: any) {
    logger.error('Delete conversations error', error);
    sendError(res, 'Failed to delete conversation history', 500);
  }
}

/**
 * Generate micro-steps for an action
 * POST /api/ai/micro-steps
 */
export async function generateMicroSteps(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, valueContext } = req.body;

    if (!action || typeof action !== 'string') {
      sendError(res, 'Action description is required', 400);
      return;
    }

    const steps = await claudeService.generateMicroSteps(action, valueContext);

    sendSuccess(res, { steps });
  } catch (error: any) {
    logger.error('Generate micro-steps error', error);
    sendError(res, 'Failed to generate micro-steps', 500);
  }
}

/**
 * Analyze boundary response
 * POST /api/ai/analyze-boundary
 */
export async function analyzeBoundary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { scenario, response, boundaryType } = req.body;

    if (!scenario || !response || !boundaryType) {
      sendError(res, 'Scenario, response, and boundary type are required', 400);
      return;
    }

    const analysis = await claudeService.analyzeBoundaryResponse(
      scenario,
      response,
      boundaryType
    );

    sendSuccess(res, analysis);
  } catch (error: any) {
    logger.error('Analyze boundary error', error);
    sendError(res, 'Failed to analyze boundary response', 500);
  }
}

/**
 * Get acceptance guidance for emotions
 * POST /api/ai/acceptance-guidance
 */
export async function getAcceptanceGuidance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { emotions, intensity, bodySensations, context } = req.body;

    if (!emotions || !Array.isArray(emotions) || emotions.length === 0) {
      sendError(res, 'Emotions array is required', 400);
      return;
    }

    if (typeof intensity !== 'number' || intensity < 1 || intensity > 10) {
      sendError(res, 'Intensity must be a number between 1 and 10', 400);
      return;
    }

    const guidance = await claudeService.generateAcceptanceGuidance(
      emotions,
      intensity,
      bodySensations || '',
      context || ''
    );

    sendSuccess(res, { guidance });
  } catch (error: any) {
    logger.error('Get acceptance guidance error', error);
    sendError(res, 'Failed to generate acceptance guidance', 500);
  }
}

/**
 * Get daily check-in message
 * GET /api/ai/daily-check-in
 */
export async function getDailyCheckIn(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const message = await claudeService.generateDailyCheckIn(userId);

    sendSuccess(res, { message });
  } catch (error: any) {
    logger.error('Get daily check-in error', error);
    sendError(res, 'Failed to generate daily check-in', 500);
  }
}

/**
 * Get reflective listening response
 * POST /api/ai/reflective-listening
 */
export async function reflectiveListening(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      sendError(res, 'Message is required', 400);
      return;
    }

    const response = await claudeService.reflectiveListening(message);

    sendSuccess(res, { response });
  } catch (error: any) {
    logger.error('Reflective listening error', error);
    sendError(res, 'Failed to generate reflective response', 500);
  }
}

/**
 * Identify boundary-value conflicts
 * GET /api/ai/boundary-value-insights
 */
export async function getBoundaryValueInsights(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const insights = await claudeService.identifyBoundaryValueConflicts(userId);

    sendSuccess(res, { insights });
  } catch (error: any) {
    logger.error('Get boundary-value insights error', error);
    sendError(res, 'Failed to generate insights', 500);
  }
}

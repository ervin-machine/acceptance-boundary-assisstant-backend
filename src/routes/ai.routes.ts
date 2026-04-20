import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { handleValidationErrors, asyncHandler } from '../middleware/error.middleware';
import { aiLimiter } from '../middleware/rateLimiter.middleware';
import { createMessageValidation } from '../utils/validators';

const router = Router();

// All AI routes require authentication and rate limiting
router.use(authenticateToken);
router.use(aiLimiter); // 20 requests per 15 minutes

/**
 * @route   POST /api/ai/chat
 * @desc    Send a message to AI companion
 * @access  Private
 */
router.post(
  '/chat',
  createMessageValidation,
  handleValidationErrors,
  asyncHandler(aiController.chat)
);

/**
 * @route   GET /api/ai/conversations
 * @desc    Get conversation history
 * @access  Private
 */
router.get(
  '/conversations',
  asyncHandler(aiController.getConversations)
);

/**
 * @route   DELETE /api/ai/conversations
 * @desc    Delete conversation history
 * @access  Private
 */
router.delete(
  '/conversations',
  asyncHandler(aiController.deleteConversations)
);

/**
 * @route   POST /api/ai/micro-steps
 * @desc    Generate micro-steps for an action
 * @access  Private
 */
router.post(
  '/micro-steps',
  asyncHandler(aiController.generateMicroSteps)
);

/**
 * @route   POST /api/ai/analyze-boundary
 * @desc    Analyze boundary-setting response
 * @access  Private
 */
router.post(
  '/analyze-boundary',
  asyncHandler(aiController.analyzeBoundary)
);

/**
 * @route   POST /api/ai/acceptance-guidance
 * @desc    Get ACT-based acceptance guidance for emotions
 * @access  Private
 */
router.post(
  '/acceptance-guidance',
  asyncHandler(aiController.getAcceptanceGuidance)
);

/**
 * @route   GET /api/ai/daily-check-in
 * @desc    Get personalized daily check-in message
 * @access  Private
 */
router.get(
  '/daily-check-in',
  asyncHandler(aiController.getDailyCheckIn)
);

/**
 * @route   POST /api/ai/reflective-listening
 * @desc    Get empathetic reflective listening response
 * @access  Private
 */
router.post(
  '/reflective-listening',
  asyncHandler(aiController.reflectiveListening)
);

/**
 * @route   GET /api/ai/boundary-value-insights
 * @desc    Get insights on boundary-value conflicts
 * @access  Private
 */
router.get(
  '/boundary-value-insights',
  asyncHandler(aiController.getBoundaryValueInsights)
);

export default router;

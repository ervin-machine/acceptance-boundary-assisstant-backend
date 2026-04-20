import { Router } from 'express';
import * as emotionController from '../controllers/emotion.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { handleValidationErrors, asyncHandler } from '../middleware/error.middleware';
import { createEmotionValidation } from '../utils/validators';
import { validateUUID } from '../middleware/validation.middleware';

const router = Router();

// All emotion routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/emotions
 * @desc    Create a new emotion entry
 * @access  Private
 */
router.post(
  '/',
  createEmotionValidation,
  handleValidationErrors,
  asyncHandler(emotionController.createEmotion)
);

/**
 * @route   GET /api/emotions
 * @desc    Get all emotions for the authenticated user (paginated)
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(emotionController.getEmotions)
);

/**
 * @route   GET /api/emotions/:id
 * @desc    Get a single emotion by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(emotionController.getEmotionById)
);

/**
 * @route   PUT /api/emotions/:id
 * @desc    Update an emotion entry
 * @access  Private
 */
router.put(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(emotionController.updateEmotion)
);

/**
 * @route   DELETE /api/emotions/:id
 * @desc    Delete an emotion entry
 * @access  Private
 */
router.delete(
  '/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(emotionController.deleteEmotion)
);

export default router;

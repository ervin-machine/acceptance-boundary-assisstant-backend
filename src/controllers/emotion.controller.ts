import { Response } from 'express';
import { AuthRequest } from '../types';
import emotionService from '../services/emotion.service';
import { sendSuccess, sendError, sendPaginated, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

/**
 * Create a new emotion entry
 * POST /api/emotions
 */
export async function createEmotion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const data = req.body;

    const emotion = await emotionService.create(userId, data);

    sendSuccess(res, emotion, 'Emotion created successfully', 201);
  } catch (error: any) {
    logger.error('Create emotion controller error', error);
    sendError(res, 'Failed to create emotion', 500);
  }
}

/**
 * Get all emotions for the authenticated user
 * GET /api/emotions
 */
export async function getEmotions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { page, limit } = parsePaginationParams(req.query);

    const { emotions, total } = await emotionService.getAll(userId, page, limit);

    sendPaginated(res, emotions, page, limit, total);
  } catch (error: any) {
    logger.error('Get emotions controller error', error);
    sendError(res, 'Failed to get emotions', 500);
  }
}

/**
 * Get a single emotion by ID
 * GET /api/emotions/:id
 */
export async function getEmotionById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const emotion = await emotionService.getById(userId, id);

    if (!emotion) {
      sendError(res, 'Emotion not found', 404);
      return;
    }

    sendSuccess(res, emotion);
  } catch (error: any) {
    logger.error('Get emotion by ID controller error', error);
    sendError(res, 'Failed to get emotion', 500);
  }
}

/**
 * Update an emotion entry
 * PUT /api/emotions/:id
 */
export async function updateEmotion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const data = req.body;

    const emotion = await emotionService.update(userId, id, data);

    if (!emotion) {
      sendError(res, 'Emotion not found', 404);
      return;
    }

    sendSuccess(res, emotion, 'Emotion updated successfully');
  } catch (error: any) {
    logger.error('Update emotion controller error', error);
    sendError(res, 'Failed to update emotion', 500);
  }
}

/**
 * Delete an emotion entry
 * DELETE /api/emotions/:id
 */
export async function deleteEmotion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const deleted = await emotionService.delete(userId, id);

    if (!deleted) {
      sendError(res, 'Emotion not found', 404);
      return;
    }

    sendSuccess(res, null, 'Emotion deleted successfully');
  } catch (error: any) {
    logger.error('Delete emotion controller error', error);
    sendError(res, 'Failed to delete emotion', 500);
  }
}

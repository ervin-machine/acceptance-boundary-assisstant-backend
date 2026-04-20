import { Response } from 'express';
import { AuthRequest } from '../types';
import actionService from '../services/action.service';
import { sendSuccess, sendError, sendPaginated, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

export async function createAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const data = req.body;

    const action = await actionService.create(userId, data);

    sendSuccess(res, action, 'Action created successfully', 201);
  } catch (error: any) {
    logger.error('Create action controller error', error);
    sendError(res, 'Failed to create action', 500);
  }
}

export async function getActions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { page, limit } = parsePaginationParams(req.query);

    const { actions, total } = await actionService.getAll(userId, page, limit);

    sendPaginated(res, actions, page, limit, total);
  } catch (error: any) {
    logger.error('Get actions controller error', error);
    sendError(res, 'Failed to get actions', 500);
  }
}

export async function getActionById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const action = await actionService.getById(userId, id);

    if (!action) {
      sendError(res, 'Action not found', 404);
      return;
    }

    sendSuccess(res, action);
  } catch (error: any) {
    logger.error('Get action by ID controller error', error);
    sendError(res, 'Failed to get action', 500);
  }
}

export async function updateAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const data = req.body;

    const action = await actionService.update(userId, id, data);

    if (!action) {
      sendError(res, 'Action not found', 404);
      return;
    }

    sendSuccess(res, action, 'Action updated successfully');
  } catch (error: any) {
    logger.error('Update action controller error', error);
    sendError(res, 'Failed to update action', 500);
  }
}

export async function deleteAction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const deleted = await actionService.delete(userId, id);

    if (!deleted) {
      sendError(res, 'Action not found', 404);
      return;
    }

    sendSuccess(res, null, 'Action deleted successfully');
  } catch (error: any) {
    logger.error('Delete action controller error', error);
    sendError(res, 'Failed to delete action', 500);
  }
}

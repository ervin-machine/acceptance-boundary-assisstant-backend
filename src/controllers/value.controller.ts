import { Response } from 'express';
import { AuthRequest } from '../types';
import valueService from '../services/value.service';
import { sendSuccess, sendError, sendPaginated, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

export async function createValue(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const data = req.body;

    const value = await valueService.create(userId, data);

    sendSuccess(res, value, 'Value created successfully', 201);
  } catch (error: any) {
    logger.error('Create value controller error', error);
    sendError(res, 'Failed to create value', 500);
  }
}

export async function getValues(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { page, limit } = parsePaginationParams(req.query);

    const { values, total } = await valueService.getAll(userId, page, limit);

    sendPaginated(res, values, page, limit, total);
  } catch (error: any) {
    logger.error('Get values controller error', error);
    sendError(res, 'Failed to get values', 500);
  }
}

export async function getValueById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const value = await valueService.getById(userId, id);

    if (!value) {
      sendError(res, 'Value not found', 404);
      return;
    }

    sendSuccess(res, value);
  } catch (error: any) {
    logger.error('Get value by ID controller error', error);
    sendError(res, 'Failed to get value', 500);
  }
}

export async function updateValue(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const data = req.body;

    const value = await valueService.update(userId, id, data);

    if (!value) {
      sendError(res, 'Value not found', 404);
      return;
    }

    sendSuccess(res, value, 'Value updated successfully');
  } catch (error: any) {
    logger.error('Update value controller error', error);
    sendError(res, 'Failed to update value', 500);
  }
}

export async function deleteValue(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const deleted = await valueService.delete(userId, id);

    if (!deleted) {
      sendError(res, 'Value not found', 404);
      return;
    }

    sendSuccess(res, null, 'Value deleted successfully');
  } catch (error: any) {
    logger.error('Delete value controller error', error);
    sendError(res, 'Failed to delete value', 500);
  }
}

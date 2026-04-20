import { Response } from 'express';
import { AuthRequest } from '../types';
import boundaryService from '../services/boundary.service';
import { sendSuccess, sendError, sendPaginated, parsePaginationParams } from '../utils/helpers';
import logger from '../utils/logger';

export async function createBoundary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const data = req.body;

    const boundary = await boundaryService.create(userId, data);

    sendSuccess(res, boundary, 'Boundary practice created successfully', 201);
  } catch (error: any) {
    logger.error('Create boundary controller error', error);
    sendError(res, 'Failed to create boundary practice', 500);
  }
}

export async function getBoundaries(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { page, limit } = parsePaginationParams(req.query);

    const { boundaries, total } = await boundaryService.getAll(userId, page, limit);

    sendPaginated(res, boundaries, page, limit, total);
  } catch (error: any) {
    logger.error('Get boundaries controller error', error);
    sendError(res, 'Failed to get boundary practices', 500);
  }
}

export async function getBoundaryById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const boundary = await boundaryService.getById(userId, id);

    if (!boundary) {
      sendError(res, 'Boundary practice not found', 404);
      return;
    }

    sendSuccess(res, boundary);
  } catch (error: any) {
    logger.error('Get boundary by ID controller error', error);
    sendError(res, 'Failed to get boundary practice', 500);
  }
}

export async function updateBoundary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const data = req.body;

    const boundary = await boundaryService.update(userId, id, data);

    if (!boundary) {
      sendError(res, 'Boundary practice not found', 404);
      return;
    }

    sendSuccess(res, boundary, 'Boundary practice updated successfully');
  } catch (error: any) {
    logger.error('Update boundary controller error', error);
    sendError(res, 'Failed to update boundary practice', 500);
  }
}

export async function deleteBoundary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const deleted = await boundaryService.delete(userId, id);

    if (!deleted) {
      sendError(res, 'Boundary practice not found', 404);
      return;
    }

    sendSuccess(res, null, 'Boundary practice deleted successfully');
  } catch (error: any) {
    logger.error('Delete boundary controller error', error);
    sendError(res, 'Failed to delete boundary practice', 500);
  }
}

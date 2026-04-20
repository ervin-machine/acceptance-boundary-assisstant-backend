import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';
import { sendError } from '../utils/helpers';

/**
 * Validation error handler middleware
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    sendError(res, errorMessages, 400);
    return;
  }

  next();
}

/**
 * Global error handler
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    error: err,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message || 'An unexpected error occurred';

  sendError(res, message, err.statusCode || 500);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(res, `Cannot ${req.method} ${req.path}`, 404);
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

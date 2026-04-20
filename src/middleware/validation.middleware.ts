import { Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { isValidUUID, sendError } from '../utils/helpers';

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string = 'id') => {
  return param(paramName)
    .custom((value) => {
      if (!isValidUUID(value)) {
        throw new Error(`Invalid ${paramName} format`);
      }
      return true;
    });
};

/**
 * Sanitize request body to prevent XSS
 */
export function sanitizeBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Trim whitespace
      obj[key] = obj[key].trim();

      // Remove null bytes
      obj[key] = obj[key].replace(/\0/g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Validate content length
 */
export function validateContentLength(maxSize: number = 5000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);

    if (contentLength > maxSize) {
      sendError(res, 'Request body too large', 413);
      return;
    }

    next();
  };
}

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/environment';
import { AuthRequest, TokenPayload, User } from '../types';
import { sendError } from '../utils/helpers';
import logger from '../utils/logger';
import database from '../config/database';
import encryptionService from '../services/encryption.service';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      sendError(res, 'Access token required', 401);
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    if (decoded.type !== 'access') {
      sendError(res, 'Invalid token type', 401);
      return;
    }

    // Get user from database
    const result = await database.query(
      'SELECT id, email_encrypted, name_encrypted, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 'User not found', 404);
      return;
    }

    const userRow = result.rows[0];

    // Decrypt user data
    const user: User = {
      id: userRow.id,
      email: encryptionService.decryptFromDatabase(userRow.email_encrypted),
      name: userRow.name_encrypted ? encryptionService.decryptFromDatabase(userRow.name_encrypted) : null,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
    };

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Token expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid token', 401);
    } else {
      logger.error('Authentication error', error);
      sendError(res, 'Authentication failed', 401);
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuthentication(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  // Token provided, attempt to authenticate
  await authenticateToken(req, res, next);
}

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return decoded;
}

import { Response } from 'express';
import { AuthRequest } from '../types';
import authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/helpers';
import logger from '../utils/logger';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    const { user, tokens } = await authService.register({ email, password, name });

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (error: any) {
    logger.error('Register controller error', error);

    if (error.message === 'Email already registered') {
      sendError(res, 'Email already registered', 409);
    } else {
      sendError(res, 'Registration failed', 500);
    }
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const { user, tokens } = await authService.login({ email, password });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Login successful');
  } catch (error: any) {
    logger.error('Login controller error', error);

    if (error.message === 'Invalid email or password') {
      sendError(res, 'Invalid email or password', 401);
    } else {
      sendError(res, 'Login failed', 500);
    }
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export async function refreshToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Token refreshed');
  } catch (error: any) {
    logger.error('Refresh token controller error', error);
    sendError(res, 'Invalid or expired refresh token', 401);
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { refreshToken } = req.body;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    await authService.logout(userId, refreshToken);

    sendSuccess(res, null, 'Logout successful');
  } catch (error: any) {
    logger.error('Logout controller error', error);
    sendError(res, 'Logout failed', 500);
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await authService.getCurrentUser(userId);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    logger.error('Get current user controller error', error);
    sendError(res, 'Failed to get user', 500);
  }
}

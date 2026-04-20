import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';
import { handleValidationErrors } from '../middleware/error.middleware';
import { loginValidation, registerValidation } from '../utils/validators';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter, // Rate limit: 5 requests per 15 minutes
  registerValidation, // Validate email, password, name
  handleValidationErrors, // Handle validation errors
  asyncHandler(authController.register) // Handle registration
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter, // Rate limit: 5 requests per 15 minutes
  loginValidation, // Validate email, password
  handleValidationErrors, // Handle validation errors
  asyncHandler(authController.login) // Handle login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticateToken, // Require valid access token
  asyncHandler(authController.logout)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get(
  '/me',
  authenticateToken, // Require valid access token
  asyncHandler(authController.getCurrentUser)
);

export default router;

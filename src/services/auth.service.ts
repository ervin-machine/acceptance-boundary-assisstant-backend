import bcrypt from 'bcrypt';
import crypto from 'crypto';
import database from '../config/database';
import encryptionService from './encryption.service';
import redisClient from '../config/redis';
import {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthTokens,
} from '../types';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.middleware';
import logger from '../utils/logger';

class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly SESSION_PREFIX = 'session:';

  /**
   * Register a new user
   *
   * Flow:
   * 1. Check if email already exists (using hash for privacy)
   * 2. Hash password with bcrypt (12 rounds)
   * 3. Encrypt PII (email, name) with AES-256
   * 4. Store in database
   * 5. Generate JWT tokens
   * 6. Create session in database
   */
  async register(credentials: RegisterCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, name } = credentials;

    try {
      // Check if user already exists (using email hash for searchability without exposing email)
      const emailHash = encryptionService.hash(email);
      const existingUser = await database.query(
        'SELECT id FROM users WHERE email_hash = $1',
        [emailHash]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password with bcrypt (HIPAA-compliant, 12 rounds)
      const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Encrypt PII data (email and name) for database storage
      const emailEncrypted = encryptionService.encryptForDatabase(email);
      const nameEncrypted = name ? encryptionService.encryptForDatabase(name) : null;

      // Insert user into database
      const result = await database.query(
        `INSERT INTO users (email_encrypted, email_hash, password_hash, name_encrypted)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email_encrypted, name_encrypted, created_at, updated_at`,
        [emailEncrypted, emailHash, passwordHash, nameEncrypted]
      );

      const userRow = result.rows[0];

      // Decrypt user data for response
      const user: User = {
        id: userRow.id,
        email: encryptionService.decryptFromDatabase(userRow.email_encrypted),
        name: userRow.name_encrypted ? encryptionService.decryptFromDatabase(userRow.name_encrypted) : null,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      };

      // Generate JWT tokens (access + refresh)
      const tokens = await this.generateTokens(user.id, user.email);

      logger.info('User registered successfully', { userId: user.id });

      return { user, tokens };
    } catch (error) {
      logger.error('Registration error', error);
      throw error;
    }
  }

  /**
   * Login user
   *
   * Flow:
   * 1. Find user by email hash
   * 2. Verify password with bcrypt
   * 3. Generate new JWT tokens
   * 4. Create new session
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = credentials;

    try {
      // Find user by email hash (can't search encrypted data directly)
      const emailHash = encryptionService.hash(email);
      const result = await database.query(
        `SELECT id, email_encrypted, password_hash, name_encrypted, created_at, updated_at
         FROM users
         WHERE email_hash = $1`,
        [emailHash]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const userRow = result.rows[0];

      // Verify password with bcrypt (constant-time comparison)
      const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Decrypt user data
      const user: User = {
        id: userRow.id,
        email: encryptionService.decryptFromDatabase(userRow.email_encrypted),
        name: userRow.name_encrypted ? encryptionService.decryptFromDatabase(userRow.name_encrypted) : null,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      };

      // Generate fresh tokens
      const tokens = await this.generateTokens(user.id, user.email);

      logger.info('User logged in successfully', { userId: user.id });

      return { user, tokens };
    } catch (error) {
      logger.error('Login error', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * Flow:
   * 1. Verify refresh token signature
   * 2. Check if session exists in database
   * 3. Generate new access token
   * 4. Keep same refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token signature and expiration
      const payload = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in sessions table
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const result = await database.query(
        `SELECT user_id, expires_at FROM sessions
         WHERE refresh_token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new access token (short-lived: 30 minutes)
      const accessToken = generateAccessToken(payload.userId, payload.email);

      logger.info('Access token refreshed', { userId: payload.userId });

      return {
        accessToken,
        refreshToken, // Return same refresh token (long-lived: 7 days)
      };
    } catch (error) {
      logger.error('Token refresh error', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   *
   * Flow:
   * 1. Delete session from database
   * 2. Clear Redis cache
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Delete specific session (single device logout)
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await database.query(
          'DELETE FROM sessions WHERE user_id = $1 AND refresh_token_hash = $2',
          [userId, tokenHash]
        );
      } else {
        // Delete all sessions (logout from all devices)
        await database.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      }

      // Clear Redis session cache
      await redisClient.del(`${this.SESSION_PREFIX}${userId}`);

      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Logout error', error);
      throw error;
    }
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      const result = await database.query(
        'SELECT id, email_encrypted, name_encrypted, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      return {
        id: userRow.id,
        email: encryptionService.decryptFromDatabase(userRow.email_encrypted),
        name: userRow.name_encrypted ? encryptionService.decryptFromDatabase(userRow.name_encrypted) : null,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      };
    } catch (error) {
      logger.error('Get current user error', error);
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   *
   * Private method used by register and login
   */
  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    // Generate JWT tokens
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    // Store refresh token hash in database for validation
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await database.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Clean up expired sessions
   * Should be run periodically (e.g., daily cron job)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await database.query('DELETE FROM sessions WHERE expires_at < NOW()');
      logger.info(`Cleaned up ${result.rowCount} expired sessions`);
    } catch (error) {
      logger.error('Session cleanup error', error);
    }
  }
}

export default new AuthService();

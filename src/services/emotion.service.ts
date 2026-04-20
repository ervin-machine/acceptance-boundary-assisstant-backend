import database from '../config/database';
import encryptionService from './encryption.service';
import {
  Emotion,
  EmotionRow,
  CreateEmotionDTO,
  UpdateEmotionDTO,
} from '../types';
import logger from '../utils/logger';
import { getPaginationOffset } from '../utils/helpers';

class EmotionService {
  /**
   * Create a new emotion entry
   */
  async create(userId: string, data: CreateEmotionDTO): Promise<Emotion> {
    try {
      // Encrypt sensitive data
      const emotionsEncrypted = encryptionService.encryptForDatabase(JSON.stringify(data.emotions));
      const bodySensationsEncrypted = encryptionService.encryptForDatabase(data.bodySensations || '');
      const contextEncrypted = encryptionService.encryptForDatabase(data.context || '');

      // Insert into database
      const result = await database.query(
        `INSERT INTO emotions (user_id, emotions_encrypted, intensity, body_sensations_encrypted, context_encrypted, accepted)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, emotions_encrypted, intensity, body_sensations_encrypted, context_encrypted, accepted, created_at`,
        [userId, emotionsEncrypted, data.intensity, bodySensationsEncrypted, contextEncrypted, data.accepted ?? false]
      );

      const row = result.rows[0];

      // Decrypt and return
      return this.mapRowToEmotion(row);
    } catch (error) {
      logger.error('Create emotion error', error);
      throw error;
    }
  }

  /**
   * Get all emotions for a user (with pagination)
   */
  async getAll(userId: string, page: number = 1, limit: number = 20): Promise<{ emotions: Emotion[]; total: number }> {
    try {
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const countResult = await database.query(
        'SELECT COUNT(*) FROM emotions WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get emotions
      const result = await database.query(
        `SELECT id, user_id, emotions_encrypted, intensity, body_sensations_encrypted, context_encrypted, accepted, created_at
         FROM emotions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const emotions = result.rows.map(row => this.mapRowToEmotion(row));

      return { emotions, total };
    } catch (error) {
      logger.error('Get all emotions error', error);
      throw error;
    }
  }

  /**
   * Get a single emotion by ID
   */
  async getById(userId: string, emotionId: string): Promise<Emotion | null> {
    try {
      const result = await database.query(
        `SELECT id, user_id, emotions_encrypted, intensity, body_sensations_encrypted, context_encrypted, accepted, created_at
         FROM emotions
         WHERE id = $1 AND user_id = $2`,
        [emotionId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEmotion(result.rows[0]);
    } catch (error) {
      logger.error('Get emotion by ID error', error);
      throw error;
    }
  }

  /**
   * Update an emotion entry
   */
  async update(userId: string, emotionId: string, data: UpdateEmotionDTO): Promise<Emotion | null> {
    try {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.emotions !== undefined) {
        updates.push(`emotions_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(JSON.stringify(data.emotions)));
      }

      if (data.intensity !== undefined) {
        updates.push(`intensity = $${paramCount++}`);
        values.push(data.intensity);
      }

      if (data.bodySensations !== undefined) {
        updates.push(`body_sensations_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.bodySensations));
      }

      if (data.context !== undefined) {
        updates.push(`context_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.context));
      }

      if (data.accepted !== undefined) {
        updates.push(`accepted = $${paramCount++}`);
        values.push(data.accepted);
      }

      if (updates.length === 0) {
        // No updates provided, return current emotion
        return this.getById(userId, emotionId);
      }

      // Add WHERE clause parameters
      values.push(emotionId, userId);

      const result = await database.query(
        `UPDATE emotions
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING id, user_id, emotions_encrypted, intensity, body_sensations_encrypted, context_encrypted, accepted, created_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToEmotion(result.rows[0]);
    } catch (error) {
      logger.error('Update emotion error', error);
      throw error;
    }
  }

  /**
   * Delete an emotion entry
   */
  async delete(userId: string, emotionId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'DELETE FROM emotions WHERE id = $1 AND user_id = $2',
        [emotionId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Delete emotion error', error);
      throw error;
    }
  }

  /**
   * Map database row to Emotion object (with decryption)
   */
  private mapRowToEmotion(row: EmotionRow): Emotion {
    return {
      id: row.id,
      userId: row.user_id,
      emotions: JSON.parse(encryptionService.decryptFromDatabase(row.emotions_encrypted)),
      intensity: row.intensity,
      bodySensations: encryptionService.decryptFromDatabase(row.body_sensations_encrypted),
      context: encryptionService.decryptFromDatabase(row.context_encrypted),
      accepted: row.accepted,
      createdAt: row.created_at,
    };
  }
}

export default new EmotionService();

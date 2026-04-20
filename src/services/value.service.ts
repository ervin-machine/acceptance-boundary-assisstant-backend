import database from '../config/database';
import encryptionService from './encryption.service';
import {
  Value,
  ValueRow,
  CreateValueDTO,
  UpdateValueDTO,
} from '../types';
import logger from '../utils/logger';
import { getPaginationOffset } from '../utils/helpers';

class ValueService {
  /**
   * Create a new value entry
   */
  async create(userId: string, data: CreateValueDTO): Promise<Value> {
    try {
      // Encrypt sensitive data
      const categoryEncrypted = encryptionService.encryptForDatabase(data.category);
      const customValueEncrypted = data.customValue
        ? encryptionService.encryptForDatabase(data.customValue)
        : null;

      // Insert into database
      const result = await database.query(
        `INSERT INTO values (user_id, category_encrypted, custom_value_encrypted, importance, alignment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, category_encrypted, custom_value_encrypted, importance, alignment, created_at`,
        [userId, categoryEncrypted, customValueEncrypted, data.importance, data.alignment]
      );

      const row = result.rows[0];

      return this.mapRowToValue(row);
    } catch (error) {
      logger.error('Create value error', error);
      throw error;
    }
  }

  /**
   * Get all values for a user (with pagination)
   */
  async getAll(userId: string, page: number = 1, limit: number = 20): Promise<{ values: Value[]; total: number }> {
    try {
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const countResult = await database.query(
        'SELECT COUNT(*) FROM values WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get values ordered by importance
      const result = await database.query(
        `SELECT id, user_id, category_encrypted, custom_value_encrypted, importance, alignment, created_at
         FROM values
         WHERE user_id = $1
         ORDER BY importance DESC, created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const values = result.rows.map(row => this.mapRowToValue(row));

      return { values, total };
    } catch (error) {
      logger.error('Get all values error', error);
      throw error;
    }
  }

  /**
   * Get a single value by ID
   */
  async getById(userId: string, valueId: string): Promise<Value | null> {
    try {
      const result = await database.query(
        `SELECT id, user_id, category_encrypted, custom_value_encrypted, importance, alignment, created_at
         FROM values
         WHERE id = $1 AND user_id = $2`,
        [valueId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToValue(result.rows[0]);
    } catch (error) {
      logger.error('Get value by ID error', error);
      throw error;
    }
  }

  /**
   * Update a value entry
   */
  async update(userId: string, valueId: string, data: UpdateValueDTO): Promise<Value | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.category !== undefined) {
        updates.push(`category_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.category));
      }

      if (data.customValue !== undefined) {
        updates.push(`custom_value_encrypted = $${paramCount++}`);
        values.push(data.customValue ? encryptionService.encryptForDatabase(data.customValue) : null);
      }

      if (data.importance !== undefined) {
        updates.push(`importance = $${paramCount++}`);
        values.push(data.importance);
      }

      if (data.alignment !== undefined) {
        updates.push(`alignment = $${paramCount++}`);
        values.push(data.alignment);
      }

      if (updates.length === 0) {
        return this.getById(userId, valueId);
      }

      values.push(valueId, userId);

      const result = await database.query(
        `UPDATE values
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING id, user_id, category_encrypted, custom_value_encrypted, importance, alignment, created_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToValue(result.rows[0]);
    } catch (error) {
      logger.error('Update value error', error);
      throw error;
    }
  }

  /**
   * Delete a value entry
   */
  async delete(userId: string, valueId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'DELETE FROM values WHERE id = $1 AND user_id = $2',
        [valueId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Delete value error', error);
      throw error;
    }
  }

  /**
   * Map database row to Value object (with decryption)
   */
  private mapRowToValue(row: ValueRow): Value {
    return {
      id: row.id,
      userId: row.user_id,
      category: encryptionService.decryptFromDatabase(row.category_encrypted),
      customValue: row.custom_value_encrypted
        ? encryptionService.decryptFromDatabase(row.custom_value_encrypted)
        : null,
      importance: row.importance,
      alignment: row.alignment,
      createdAt: row.created_at,
    };
  }
}

export default new ValueService();

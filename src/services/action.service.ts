import database from '../config/database';
import encryptionService from './encryption.service';
import {
  Action,
  ActionRow,
  CreateActionDTO,
  UpdateActionDTO,
} from '../types';
import logger from '../utils/logger';
import { getPaginationOffset } from '../utils/helpers';

class ActionService {
  /**
   * Create a new action entry
   */
  async create(userId: string, data: CreateActionDTO): Promise<Action> {
    try {
      // Encrypt sensitive data
      const valueEncrypted = encryptionService.encryptForDatabase(data.value);
      const actionEncrypted = encryptionService.encryptForDatabase(data.action);
      const microStepsEncrypted = encryptionService.encryptForDatabase(
        JSON.stringify(data.microSteps || [])
      );
      const completedStepsEncrypted = encryptionService.encryptForDatabase(
        JSON.stringify([])
      );
      const feelingEncrypted = data.feeling
        ? encryptionService.encryptForDatabase(data.feeling)
        : null;

      // Insert into database
      const result = await database.query(
        `INSERT INTO actions (user_id, value_encrypted, action_encrypted, completed, micro_steps_encrypted, completed_steps_encrypted, commitment, feeling_encrypted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, user_id, value_encrypted, action_encrypted, completed, micro_steps_encrypted, completed_steps_encrypted, commitment, feeling_encrypted, created_at`,
        [userId, valueEncrypted, actionEncrypted, false, microStepsEncrypted, completedStepsEncrypted, data.commitment || null, feelingEncrypted]
      );

      const row = result.rows[0];

      return this.mapRowToAction(row);
    } catch (error) {
      logger.error('Create action error', error);
      throw error;
    }
  }

  /**
   * Get all actions for a user (with pagination)
   */
  async getAll(userId: string, page: number = 1, limit: number = 20): Promise<{ actions: Action[]; total: number }> {
    try {
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const countResult = await database.query(
        'SELECT COUNT(*) FROM actions WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get actions (incomplete first, then by date)
      const result = await database.query(
        `SELECT id, user_id, value_encrypted, action_encrypted, completed, micro_steps_encrypted, completed_steps_encrypted, commitment, feeling_encrypted, created_at
         FROM actions
         WHERE user_id = $1
         ORDER BY completed ASC, created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const actions = result.rows.map(row => this.mapRowToAction(row));

      return { actions, total };
    } catch (error) {
      logger.error('Get all actions error', error);
      throw error;
    }
  }

  /**
   * Get a single action by ID
   */
  async getById(userId: string, actionId: string): Promise<Action | null> {
    try {
      const result = await database.query(
        `SELECT id, user_id, value_encrypted, action_encrypted, completed, micro_steps_encrypted, completed_steps_encrypted, commitment, feeling_encrypted, created_at
         FROM actions
         WHERE id = $1 AND user_id = $2`,
        [actionId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAction(result.rows[0]);
    } catch (error) {
      logger.error('Get action by ID error', error);
      throw error;
    }
  }

  /**
   * Update an action entry
   */
  async update(userId: string, actionId: string, data: UpdateActionDTO): Promise<Action | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.value !== undefined) {
        updates.push(`value_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.value));
      }

      if (data.action !== undefined) {
        updates.push(`action_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.action));
      }

      if (data.completed !== undefined) {
        updates.push(`completed = $${paramCount++}`);
        values.push(data.completed);
      }

      if (data.microSteps !== undefined) {
        updates.push(`micro_steps_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(JSON.stringify(data.microSteps)));
      }

      if (data.completedSteps !== undefined) {
        updates.push(`completed_steps_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(JSON.stringify(data.completedSteps)));
      }

      if (data.commitment !== undefined) {
        updates.push(`commitment = $${paramCount++}`);
        values.push(data.commitment);
      }

      if (data.feeling !== undefined) {
        updates.push(`feeling_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.feeling));
      }

      if (updates.length === 0) {
        return this.getById(userId, actionId);
      }

      values.push(actionId, userId);

      const result = await database.query(
        `UPDATE actions
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING id, user_id, value_encrypted, action_encrypted, completed, micro_steps_encrypted, completed_steps_encrypted, commitment, feeling_encrypted, created_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAction(result.rows[0]);
    } catch (error) {
      logger.error('Update action error', error);
      throw error;
    }
  }

  /**
   * Delete an action entry
   */
  async delete(userId: string, actionId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'DELETE FROM actions WHERE id = $1 AND user_id = $2',
        [actionId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Delete action error', error);
      throw error;
    }
  }

  /**
   * Map database row to Action object (with decryption)
   */
  private mapRowToAction(row: ActionRow): Action {
    return {
      id: row.id,
      userId: row.user_id,
      value: encryptionService.decryptFromDatabase(row.value_encrypted),
      action: encryptionService.decryptFromDatabase(row.action_encrypted),
      completed: row.completed,
      microSteps: JSON.parse(encryptionService.decryptFromDatabase(row.micro_steps_encrypted)),
      completedSteps: row.completed_steps_encrypted
        ? JSON.parse(encryptionService.decryptFromDatabase(row.completed_steps_encrypted))
        : [],
      commitment: row.commitment || undefined,
      feeling: row.feeling_encrypted
        ? encryptionService.decryptFromDatabase(row.feeling_encrypted)
        : undefined,
      createdAt: row.created_at,
    };
  }
}

export default new ActionService();

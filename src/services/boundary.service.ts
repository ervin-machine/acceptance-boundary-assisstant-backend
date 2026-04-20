import database from '../config/database';
import encryptionService from './encryption.service';
import {
  BoundaryPractice,
  BoundaryPracticeRow,
  CreateBoundaryDTO,
  UpdateBoundaryDTO,
} from '../types';
import logger from '../utils/logger';
import { getPaginationOffset } from '../utils/helpers';

class BoundaryService {
  /**
   * Create a new boundary practice entry
   */
  async create(userId: string, data: CreateBoundaryDTO): Promise<BoundaryPractice> {
    try {
      // Encrypt sensitive data
      const scenarioEncrypted = encryptionService.encryptForDatabase(data.scenario);
      const responseEncrypted = encryptionService.encryptForDatabase(data.response);
      const outcomeEncrypted = data.outcome
        ? encryptionService.encryptForDatabase(data.outcome)
        : null;

      // Insert into database
      const result = await database.query(
        `INSERT INTO boundary_practices (user_id, scenario_encrypted, boundary_type, response_encrypted, confidence, outcome_encrypted)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, scenario_encrypted, boundary_type, response_encrypted, confidence, outcome_encrypted, created_at`,
        [userId, scenarioEncrypted, data.boundaryType, responseEncrypted, data.confidence, outcomeEncrypted]
      );

      const row = result.rows[0];

      return this.mapRowToBoundary(row);
    } catch (error) {
      logger.error('Create boundary error', error);
      throw error;
    }
  }

  /**
   * Get all boundary practices for a user (with pagination)
   */
  async getAll(userId: string, page: number = 1, limit: number = 20): Promise<{ boundaries: BoundaryPractice[]; total: number }> {
    try {
      const offset = getPaginationOffset(page, limit);

      // Get total count
      const countResult = await database.query(
        'SELECT COUNT(*) FROM boundary_practices WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get boundaries
      const result = await database.query(
        `SELECT id, user_id, scenario_encrypted, boundary_type, response_encrypted, confidence, outcome_encrypted, created_at
         FROM boundary_practices
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const boundaries = result.rows.map(row => this.mapRowToBoundary(row));

      return { boundaries, total };
    } catch (error) {
      logger.error('Get all boundaries error', error);
      throw error;
    }
  }

  /**
   * Get a single boundary practice by ID
   */
  async getById(userId: string, boundaryId: string): Promise<BoundaryPractice | null> {
    try {
      const result = await database.query(
        `SELECT id, user_id, scenario_encrypted, boundary_type, response_encrypted, confidence, outcome_encrypted, created_at
         FROM boundary_practices
         WHERE id = $1 AND user_id = $2`,
        [boundaryId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToBoundary(result.rows[0]);
    } catch (error) {
      logger.error('Get boundary by ID error', error);
      throw error;
    }
  }

  /**
   * Update a boundary practice entry
   */
  async update(userId: string, boundaryId: string, data: UpdateBoundaryDTO): Promise<BoundaryPractice | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.scenario !== undefined) {
        updates.push(`scenario_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.scenario));
      }

      if (data.boundaryType !== undefined) {
        updates.push(`boundary_type = $${paramCount++}`);
        values.push(data.boundaryType);
      }

      if (data.response !== undefined) {
        updates.push(`response_encrypted = $${paramCount++}`);
        values.push(encryptionService.encryptForDatabase(data.response));
      }

      if (data.confidence !== undefined) {
        updates.push(`confidence = $${paramCount++}`);
        values.push(data.confidence);
      }

      if (data.outcome !== undefined) {
        updates.push(`outcome_encrypted = $${paramCount++}`);
        values.push(data.outcome ? encryptionService.encryptForDatabase(data.outcome) : null);
      }

      if (updates.length === 0) {
        return this.getById(userId, boundaryId);
      }

      values.push(boundaryId, userId);

      const result = await database.query(
        `UPDATE boundary_practices
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING id, user_id, scenario_encrypted, boundary_type, response_encrypted, confidence, outcome_encrypted, created_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToBoundary(result.rows[0]);
    } catch (error) {
      logger.error('Update boundary error', error);
      throw error;
    }
  }

  /**
   * Delete a boundary practice entry
   */
  async delete(userId: string, boundaryId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'DELETE FROM boundary_practices WHERE id = $1 AND user_id = $2',
        [boundaryId, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Delete boundary error', error);
      throw error;
    }
  }

  /**
   * Map database row to BoundaryPractice object (with decryption)
   */
  private mapRowToBoundary(row: BoundaryPracticeRow): BoundaryPractice {
    return {
      id: row.id,
      userId: row.user_id,
      scenario: encryptionService.decryptFromDatabase(row.scenario_encrypted),
      boundaryType: row.boundary_type,
      response: encryptionService.decryptFromDatabase(row.response_encrypted),
      confidence: row.confidence,
      outcome: row.outcome_encrypted
        ? encryptionService.decryptFromDatabase(row.outcome_encrypted)
        : null,
      createdAt: row.created_at,
    };
  }
}

export default new BoundaryService();

import database from '../config/database';
import encryptionService from './encryption.service';
import { Message, MessageRow } from '../types';
import logger from '../utils/logger';

class MessageService {
  /**
   * Create a new message (user or assistant)
   */
  async create(userId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    try {
      // Encrypt message content
      const contentEncrypted = encryptionService.encryptForDatabase(content);

      const result = await database.query(
        `INSERT INTO messages (user_id, role, content_encrypted)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, role, content_encrypted, created_at`,
        [userId, role, contentEncrypted]
      );

      const row = result.rows[0];
      return this.mapRowToMessage(row);
    } catch (error) {
      logger.error('Create message error', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a user (last N messages)
   */
  async getConversationHistory(userId: string, limit: number = 50): Promise<Message[]> {
    try {
      const result = await database.query(
        `SELECT id, user_id, role, content_encrypted, created_at
         FROM messages
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      // Reverse to get chronological order (oldest first)
      return result.rows.reverse().map(row => this.mapRowToMessage(row));
    } catch (error) {
      logger.error('Get conversation history error', error);
      throw error;
    }
  }

  /**
   * Get recent messages (for context window)
   */
  async getRecentMessages(userId: string, count: number = 10): Promise<Message[]> {
    try {
      const result = await database.query(
        `SELECT id, user_id, role, content_encrypted, created_at
         FROM messages
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, count]
      );

      return result.rows.reverse().map(row => this.mapRowToMessage(row));
    } catch (error) {
      logger.error('Get recent messages error', error);
      throw error;
    }
  }

  /**
   * Delete all conversation history for a user
   */
  async deleteConversation(userId: string): Promise<boolean> {
    try {
      const result = await database.query(
        'DELETE FROM messages WHERE user_id = $1',
        [userId]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Delete conversation error', error);
      throw error;
    }
  }

  /**
   * Delete messages older than specified days
   */
  async cleanupOldMessages(days: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await database.query(
        'DELETE FROM messages WHERE created_at < $1',
        [cutoffDate]
      );

      logger.info(`Cleaned up ${result.rowCount} old messages`);
    } catch (error) {
      logger.error('Cleanup old messages error', error);
      throw error;
    }
  }

  /**
   * Map database row to Message object (with decryption)
   */
  private mapRowToMessage(row: MessageRow): Message {
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      content: encryptionService.decryptFromDatabase(row.content_encrypted),
      createdAt: row.created_at,
    };
  }
}

export default new MessageService();

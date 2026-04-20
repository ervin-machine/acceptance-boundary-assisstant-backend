import crypto from 'crypto';
import config from '../config/environment';
import logger from '../utils/logger';

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor() {
    // Ensure encryption key is valid
    const keyHex = config.encryption.key;
    if (keyHex.length !== this.keyLength * 2) {
      throw new Error(`ENCRYPTION_KEY must be ${this.keyLength * 2} hex characters (${this.keyLength} bytes)`);
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt a string value
   * @param plaintext - The text to encrypt
   * @returns Base64 encoded encrypted data with IV and auth tag
   */
  public encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'hex'),
        authTag,
      ]);

      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption error', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedData - Base64 encoded encrypted data
   * @returns Decrypted plaintext
   */
  public decrypt(encryptedData: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, encrypted data, and auth tag
      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(combined.length - this.tagLength);
      const encrypted = combined.subarray(this.ivLength, combined.length - this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption error', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a value (one-way, for searchable fields like email)
   * @param value - The value to hash
   * @returns SHA-256 hex hash
   */
  public hash(value: string): string {
    return crypto.createHash('sha256').update(value.toLowerCase()).digest('hex');
  }

  /**
   * Generate a cryptographically secure random token
   * @param length - Length in bytes (default: 32)
   * @returns Random hex token
   */
  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random encryption key
   * @returns 32-byte hex key suitable for AES-256
   */
  public static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt data for database storage (returns Buffer for BYTEA columns)
   * @param plaintext - The text to encrypt
   * @returns Buffer suitable for PostgreSQL BYTEA column
   */
  public encryptForDatabase(plaintext: string): Buffer {
    const encrypted = this.encrypt(plaintext);
    return Buffer.from(encrypted, 'base64');
  }

  /**
   * Decrypt data from database (accepts Buffer from BYTEA columns)
   * @param encryptedBuffer - Buffer from PostgreSQL BYTEA column
   * @returns Decrypted plaintext
   */
  public decryptFromDatabase(encryptedBuffer: Buffer): string {
    const base64 = encryptedBuffer.toString('base64');
    return this.decrypt(base64);
  }
}

export default new EncryptionService();

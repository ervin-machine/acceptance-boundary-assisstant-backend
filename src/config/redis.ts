import { createClient, RedisClientType } from 'redis';
import config from './environment';
import logger from '../utils/logger';

class RedisClient {
  private client: RedisClientType;
  private static instance: RedisClient;

  private constructor() {
    this.client = createClient({
      url: config.redis.url,
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async set(key: string, value: string, expiresIn?: number): Promise<void> {
    if (expiresIn) {
      await this.client.setEx(key, expiresIn, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async setWithExpiry(key: string, value: string, seconds: number): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  public async increment(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  public async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  public async flushAll(): Promise<void> {
    await this.client.flushAll();
  }

  public getClient(): RedisClientType {
    return this.client;
  }
}

export default RedisClient.getInstance();

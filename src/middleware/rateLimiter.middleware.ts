import rateLimit from 'express-rate-limit';
import config from '../config/environment';
import redisClient from '../config/redis';
import logger from '../utils/logger';

/**
 * Create rate limiter with Redis store
 */
function createRateLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom store using Redis for distributed rate limiting
    store: {
      async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
        try {
          const redis = redisClient.getClient();
          const current = await redis.incr(key);

          if (current === 1) {
            await redis.expire(key, Math.ceil(windowMs / 1000));
          }

          const ttl = await redis.ttl(key);
          const resetTime = ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined;

          return {
            totalHits: current,
            resetTime,
          };
        } catch (error) {
          logger.error('Rate limiter Redis error', error);
          // Fallback to allowing the request if Redis fails
          return {
            totalHits: 0,
            resetTime: undefined,
          };
        }
      },
      async decrement(key: string): Promise<void> {
        try {
          await redisClient.getClient().decr(key);
        } catch (error) {
          logger.error('Rate limiter decrement error', error);
        }
      },
      async resetKey(key: string): Promise<void> {
        try {
          await redisClient.del(key);
        } catch (error) {
          logger.error('Rate limiter reset error', error);
        }
      },
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        error: message,
      });
    },
  });
}

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'Too many requests, please try again later'
);

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
export const authLimiter = createRateLimiter(
  config.rateLimit.authWindowMs,
  config.rateLimit.authMax,
  'Too many authentication attempts, please try again later'
);

/**
 * AI endpoint rate limiter
 * 20 requests per 15 minutes
 */
export const aiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20,
  'Too many AI requests, please try again later'
);

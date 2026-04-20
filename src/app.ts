import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config/environment';
import database from './config/database';
import redisClient from './config/redis';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { auditLog } from './middleware/audit.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import emotionRoutes from './routes/emotion.routes';
import valueRoutes from './routes/value.routes';
import actionRoutes from './routes/action.routes';
import boundaryRoutes from './routes/boundary.routes';
import aiRoutes from './routes/ai.routes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Trust the first proxy (nginx) so X-Forwarded-For is used for rate limiting
    this.app.set('trust proxy', 1);

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Audit logging (HIPAA compliance)
    this.app.use(auditLog);

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/emotions', apiLimiter, emotionRoutes);
    this.app.use('/api/values', apiLimiter, valueRoutes);
    this.app.use('/api/actions', apiLimiter, actionRoutes);
    this.app.use('/api/boundaries', apiLimiter, boundaryRoutes);
    this.app.use('/api/ai', aiRoutes); // Has its own rate limiter

    // Welcome route
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'Acceptance and Boundary Assistant API',
        version: '1.0.0',
        documentation: '/api/health',
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async initialize(): Promise<void> {
    const isProd = config.nodeEnv === 'production';

    // Database
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      if (isProd) throw new Error('Database connection failed — cannot start in production without a database');
      logger.warn('PostgreSQL unavailable — API routes requiring a database will return 503. Start postgres to use data features.');
    }

    // Redis
    try {
      await redisClient.connect();
    } catch (redisError) {
      if (isProd) {
        logger.error('Redis connection failed', redisError);
        throw new Error('Redis connection failed — cannot start in production without Redis');
      }
      logger.warn('Redis unavailable — rate limiting and session storage disabled. Start Redis to enable these features.');
    }

    logger.info(`Server initialized (db: ${dbConnected ? 'connected' : 'unavailable'}, redis: ${redisClient.getClient().isOpen ? 'connected' : 'unavailable'})`);
  }

  public async listen(): Promise<void> {
    await this.initialize();

    this.app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`CORS enabled for: ${config.cors.origin}`);
      logger.info(`AI Companion: ${config.features.enableAICompanion ? 'enabled' : 'disabled'}`);
      logger.info(`Crisis Detection: ${config.features.enableCrisisDetection ? 'enabled' : 'disabled'}`);
    });
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');

    try {
      await database.close();
      await redisClient.disconnect();
      logger.info('All connections closed');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }
  }
}

// Create and export app instance
const appInstance = new App();

// Handle shutdown signals
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await appInstance.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await appInstance.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start server if this file is run directly
if (require.main === module) {
  appInstance.listen().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export default appInstance.app;

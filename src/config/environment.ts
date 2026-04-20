import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvironmentConfig {
  // Server
  nodeEnv: string;
  port: number;

  // Database
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };

  // Redis
  redis: {
    url: string;
  };

  // JWT
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // Encryption
  encryption: {
    key: string;
  };

  // OpenRouter API
  openrouter: {
    apiKey: string;
    model: string;
    maxTokens: number;
    siteUrl: string;
    siteName: string;
  };

  // CORS
  cors: {
    origin: string;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    max: number;
    authWindowMs: number;
    authMax: number;
  };

  // Session
  session: {
    timeout: number;
  };

  // Logging
  logging: {
    level: string;
    filePath: string;
  };

  // HIPAA Compliance
  hipaa: {
    auditLogRetentionDays: number;
    enableAuditLogging: boolean;
  };

  // Feature Flags
  features: {
    enableAICompanion: boolean;
    enableCrisisDetection: boolean;
  };
}

const config: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:462001@localhost:5432/acceptance_boundary_assistant',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'acceptance_boundary_assistant',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '462001',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '4096', 10),
    siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
    siteName: process.env.OPENROUTER_SITE_NAME || 'Acceptance and Boundary Assistant',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '15', 10) * 60 * 1000,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  },

  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || '1800000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  hipaa: {
    auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555', 10),
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
  },

  features: {
    enableAICompanion: process.env.ENABLE_AI_COMPANION !== 'false',
    enableCrisisDetection: process.env.ENABLE_CRISIS_DETECTION !== 'false',
  },
};

// Validation
if (config.nodeEnv === 'production') {
  if (config.jwt.secret === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (config.encryption.key === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
    throw new Error('ENCRYPTION_KEY must be set in production');
  }
  if (!config.openrouter.apiKey && config.features.enableAICompanion) {
    console.warn('OPENROUTER_API_KEY not set - AI Companion features will be disabled');
  }
}

export default config;

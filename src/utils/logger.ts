import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/environment';

// Ensure log directory exists before Winston tries to write to it
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) msg += `\n${stack}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    logFormat
  ),
});

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    consoleTransport,
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  // Print exceptions and rejections to console AND file
  exceptionHandlers: [
    consoleTransport,
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    consoleTransport,
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
  ],
});

export default logger;

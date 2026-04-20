import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

/**
 * Send success response
 */
export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(res: Response, error: string, statusCode: number = 400): void {
  const response: ApiResponse = {
    success: false,
    error,
  };
  res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
  res.status(200).json(response);
}

/**
 * Calculate pagination offset
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Check if string contains crisis keywords
 */
export function containsCrisisKeywords(text: string): boolean {
  const crisisKeywords = [
    'suicide',
    'kill myself',
    'end my life',
    'want to die',
    'better off dead',
    'no reason to live',
    'self-harm',
    'hurt myself',
  ];

  const lowerText = text.toLowerCase();
  return crisisKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Get crisis resources message
 */
export function getCrisisResources(): string {
  return `
⚠️ **IMPORTANT CRISIS RESOURCES** ⚠️

If you're experiencing thoughts of suicide or self-harm, please reach out for immediate help:

- **988** - Suicide & Crisis Lifeline (Call or Text)
- **Text HOME to 741741** - Crisis Text Line
- **911** - Emergency Services

These services are available 24/7 and provide free, confidential support.

You don't have to face this alone. Please reach out to a trained professional who can help.
  `.trim();
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse pagination parameters from query
 */
export function parsePaginationParams(query: any): { page: number; limit: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  return { page, limit };
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Sleep utility for testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

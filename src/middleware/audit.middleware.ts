import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import database from '../config/database';
import logger from '../utils/logger';
import config from '../config/environment';

/**
 * Audit logging middleware for HIPAA compliance
 */
export async function auditLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip audit logging if disabled
  if (!config.hipaa.enableAuditLogging) {
    next();
    return;
  }

  // Capture original json method
  const originalJson = res.json;

  // Override json method to log after response
  res.json = function (body: any): Response {
    // Only log successful operations
    if (body.success) {
      // Determine action from method
      let action = 'READ';
      if (req.method === 'POST') action = 'CREATE';
      else if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
      else if (req.method === 'DELETE') action = 'DELETE';

      // Extract resource from path
      const resource = extractResourceFromPath(req.path);
      const resourceId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) ?? null;

      // Log to audit_logs table
      logAudit(
        req.userId || null,
        action,
        resource,
        resourceId,
        req.ip || '',
        req.get('user-agent') || ''
      );
    }

    // Call original json method
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Extract resource name from request path
 */
function extractResourceFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean);

  // Remove 'api' from path parts
  const filtered = parts.filter(p => p !== 'api');

  // Get the resource name (usually first part after /api/)
  return filtered[0] || 'unknown';
}

/**
 * Log audit entry to database
 */
async function logAudit(
  userId: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  try {
    await database.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, resource, resourceId, ipAddress, userAgent]
    );
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    logger.error('Failed to write audit log', {
      error,
      userId,
      action,
      resource,
      resourceId,
    });
  }
}

/**
 * Cleanup old audit logs (HIPAA requires 7-year retention)
 * This should be run periodically (e.g., daily cron job)
 */
export async function cleanupOldAuditLogs(): Promise<void> {
  try {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - config.hipaa.auditLogRetentionDays);

    const result = await database.query(
      'DELETE FROM audit_logs WHERE timestamp < $1',
      [retentionDate]
    );

    logger.info(`Cleaned up ${result.rowCount} old audit logs`);
  } catch (error) {
    logger.error('Failed to cleanup audit logs', error);
  }
}

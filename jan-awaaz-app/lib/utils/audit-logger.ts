/**
 * Audit Logging Utility
 * Logs all critical operations for compliance and security
 */

import { SessionData } from '../types';

/**
 * Audit event types
 */
export enum AuditEventType {
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_ACCESSED = 'SESSION_ACCESSED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_ARCHIVED = 'SESSION_ARCHIVED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  SCHEME_QUERIED = 'SCHEME_QUERIED',
  SCHEME_MATCHED = 'SCHEME_MATCHED',
  REFERRAL_CARD_GENERATED = 'REFERRAL_CARD_GENERATED',
  REFERRAL_CARD_ACCESSED = 'REFERRAL_CARD_ACCESSED',
  VOICE_TRANSCRIBED = 'VOICE_TRANSCRIBED',
  VOICE_SYNTHESIZED = 'VOICE_SYNTHESIZED',
  LOCATION_QUERIED = 'LOCATION_QUERIED',
  API_KEY_USED = 'API_KEY_USED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  userId?: string; // Hashed phone number
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE';
  details?: Record<string, any>;
  metadata?: {
    language?: string;
    location?: string;
    deviceType?: string;
  };
}

/**
 * Log audit event
 */
export function logAuditEvent(
  eventType: AuditEventType,
  action: string,
  result: 'SUCCESS' | 'FAILURE',
  options?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    resourceId?: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
  }
): AuditLogEntry {
  const logEntry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: options?.userId,
    sessionId: options?.sessionId,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    action,
    resource: options?.resource,
    resourceId: options?.resourceId,
    result,
    details: sanitizeDetails(options?.details),
    metadata: options?.metadata,
  };

  // Log to console (CloudWatch will capture this)
  console.log('[AUDIT]', JSON.stringify(logEntry));

  // In production, you would also:
  // 1. Send to CloudWatch Logs with specific log group
  // 2. Store in DynamoDB audit table
  // 3. Send to S3 for long-term retention
  // storeAuditLog(logEntry);

  return logEntry;
}

/**
 * Sanitize sensitive data from audit logs
 */
function sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
  if (!details) return undefined;

  const sanitized = { ...details };

  // Remove or mask sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'aadhaarNumber',
    'phoneNumber',
    'creditCard',
  ];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Mask Aadhaar numbers if present in nested objects
  if (sanitized.aadhaar) {
    sanitized.aadhaar = maskAadhaar(sanitized.aadhaar);
  }

  return sanitized;
}

/**
 * Mask Aadhaar number (show only last 4 digits)
 */
function maskAadhaar(aadhaar: string): string {
  if (aadhaar.length !== 12) return '****-****-****';
  return `****-****-${aadhaar.substring(8)}`;
}

/**
 * Log session operation
 */
export function logSessionOperation(
  eventType: AuditEventType,
  sessionData: Partial<SessionData>,
  result: 'SUCCESS' | 'FAILURE',
  details?: Record<string, any>
) {
  return logAuditEvent(
    eventType,
    `Session ${eventType.toLowerCase()}`,
    result,
    {
      userId: sessionData.phoneNumber,
      sessionId: sessionData.sessionId,
      resource: 'Session',
      resourceId: sessionData.sessionId,
      details,
      metadata: {
        language: sessionData.language,
        currentStep: sessionData.currentStep,
      },
    }
  );
}

/**
 * Log document operation
 */
export function logDocumentOperation(
  eventType: AuditEventType,
  documentId: string,
  sessionId: string,
  result: 'SUCCESS' | 'FAILURE',
  details?: Record<string, any>
) {
  return logAuditEvent(
    eventType,
    `Document ${eventType.toLowerCase()}`,
    result,
    {
      sessionId,
      resource: 'Document',
      resourceId: documentId,
      details,
    }
  );
}

/**
 * Log scheme query operation
 */
export function logSchemeOperation(
  eventType: AuditEventType,
  sessionId: string,
  result: 'SUCCESS' | 'FAILURE',
  details?: Record<string, any>
) {
  return logAuditEvent(
    eventType,
    `Scheme ${eventType.toLowerCase()}`,
    result,
    {
      sessionId,
      resource: 'Scheme',
      details,
    }
  );
}

/**
 * Log referral card operation
 */
export function logReferralCardOperation(
  eventType: AuditEventType,
  cardId: string,
  sessionId: string,
  result: 'SUCCESS' | 'FAILURE',
  details?: Record<string, any>
) {
  return logAuditEvent(
    eventType,
    `Referral card ${eventType.toLowerCase()}`,
    result,
    {
      sessionId,
      resource: 'ReferralCard',
      resourceId: cardId,
      details,
    }
  );
}

/**
 * Log authentication event
 */
export function logAuthenticationEvent(
  result: 'SUCCESS' | 'FAILURE',
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, any>
) {
  return logAuditEvent(
    AuditEventType.AUTHENTICATION_FAILED,
    'Authentication attempt',
    result,
    {
      ipAddress,
      userAgent,
      resource: 'Authentication',
      details,
    }
  );
}

/**
 * Log rate limit event
 */
export function logRateLimitEvent(
  userId: string,
  ipAddress?: string,
  details?: Record<string, any>
) {
  return logAuditEvent(
    AuditEventType.RATE_LIMIT_EXCEEDED,
    'Rate limit exceeded',
    'FAILURE',
    {
      userId,
      ipAddress,
      resource: 'RateLimit',
      details,
    }
  );
}

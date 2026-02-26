/**
 * Comprehensive Error Handling and Logging
 * Centralized error handling with session context and CloudWatch integration
 */

import { SessionData } from '../types';

/**
 * Error types for categorization
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  AWS_SERVICE_ERROR = 'AWS_SERVICE_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Structured error log entry
 */
export interface ErrorLogEntry {
  timestamp: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  sessionContext?: {
    sessionId?: string;
    phoneNumber?: string;
    language?: string;
    currentStep?: string;
  };
  technicalDetails?: any;
  stackTrace?: string;
}

/**
 * Application error class with user-friendly messages
 */
export class AppError extends Error {
  public readonly errorType: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly technicalDetails?: any;

  constructor(
    errorType: ErrorType,
    message: string,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    technicalDetails?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.errorType = errorType;
    this.severity = severity;
    this.userMessage = userMessage;
    this.technicalDetails = technicalDetails;
  }
}

/**
 * Log error with session context
 */
export function logError(
  error: Error | AppError,
  sessionContext?: Partial<SessionData>
): ErrorLogEntry {
  const isAppError = error instanceof AppError;
  
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    errorType: isAppError ? error.errorType : ErrorType.UNKNOWN_ERROR,
    severity: isAppError ? error.severity : ErrorSeverity.MEDIUM,
    message: error.message,
    userMessage: isAppError ? error.userMessage : 'An unexpected error occurred. Please try again.',
    sessionContext: sessionContext ? {
      sessionId: sessionContext.sessionId,
      phoneNumber: maskPhoneNumber(sessionContext.phoneNumber),
      language: sessionContext.language,
      currentStep: sessionContext.currentStep,
    } : undefined,
    technicalDetails: isAppError ? error.technicalDetails : undefined,
    stackTrace: error.stack,
  };

  // Log to console (CloudWatch will capture this)
  console.error(JSON.stringify(logEntry, null, 2));

  // In production, you would also send to CloudWatch Metrics
  // sendMetricToCloudWatch(logEntry);

  return logEntry;
}

/**
 * Mask phone number for privacy in logs
 */
function maskPhoneNumber(phoneNumber?: string): string {
  if (!phoneNumber) return 'N/A';
  if (phoneNumber.length < 4) return '****';
  return phoneNumber.substring(0, 2) + '****' + phoneNumber.substring(phoneNumber.length - 2);
}

/**
 * Handle AWS service errors
 */
export function handleAWSError(error: any, serviceName: string): AppError {
  const errorCode = error.name || error.code || 'Unknown';
  
  // Map AWS error codes to user-friendly messages
  const userMessages: Record<string, string> = {
    'ThrottlingException': 'Service is busy. Please try again in a moment.',
    'ServiceUnavailable': 'Service temporarily unavailable. Please try again.',
    'AccessDeniedException': 'Access denied. Please contact support.',
    'ResourceNotFoundException': 'Resource not found. Please try again.',
    'ValidationException': 'Invalid input. Please check your data.',
  };

  const userMessage = userMessages[errorCode] || 'Service error. Please try again.';

  return new AppError(
    ErrorType.AWS_SERVICE_ERROR,
    `${serviceName} error: ${errorCode}`,
    userMessage,
    ErrorSeverity.HIGH,
    { serviceName, errorCode, originalError: error.message }
  );
}

/**
 * Handle network errors with retry logic
 */
export function handleNetworkError(error: any, attemptNumber: number = 1): AppError {
  const maxRetries = 3;
  const shouldRetry = attemptNumber < maxRetries;

  return new AppError(
    ErrorType.NETWORK_ERROR,
    `Network error on attempt ${attemptNumber}`,
    shouldRetry 
      ? 'Network issue detected. Retrying...'
      : 'Network error. Please check your connection and try again.',
    ErrorSeverity.MEDIUM,
    { attemptNumber, maxRetries, shouldRetry }
  );
}

/**
 * Handle validation errors
 */
export function handleValidationError(field: string, reason: string): AppError {
  return new AppError(
    ErrorType.VALIDATION_ERROR,
    `Validation failed for ${field}: ${reason}`,
    `Invalid ${field}. ${reason}`,
    ErrorSeverity.LOW,
    { field, reason }
  );
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  sessionContext?: Partial<SessionData>
): Promise<T> {
  return fn().catch((error) => {
    logError(error, sessionContext);
    throw error;
  });
}

/**
 * Create user-friendly error response
 */
export function createErrorResponse(error: Error | AppError, statusCode: number = 500) {
  const isAppError = error instanceof AppError;

  return {
    error: true,
    message: isAppError ? error.userMessage : 'An unexpected error occurred. Please try again.',
    errorType: isAppError ? error.errorType : ErrorType.UNKNOWN_ERROR,
    statusCode,
    // Don't include technical details or stack traces in production
    ...(process.env.NODE_ENV === 'development' && {
      technicalDetails: isAppError ? error.technicalDetails : undefined,
      stack: error.stack,
    }),
  };
}

/**
 * Session Management Service
 * Handles CRUD operations for user sessions in DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  SessionData,
  SessionState,
  PendingAction,
  Language,
} from '../types';
import { awsConfig, dynamoDbConfig } from './config';
import { hashPhoneNumber } from '../utils/validation';

// Initialize DynamoDB client
const client = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Get or create a session for a phone number
 * If session exists, return it. Otherwise, create a new one.
 */
export async function getOrCreateSession(
  phoneNumber: string,
  language: Language
): Promise<SessionData> {
  // Hash phone number for storage
  const hashedPhone = await hashPhoneNumber(phoneNumber);

  // Try to get existing active session
  const existingSession = await getActiveSession(hashedPhone);

  if (existingSession) {
    // Update last accessed time
    await updateLastAccessedTime(existingSession.sessionId, hashedPhone);
    return existingSession;
  }

  // Create new session
  const sessionId = uuidv4();
  const now = new Date();
  const ttl = Math.floor(now.getTime() / 1000) + (30 * 24 * 60 * 60); // 30 days from now

  const newSession: SessionData = {
    sessionId,
    phoneNumber: hashedPhone,
    language,
    createdAt: now.toISOString(),
    lastAccessedAt: now.toISOString(),
    currentStep: 'LANGUAGE_SELECTION',
    status: 'ACTIVE',
    userStory: '',
    location: { latitude: 0, longitude: 0 },
    schemeMatches: [],
    documents: [],
    pendingActions: [],
    referralCards: [],
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Item: newSession,
    })
  );

  return newSession;
}

/**
 * Get active session for a phone number
 */
async function getActiveSession(hashedPhone: string): Promise<SessionData | null> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: dynamoDbConfig.sessionsTable,
      KeyConditionExpression: 'phoneNumber = :phone',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':phone': hashedPhone,
        ':status': 'ACTIVE',
      },
      ScanIndexForward: false, // Get most recent first
      Limit: 1,
    })
  );

  if (response.Items && response.Items.length > 0) {
    return response.Items[0] as SessionData;
  }

  return null;
}

/**
 * Recursively convert all Date objects to ISO strings for DynamoDB
 */
function convertDatesToStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToStrings(item));
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertDatesToStrings(obj[key]);
      }
    }
    return converted;
  }
  
  return obj;
}

/**
 * Update session with partial data
 */
export async function updateSession(
  sessionId: string,
  phoneNumber: string,
  updates: Partial<SessionData>
): Promise<void> {
  const hashedPhone = await hashPhoneNumber(phoneNumber);

  // Convert all Date objects to ISO strings
  const cleanedUpdates = convertDatesToStrings(updates);

  // Log what we're updating
  if (cleanedUpdates.schemeMatches) {
    console.log('Updating session with schemes:', cleanedUpdates.schemeMatches.map((s: any) => s.schemeName));
  }

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  let index = 0;
  for (const [key, value] of Object.entries(cleanedUpdates)) {
    if (key !== 'sessionId' && key !== 'phoneNumber' && value !== undefined) {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
      index++;
    }
  }

  // Always update lastAccessedAt
  updateExpressions.push(`#lastAccessed = :lastAccessed`);
  expressionAttributeNames['#lastAccessed'] = 'lastAccessedAt';
  expressionAttributeValues[':lastAccessed'] = Date.now();

  // Skip update if no expressions (shouldn't happen, but safety check)
  if (updateExpressions.length === 0) {
    console.warn('No update expressions generated');
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Key: {
        phoneNumber: hashedPhone,
        sessionId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

/**
 * Get pending actions for a session
 */
export async function getPendingActions(
  sessionId: string,
  phoneNumber: string
): Promise<PendingAction[]> {
  const hashedPhone = await hashPhoneNumber(phoneNumber);

  const response = await docClient.send(
    new GetCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Key: {
        phoneNumber: hashedPhone,
        sessionId,
      },
      ProjectionExpression: 'pendingActions',
    })
  );

  return (response.Item?.pendingActions as PendingAction[]) || [];
}

/**
 * Archive a session (change status to ARCHIVED)
 */
export async function archiveSession(
  sessionId: string,
  phoneNumber: string
): Promise<void> {
  const hashedPhone = await hashPhoneNumber(phoneNumber);

  await docClient.send(
    new UpdateCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Key: {
        phoneNumber: hashedPhone,
        sessionId,
      },
      UpdateExpression: 'SET #status = :status, lastAccessedAt = :lastAccessed',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'ARCHIVED',
        ':lastAccessed': Date.now(),
      },
    })
  );
}

/**
 * Update last accessed time for a session
 */
async function updateLastAccessedTime(
  sessionId: string,
  hashedPhone: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Key: {
        phoneNumber: hashedPhone,
        sessionId,
      },
      UpdateExpression: 'SET lastAccessedAt = :lastAccessed',
      ExpressionAttributeValues: {
        ':lastAccessed': Date.now(),
      },
    })
  );
}

/**
 * Get session by ID (for internal use)
 */
export async function getSessionById(
  sessionId: string,
  phoneNumber: string
): Promise<SessionData | null> {
  const hashedPhone = await hashPhoneNumber(phoneNumber);

  const response = await docClient.send(
    new GetCommand({
      TableName: dynamoDbConfig.sessionsTable,
      Key: {
        phoneNumber: hashedPhone,
        sessionId,
      },
    })
  );

  return (response.Item as SessionData) || null;
}

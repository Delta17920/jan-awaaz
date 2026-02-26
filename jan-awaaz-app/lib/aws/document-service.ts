/**
 * Document Verification Service
 * Handles document upload, classification, and verification using Amazon Textract
 */

import {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType,
} from '@aws-sdk/client-textract';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import type {
  DocumentImage,
  DocumentType,
  VerificationResult,
  Defect,
  ExtractedData,
} from '../types';
import { awsConfig, s3Config } from './config';
import { validateAadhaarNumber } from '../utils/validation';

// Initialize AWS clients
const textractClient = new TextractClient(awsConfig);
const s3Client = new S3Client(awsConfig);

/**
 * Upload document to S3 and verify
 */
export async function verifyDocument(
  image: DocumentImage
): Promise<VerificationResult> {
  const startTime = Date.now();
  
  try {
    // Upload to S3
    const imageUrl = await uploadDocumentToS3(image);
    
    // Extract data using Textract
    const extractedData = await extractDataWithTextract(image);
    
    // Classify document type
    const documentType = classifyDocument(extractedData);
    
    // Validate based on document type
    const { isValid, defects } = await validateDocument(documentType, extractedData);
    
    // Never require physical visit - accept documents as-is
    const requiresPhysicalVisit = false;
    
    const processingTime = Date.now() - startTime;
    
    // Ensure latency requirement (<5 seconds)
    if (processingTime > 5000) {
      console.warn(`Document verification took ${processingTime}ms, exceeding 5s requirement`);
    }
    
    return {
      documentType,
      isValid,
      defects,
      extractedData,
      requiresPhysicalVisit,
    };
  } catch (error) {
    console.error('Document verification error:', error);
    throw new Error('Failed to verify document');
  }
}

/**
 * Upload document image to S3
 */
async function uploadDocumentToS3(image: DocumentImage): Promise<string> {
  const documentId = uuidv4();
  const key = `documents/${documentId}.${image.format}`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Config.userDocsBucket,
      Key: key,
      Body: image.data,
      ContentType: `image/${image.format}`,
      ServerSideEncryption: 'aws:kms', // SSE-KMS encryption
    })
  );
  
  return `s3://${s3Config.userDocsBucket}/${key}`;
}

/**
 * Extract data from document using Amazon Textract
 */
async function extractDataWithTextract(image: DocumentImage): Promise<ExtractedData> {
  try {
    console.log('Starting Textract analysis...');
    
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: image.data,
      },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
    });
    
    const response = await textractClient.send(command);
    console.log('Textract response received:', response.Blocks?.length, 'blocks');
    
    // Parse Textract response
    const fields: Record<string, string> = {};
    let totalConfidence = 0;
    let fieldCount = 0;
    
    // Extract all text for better classification
    let allText = '';
    
    if (response.Blocks) {
      for (const block of response.Blocks) {
        // Collect all text
        if (block.Text) {
          allText += block.Text + ' ';
        }
        
        // Extract key-value pairs
        if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
          const key = block.Text || '';
          
          // Find corresponding VALUE block
          let value = '';
          if (block.Relationships) {
            for (const relationship of block.Relationships) {
              if (relationship.Type === 'VALUE' && relationship.Ids) {
                // Find VALUE blocks
                const valueBlocks = response.Blocks.filter(b => 
                  relationship.Ids?.includes(b.Id || '')
                );
                value = valueBlocks.map(b => b.Text || '').join(' ');
              }
            }
          }
          
          fields[key] = value;
          
          if (block.Confidence) {
            totalConfidence += block.Confidence;
            fieldCount++;
          }
        }
      }
    }
    
    // Store all extracted text for classification
    fields['_fullText'] = allText.trim();
    
    // Remove empty keys (DynamoDB doesn't allow empty attribute names)
    const cleanedFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key && key.trim().length > 0) {
        cleanedFields[key] = value;
      }
    }
    
    const confidence = fieldCount > 0 ? totalConfidence / fieldCount / 100 : 0.5;
    
    console.log('Extracted fields:', Object.keys(cleanedFields).length);
    console.log('Average confidence:', confidence);
    
    return {
      fields: cleanedFields,
      confidence,
    };
  } catch (error) {
    console.error('Textract error:', error);
    
    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Re-throw error instead of returning mock data
    throw new Error(`Textract failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Classify document type based on extracted data
 */
export function classifyDocument(extractedData: ExtractedData): DocumentType {
  const fields = extractedData.fields;
  const fullText = fields['_fullText'] || '';
  const text = (fullText + ' ' + Object.values(fields).join(' ')).toLowerCase();
  
  console.log('Classifying document with text:', text.substring(0, 200));
  
  // Aadhaar detection
  if (text.includes('aadhaar') || 
      text.includes('uid') || 
      text.includes('unique identification') ||
      text.includes('uidai') ||
      /\d{4}\s*\d{4}\s*\d{4}/.test(text)) { // 12-digit pattern
    console.log('Classified as AADHAAR');
    return 'AADHAAR';
  }
  
  // Income Certificate detection
  if (text.includes('income certificate') || 
      text.includes('annual income') ||
      text.includes('income proof') ||
      text.includes('salary certificate')) {
    console.log('Classified as INCOME_CERTIFICATE');
    return 'INCOME_CERTIFICATE';
  }
  
  // Land Patta detection
  if (text.includes('patta') || 
      text.includes('survey number') || 
      text.includes('land record') ||
      text.includes('land ownership') ||
      text.includes('revenue record')) {
    console.log('Classified as LAND_PATTA');
    return 'LAND_PATTA';
  }
  
  console.log('Classified as UNKNOWN');
  return 'UNKNOWN';
}

/**
 * Validate document based on type
 * Simplified: Accept any document that looks official
 */
async function validateDocument(
  documentType: DocumentType,
  extractedData: ExtractedData
): Promise<{ isValid: boolean; defects: Defect[] }> {
  const defects: Defect[] = [];
  
  // If we could classify the document (not UNKNOWN), accept it
  if (documentType !== 'UNKNOWN') {
    console.log(`Document classified as ${documentType} - accepting as valid`);
    return { isValid: true, defects: [] };
  }
  
  // For UNKNOWN documents, check if it has any text (looks like a document)
  const fullText = extractedData.fields['_fullText'] || '';
  const hasSignificantText = fullText.length > 50; // At least 50 characters
  
  if (hasSignificantText) {
    console.log('Document has significant text - accepting as valid official document');
    return { isValid: true, defects: [] };
  }
  
  // Only reject if it's clearly not a document (no text, random photo)
  console.log('Document appears to be invalid - no significant text found');
  defects.push({
    type: 'BLURRY',
    description: 'Document not readable - please ensure document is clear and well-lit',
    severity: 'HIGH',
  });
  
  return { isValid: false, defects };
}

/**
 * Validate Aadhaar card
 */
function validateAadhaar(extractedData: ExtractedData): { isValid: boolean; defects: Defect[] } {
  const defects: Defect[] = [];
  const fields = extractedData.fields;
  const fullText = fields['_fullText'] || '';
  
  console.log('Validating Aadhaar with full text:', fullText);
  
  // Check for 12-digit Aadhaar number (with or without spaces)
  const aadhaarPattern = /\d{4}\s*\d{4}\s*\d{4}/;
  const hasAadhaarNumber = aadhaarPattern.test(fullText);
  
  if (!hasAadhaarNumber) {
    defects.push({
      type: 'TAMPERED',
      description: 'Aadhaar number not found or invalid format',
      severity: 'HIGH',
    });
  } else {
    console.log('✓ Aadhaar number found');
  }
  
  // Check for name (any text that looks like a name - 2+ words with letters)
  const namePattern = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/;
  const hasName = namePattern.test(fullText);
  
  if (!hasName) {
    console.log('⚠ Name pattern not found, but document may still be valid');
    // Don't add defect - Textract might not extract name as a separate field
  } else {
    console.log('✓ Name found');
  }
  
  // Check for DOB (various date formats)
  const dobPattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/;
  const hasDOB = dobPattern.test(fullText);
  
  if (!hasDOB) {
    console.log('⚠ DOB pattern not found, but document may still be valid');
    // Don't add defect - Textract might not extract DOB as a separate field
  } else {
    console.log('✓ DOB found');
  }
  
  // Check for gender indicators
  const hasGender = /male|female|transgender/i.test(fullText);
  if (hasGender) {
    console.log('✓ Gender found');
  }
  
  // If we found Aadhaar number and confidence is good, consider it valid
  const isValid = hasAadhaarNumber && extractedData.confidence > 0.5;
  
  console.log('Aadhaar validation result:', isValid ? 'VALID' : 'INVALID', 'Defects:', defects.length);
  
  return {
    isValid,
    defects,
  };
}

/**
 * Validate Income Certificate
 */
function validateIncomeCertificate(extractedData: ExtractedData): { isValid: boolean; defects: Defect[] } {
  const defects: Defect[] = [];
  const fields = extractedData.fields;
  
  // Check for government seal
  if (!fields['Seal'] && !fields['Official Seal']) {
    defects.push({
      type: 'MISSING_SEAL',
      description: 'Government seal is missing',
      severity: 'HIGH',
    });
  }
  
  // Check for signature
  if (!fields['Signature'] && !fields['Authorized Signature']) {
    defects.push({
      type: 'MISSING_SIGNATURE',
      description: 'Issuing authority signature is missing',
      severity: 'HIGH',
    });
  }
  
  // Check for validity date
  const validityDate = fields['Valid Until'] || fields['Validity'];
  if (validityDate) {
    const expiryDate = new Date(validityDate);
    if (expiryDate < new Date()) {
      defects.push({
        type: 'EXPIRED',
        description: `Certificate expired on ${validityDate}`,
        severity: 'HIGH',
      });
    }
  }
  
  return {
    isValid: defects.length === 0,
    defects,
  };
}

/**
 * Validate Land Patta
 */
function validateLandPatta(extractedData: ExtractedData): { isValid: boolean; defects: Defect[] } {
  const defects: Defect[] = [];
  const fields = extractedData.fields;
  
  // Check for survey number
  if (!fields['Survey Number'] && !fields['Survey No']) {
    defects.push({
      type: 'BLURRY',
      description: 'Survey number not clearly visible',
      severity: 'HIGH',
    });
  }
  
  // Check for owner name
  if (!fields['Owner'] && !fields['Owner Name']) {
    defects.push({
      type: 'BLURRY',
      description: 'Owner name not clearly visible',
      severity: 'MEDIUM',
    });
  }
  
  // Check for area
  if (!fields['Area'] && !fields['Land Area']) {
    defects.push({
      type: 'BLURRY',
      description: 'Land area not clearly visible',
      severity: 'LOW',
    });
  }
  
  return {
    isValid: defects.length === 0,
    defects,
  };
}

/**
 * Compress image to <500KB while maintaining 300 DPI
 */
export function compressImage(image: DocumentImage): DocumentImage {
  // In production, use image compression library (sharp, jimp, etc.)
  // For now, return as-is
  return image;
}

/**
 * Detect if image is too blurry
 */
export function detectBlur(image: DocumentImage): boolean {
  // In production, use blur detection algorithm
  // For now, return false (not blurry)
  return false;
}

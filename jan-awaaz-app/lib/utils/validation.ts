/**
 * Validation utilities for Jan-Awaaz data models
 */

import type { Language, DocumentType, OfficeType, SessionStatus, GPSCoordinates } from '../types';

// ============================================================================
// Type Guards
// ============================================================================

export function isLanguage(value: string): value is Language {
  const validLanguages: Language[] = [
    'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN',
    'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'or-IN'
  ];
  return validLanguages.includes(value as Language);
}

export function isDocumentType(value: string): value is DocumentType {
  const validTypes: DocumentType[] = ['AADHAAR', 'INCOME_CERTIFICATE', 'LAND_PATTA', 'UNKNOWN'];
  return validTypes.includes(value as DocumentType);
}

export function isOfficeType(value: string): value is OfficeType {
  const validTypes: OfficeType[] = ['CSC', 'PANCHAYAT', 'DISTRICT_OFFICE', 'TALUK_OFFICE'];
  return validTypes.includes(value as OfficeType);
}

export function isSessionStatus(value: string): value is SessionStatus {
  const validStatuses: SessionStatus[] = ['ACTIVE', 'PENDING_ACTION', 'COMPLETED', 'ARCHIVED'];
  return validStatuses.includes(value as SessionStatus);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Indian phone number format (10 digits)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Validate Aadhaar number format (12 digits)
 */
export function validateAadhaarNumber(aadhaar: string): boolean {
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(aadhaar);
}

/**
 * Validate GPS coordinates (within India bounding box)
 */
export function validateGPSCoordinates(coords: GPSCoordinates): boolean {
  const { latitude, longitude } = coords;
  
  // India bounding box (approximate)
  const indiaBounds = {
    minLat: 6.0,
    maxLat: 37.0,
    minLon: 68.0,
    maxLon: 98.0
  };
  
  return (
    latitude >= indiaBounds.minLat &&
    latitude <= indiaBounds.maxLat &&
    longitude >= indiaBounds.minLon &&
    longitude <= indiaBounds.maxLon
  );
}

/**
 * Validate image file format
 */
export function validateImageFormat(format: string): format is 'jpg' | 'png' {
  return format === 'jpg' || format === 'png';
}

/**
 * Validate audio file format
 */
export function validateAudioFormat(format: string): format is 'wav' | 'mp3' | 'ogg' {
  return format === 'wav' || format === 'mp3' || format === 'ogg';
}

/**
 * Validate image size (should be < 500KB for compression requirement)
 */
export function validateImageSize(sizeInBytes: number): boolean {
  const maxSizeKB = 500;
  const maxSizeBytes = maxSizeKB * 1024;
  return sizeInBytes <= maxSizeBytes;
}

/**
 * Mask Aadhaar number for logging (XXXX-XXXX-1234)
 */
export function maskAadhaarNumber(aadhaar: string): string {
  if (!validateAadhaarNumber(aadhaar)) {
    return aadhaar;
  }
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

/**
 * Hash phone number for storage (SHA-256)
 */
export async function hashPhoneNumber(phoneNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phoneNumber);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Indian pincode format (6 digits)
 */
export function validatePincode(pincode: string): boolean {
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode);
}

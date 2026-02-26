/**
 * Core Type Definitions for Jan-Awaaz
 * Based on design.md data models
 */

// ============================================================================
// Enums
// ============================================================================

export type Language =
  | 'hi-IN' // Hindi
  | 'ta-IN' // Tamil
  | 'te-IN' // Telugu
  | 'kn-IN' // Kannada
  | 'ml-IN' // Malayalam
  | 'mr-IN' // Marathi
  | 'bn-IN' // Bengali
  | 'gu-IN' // Gujarati
  | 'pa-IN' // Punjabi
  | 'or-IN'; // Odia

export type DocumentType =
  | 'AADHAAR'
  | 'INCOME_CERTIFICATE'
  | 'LAND_PATTA'
  | 'UNKNOWN';

export type OfficeType =
  | 'CSC'
  | 'PANCHAYAT'
  | 'DISTRICT_OFFICE'
  | 'TALUK_OFFICE';

export type SessionStatus =
  | 'ACTIVE'
  | 'PENDING_ACTION'
  | 'COMPLETED'
  | 'ARCHIVED';

export type WorkflowStep =
  | 'LANGUAGE_SELECTION'
  | 'PHONE_NUMBER_CAPTURE'
  | 'VOICE_INPUT'
  | 'SCHEME_MATCHING'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VERIFICATION'
  | 'OFFICE_ROUTING'
  | 'REFERRAL_GENERATION'
  | 'COMPLETED';

export type DefectType =
  | 'MISSING_SEAL'
  | 'MISSING_SIGNATURE'
  | 'EXPIRED'
  | 'BLURRY'
  | 'TAMPERED';

export type DefectSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type SchemeCategory =
  | 'PENSION'
  | 'AGRICULTURE'
  | 'EDUCATION'
  | 'HEALTH'
  | 'HOUSING'
  | 'EMPLOYMENT'
  | 'WOMEN_WELFARE'
  | 'DISABILITY'
  | 'OTHER';

export type ApplicationProcessType = 'ONLINE' | 'PHYSICAL' | 'HYBRID';

export type BenefitType = 'MONETARY' | 'SUBSIDY' | 'SERVICE' | 'CERTIFICATE';

export type BenefitFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export type PendingActionType =
  | 'GET_STAMP'
  | 'RENEW_DOCUMENT'
  | 'VISIT_OFFICE'
  | 'UPLOAD_DOCUMENT';

export type IconType = 'GREEN_CHECK' | 'RED_CROSS' | 'YELLOW_WARNING' | 'BLUE_INFO';

// ============================================================================
// Audio and Voice Processing
// ============================================================================

export interface AudioStream {
  data: Buffer;
  format: 'wav' | 'mp3' | 'ogg';
  sampleRate: number;
}

export interface TranscribedText {
  text: string;
  confidence: number;
  language: Language;
  timestamp: Date;
}

// ============================================================================
// Document Processing
// ============================================================================

export interface DocumentImage {
  data: Buffer;
  format: 'jpg' | 'png';
  size: number;
  captureTimestamp: Date;
}

export interface Defect {
  type: DefectType;
  description: string;
  severity: DefectSeverity;
}

export interface ExtractedData {
  fields: Record<string, string>;
  confidence: number;
}

export interface VerificationResult {
  documentType: DocumentType;
  isValid: boolean;
  defects: Defect[];
  extractedData: ExtractedData;
  requiresPhysicalVisit: boolean;
}

export interface DocumentVerification {
  verificationId: string;
  documentType: DocumentType;
  uploadedAt: Date;
  imageUrl: string;
  extractedData: Record<string, string>;
  confidence: number;
  isValid: boolean;
  defects: Defect[];
  requiresPhysicalVisit: boolean;
  processingTimeMs: number;
  textractJobId: string;
}

// ============================================================================
// Scheme Matching
// ============================================================================

export interface EligibilityCriterion {
  criterion: string;
  isMandatory: boolean;
  verificationMethod: 'DOCUMENT' | 'DECLARATION' | 'FIELD_VISIT';
}

export interface DocumentRequirement {
  documentType: DocumentType;
  isMandatory: boolean;
  validityPeriodMonths?: number;
  specificRequirements: string[];
}

export interface Benefit {
  benefitType: BenefitType;
  amount?: number;
  frequency?: BenefitFrequency;
  description: string;
}

export interface ApplicationProcess {
  type: ApplicationProcessType;
  steps: string[];
  estimatedTime: string;
  fees: number;
}

export interface ContactInfo {
  helplineNumber: string;
  email?: string;
  websiteUrl?: string;
}

export interface SchemeMatch {
  schemeId: string;
  schemeName: string;
  relevanceScore: number;
  eligibilityCriteria: string[];
  requiredDocuments: DocumentType[];
  applicationProcess: ApplicationProcess;
  sourceDocument: string;
}

export interface SchemeMatchData {
  schemeId: string;
  schemeName: string;
  category: SchemeCategory;
  state: string;
  relevanceScore: number;
  matchedKeywords: string[];
  sourceDocument: string;
  sourcePageNumbers: number[];
  description: string;
  eligibilityCriteria: EligibilityCriterion[];
  requiredDocuments: DocumentRequirement[];
  benefits: Benefit[];
  applicationProcess: ApplicationProcess;
  estimatedProcessingDays: number;
  applicationFees: number;
  helplineNumber: string;
  websiteUrl?: string;
}

export interface SchemeDetails {
  schemeId: string;
  schemeName: string;
  description: string;
  eligibility: string[];
  benefits: string[];
  documents: DocumentType[];
  applicationProcess: ApplicationProcess;
  contactInfo: ContactInfo;
}

// ============================================================================
// Location and Office
// ============================================================================

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  line1: string;
  line2?: string;
  village?: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
}

export interface WorkingHours {
  openTime: string;  // "09:00"
  closeTime: string; // "17:00"
  lunchBreak?: { start: string; end: string };
}

export interface Office {
  officeId: string;
  name: string;
  type: OfficeType;
  location: GPSCoordinates;
  address: string;
  contactNumber: string;
  workingHours: string;
  distanceKm: number;
}

export interface OfficeLocation {
  officeId: string;
  name: string;
  type: OfficeType;
  location: GPSCoordinates;
  address: Address;
  contactNumber: string;
  email?: string;
  workingHours: WorkingHours;
  workingDays: string[];
  holidays: Date[];
  supportedSchemes: string[];
  hasOnlineSubmission: boolean;
  hasDocumentScanning: boolean;
  lastUpdated: Date;
  isActive: boolean;
}

export interface Directions {
  distanceKm: number;
  estimatedTimeMinutes: number;
  steps: string[];
  mapUrl: string;
}

// ============================================================================
// Referral Card
// ============================================================================

export interface DocumentStatus {
  documentType: DocumentType;
  status: 'VALID' | 'INVALID' | 'MISSING' | 'EXPIRED';
  icon: IconType;
  message: string;
}

export interface ReferralCard {
  cardId: string;
  referenceNumber: string;
  timestamp: Date;
  phoneNumber: string;
  schemeName: string;
  eligibilityStatus: 'ELIGIBLE' | 'PENDING_DOCS' | 'NEEDS_CORRECTION';
  requiredDocuments: DocumentStatus[];
  officeDetails: Office;
  qrCode: string;
  imageUrl: string;
}

// ============================================================================
// Session Management
// ============================================================================

export interface PendingAction {
  actionType: PendingActionType;
  description: string;
  dueDate?: Date;
  contextualPrompt: string;
}

export interface SessionState {
  currentStep: WorkflowStep;
  schemeMatches: SchemeMatch[];
  documentVerifications: VerificationResult[];
  referralCards: ReferralCard[];
  pendingActions: PendingAction[];
  status: SessionStatus;
}

export interface Session {
  sessionId: string;
  phoneNumber: string;
  language: Language;
  createdAt: Date | string;
  lastAccessedAt: Date | string;
  state: SessionState;
}

export interface SessionData {
  sessionId: string;
  phoneNumber: string;
  language: Language;
  createdAt: Date | string;
  lastAccessedAt: Date | string;
  currentStep: WorkflowStep;
  status: SessionStatus;
  userStory: string;
  location: GPSCoordinates;
  schemeMatches: SchemeMatch[];
  selectedScheme?: SchemeMatch;
  documents: DocumentVerification[];
  pendingActions: PendingAction[];
  referralCards: ReferralCard[];
  recommendedOffice?: Office;
  conversationHistory?: any[]; // Bedrock conversation history
  lastMessage?: string; // Last user message
  cscCenterInfo?: { // CSC center information from chat
    name: string;
    address: string;
    phone: string;
  };
  // Document tracking for multiple uploads
  documentsRequired?: number;           // Total documents needed
  documentsUploaded?: number;           // How many uploaded so far
  requiredDocumentTypes?: DocumentType[]; // What types are needed
  uploadedDocumentTypes?: DocumentType[]; // What types have been uploaded
  currentDocumentIndex?: number;        // Which document we're on (0-based)
  ttl: number; // Unix timestamp for DynamoDB TTL
}

// ============================================================================
// User Context
// ============================================================================

export interface UserContext {
  phoneNumber: string;
  language: Language;
  location: GPSCoordinates;
  previousSchemes: string[];
}

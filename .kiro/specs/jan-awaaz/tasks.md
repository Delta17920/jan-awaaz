# Implementation Plan: Jan-Awaaz

## Overview

Jan-Awaaz is a voice-first mobile application that connects rural Indian citizens with government schemes through intelligent voice interaction, document verification, and smart routing. The implementation follows a mobile-first, voice-centric architecture built on AWS services including Amazon Transcribe, Polly, Textract, and Bedrock Knowledge Base.

This implementation plan breaks down the system into core services, starting with foundational infrastructure and progressing through voice processing, document verification, scheme matching, session management, location routing, and referral card generation. Each task builds incrementally, with property-based tests integrated throughout to validate correctness properties from the design document.

## Tasks

- [x] 1. Set up Next.js PWA project and AWS infrastructure (Cost-Optimized)
  - Create Next.js 14+ project with TypeScript and PWA support
  - Configure AWS services: API Gateway, Lambda, DynamoDB, S3, Transcribe, Polly, Textract, Bedrock, Location Service
  - Set up Vercel project for deployment with environment variables
  - Configure AWS credentials and region (ap-south-1 Mumbai for data residency)
  - Set up AWS CDK or Terraform for infrastructure as code
  - Configure IAM roles and policies following least privilege principle
  - Enable encryption at rest for S3 (SSE-KMS for user documents, SSE-S3 for others) and DynamoDB
  - Configure API Gateway with HTTPS-only, API key authentication, and rate limiting (1000 req/s, burst 2000)
  - Set up CloudWatch logging and monitoring with alarms
  - Configure CloudTrail for audit logging with 1-year retention
  - Set up AWS Secrets Manager for API keys and credentials
  - Configure SNS for critical alerts
  - Set up property-based testing framework (fast-check)
  - Configure next-pwa for service worker and offline support
  - Set up development, staging, and production environments
  - **Note**: VPC endpoints and AWS WAF are optional for cost savings (~$43/month). Can be added later for production.
  - _Requirements: 14.1, 14.2_

- [x] 2. Implement core data models and types
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define Session, DocumentVerification, SchemeMatch, Office, ReferralCard types
    - Define Language, DocumentType, OfficeType, SessionStatus enums
    - Define AudioStream, TranscribedText, VerificationResult interfaces
    - _Requirements: All requirements (foundational types)_
  
  - [ ]* 2.2 Write unit tests for data model validation
    - Test type guards and validation functions
    - Test enum value constraints
    - _Requirements: All requirements_

- [x] 3. Implement Session Management Service
  - [x] 3.1 Create DynamoDB table schema for sessions
    - Define partition key (phoneNumber) and sort key (sessionId)
    - Create GSI for SessionsByStatus
    - Configure TTL for automatic archival after 30 days
    - _Requirements: 7.2, 7.6_
  
  - [x] 3.2 Implement session CRUD operations
    - Create getOrCreateSession function
    - Implement updateSession function
    - Implement getPendingActions function
    - Implement archiveSession function
    - Add phone number hashing for storage
    - _Requirements: 7.2, 7.3, 7.5, 14.2_
  
  - [ ]* 3.3 Write property test for session creation and retrieval
    - **Property 32: Session Creation and Retrieval**
    - **Validates: Requirements 7.2**
  
  - [ ]* 3.4 Write property test for session restoration
    - **Property 33: Session Restoration**
    - **Validates: Requirements 7.3**
  
  - [ ]* 3.5 Write property test for session data persistence
    - **Property 35: Session Data Persistence**
    - **Validates: Requirements 7.5**
  
  - [ ]* 3.6 Write property test for session archival
    - **Property 36: Session Archival**
    - **Validates: Requirements 7.6**
  
  - [ ]* 3.7 Write property test for phone number hashing
    - **Property 53: Phone Number Hashing**
    - **Validates: Requirements 14.2**

- [x] 4. Checkpoint - Ensure session management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Voice Processing Service
  - [x] 5.1 Create Lambda function for voice input handling
    - Implement audio stream capture from API Gateway
    - Add audio format validation (wav, mp3, ogg)
    - Implement audio compression for bandwidth optimization
    - _Requirements: 1.1, 8.2_
  
  - [x] 5.2 Integrate Amazon Transcribe for speech-to-text
    - Implement transcribeVoice function with language parameter
    - Support all 10 Indian regional languages (hi-IN, ta-IN, te-IN, kn-IN, ml-IN, mr-IN, bn-IN, gu-IN, pa-IN, or-IN)
    - Implement streaming transcription for real-time feedback
    - Add confidence score validation (threshold 0.6)
    - Implement segmented audio processing for inputs >60 seconds
    - _Requirements: 1.1, 1.2, 1.3, 9.3_
  
  - [x] 5.3 Integrate Amazon Polly for text-to-speech
    - Implement synthesizeSpeech function with language parameter
    - Support all 10 Indian regional languages
    - Implement audio compression (Opus/AAC)
    - Add caching for common phrases
    - _Requirements: 4.1, 4.4, 8.2, 9.2_
  
  - [x] 5.4 Implement noise filtering for voice input
    - Add background noise detection
    - Implement noise reduction preprocessing
    - _Requirements: 1.5_
  
  - [x] 5.5 Implement error handling for voice processing
    - Handle transcription failures with retry logic
    - Handle low confidence scores with user prompts
    - Handle Polly API errors with text fallback
    - Implement timeout handling with loading indicators
    - _Requirements: 1.4, 11.1_
  
  - [ ]* 5.6 Write property test for multi-language voice input support
    - **Property 1: Multi-Language Voice Input Support**
    - **Validates: Requirements 1.1, 9.3**
  
  - [ ]* 5.7 Write property test for voice transcription latency
    - **Property 2: Voice Transcription Latency**
    - **Validates: Requirements 1.2, 13.1**
  
  - [ ]* 5.8 Write property test for segmented audio context preservation
    - **Property 3: Segmented Audio Context Preservation**
    - **Validates: Requirements 1.3**
  
  - [ ]* 5.9 Write property test for noise filtering accuracy
    - **Property 4: Noise Filtering Accuracy**
    - **Validates: Requirements 1.5**
  
  - [ ]* 5.10 Write property test for language consistency
    - **Property 16: Language Consistency (Input-Output Matching)**
    - **Validates: Requirements 4.1, 9.2**
  
  - [ ]* 5.11 Write property test for voice synthesis latency
    - **Property 19: Voice Synthesis Latency**
    - **Validates: Requirements 4.4, 13.4**
  
  - [ ]* 5.12 Write property test for voice output replay
    - **Property 20: Voice Output Replay**
    - **Validates: Requirements 4.5**
  
  - [ ]* 5.13 Write property test for audio compression optimization
    - **Property 38: Audio Compression Optimization**
    - **Validates: Requirements 8.2**
  
  - [ ]* 5.14 Write property test for voice audio retention limit
    - **Property 54: Voice Audio Retention Limit**
    - **Validates: Requirements 14.3**

- [x] 6. Checkpoint - Ensure voice processing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Document Verification Service
  - [x] 7.1 Create S3 buckets for document storage
    - Create user-documents bucket with encryption (SSE-KMS)
    - Configure 30-day lifecycle policy for automatic deletion
    - Enable versioning and access logging
    - Block all public access
    - _Requirements: 14.1, 14.4_
  
  - [x] 7.2 Implement document upload with compression
    - Create Lambda function for document upload
    - Implement client-side image compression to <500KB
    - Maintain minimum 300 DPI for Textract readability
    - Add image format validation (jpg, png)
    - Implement blur detection before upload
    - _Requirements: 3.1, 8.1_
  
  - [x] 7.3 Integrate Amazon Textract for document extraction
    - Implement extractData function using AnalyzeDocument API
    - Enable FORMS and TABLES analysis
    - Extract text, dates, seals, signatures
    - Return confidence scores for extracted fields
    - _Requirements: 3.2_
  
  - [x] 7.4 Implement automatic document classification
    - Create classifyDocument function
    - Implement classification logic for Aadhaar, Income Certificate, Land Patta
    - Use pattern matching on extracted text
    - Handle unknown document types
    - _Requirements: 10.1, 10.6_
  
  - [x] 7.5 Implement document type-specific validation
    - Create validation rules for Aadhaar (12-digit format, tampering check)
    - Create validation rules for Income Certificate (seal, signature, validity date)
    - Create validation rules for Land Patta (survey number, area, owner name)
    - Implement defect detection (missing seal, signature, expired, blurry, tampered)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 10.2_
  
  - [x] 7.6 Implement document verification error handling
    - Handle image quality issues (blur, low light, glare)
    - Handle Textract processing errors with retry logic
    - Handle validation failures with specific error messages
    - Prompt user for recapture when needed
    - _Requirements: 3.7, 11.2_
  
  - [ ]* 7.7 Write property test for document upload reliability
    - **Property 9: Document Upload Reliability**
    - **Validates: Requirements 3.1**
  
  - [ ]* 7.8 Write property test for document verification latency
    - **Property 10: Document Verification Latency and Completeness**
    - **Validates: Requirements 3.2, 13.3**
  
  - [ ]* 7.9 Write property test for Aadhaar validation
    - **Property 11: Aadhaar Validation**
    - **Validates: Requirements 3.3**
  
  - [ ]* 7.10 Write property test for Income Certificate validation
    - **Property 12: Income Certificate Validation**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.11 Write property test for document expiration detection
    - **Property 13: Document Expiration Detection**
    - **Validates: Requirements 3.5**
  
  - [ ]* 7.12 Write property test for document defect detection
    - **Property 14: Document Defect Detection**
    - **Validates: Requirements 3.6**
  
  - [ ]* 7.13 Write property test for image quality validation
    - **Property 15: Image Quality Validation**
    - **Validates: Requirements 3.7**
  
  - [ ]* 7.14 Write property test for automatic document classification
    - **Property 44: Automatic Document Classification**
    - **Validates: Requirements 10.1**
  
  - [ ]* 7.15 Write property test for type-specific validation rules
    - **Property 45: Type-Specific Validation Rules**
    - **Validates: Requirements 10.2**
  
  - [ ]* 7.16 Write property test for document type-specific field extraction
    - **Property 46: Document Type-Specific Field Extraction**
    - **Validates: Requirements 10.3, 10.4, 10.5**
  
  - [ ]* 7.17 Write property test for image compression with readability
    - **Property 37: Image Compression with Readability**
    - **Validates: Requirements 8.1**
  
  - [ ]* 7.18 Write property test for document image encryption
    - **Property 52: Document Image Encryption**
    - **Validates: Requirements 14.1**

- [x] 8. Checkpoint - Ensure document verification tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Scheme Matching Service
  - [x] 9.1 Set up Amazon Bedrock Knowledge Base
    - Create S3 bucket for scheme PDFs with encryption (SSE-S3)
    - Upload government scheme PDF documents
    - Configure Bedrock Knowledge Base with Titan Embeddings
    - Set up semantic search with source attribution
    - Configure confidence threshold at 0.7
    - _Requirements: 2.2, 12.1_
  
  - [x] 9.2 Implement scheme matching with RAG pattern
    - Create findMatchingSchemes function
    - Implement query to Bedrock Knowledge Base
    - Extract eligibility criteria, required documents, application process
    - Implement strict source verification (no hallucination)
    - Return top 3 matches ranked by relevance score
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 12.1, 12.2, 12.4_
  
  - [x] 9.3 Implement query expansion for colloquial descriptions
    - Map common phrases to scheme keywords ("husband died" → "widow pension")
    - Handle regional language variations
    - _Requirements: 2.1_
  
  - [x] 9.4 Implement scheme details retrieval
    - Create getSchemeDetails function
    - Validate scheme exists in knowledge base
    - Extract complete scheme information
    - _Requirements: 2.5, 12.2_
  
  - [x] 9.5 Implement scheme matching error handling
    - Handle no results found with clarifying questions
    - Handle low confidence matches with user confirmation
    - Handle Bedrock API errors with retry logic
    - _Requirements: 2.4, 11.3_
  
  - [ ]* 9.6 Write property test for scheme matcher invocation
    - **Property 5: Scheme Matcher Invocation**
    - **Validates: Requirements 2.1**
  
  - [ ]* 9.7 Write property test for no hallucinated schemes
    - **Property 6: No Hallucinated Schemes (Source Verification)**
    - **Validates: Requirements 2.2, 12.1, 12.2, 12.4**
  
  - [ ]* 9.8 Write property test for scheme ranking and limiting
    - **Property 7: Scheme Ranking and Limiting**
    - **Validates: Requirements 2.3**
  
  - [ ]* 9.9 Write property test for scheme data completeness
    - **Property 8: Scheme Data Completeness**
    - **Validates: Requirements 2.5**
  
  - [ ]* 9.10 Write property test for scheme matcher query latency
    - **Property 50: Scheme Matcher Query Latency**
    - **Validates: Requirements 13.2**
  
  - [ ]* 9.11 Write property test for knowledge base freshness
    - **Property 49: Knowledge Base Freshness**
    - **Validates: Requirements 12.3**

- [x] 10. Checkpoint - Ensure scheme matching tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Location Routing Service
  - [x] 11.1 Set up Amazon Location Service
    - Configure Place Index with Esri or HERE data provider
    - Configure Route Calculator for distance and directions
    - Create DynamoDB table for office locations with geospatial indexing
    - Populate office database (CSC, Panchayat, District, Taluk offices)
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 11.2 Implement smart routing logic
    - Create determineOfficeType function
    - Implement priority 1: Document defects requiring physical correction
    - Implement priority 2: Scheme application process type (ONLINE → CSC, PHYSICAL → Panchayat)
    - Implement override logic for missing seal/signature/tampering → force Panchayat
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 11.3 Implement office search and ranking
    - Create findNearestOffices function
    - Implement GPS-based search within 10km radius
    - Implement fallback to 25km if no results
    - Rank offices by distance (ascending)
    - _Requirements: 5.4, 5.5_
  
  - [x] 11.4 Implement directions and map display
    - Create getDirections function using Route Calculator
    - Generate map URLs with color-coded pins (Green: CSC, Red: Panchayat)
    - Calculate distance and estimated time
    - _Requirements: 5.1, 5.2_
  
  - [x] 11.5 Implement location service error handling
    - Handle GPS unavailable with manual location entry
    - Handle no offices found with expanded search
    - Handle Amazon Location Service errors with cached data
    - _Requirements: 5.6, 11.4_
  
  - [ ]* 11.6 Write property test for physical scheme office routing
    - **Property 21: Physical Scheme Office Routing**
    - **Validates: Requirements 5.1**
  
  - [ ]* 11.7 Write property test for online scheme office routing
    - **Property 22: Online Scheme Office Routing**
    - **Validates: Requirements 5.2**
  
  - [ ]* 11.8 Write property test for defect-to-location smart routing
    - **Property 23: Defect-to-Location Smart Routing**
    - **Validates: Requirements 5.3**
  
  - [ ]* 11.9 Write property test for GPS-based distance calculation
    - **Property 24: GPS-Based Distance Calculation**
    - **Validates: Requirements 5.4**
  
  - [ ]* 11.10 Write property test for office distance ranking
    - **Property 25: Office Distance Ranking**
    - **Validates: Requirements 5.5**
  
  - [ ]* 11.11 Write property test for map rendering latency
    - **Property 51: Map Rendering Latency**
    - **Validates: Requirements 13.5**

- [x] 12. Checkpoint - Ensure location routing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Referral Card Generator
  - [x] 13.1 Create S3 bucket for referral cards
    - Create referral-cards bucket with encryption (SSE-S3)
    - Configure 90-day lifecycle policy
    - _Requirements: 6.1_
  
  - [x] 13.2 Implement card generation with iconography
    - Create generateCard function
    - Implement card layout with large icons (minimum 48x48px)
    - Implement color coding (Green: valid, Red: invalid, Yellow: warning, Blue: info)
    - Use minimum 16pt font size for text
    - Include scheme name, phone number, required documents, office location
    - Add timestamp and unique reference number
    - _Requirements: 6.1, 6.2, 6.3, 6.6_
  
  - [x] 13.3 Implement QR code generation
    - Generate QR code with encrypted session data
    - Include reference number in QR code
    - _Requirements: 6.5_
  
  - [x] 13.4 Implement card rendering as PNG image
    - Use Canvas API or similar for image generation
    - Ensure high contrast (black text on white background)
    - Support all 10 Indian regional languages for text
    - _Requirements: 6.3, 9.4_
  
  - [x] 13.5 Implement save to gallery functionality
    - Create saveToGallery function
    - Generate pre-signed S3 URL for download
    - _Requirements: 6.4_
  
  - [x] 13.6 Implement CSC operator view
    - Create endpoint for QR code scanning
    - Display full eligibility criteria and document checklist
    - Implement read-only access with audit logging
    - _Requirements: 6.5_
  
  - [ ]* 13.7 Write property test for referral card data completeness
    - **Property 26: Referral Card Data Completeness**
    - **Validates: Requirements 6.1**
  
  - [ ]* 13.8 Write property test for referral card iconography
    - **Property 27: Referral Card Iconography**
    - **Validates: Requirements 6.2**
  
  - [ ]* 13.9 Write property test for referral card visual standards
    - **Property 28: Referral Card Visual Standards**
    - **Validates: Requirements 6.3**
  
  - [ ]* 13.10 Write property test for referral card save functionality
    - **Property 29: Referral Card Save Functionality**
    - **Validates: Requirements 6.4**
  
  - [ ]* 13.11 Write property test for referral card operator view
    - **Property 30: Referral Card Operator View**
    - **Validates: Requirements 6.5**
  
  - [ ]* 13.12 Write property test for referral card metadata
    - **Property 31: Referral Card Metadata**
    - **Validates: Requirements 6.6**
  
  - [ ]* 13.13 Write property test for referral card localization
    - **Property 42: Referral Card Localization**
    - **Validates: Requirements 9.4**

- [x] 14. Checkpoint - Ensure referral card tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement API Gateway with security configuration
  - [x] 15.1 Create API Gateway REST API with security features
    - Define endpoints for voice input, document upload, scheme query, session management
    - Configure HTTPS-only with TLS 1.2+ (disable HTTP)
    - Enable API key authentication for mobile clients
    - Configure throttling (1000 req/s per user, burst 2000)
    - Enable CloudWatch logging for all API requests
    - Configure CORS policies to restrict to PWA origin only
    - Deploy as regional endpoint (not edge-optimized) for data residency in Mumbai
    - **Note**: AWS WAF integration is optional for cost savings (~$8/month). Built-in throttling provides basic protection.
    - _Requirements: All requirements_
  
  - [x] 15.2 Implement main orchestration in Next.js API routes
    - Create API route handlers for complete user journey flow
    - Implement language detection and selection
    - Implement phone number capture and session management
    - Orchestrate voice input → transcription → scheme matching
    - Orchestrate document upload → verification → routing
    - Orchestrate referral card generation
    - Implement proactive context awareness for returning users
    - Add request validation using JSON schemas
    - Implement rate limiting per phone number (max 10 sessions/day)
    - Add input sanitization (validate phone format, GPS coordinates, file types)
    - Implement error handling with generic user messages (no stack traces)
    - _Requirements: 7.4, 9.1_
  
  - [x] 15.3 Implement network resilience
    - Add retry logic with exponential backoff
    - Implement operation queuing for offline mode
    - Add progress indicators for data transfers
    - Implement state preservation for network recovery
    - _Requirements: 8.3, 8.4, 8.5, 11.4_
  
  - [ ]* 15.4 Write property test for proactive session nudge
    - **Property 34: Proactive Session Nudge**
    - **Validates: Requirements 7.4**
  
  - [ ]* 15.5 Write property test for language detection and prompting
    - **Property 41: Language Detection and Prompting**
    - **Validates: Requirements 9.1**
  
  - [ ]* 15.6 Write property test for dynamic language switching
    - **Property 43: Dynamic Language Switching**
    - **Validates: Requirements 9.5**
  
  - [ ]* 15.7 Write property test for network retry logic
    - **Property 39: Network Retry Logic**
    - **Validates: Requirements 8.3**
  
  - [ ]* 15.8 Write property test for progress indicator display
    - **Property 40: Progress Indicator Display**
    - **Validates: Requirements 8.5**
  
  - [ ]* 15.9 Write property test for network recovery state preservation
    - **Property 47: Network Recovery State Preservation**
    - **Validates: Requirements 11.4**

- [x] 16. Implement voice output generation for all user interactions
  - [x] 16.1 Create voice response templates
    - Create templates for scheme descriptions
    - Create templates for document verification results
    - Create templates for error messages
    - Create templates for guidance and prompts
    - Support all 10 Indian regional languages
    - _Requirements: 4.2, 4.3_
  
  - [x] 16.2 Integrate voice output into all service responses
    - Add voice output to scheme matching results
    - Add voice output to document verification results
    - Add voice output to error handling flows
    - Add voice output to proactive nudges
    - _Requirements: 4.2, 4.3, 5.3_
  
  - [ ]* 16.3 Write property test for scheme description voice output
    - **Property 17: Scheme Description Voice Output**
    - **Validates: Requirements 4.2**
  
  - [ ]* 16.4 Write property test for verification result voice output
    - **Property 18: Verification Result Voice Output**
    - **Validates: Requirements 4.3**

- [x] 17. Implement comprehensive error handling and logging
  - [x] 17.1 Add error handling to all Lambda functions
    - Implement try-catch blocks with specific error types
    - Add user-friendly error messages (no technical details)
    - Implement error logging with session context
    - Add CloudWatch metrics for error rates
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 17.2 Implement audit logging
    - Enable CloudTrail for all API calls
    - Log all S3 object access
    - Enable DynamoDB Streams for session changes
    - Store audit logs with 1-year retention
    - _Requirements: 14.1_
  
  - [ ]* 17.3 Write property test for error logging with session context
    - **Property 48: Error Logging with Session Context**
    - **Validates: Requirements 11.5**

- [x] 18. Implement security and compliance measures (Cost-Optimized)
  - [x] 18.1 Configure encryption and access controls
    - Enable S3 bucket encryption (SSE-KMS with customer-managed keys for user documents, SSE-S3 for scheme PDFs and cards)
    - Enable DynamoDB encryption at rest using AWS-managed keys
    - Configure IAM roles with least privilege for each Lambda function
    - Block public access on all S3 buckets
    - Enable S3 versioning for user-documents bucket (audit trail)
    - Enable S3 Access Logging for all buckets
    - Configure bucket policies to restrict access to specific Lambda roles only
    - Encrypt Lambda environment variables using AWS Secrets Manager
    - Enable HTTPS-only for all S3 pre-signed URLs
    - _Requirements: 14.1, 14.2_
  
  - [x] 18.2 Implement data retention and privacy policies
    - Configure S3 lifecycle policies (30 days for user documents, 90 days for referral cards)
    - Configure DynamoDB TTL for session archival after 30 days
    - Implement Aadhaar number masking in logs (mask middle 8 digits: XXXX-XXXX-1234)
    - Implement phone number hashing using SHA-256 for storage
    - Configure Lambda to not store raw audio beyond active session
    - Remove all document images after 30 days automatically
    - Retain only scheme match history after archival
    - _Requirements: 14.2, 14.3, 14.4_
  
  - [x] 18.3 Configure monitoring and alerting
    - Set up CloudWatch alarms for:
      - High error rates in Lambda functions (>5%)
      - S3 bucket policy changes
      - IAM role modifications
      - Failed authentication attempts
    - Configure SNS notifications for critical alerts
    - Enable CloudWatch Logs for all Lambda functions
    - Set log retention to 30 days for cost optimization
    - **Note**: AWS WAF alarms are optional (requires WAF to be enabled)
    - _Requirements: 14.1_
  
  - [x] 18.4 Implement audit logging and compliance
    - Enable AWS CloudTrail for all API calls
    - Log all S3 object access (GetObject, PutObject, DeleteObject)
    - Enable DynamoDB Streams for session state changes
    - Store audit logs in separate S3 bucket with 1-year retention
    - Enable S3 Object Lock for audit logs (prevent tampering)
    - Configure CloudTrail to log data events (not just management events)
    - Ensure all resources are deployed in Mumbai (ap-south-1) region for data residency
    - _Requirements: 14.1_
  
  - [x] 18.5 Document production upgrade path
    - Document how to enable VPC endpoints for enhanced network security (~$35/month)
    - Document how to enable AWS WAF for DDoS protection (~$8/month)
    - Create runbook for security hardening when moving to production
    - _Requirements: 14.1_
  
  - [ ]* 18.6 Write property test for archival data retention policy
    - **Property 55: Archival Data Retention Policy**
    - **Validates: Requirements 14.4**

- [x] 19. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Implement Next.js PWA client
  - [x] 20.1 Set up Next.js project with PWA configuration
    - Initialize Next.js 14+ project with TypeScript
    - Install and configure next-pwa for Progressive Web App support
    - Configure manifest.json with app name, icons, theme colors
    - Set up service worker for offline functionality
    - Configure responsive design for mobile-first experience
    - Deploy to Vercel with environment variables for AWS credentials
    - _Requirements: All requirements_
  
  - [x] 20.2 Create PWA UI components
    - Implement voice input button with recording indicator using Web Audio API
    - Implement camera interface for document capture using MediaDevices API
    - Implement map display with color-coded pins using Leaflet or Google Maps
    - Implement referral card display with download functionality
    - Implement language selection interface
    - Use large icons (minimum 48x48px) and fonts (minimum 16pt)
    - Implement responsive design for various mobile screen sizes
    - _Requirements: 6.2, 6.3_
  
  - [x] 20.3 Integrate PWA with AWS services via Next.js API routes
    - Create API routes for voice processing (Transcribe/Polly integration)
    - Create API routes for document verification (Textract integration)
    - Create API routes for scheme matching (Bedrock integration)
    - Create API routes for location routing (Location Service integration)
    - Implement API client with authentication
    - Add audio streaming for voice input
    - Add image upload with compression
    - Add GPS coordinate capture using Geolocation API
    - _Requirements: 1.1, 3.1, 5.4_
  
  - [x] 20.4 Implement PWA offline capabilities
    - Configure service worker to cache static assets
    - Implement IndexedDB for local session storage
    - Store session ID and phone number locally
    - Cache referral cards for offline viewing
    - Store language preference
    - Implement operation queuing for offline mode
    - Sync queued operations when connection restored
    - _Requirements: 7.3, 8.3_
  
  - [x] 20.5 Implement PWA installation and mobile features
    - Add "Add to Home Screen" prompt
    - Configure app icons for iOS and Android
    - Implement push notifications for session reminders (optional)
    - Test PWA installation on iOS Safari and Android Chrome
    - Optimize for mobile performance and low bandwidth
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 20.6 Write integration tests for Next.js PWA
    - Test complete voice-to-scheme-to-card flow
    - Test document upload-to-verification-to-routing flow
    - Test session restoration flow
    - Test offline mode and sync behavior
    - Test PWA installation and service worker functionality
    - _Requirements: All requirements_

- [x] 21. Final checkpoint and deployment preparation
  - [x] 21.1 Run comprehensive test suite
    - Execute all unit tests
    - Execute all property-based tests (minimum 100 iterations each)
    - Execute integration tests
    - Execute performance tests (verify latency requirements)
    - Execute security tests (vulnerability scanning)
    - _Requirements: All requirements_
  
  - [x] 21.2 Perform security review
    - Verify encryption in transit (TLS 1.2+) and at rest (SSE-KMS/SSE-S3)
    - Verify IAM policies follow least privilege principle
    - Verify data retention policies are active and working
    - Verify audit logging is enabled (CloudTrail, S3 Access Logs, DynamoDB Streams)
    - Verify all resources are in Mumbai (ap-south-1) region
    - Verify no public access to S3 buckets
    - Verify Secrets Manager is used for all credentials
    - Verify PII masking in logs (Aadhaar, phone numbers)
    - Run AWS Trusted Advisor security checks
    - Document optional security upgrades (VPC endpoints, WAF) for production
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 21.3 Deploy to staging environment
    - Deploy infrastructure using AWS CDK/Terraform
    - Upload 15 scheme PDFs to Bedrock Knowledge Base
    - Populate office location database in DynamoDB
    - Configure monitoring and alerting (CloudWatch, SNS)
    - Deploy Next.js PWA to Vercel staging environment
    - Configure environment variables for staging
    - Test end-to-end flows in staging
    - _Requirements: All requirements_
  
  - [x] 21.4 Conduct user acceptance testing
    - Test with users in each supported language (Hindi, Tamil, etc.)
    - Test with low bandwidth connections
    - Test with various document types and quality levels
    - Test PWA installation on iOS Safari and Android Chrome
    - Test offline mode and sync functionality
    - Test voice input with background noise
    - Test document verification with various defects
    - Gather feedback and iterate
    - _Requirements: All requirements_
  
  - [x] 21.5 Prepare production deployment and documentation
    - Create production environment in AWS
    - Configure production domain and SSL certificates
    - Set up production monitoring dashboards
    - Document deployment procedures
    - Create runbook for common issues
    - Document cost optimization strategy and upgrade path
    - Deploy to Vercel production environment
    - _Requirements: All requirements_

- [x] 22. Final checkpoint - Production readiness
  - Ensure all tests pass, all security measures are in place, and the system is ready for production deployment.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- **IMPORTANT: All tests should use mocks/stubs for AWS services to avoid charges**
  - Use jest.mock() or similar to mock Transcribe, Polly, Textract, Bedrock, S3, DynamoDB
  - Property tests validate logic without making real AWS API calls
  - Manual verification with real AWS services should be done sparingly
  - Tests serve as documentation of expected behavior for judges
- Property tests validate universal correctness properties from the design document
- Each property test should run minimum 100 iterations (with mocked services)
- All AWS services should be deployed in Mumbai (ap-south-1) region for data residency
- Use TypeScript with AWS SDK v3 for all Lambda functions and Next.js API routes
- Use fast-check library for property-based testing
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Cost-optimized configuration: VPC endpoints and AWS WAF are optional (~$43/month savings)
- Estimated monthly cost: ~$7-12/month for testing phase

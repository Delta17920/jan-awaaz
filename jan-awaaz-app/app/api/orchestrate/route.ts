/**
 * Main Orchestration API Route
 * Handles complete user journey flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateSession, updateSession } from '@/lib/aws/session-service';
import { transcribeVoice, synthesizeSpeech } from '@/lib/aws/voice-service';
import { findMatchingSchemes } from '@/lib/aws/scheme-service';
import { verifyDocument } from '@/lib/aws/document-service';
import { generateCard } from '@/lib/aws/referral-card-service';
import { Language, WorkflowStep, SessionStatus, AudioStream, DocumentImage, Office, OfficeType, ReferralCard } from '@/lib/types';
import { logAuditEvent, AuditEventType } from '@/lib/utils/audit-logger';
import { logError, AppError, ErrorType, ErrorSeverity } from '@/lib/utils/error-handler';
import { voiceTemplates } from '@/lib/utils/voice-templates';

// Rate limiting: max 10 sessions per phone number per day
const sessionLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * Main orchestration endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phoneNumber, language, audioData, documentImage, location, cscCenter } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // Rate limiting check
    if (phoneNumber && action === 'start') {
      const isRateLimited = checkRateLimit(phoneNumber);
      if (isRateLimited) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Maximum 10 sessions per day.' },
          { status: 429 }
        );
      }
    }

    switch (action) {
      case 'start': {
        // Start new session or restore existing
        return await handleStart(phoneNumber, language);
      }

      case 'captureVoice': {
        // Transcribe voice input and match schemes
        return await handleVoiceCapture(phoneNumber, audioData, language);
      }

      case 'uploadDocument': {
        // Verify document and determine routing
        return await handleDocumentUpload(phoneNumber, documentImage, language);
      }

      case 'skipDocument': {
        // Skip current document
        return await handleDocumentSkip(phoneNumber, language);
      }

      case 'generateReferral': {
        // Generate referral card
        return await handleReferralGeneration(phoneNumber, location, language, cscCenter);
      }

      case 'getSession': {
        // Get current session state
        return await handleGetSession(phoneNumber);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Orchestration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle session start
 */
async function handleStart(phoneNumber: string, language: Language = 'hi-IN') {
  try {
    // Validate phone number
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid phone number',
        'Please provide a valid 10-digit phone number',
        ErrorSeverity.LOW
      );
    }

    // Get or create session
    const session = await getOrCreateSession(phoneNumber, language);

    // Log audit event
    logAuditEvent(
      AuditEventType.SESSION_CREATED,
      'Session started',
      'SUCCESS',
      { sessionId: session.sessionId, userId: phoneNumber }
    );

    // Generate welcome voice message
    const welcomeText = voiceTemplates.welcome[language];
    const welcomeAudio = await synthesizeSpeech(welcomeText, language);

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        language: session.language,
        currentStep: session.currentStep,
        status: session.status,
      },
      welcomeMessage: welcomeText,
      welcomeAudio: welcomeAudio.data.toString('base64'),
      nextAction: 'captureVoice',
    });
  } catch (error) {
    logError(error as Error, { phoneNumber, language });
    throw error;
  }
}

/**
 * Handle voice capture and scheme matching
 */
async function handleVoiceCapture(
  phoneNumber: string,
  audioData: string,
  language: Language = 'hi-IN'
) {
  try {
    if (!audioData) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Missing audio data',
        'Please provide voice input',
        ErrorSeverity.LOW
      );
    }

    // Get session
    const session = await getOrCreateSession(phoneNumber, language);

    // Transcribe voice
    const audioBuffer = Buffer.from(audioData, 'base64');
    const audioStream: AudioStream = {
      data: audioBuffer,
      format: 'wav',
      sampleRate: 16000,
    };
    const transcription = await transcribeVoice(audioStream, language);

    // Log audit event
    logAuditEvent(
      AuditEventType.VOICE_TRANSCRIBED,
      'Voice transcribed',
      'SUCCESS',
      { sessionId: session.sessionId }
    );

    // Find matching schemes
    const schemes = await findMatchingSchemes(transcription.text, language);

    // Update session
    await updateSession(session.sessionId, phoneNumber, {
      currentStep: 'SCHEME_MATCHING' as WorkflowStep,
      userStory: transcription.text,
      schemeMatches: schemes,
    });

    // Generate voice response
    let responseText = '';
    if (schemes.length === 0) {
      responseText = 'कोई योजना नहीं मिली। कृपया अधिक विवरण दें।';
    } else {
      responseText = `मुझे ${schemes.length} योजनाएं मिलीं। पहली योजना: ${schemes[0].schemeName}`;
    }

    const responseAudio = await synthesizeSpeech(responseText, language);

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      confidence: transcription.confidence,
      schemes,
      responseMessage: responseText,
      responseAudio: responseAudio.data.toString('base64'),
      nextAction: schemes.length > 0 ? 'uploadDocument' : 'captureVoice',
    });
  } catch (error) {
    logError(error as Error, { phoneNumber, language });
    throw error;
  }
}

/**
 * Handle document upload and verification
 */
async function handleDocumentUpload(
  phoneNumber: string,
  documentImage: string,
  language: Language = 'hi-IN'
) {
  try {
    if (!documentImage) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Missing document image',
        'Please provide document image',
        ErrorSeverity.LOW
      );
    }

    // Get session
    const session = await getOrCreateSession(phoneNumber, language);

    // Get document tracking info
    const documentsRequired = (session as any).documentsRequired || 1;
    const documentsUploaded = (session as any).documentsUploaded || 0;
    const uploadedDocumentTypes = (session as any).uploadedDocumentTypes || [];
    const requiredDocumentTypes = (session as any).requiredDocumentTypes || [];

    console.log(`Document upload progress: ${documentsUploaded}/${documentsRequired}`);

    // Verify document
    const imageBuffer = Buffer.from(documentImage, 'base64');
    const docImage: DocumentImage = {
      data: imageBuffer,
      format: 'jpg',
      size: imageBuffer.length,
      captureTimestamp: new Date(),
    };
    
    console.log('Verifying document...');
    const verification = await verifyDocument(docImage);
    console.log('Verification result:', verification);

    // Update session with verification result
    const existingDocs = (session as any).documents || [];
    const newDocument = {
      verificationId: `doc-${Date.now()}`,
      documentType: verification.documentType,
      uploadedAt: new Date().toISOString(),
      imageUrl: '',
      extractedData: verification.extractedData.fields,
      confidence: verification.extractedData.confidence,
      isValid: verification.isValid,
      defects: verification.defects,
      requiresPhysicalVisit: verification.requiresPhysicalVisit,
      processingTimeMs: 0,
      textractJobId: '',
    };

    // Generate voice response based on validation
    let responseText = '';
    
    if (verification.isValid) {
      // Document is valid - increment counter
      const newUploadedCount = documentsUploaded + 1;
      const newUploadedTypes = [...uploadedDocumentTypes, verification.documentType];
      
      // Update session with new document
      await updateSession(session.sessionId, phoneNumber, {
        currentStep: 'DOCUMENT_VERIFICATION' as WorkflowStep,
        documents: [...existingDocs, newDocument],
        documentsUploaded: newUploadedCount,
        uploadedDocumentTypes: newUploadedTypes,
      });

      // Check if all documents are uploaded
      const allDocumentsUploaded = newUploadedCount >= documentsRequired;
      
      if (allDocumentsUploaded) {
        // All documents verified - return to Haiku
        responseText = `बहुत अच्छा! सभी ${documentsRequired} दस्तावेज़ सफलतापूर्वक सत्यापित हो गए हैं।`;
        
        console.log(`All ${documentsRequired} documents verified! Returning to Haiku.`);
        
        return NextResponse.json({
          success: true,
          verification,
          responseMessage: responseText,
          nextAction: 'voice', // Return to Haiku
          allDocumentsComplete: true,
          documentsProgress: {
            uploaded: newUploadedCount,
            required: documentsRequired,
          },
        });
      } else {
        // More documents needed
        const nextDocIndex = newUploadedCount; // 0-based index
        const nextDocType = requiredDocumentTypes[nextDocIndex] || 'document';
        
        responseText = `दस्तावेज़ ${newUploadedCount} of ${documentsRequired} सत्यापित हो गया है। अब अगला दस्तावेज़ दिखाएं।`;
        
        console.log(`Document ${newUploadedCount}/${documentsRequired} verified. Next: ${nextDocType}`);
        
        return NextResponse.json({
          success: true,
          verification,
          responseMessage: responseText,
          nextAction: 'uploadDocument', // Stay in document capture
          allDocumentsComplete: false,
          documentsProgress: {
            uploaded: newUploadedCount,
            required: documentsRequired,
            nextDocumentType: nextDocType,
          },
        });
      }
    } else {
      // Invalid document - ask to re-upload
      const defects = verification.defects.map(d => d.description).join(', ');
      responseText = `आपके दस्तावेज़ में कुछ समस्याएं हैं: ${defects}। कृपया सही दस्तावेज़ की फोटो लें।`;
      
      console.log('Document invalid - requesting re-upload');
      
      return NextResponse.json({
        success: true,
        verification,
        responseMessage: responseText,
        nextAction: 'uploadDocument', // Re-upload same document
        allDocumentsComplete: false,
        documentsProgress: {
          uploaded: documentsUploaded,
          required: documentsRequired,
        },
      });
    }
  } catch (error) {
    console.error('Document upload error:', error);
    logError(error as Error, { phoneNumber, language });
    throw error;
  }
}

/**
 * Handle document skip
 */
async function handleDocumentSkip(
  phoneNumber: string,
  language: Language = 'hi-IN'
) {
  try {
    // Get session
    const session = await getOrCreateSession(phoneNumber, language);

    // Get document tracking info
    const documentsRequired = (session as any).documentsRequired || 1;
    const documentsUploaded = (session as any).documentsUploaded || 0;
    const uploadedDocumentTypes = (session as any).uploadedDocumentTypes || [];
    const requiredDocumentTypes = (session as any).requiredDocumentTypes || [];

    console.log(`Document skip - progress: ${documentsUploaded}/${documentsRequired}`);

    // Mark current document as skipped
    const newUploadedCount = documentsUploaded + 1;
    const newUploadedTypes = [...uploadedDocumentTypes, 'SKIPPED'];
    
    // Add skipped document to documents array
    const existingDocs = (session as any).documents || [];
    const skippedDocument = {
      verificationId: `doc-skipped-${Date.now()}`,
      documentType: 'UNKNOWN' as const,
      uploadedAt: new Date().toISOString(),
      imageUrl: '',
      extractedData: {},
      confidence: 0,
      isValid: false,
      defects: [],
      requiresPhysicalVisit: true, // Will need to show at CSC
      processingTimeMs: 0,
      textractJobId: '',
      skipped: true, // Mark as skipped
    };

    // Update session
    await updateSession(session.sessionId, phoneNumber, {
      documents: [...existingDocs, skippedDocument],
      documentsUploaded: newUploadedCount,
      uploadedDocumentTypes: newUploadedTypes,
    });

    // Check if all documents are processed (uploaded or skipped)
    const allDocumentsProcessed = newUploadedCount >= documentsRequired;
    
    let responseText = '';
    
    if (allDocumentsProcessed) {
      // All documents processed - return to Haiku
      responseText = `सभी दस्तावेज़ प्रोसेस हो गए हैं। आप CSC सेंटर पर छूटे हुए दस्तावेज़ दिखा सकते हैं।`;
      
      console.log(`All ${documentsRequired} documents processed (some skipped). Returning to Haiku.`);
      
      return NextResponse.json({
        success: true,
        responseMessage: responseText,
        nextAction: 'voice', // Return to Haiku
        allDocumentsComplete: true,
        documentsProgress: {
          uploaded: newUploadedCount,
          required: documentsRequired,
        },
      });
    } else {
      // More documents needed
      const nextDocIndex = newUploadedCount;
      const nextDocType = requiredDocumentTypes[nextDocIndex] || 'document';
      
      responseText = `दस्तावेज़ ${documentsUploaded + 1} को छोड़ दिया गया। अब अगला दस्तावेज़ दिखाएं या छोड़ें।`;
      
      console.log(`Document ${newUploadedCount}/${documentsRequired} skipped. Next: ${nextDocType}`);
      
      return NextResponse.json({
        success: true,
        responseMessage: responseText,
        nextAction: 'uploadDocument', // Stay in document capture
        allDocumentsComplete: false,
        documentsProgress: {
          uploaded: newUploadedCount,
          required: documentsRequired,
          nextDocumentType: nextDocType,
        },
      });
    }
  } catch (error) {
    console.error('Document skip error:', error);
    logError(error as Error, { phoneNumber, language });
    throw error;
  }
}

/**
 * Handle referral card generation
 */
async function handleReferralGeneration(
  phoneNumber: string,
  location: { latitude: number; longitude: number },
  language: Language = 'hi-IN',
  cscCenterFromFrontend?: any
) {
  try {
    // Get session
    const session = await getOrCreateSession(phoneNumber, language);

    console.log('Session schemeMatches:', session.schemeMatches);
    console.log('Number of schemes in session:', session.schemeMatches?.length || 0);
    console.log('CSC center from frontend:', cscCenterFromFrontend);
    
    if (session.schemeMatches && session.schemeMatches.length > 0) {
      console.log('First scheme name:', session.schemeMatches[0].schemeName);
    }

    if (!session.schemeMatches || session.schemeMatches.length === 0) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'No schemes matched',
        'Please complete scheme matching first',
        ErrorSeverity.LOW
      );
    }

    const selectedScheme = session.schemeMatches[0];
    
    // Get all documents from session (including skipped ones)
    const sessionDocuments = (session as any).documents || [];
    
    // Build document status list for referral card
    const documentStatuses: DocumentStatus[] = sessionDocuments.map((doc: any) => {
      if (doc.skipped) {
        // Skipped document
        return {
          documentType: 'UNKNOWN' as DocumentType,
          status: 'MISSING' as const,
          icon: 'YELLOW_WARNING' as IconType,
          message: 'Skipped - Show at CSC',
        };
      } else if (doc.isValid) {
        // Valid document
        return {
          documentType: doc.documentType,
          status: 'VALID' as const,
          icon: 'GREEN_CHECK' as IconType,
          message: 'Verified',
        };
      } else {
        // Invalid document
        return {
          documentType: doc.documentType,
          status: 'INVALID' as const,
          icon: 'RED_CROSS' as IconType,
          message: 'Needs Correction',
        };
      }
    });
    
    // Determine eligibility status based on documents
    const hasSkipped = sessionDocuments.some((doc: any) => doc.skipped);
    const eligibilityStatus = hasSkipped ? 'PENDING_DOCS' : 'ELIGIBLE';

    // Get CSC center info - prioritize frontend-provided data, then session data
    let officeDetails: Office;
    
    if (cscCenterFromFrontend && cscCenterFromFrontend.address) {
      // Use CSC center info passed from frontend (from chat API)
      console.log('Using CSC center from frontend/chat API');
      officeDetails = {
        officeId: 'csc-' + Date.now(),
        name: cscCenterFromFrontend.name || 'CSC Center',
        type: 'CSC' as OfficeType,
        address: cscCenterFromFrontend.address,
        contactNumber: cscCenterFromFrontend.phone || '044-XXXXXXXX',
        distanceKm: 5,
        workingHours: '9:00 AM - 5:00 PM',
        location: location,
      };
    } else if ((session as any).cscCenterInfo && (session as any).cscCenterInfo.address) {
      // Use CSC center info from session (translated address)
      console.log('Using CSC center from session');
      const sessionCsc = (session as any).cscCenterInfo;
      officeDetails = {
        officeId: 'csc-' + Date.now(),
        name: sessionCsc.name || 'CSC Center',
        type: 'CSC' as OfficeType,
        address: sessionCsc.address, // This is the translated address
        contactNumber: sessionCsc.phone || '044-XXXXXXXX',
        distanceKm: 5,
        workingHours: '9:00 AM - 5:00 PM',
        location: location,
      };
    } else {
      // Fallback: Try to extract from conversation history
      console.log('No CSC center from frontend, checking conversation history...');
      const conversationHistory = (session as any).conversationHistory || [];
      let cscCenterAddress = null;
      
      console.log('Conversation history length:', conversationHistory.length);
      
      // Look through conversation history for the CSC center address
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        const msg = conversationHistory[i];
        if (msg.role === 'user' && msg.content && msg.content[0] && msg.content[0].text) {
          const text = msg.content[0].text;
          
          if (text.includes('I found this CSC center information near')) {
            console.log('Found CSC message:', text);
            const startMarker = text.indexOf(': ') + 2;
            const endMarker = text.indexOf('. Please tell');
            
            if (startMarker > 1 && endMarker > startMarker) {
              cscCenterAddress = text.substring(startMarker, endMarker).trim();
              console.log('Extracted CSC address:', cscCenterAddress);
              break;
            }
          }
        }
      }
      
      if (cscCenterAddress && cscCenterAddress.length > 10) {
        console.log('Using CSC center from conversation history');
        officeDetails = {
          officeId: 'csc-' + Date.now(),
          name: 'CSC Center',
          type: 'CSC' as OfficeType,
          address: cscCenterAddress,
          contactNumber: '044-XXXXXXXX',
          distanceKm: 5,
          workingHours: '9:00 AM - 5:00 PM',
          location: location,
        };
      } else {
        // No CSC center found - throw error
        console.error('No CSC center found');
        throw new AppError(
          ErrorType.NOT_FOUND_ERROR,
          'No CSC center found',
          'Please provide your location to find nearby CSC center.',
          ErrorSeverity.MEDIUM
        );
      }
    }

    // Generate referral card
    const card = await generateCard(
      phoneNumber,
      selectedScheme.schemeName,
      eligibilityStatus as 'ELIGIBLE' | 'PENDING_DOCS' | 'NEEDS_CORRECTION',
      documentStatuses,
      officeDetails,
      language
    );

    // Convert card timestamp to ISO string for DynamoDB
    const cardForSession: ReferralCard = {
      ...card,
      timestamp: card.timestamp.toISOString() as any,
    };

    // Update session
    await updateSession(session.sessionId, phoneNumber, {
      currentStep: 'COMPLETED' as WorkflowStep,
      status: 'COMPLETED' as SessionStatus,
      referralCards: [cardForSession],
      recommendedOffice: officeDetails,
    });

    // Generate voice response
    const responseText = `आपका रेफरल कार्ड तैयार है। कृपया ${officeDetails.name} पर जाएं।`;
    const responseAudio = await synthesizeSpeech(responseText, language);

    return NextResponse.json({
      success: true,
      card,
      office: officeDetails,
      responseMessage: responseText,
      responseAudio: responseAudio.data.toString('base64'),
    });
  } catch (error) {
    logError(error as Error, { phoneNumber, language });
    throw error;
  }
}

/**
 * Handle get session
 */
async function handleGetSession(phoneNumber: string, language: Language = 'hi-IN') {
  try {
    const session = await getOrCreateSession(phoneNumber, language);

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        language: session.language,
        currentStep: session.currentStep,
        status: session.status,
        schemeMatches: session.schemeMatches,
        documents: session.documents,
        referralCards: session.referralCards,
        pendingActions: session.pendingActions,
      },
    });
  } catch (error) {
    logError(error as Error, { phoneNumber });
    throw error;
  }
}

/**
 * Check rate limit for phone number
 */
function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const limit = sessionLimits.get(phoneNumber);

  if (!limit || now > limit.resetTime) {
    // Reset limit (24 hours)
    sessionLimits.set(phoneNumber, {
      count: 1,
      resetTime: now + 24 * 60 * 60 * 1000,
    });
    return false;
  }

  if (limit.count >= 10) {
    return true; // Rate limited
  }

  limit.count++;
  return false;
}

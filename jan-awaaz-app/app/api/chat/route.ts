/**
 * Conversational Chat API
 * Handles multi-turn conversation with Claude Haiku
 */

import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { findMatchingSchemes } from '@/lib/aws/scheme-service';
import { getOrCreateSession, updateSession } from '@/lib/aws/session-service';
import { awsConfig, bedrockConfig } from '@/lib/aws/config';
import { Language } from '@/lib/types';

const bedrockClient = new BedrockRuntimeClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

export async function POST(request: NextRequest) {
  try {
    const { message, phoneNumber, language = 'hi-IN' } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('Chat request:', { message, phoneNumber, language });

    // Check if this is a document verification notification
    const isDocumentVerified = message === '[DOCUMENT_VERIFIED]';

    // Get or create session from DynamoDB
    const session = await getOrCreateSession(phoneNumber, language as Language);
    console.log('Session:', session.sessionId);

    // Build conversation history from session (not from request)
    const conversationHistory = (session as any).conversationHistory || [];
    console.log('Loaded conversation history:', conversationHistory.length, 'messages');
    
    // If document was just verified, add a system message
    const actualMessage = isDocumentVerified 
      ? 'My document has been verified successfully' 
      : message;
    
    // Check if we need to search for schemes (user is describing their situation)
    // Search if: no schemes in session yet AND not a greeting AND not document-related
    const isGreeting = /^(hello|hi|hey|namaste|नमस्ते|हेलो|हाय)/i.test(actualMessage);
    const isDocumentResponse = /document|दस्तावेज़|show|दिखा|ready|तैयार/i.test(actualMessage);
    const needsSchemeSearch = !session.schemeMatches?.length && !isGreeting && !isDocumentResponse && !isDocumentVerified;
    
    let schemes: any[] = session.schemeMatches || [];
    
    // Search for schemes if needed
    if (needsSchemeSearch && actualMessage.length > 10) {
      console.log('Searching for schemes based on user message...');
      schemes = await findMatchingSchemes(actualMessage, language as Language);
      console.log('Found schemes:', schemes.length);
      if (schemes.length > 0) {
        console.log('Scheme names:', schemes.map(s => s.schemeName));
        
        // Initialize document tracking
        const requiredDocs = schemes[0].requiredDocuments || [];
        const docCount = requiredDocs.length;
        
        // Store schemes in session immediately with document tracking
        await updateSession(session.sessionId, phoneNumber, {
          schemeMatches: schemes,
          currentStep: 'SCHEME_MATCHING',
          documentsRequired: docCount,
          documentsUploaded: 0,
          requiredDocumentTypes: requiredDocs,
          uploadedDocumentTypes: [],
          currentDocumentIndex: 0,
        });
        
        console.log(`Initialized document tracking: ${docCount} documents required`);
      }
    }
    
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: [{ text: actualMessage }],
      },
    ];

    // System prompt for conversational assistant
    let systemPrompt = `You are a helpful government scheme assistant for India. You help users find and apply for government schemes.

IMPORTANT RULES:
1. Always respond in ${getLanguageName(language as string)} language
2. Be warm, friendly, and conversational
3. When user greets you, greet them back warmly
4. Ask clarifying questions if needed to understand their situation
5. When you understand their need, explain the matching scheme with:
   - Scheme name
   - What it provides (benefits)
   - Eligibility criteria (who can apply)
   - Required documents
6. ALWAYS ask if they have the documents - DO NOT skip this step
7. ONLY when user confirms they have documents, respond with: "[READY_FOR_DOCUMENTS]"
8. DO NOT give online portal links or upload instructions - we will capture documents via camera
9. Keep responses concise but complete
10. Do NOT mention multiple schemes - focus on the single best match

CRITICAL: DOCUMENT FLOW
Step 1: After explaining scheme, ALWAYS ask: "क्या आपके पास ये दस्तावेज हैं?" (Do you have these documents?)
Step 2: WAIT for user response
Step 3: ONLY if user says yes/ready, include [READY_FOR_DOCUMENTS] in response

DOCUMENT CAPTURE TRIGGER - ONLY use [READY_FOR_DOCUMENTS] when user says:
- "yes" / "हां" / "yes I have" / "हां मेरे पास हैं"
- "I'm ready" / "मैं तैयार हूं"
- "I can show" / "मैं दिखा सकता हूं"
- "let me show" / "मैं दिखाता हूं"

RESPONSE FORMAT when user confirms:
"बहुत अच्छा! कृपया अपने दस्तावेज कैमरे में दिखाएं। [READY_FOR_DOCUMENTS]"

AFTER DOCUMENT VERIFICATION:
When user says "My document has been verified successfully":
- Congratulate them
- Ask them for their location (city or area name) in ${getLanguageName(language as string)}
- Example: "बहुत बढ़िया! आपका दस्तावेज़ सत्यापित हो गया है। कृपया मुझे बताएं आप किस शहर या क्षेत्र में रहते हैं?"
- Wait for user to provide their location
- DO NOT include any markers yet

AFTER USER PROVIDES LOCATION:
When user tells their city/area:
- Thank them and tell them you are searching for CSC center
- Include [SEARCH_CSC_CENTER] marker
- Example: "धन्यवाद! मैं [city name] में आपके नजदीकी CSC सेंटर की जानकारी ढूंढ रहा हूं... [SEARCH_CSC_CENTER]"

After finding CSC center:
- Present the complete CSC center name and address to the user
- Include [GENERATE_REFERRAL] marker
- Example: "मुझे आपके लिए एक CSC सेंटर मिला है: [center name], पता: [complete address]. अब मैं आपके लिए रेफरल कार्ड तैयार कर रहा हूं। [GENERATE_REFERRAL]"

Current conversation language: ${getLanguageName(language as string)}`;

    // Add scheme information to prompt if available
    if (schemes.length > 0) {
      const topScheme = schemes[0];
      const requiredDocs = topScheme.requiredDocuments || [];
      const docCount = requiredDocs.length;
      const docNames = (topScheme as any).documentNames || [];
      
      systemPrompt += `\n\nMATCHED SCHEME INFORMATION:
Scheme Name: ${topScheme.schemeName}
Eligibility: ${topScheme.eligibilityCriteria.join(', ')}
Required Documents (${docCount} total): ${docNames.length > 0 ? docNames.join(', ') : requiredDocs.join(', ')}

DOCUMENT CAPTURE INSTRUCTIONS:
- This scheme requires ${docCount} document${docCount > 1 ? 's' : ''}
- The specific documents needed are: ${docNames.length > 0 ? docNames.join(', ') : requiredDocs.join(', ')}
- When user confirms they have documents, tell them: "कृपया अपने ${docCount} दस्तावेज़ एक-एक करके दिखाएं।"
- List the specific documents by name: ${docNames.length > 0 ? docNames.map((name, i) => `${i + 1}. ${name}`).join(', ') : ''}
- Tell them they can SKIP documents they don't have: "अगर कोई दस्तावेज़ नहीं है तो छोड़ सकते हैं।"
- Then include [READY_FOR_DOCUMENTS] marker
- The system will automatically handle capturing each document
- Users can skip documents they don't have - they can show them at CSC center
- After all ${docCount} documents are verified/skipped, user will return to you
- Then ask for their location to find CSC center

Use this information to explain the scheme to the user in ${getLanguageName(language as string)} language.`;
    }

    // Call Claude Haiku for conversation
    const command = new ConverseCommand({
      modelId: bedrockConfig.modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 2000, // Increased for longer responses
        temperature: 0.7,
      },
    });

    const response = await bedrockClient.send(command);
    const assistantMessage = response.output?.message?.content?.[0]?.text || '';

    console.log('Assistant response:', assistantMessage);
    
    // Check if user is ready for document capture
    const readyForDocuments = assistantMessage.includes('[READY_FOR_DOCUMENTS]');
    
    // Check if we need to search for CSC center
    const searchCSCCenter = assistantMessage.includes('[SEARCH_CSC_CENTER]');
    
    // Check if we need to generate referral card
    const generateReferral = assistantMessage.includes('[GENERATE_REFERRAL]');

    // If we need to search for CSC center, do it now
    let cscCenterInfo = null;
    if (searchCSCCenter) {
      console.log('Searching for CSC center near user...');
      
      // Extract user's location from the conversation
      // Look at recent messages to find the city/area they mentioned
      const recentMessages = messages.slice(-3).filter(m => m.role === 'user').map(m => m.content[0].text).join(' ');
      console.log('Recent user messages for location:', recentMessages);
      
      // Use the user's location from their message
      const userLocation = recentMessages; // This contains the city/area they mentioned
      
      // Search for CSC centers using Bedrock with the actual user location
      try {
        const searchQuery = `Find a CSC center (Common Service Centre) near ${userLocation} India. Provide ONLY the following details in this exact format:

Name: [CSC center name]
Address: [Complete street address with building number, street name, area]
Landmark: [Nearby landmark]
Contact Number: [Phone number]

Do not include any disclaimers, explanations, or additional text. Just provide the 4 lines above with actual information.`;
        console.log('Searching for CSC center:', searchQuery);
        
        // Use Bedrock to search for CSC center information
        const searchCommand = new ConverseCommand({
          modelId: bedrockConfig.modelId,
          messages: [
            {
              role: 'user',
              content: [{ text: searchQuery }],
            },
          ],
          system: [{ text: `You are a CSC location database. Provide ONLY the requested information in the exact format specified. No disclaimers, no explanations, no additional text. Just the 4 lines: Name, Address, Landmark, Contact Number.` }],
          inferenceConfig: {
            maxTokens: 300,
            temperature: 0.3,
          },
        });
        
        const searchResponse = await bedrockClient.send(searchCommand);
        const searchResult = searchResponse.output?.message?.content?.[0]?.text || '';
        
        console.log('CSC search result:', searchResult);
        
        // Extract only the relevant CSC information (skip disclaimers)
        let cleanedResult = searchResult;
        
        // If response contains "here is the most likely" or similar, extract only the address part
        if (searchResult.includes('here is the most likely') || searchResult.includes('However, based on')) {
          // Find where the actual address starts (after "Name:")
          const nameIndex = searchResult.indexOf('Name:');
          if (nameIndex !== -1) {
            // Extract from "Name:" onwards
            cleanedResult = searchResult.substring(nameIndex);
            
            // Remove any text after the contact number (disclaimers, recommendations, etc.)
            const lines = cleanedResult.split('\n');
            const relevantLines = [];
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('Name:') || 
                  trimmed.startsWith('Address:') || 
                  trimmed.startsWith('Landmark:') || 
                  trimmed.startsWith('Contact Number:')) {
                relevantLines.push(trimmed);
              }
              // Stop after we have all 4 fields
              if (relevantLines.length === 4) break;
            }
            
            cleanedResult = relevantLines.join('\n');
            console.log('Cleaned CSC result:', cleanedResult);
          }
        }
        
        if (cleanedResult && cleanedResult.length > 20) {
          cscCenterInfo = {
            name: 'CSC Center',
            address: cleanedResult,
            source: 'AI Search',
          };
          
          // Parse the CSC info to extract just the values (remove English labels)
          const lines = cleanedResult.split('\n');
          let cscName = '';
          let cscAddress = '';
          let cscLandmark = '';
          let cscPhone = '';
          
          for (const line of lines) {
            if (line.startsWith('Name:')) {
              cscName = line.replace('Name:', '').trim();
            } else if (line.startsWith('Address:')) {
              cscAddress = line.replace('Address:', '').trim();
            } else if (line.startsWith('Landmark:')) {
              cscLandmark = line.replace('Landmark:', '').trim();
            } else if (line.startsWith('Contact Number:')) {
              cscPhone = line.replace('Contact Number:', '').trim();
            }
          }
          
          // Translate the address to user's language using Bedrock
          const translateQuery = `Translate this CSC center information to ${getLanguageName(language as string)}. Provide ONLY the translated text, no explanations:

Name: ${cscName}
Address: ${cscAddress}
Landmark: ${cscLandmark}
Contact Number: ${cscPhone}`;

          const translateCommand = new ConverseCommand({
            modelId: bedrockConfig.modelId,
            messages: [{ role: 'user', content: [{ text: translateQuery }] }],
            system: [{ text: `You are a translator. Translate the given text to ${getLanguageName(language as string)} and return ONLY the translation, nothing else.` }],
            inferenceConfig: {
              maxTokens: 300,
              temperature: 0.3,
            },
          });

          const translateResponse = await bedrockClient.send(translateCommand);
          const translatedAddress = translateResponse.output?.message?.content?.[0]?.text || cleanedResult;
          
          console.log('Translated CSC address:', translatedAddress);
          
          // Save translated CSC center info to session
          await updateSession(session.sessionId, phoneNumber, {
            cscCenterInfo: {
              name: 'CSC Center',
              address: translatedAddress, // Use translated address
              phone: cscPhone,
            },
          } as any);
          
          console.log('Saved translated CSC center to session');
          
          // Ask Haiku to present the address details in user's language
          const followUpMessage = `I found a CSC center near ${userLocation}. Present this information to the user in ${getLanguageName(language as string)} naturally:

Center: ${cscName}
Location: ${cscAddress}
Nearby: ${cscLandmark}
Contact: ${cscPhone}

After telling them, include [GENERATE_REFERRAL] marker.`;
          
          // Make another call to Haiku with the CSC info
          const followUpMessages = [
            ...conversationHistory,
            { role: 'user', content: [{ text: actualMessage }] },
            { role: 'assistant', content: [{ text: assistantMessage }] },
            { role: 'user', content: [{ text: followUpMessage }] },
          ];
          
          const followUpCommand = new ConverseCommand({
            modelId: bedrockConfig.modelId,
            messages: followUpMessages,
            system: [{ text: systemPrompt }],
            inferenceConfig: {
              maxTokens: 2000,
              temperature: 0.7,
            },
          });
          
          const followUpResponse = await bedrockClient.send(followUpCommand);
          const followUpText = followUpResponse.output?.message?.content?.[0]?.text || '';
          
          console.log('Follow-up response with CSC info:', followUpText);
          
          // Update the assistant message with the follow-up
          const updatedHistory = [
            ...conversationHistory,
            { role: 'user', content: [{ text: actualMessage }] },
            { role: 'assistant', content: [{ text: assistantMessage }] },
            { role: 'user', content: [{ text: followUpMessage }] },
            { role: 'assistant', content: [{ text: followUpText }] },
          ];
          
          await updateSession(session.sessionId, phoneNumber, {
            conversationHistory: updatedHistory,
            lastMessage: actualMessage, // Keep the actual user message
            currentStep: followUpText.includes('[GENERATE_REFERRAL]') ? 'REFERRAL_GENERATION' : session.currentStep,
          });
          
          return NextResponse.json({
            success: true,
            message: followUpText.replace('[GENERATE_REFERRAL]', '').trim(),
            schemes,
            readyForDocuments: false,
            generateReferral: followUpText.includes('[GENERATE_REFERRAL]'),
            sessionId: session.sessionId,
            cscCenter: {
              name: 'CSC Center',
              address: cleanedResult, // Use cleaned result
              phone: '044-XXXXXXXX',
            },
          });
        }
      } catch (error) {
        console.error('Error searching for CSC center:', error);
        // Continue with default flow if search fails
      }
    }

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: [{ text: actualMessage }] },
      { role: 'assistant', content: [{ text: assistantMessage }] },
    ];

    // Prepare session updates
    const sessionUpdates: any = {
      conversationHistory: updatedHistory,
      lastMessage: actualMessage,
    };

    // Update current step based on conversation state
    if (readyForDocuments) {
      sessionUpdates.currentStep = 'DOCUMENT_UPLOAD';
    } else if (generateReferral) {
      sessionUpdates.currentStep = 'REFERRAL_GENERATION';
    }

    // Update session in DynamoDB
    await updateSession(session.sessionId, phoneNumber, sessionUpdates);
    
    // Reload session to get updated CSC center info if it was saved
    const updatedSession = await getOrCreateSession(phoneNumber, language as Language);
    const sessionCscCenter = (updatedSession as any).cscCenterInfo || null;
    
    console.log('CSC center from session for response:', sessionCscCenter);

    return NextResponse.json({
      success: true,
      message: assistantMessage.replace('[SEARCH_CSC_CENTER]', '').replace('[READY_FOR_DOCUMENTS]', '').replace('[GENERATE_REFERRAL]', '').trim(),
      schemes,
      readyForDocuments, // Signal to frontend to open camera
      generateReferral, // Signal to frontend to show referral card
      sessionId: session.sessionId,
      cscCenter: generateReferral ? sessionCscCenter : undefined, // Include CSC center when generating referral
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getLanguageName(language: string): string {
  const languageNames: Record<string, string> = {
    'hi-IN': 'Hindi (हिंदी)',
    'ta-IN': 'Tamil (தமிழ்)',
    'te-IN': 'Telugu (తెలుగు)',
    'kn-IN': 'Kannada (ಕನ್ನಡ)',
    'ml-IN': 'Malayalam (മലയാളം)',
    'mr-IN': 'Marathi (मराठी)',
    'bn-IN': 'Bengali (বাংলা)',
    'gu-IN': 'Gujarati (ગુજરાતી)',
    'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
    'or-IN': 'Odia (ଓଡ଼ିଆ)',
  };
  return languageNames[language] || 'Hindi (हिंदी)';
}

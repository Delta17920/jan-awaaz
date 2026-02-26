/**
 * Scheme Matching Service
 * Integrates with Amazon Bedrock Knowledge Base for RAG-based scheme matching
 */

import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { awsConfig, bedrockConfig } from './config';
import {
  SchemeMatch,
  SchemeMatchData,
  SchemeDetails,
  Language,
  DocumentType,
  ApplicationProcessType,
  SchemeCategory,
  BenefitType,
  BenefitFrequency,
} from '../types';

const bedrockClient = new BedrockAgentRuntimeClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

// Confidence threshold for scheme matching
const CONFIDENCE_THRESHOLD = 0.7;
const MAX_RESULTS = 3;

/**
 * Get language name for prompts
 */
function getLanguageName(language: Language): string {
  const languageNames: Record<Language, string> = {
    'hi-IN': 'Hindi',
    'ta-IN': 'Tamil',
    'te-IN': 'Telugu',
    'kn-IN': 'Kannada',
    'ml-IN': 'Malayalam',
    'mr-IN': 'Marathi',
    'bn-IN': 'Bengali',
    'gu-IN': 'Gujarati',
    'pa-IN': 'Punjabi',
    'or-IN': 'Odia',
  };
  return languageNames[language] || 'Hindi';
}

/**
 * Query expansion: Map colloquial phrases to scheme keywords
 */
const queryExpansionMap: Record<string, string[]> = {
  'husband died': ['widow', 'vidhwa', 'pension', 'financial assistance', 'death benefit', 'spouse death'],
  'wife died': ['widower', 'pension', 'financial assistance', 'death benefit', 'spouse death'],
  'no land': ['landless', 'housing', 'land allocation', 'shelter'],
  'farmer': ['agriculture', 'crop', 'irrigation', 'kisan', 'farming', 'agricultural'],
  'old age': ['senior citizen', 'pension', 'elderly', 'aged', 'old'],
  'disability': ['divyang', 'handicapped', 'special needs', 'disabled', 'differently abled'],
  'education': ['scholarship', 'school', 'student', 'study', 'chhatravritti'],
  'health': ['medical', 'hospital', 'treatment', 'insurance', 'healthcare'],
  'unemployment': ['job', 'employment', 'rojgar', 'skill training', 'unemployed'],
  'financial support': ['assistance', 'aid', 'subsidy', 'benefit', 'pension'],
  'need money': ['financial assistance', 'pension', 'subsidy', 'benefit'],
  'no income': ['financial assistance', 'pension', 'subsidy', 'support'],
};

/**
 * Expand user query with related keywords
 */
function expandQuery(userStory: string): string {
  let expandedQuery = userStory.toLowerCase();

  for (const [phrase, keywords] of Object.entries(queryExpansionMap)) {
    if (expandedQuery.includes(phrase)) {
      expandedQuery += ' ' + keywords.join(' ');
    }
  }

  return expandedQuery;
}

/**
 * Find matching schemes based on user story using Bedrock Knowledge Base
 */
export async function findMatchingSchemes(
  userStory: string,
  language: Language = 'hi-IN'
): Promise<SchemeMatch[]> {
  try {
    // Expand query with related keywords
    const expandedQuery = expandQuery(userStory);

    console.log('Searching for schemes with query:', expandedQuery);

    // Run both calls in parallel - speech first for faster response
    const speechCommand = new RetrieveAndGenerateCommand({
      input: {
        text: `Find government schemes that match this situation: ${expandedQuery}

Provide a conversational response in ${getLanguageName(language)} language that includes:
1. The name of the top matching scheme
2. A brief description of what the scheme provides
3. Key eligibility criteria (who can apply)
4. Required MANDATORY documents needed for application (list each one by name)
5. End by asking if the user has these documents

Be warm and conversational in ${getLanguageName(language)} language.`,
      },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: bedrockConfig.knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${awsConfig.region}::foundation-model/${bedrockConfig.modelId}`,
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 10,
            },
          },
        },
      },
    });

    const metadataCommand = new RetrieveAndGenerateCommand({
      input: {
        text: `Find the government scheme that matches this situation: ${expandedQuery}

Extract ONLY the following information in this EXACT format (no additional text):

SCHEME_NAME: [exact full scheme name in English]
DOCUMENT_COUNT: [number of mandatory documents only, e.g., 3]
DOCUMENT_NAMES: [comma-separated list of mandatory document names in English, e.g., "Aadhaar Card, Death Certificate, Income Certificate"]

Provide ONLY these 3 lines. No explanations, no additional text.`,
      },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: bedrockConfig.knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${awsConfig.region}::foundation-model/${bedrockConfig.modelId}`,
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 10,
            },
          },
        },
      },
    });

    // Execute both in parallel
    const [speechResponse, metadataResponse] = await Promise.all([
      bedrockClient.send(speechCommand),
      bedrockClient.send(metadataCommand),
    ]);

    const responseText = speechResponse.output?.text || '';
    console.log('Speech response text:', responseText);

    const metadataText = metadataResponse.output?.text || '';
    console.log('Metadata extraction response:', metadataText);

    // Parse metadata from parallel response
    let schemeName = 'Unknown Scheme';
    let documentCount = 1;
    let documentNames: string[] = [];
    
    const nameMatch = metadataText.match(/SCHEME_NAME:\s*(.+?)(?:\n|$)/i);
    if (nameMatch) {
      schemeName = nameMatch[1].trim();
      console.log('Extracted scheme name:', schemeName);
    }
    
    const countMatch = metadataText.match(/DOCUMENT_COUNT:\s*(\d+)/i);
    if (countMatch) {
      documentCount = parseInt(countMatch[1], 10);
      console.log('Extracted document count:', documentCount);
    }
    
    const namesMatch = metadataText.match(/DOCUMENT_NAMES:\s*(.+?)(?:\n|$)/i);
    if (namesMatch) {
      documentNames = namesMatch[1].split(',').map(name => name.trim());
      console.log('Extracted document names:', documentNames);
    }

    if (!responseText || responseText.includes('unable to assist') || responseText.includes('Sorry')) {
      console.log('Bedrock refused to answer, trying Retrieve API fallback');
      return await findMatchingSchemesWithRetrieve(expandedQuery);
    }

    // Parse schemes from the response text and citations
    const schemes: SchemeMatch[] = [];
    const citations = speechResponse.citations || [];

    if (citations.length > 0) {
      const seenSchemes = new Set<string>();
      
      for (const citation of citations) {
        const references = citation.retrievedReferences || [];
        
        for (const ref of references) {
          const content = ref.content?.text || '';
          const sourceUri = ref.location?.s3Location?.uri || 'Unknown';
          
          if (content) {
            // Calculate relevance score based on keyword matching
            const relevanceScore = calculateRelevanceScore(content, expandedQuery);
            const scheme = extractSchemeFromContent(content, sourceUri, relevanceScore);
            
            if (scheme && !seenSchemes.has(scheme.schemeId)) {
              seenSchemes.add(scheme.schemeId);
              schemes.push(scheme);
              console.log('Extracted scheme:', scheme.schemeName, 'with score:', relevanceScore);
            }
          }
        }
      }
      
      // Sort by relevance score (highest first)
      schemes.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    console.log('Final schemes to return:', schemes.length);
    
    // If we extracted metadata but have no schemes from citations, create one
    if (schemes.length === 0 && schemeName !== 'Unknown Scheme') {
      console.log('No schemes from citations, creating scheme from metadata');
      
      // Create scheme from metadata
      const documents: DocumentType[] = [];
      for (let i = 0; i < documentCount; i++) {
        if (i === 0) documents.push('AADHAAR');
        else if (i === 1) documents.push('INCOME_CERTIFICATE');
        else if (i === 2) documents.push('INCOME_CERTIFICATE');
        else documents.push('AADHAAR');
      }
      
      const schemeId = schemeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      schemes.push({
        schemeId,
        schemeName,
        relevanceScore: 0.8,
        eligibilityCriteria: ['Please check with local office for eligibility criteria'],
        requiredDocuments: documents,
        applicationProcess: {
          type: 'PHYSICAL' as ApplicationProcessType,
          steps: ['Visit local government office', 'Submit application form', 'Provide required documents'],
          estimatedTime: '7-14 days',
          fees: 0,
        },
        sourceDocument: 'Bedrock Knowledge Base',
      });
      
      console.log('Created scheme from metadata:', schemeName);
    }
    
    // Return schemes with the speech text from Bedrock
    const result = schemes.slice(0, MAX_RESULTS);
    
    // If we have schemes, update the first one with metadata
    if (result.length > 0) {
      // Update scheme name if we extracted it from metadata
      if (schemeName !== 'Unknown Scheme') {
        result[0].schemeName = schemeName;
        result[0].schemeId = schemeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      
      // Update document count - create array of correct length
      const documents: DocumentType[] = [];
      for (let i = 0; i < documentCount; i++) {
        if (i === 0) documents.push('AADHAAR');
        else if (i === 1) documents.push('INCOME_CERTIFICATE');
        else if (i === 2) documents.push('INCOME_CERTIFICATE');
        else documents.push('AADHAAR');
      }
      result[0].requiredDocuments = documents;
      
      // Store document names as metadata for Haiku to use
      (result[0] as any).documentNames = documentNames;
      
      console.log('Updated scheme with metadata:', result[0].schemeName, 'documents:', documentCount, 'names:', documentNames);
      
      // Attach the Bedrock-generated speech text
      if (responseText) {
        (result[0] as any).speechText = responseText.trim();
      }
    }
    
    return result;

  } catch (error) {
    console.error('Error finding matching schemes:', error);
    throw new Error('Failed to find matching schemes. Please try again.');
  }
}

/**
 * Fallback: Use Retrieve API directly when RetrieveAndGenerate refuses to answer
 */
async function findMatchingSchemesWithRetrieve(query: string): Promise<SchemeMatch[]> {
  try {
    console.log('Using Retrieve API fallback');
    
    const retrieveCommand = new RetrieveCommand({
      knowledgeBaseId: bedrockConfig.knowledgeBaseId,
      retrievalQuery: {
        text: query,
      },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: MAX_RESULTS * 2,
        },
      },
    });

    const retrieveResponse = await bedrockClient.send(retrieveCommand);
    console.log('Retrieved documents:', retrieveResponse.retrievalResults?.length || 0);

    if (!retrieveResponse.retrievalResults || retrieveResponse.retrievalResults.length === 0) {
      return [];
    }

    const schemes: SchemeMatch[] = [];
    const seenSchemes = new Set<string>();

    for (const result of retrieveResponse.retrievalResults) {
      const content = result.content?.text || '';
      const score = result.score || 0;
      const sourceUri = result.location?.s3Location?.uri || 'Unknown';

      const scheme = extractSchemeFromContent(content, sourceUri, score);
      
      if (scheme && !seenSchemes.has(scheme.schemeId)) {
        seenSchemes.add(scheme.schemeId);
        schemes.push(scheme);
        console.log('Extracted scheme from retrieve:', scheme.schemeName);
      }

      if (schemes.length >= MAX_RESULTS) {
        break;
      }
    }

    return schemes;
  } catch (error) {
    console.error('Error in Retrieve API fallback:', error);
    return [];
  }
}

/**
 * Calculate relevance score based on keyword matching
 */
function calculateRelevanceScore(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let score = 0.5; // Base score
  
  // Split query into keywords
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 3);
  
  // Check how many keywords appear in content
  for (const keyword of keywords) {
    if (contentLower.includes(keyword)) {
      score += 0.1;
    }
  }
  
  // Boost score significantly if scheme name or keywords section matches
  const keywordsSection = content.match(/Keywords:(.+)/i);
  if (keywordsSection) {
    const keywordsSectionLower = keywordsSection[1].toLowerCase();
    for (const keyword of keywords) {
      if (keywordsSectionLower.includes(keyword)) {
        score += 0.3; // Much higher boost for keyword section matches
      }
    }
  }
  
  // Boost for specific important keywords
  const importantKeywords = ['widow', 'vidhwa', 'husband died', 'farmer', 'kisan', 'education', 'scholarship'];
  for (const important of importantKeywords) {
    if (queryLower.includes(important) && contentLower.includes(important)) {
      score += 0.4; // Big boost for important keyword matches
    }
  }
  
  // Cap score at 1.0
  return Math.min(score, 1.0);
}

/**
 * Fallback: Extract schemes from natural language response when JSON parsing fails
 */
function extractSchemesFromNaturalLanguage(responseText: string, citations: any[]): any[] {
  console.log('Using fallback natural language extraction');
  
  const schemes: any[] = [];
  
  // Try to find scheme names in the response
  const schemeNamePatterns = [
    /(?:Scheme|योजना):\s*([^\n]+)/gi,
    /(?:Name|नाम):\s*([^\n]+)/gi,
    /\d+\.\s*([^\n]+?(?:Scheme|योजना|Yojana))/gi,
  ];
  
  const foundSchemes = new Set<string>();
  
  for (const pattern of schemeNamePatterns) {
    const matches = responseText.matchAll(pattern);
    for (const match of matches) {
      const schemeName = match[1].trim();
      if (schemeName && schemeName.length > 5 && !foundSchemes.has(schemeName)) {
        foundSchemes.add(schemeName);
        
        schemes.push({
          schemeName,
          eligibilityCriteria: ['Please check with local office for eligibility criteria'],
          requiredDocuments: ['AADHAAR'],
          applicationProcess: {
            type: 'PHYSICAL',
            steps: ['Visit local government office', 'Submit application form', 'Provide required documents'],
            estimatedTime: '7-14 days',
            fees: 0
          }
        });
      }
    }
  }
  
  console.log('Extracted schemes from natural language:', schemes);
  return schemes;
}

/**
 * Empty parser (deprecated by JSON logic above)
 */
function parseSchemeResponse(responseText: string, citations: any[]): SchemeMatch[] {
  return [];
}

/**
 * Extract scheme details from content text
 */
function extractSchemeFromContent(
  content: string,
  sourceDocument: string,
  relevanceScore: number
): SchemeMatch | null {
  try {
    // Extract scheme name - prioritize "Scheme Name:" field
    let schemeName = 'Unknown Scheme';
    
    // First try to find "Scheme Name:" field
    const nameMatch = content.match(/Scheme Name:\s*(.+?)(?:\n|$)/i);
    if (nameMatch) {
      schemeName = nameMatch[1].trim();
    } else {
      // Fallback: use first line if it looks like a title (all caps or contains "SCHEME")
      const firstLineMatch = content.match(/^(.+?)(?:\n|$)/);
      if (firstLineMatch) {
        const firstLine = firstLineMatch[1].trim();
        if (firstLine.toUpperCase() === firstLine || firstLine.toLowerCase().includes('scheme')) {
          schemeName = firstLine;
        }
      }
    }
    
    console.log('Extracted scheme name:', schemeName);

    // Extract eligibility criteria
    const eligibilitySection = content.match(/Eligibility Criteria:?\s*\n([\s\S]*?)(?=\n\n|Required Documents:|Benefits:|Application Process:|$)/i);
    const eligibilityCriteria: string[] = [];
    if (eligibilitySection) {
      const lines = eligibilitySection[1].split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim();
        if (cleaned && cleaned.length > 5) {
          eligibilityCriteria.push(cleaned);
        }
      }
    }
    
    console.log('Extracted eligibility criteria:', eligibilityCriteria.length, 'items');

    // Extract required documents
    const documentsSection = content.match(/Required Documents:?\s*\n([\s\S]*?)(?=\n\n|Benefits:|Application Process:|Contact Information:|$)/i);
    const requiredDocuments: DocumentType[] = [];
    if (documentsSection) {
      const docText = documentsSection[1];
      const docLines = docText.split('\n');
      
      console.log('Found documents section with', docLines.length, 'lines');
      
      // Count all numbered/bulleted document lines
      for (const line of docLines) {
        const trimmed = line.trim();
        // Check if line starts with number, bullet, or dash (indicates a document item)
        if (/^[\d•\-*]+[\.\):]?\s+/.test(trimmed) && trimmed.length > 5) {
          const docLower = trimmed.toLowerCase();
          
          console.log('Processing document line:', trimmed);
          
          // Map to document types
          if (docLower.includes('aadhaar') || docLower.includes('आधार')) {
            requiredDocuments.push('AADHAAR');
          } else if (docLower.includes('death') || docLower.includes('मृत्यु')) {
            requiredDocuments.push('INCOME_CERTIFICATE'); // Using INCOME_CERTIFICATE as placeholder for death cert
          } else if (docLower.includes('income') || docLower.includes('आय')) {
            requiredDocuments.push('INCOME_CERTIFICATE');
          } else if (docLower.includes('land') || docLower.includes('patta') || docLower.includes('भूमि')) {
            requiredDocuments.push('LAND_PATTA');
          } else {
            // For any other document, add as UNKNOWN to maintain count
            requiredDocuments.push('AADHAAR'); // Use AADHAAR as generic placeholder
          }
        }
      }
      
      console.log('Extracted', requiredDocuments.length, 'documents:', requiredDocuments);
    }

    // If no documents found, default to Aadhaar
    if (requiredDocuments.length === 0) {
      requiredDocuments.push('AADHAAR');
      console.log('No documents found, defaulting to AADHAAR');
    }

    // Extract application process
    const processSection = content.match(/Application Process:?\s*\n([\s\S]*?)(?=\n(?:Contact|Estimated Time|Fees|$))/i);
    const processSteps: string[] = [];
    let processType: ApplicationProcessType = 'PHYSICAL';
    
    if (processSection) {
      const processText = processSection[1];
      
      // Determine process type
      if (processText.toLowerCase().includes('online') && processText.toLowerCase().includes('physical')) {
        processType = 'HYBRID';
      } else if (processText.toLowerCase().includes('online')) {
        processType = 'ONLINE';
      }
      
      // Extract steps
      const typeMatch = processText.match(/Type:\s*(.+)/i);
      if (typeMatch) {
        const typeValue = typeMatch[1].toLowerCase();
        if (typeValue.includes('hybrid')) processType = 'HYBRID';
        else if (typeValue.includes('online')) processType = 'ONLINE';
        else processType = 'PHYSICAL';
      }
      
      const stepsMatch = processText.match(/Steps:?\s*\n([\s\S]*?)(?=\n(?:Estimated Time|Fees|$))/i);
      if (stepsMatch) {
        const lines = stepsMatch[1].split('\n');
        for (const line of lines) {
          const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').trim();
          if (cleaned && cleaned.length > 5) {
            processSteps.push(cleaned);
          }
        }
      }
    }

    // Generate scheme ID from name
    const schemeId = schemeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return {
      schemeId,
      schemeName,
      relevanceScore,
      eligibilityCriteria: eligibilityCriteria.length > 0 ? eligibilityCriteria : ['Please check with local office for eligibility criteria'],
      requiredDocuments,
      applicationProcess: {
        type: processType,
        steps: processSteps.length > 0 ? processSteps : ['Visit local government office', 'Submit application form', 'Provide required documents'],
        estimatedTime: '7-14 days',
        fees: 0,
      },
      sourceDocument,
    };
  } catch (error) {
    console.error('Error extracting scheme from content:', error);
    return null;
  }
}

/**
 * Get detailed information about a specific scheme
 */
export async function getSchemeDetails(schemeId: string): Promise<SchemeDetails | null> {
  try {
    // Query Bedrock Knowledge Base for specific scheme
    const command = new RetrieveAndGenerateCommand({
      input: {
        text: `Provide complete details about the scheme with ID: ${schemeId}. 
               Include description, eligibility criteria, benefits, required documents, 
               application process, and contact information.`,
      },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: bedrockConfig.knowledgeBaseId,
          modelArn: `arn:aws:bedrock:${awsConfig.region}::foundation-model/${bedrockConfig.modelId}`,
        },
      },
    });

    const response = await bedrockClient.send(command);
    const responseText = response.output?.text || '';

    // Parse response into SchemeDetails
    return parseSchemeDetails(schemeId, responseText);

  } catch (error) {
    console.error('Error getting scheme details:', error);
    return null;
  }
}

/**
 * Parse scheme details from Bedrock response
 */
function parseSchemeDetails(schemeId: string, responseText: string): SchemeDetails | null {
  try {
    // Extract scheme name
    const nameMatch = responseText.match(/(?:Scheme Name|योजना का नाम):\s*(.+)/i);
    const schemeName = nameMatch ? nameMatch[1].trim() : schemeId;

    // Extract description
    const descMatch = responseText.match(/(?:Description|विवरण):\s*(.+?)(?=Eligibility|पात्रता|$)/is);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract eligibility
    const eligibilitySection = responseText.match(/(?:Eligibility|पात्रता):\s*(.+?)(?=Benefits|लाभ|$)/is);
    const eligibility = eligibilitySection
      ? eligibilitySection[1].split(/[•\n-]/).filter(e => e.trim()).map(e => e.trim())
      : [];

    // Extract benefits
    const benefitsSection = responseText.match(/(?:Benefits|लाभ):\s*(.+?)(?=Documents|दस्तावेज़|$)/is);
    const benefits = benefitsSection
      ? benefitsSection[1].split(/[•\n-]/).filter(b => b.trim()).map(b => b.trim())
      : [];

    // Extract documents
    const documentsSection = responseText.match(/(?:Required Documents|आवश्यक दस्तावेज़):\s*(.+?)(?=Application|आवेदन|$)/is);
    const documentsList = documentsSection
      ? documentsSection[1].split(/[•\n-]/).filter(d => d.trim())
      : [];

    const documents: DocumentType[] = [];
    for (const doc of documentsList) {
      const docLower = doc.toLowerCase();
      if (docLower.includes('aadhaar')) documents.push('AADHAAR');
      else if (docLower.includes('income')) documents.push('INCOME_CERTIFICATE');
      else if (docLower.includes('land') || docLower.includes('patta')) documents.push('LAND_PATTA');
    }

    // Extract application process
    const processSection = responseText.match(/(?:Application Process|आवेदन प्रक्रिया):\s*(.+?)(?=Contact|संपर्क|$)/is);
    const processSteps = processSection
      ? processSection[1].split(/[•\n-]/).filter(s => s.trim()).map(s => s.trim())
      : [];

    const processType: ApplicationProcessType =
      responseText.toLowerCase().includes('online') ? 'ONLINE' : 'PHYSICAL';

    // Extract contact info
    const helplineMatch = responseText.match(/(?:Helpline|हेल्पलाइन):\s*(\d{10,})/i);
    const websiteMatch = responseText.match(/(?:Website|वेबसाइट):\s*(https?:\/\/[^\s]+)/i);
    const emailMatch = responseText.match(/(?:Email|ईमेल):\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i);

    return {
      schemeId,
      schemeName,
      description,
      eligibility,
      benefits,
      documents,
      applicationProcess: {
        type: processType,
        steps: processSteps,
        estimatedTime: '7-14 days',
        fees: 0,
      },
      contactInfo: {
        helplineNumber: helplineMatch ? helplineMatch[1] : '1800-XXX-XXXX',
        email: emailMatch ? emailMatch[1] : undefined,
        websiteUrl: websiteMatch ? websiteMatch[1] : undefined,
      },
    };
  } catch (error) {
    console.error('Error parsing scheme details:', error);
    return null;
  }
}

/**
 * Validate that a scheme exists in the knowledge base (no hallucination)
 */
export async function validateSchemeExists(schemeId: string): Promise<boolean> {
  try {
    const details = await getSchemeDetails(schemeId);
    return details !== null;
  } catch (error) {
    console.error('Error validating scheme:', error);
    return false;
  }
}

/**
 * Referral Card Generator Service
 * Generates visual referral cards with QR codes for users
 * Uses SVG generation (Lambda-friendly, no heavy dependencies)
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig, s3Config } from './config';
import {
  ReferralCard,
  DocumentStatus,
  Office,
  IconType,
  DocumentType,
  Language,
} from '../types';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

// Card dimensions
const CARD_WIDTH = 800;
const CARD_HEIGHT = 1200;
const PADDING = 40;
const ICON_SIZE = 48;
const FONT_SIZE_TITLE = 32;
const FONT_SIZE_BODY = 20;
const FONT_SIZE_SMALL = 16;

// Colors - Dark Theme
const COLOR_GREEN = '#10B981'; // Emerald green
const COLOR_RED = '#EF4444'; // Bright red
const COLOR_YELLOW = '#F59E0B'; // Amber
const COLOR_BLUE = '#3B82F6'; // Bright blue
const COLOR_BLACK = '#FFFFFF'; // White text for dark background
const COLOR_WHITE = '#1F2937'; // Dark gray background
const COLOR_GRAY = '#9CA3AF'; // Light gray for secondary text
const COLOR_BACKGROUND = '#111827'; // Very dark background
const COLOR_CARD_BG = '#1F2937'; // Card background

/**
 * Translate ALL card content (keys and values) to user's language using Bedrock
 */
async function translateCardContent(
  schemeName: string,
  officeAddress: string,
  officeName: string,
  officePhone: string,
  officeHours: string,
  documentTypes: string[],
  documentStatuses: string[],
  eligibilityStatus: string,
  language: Language
): Promise<{
  translatedScheme: string;
  translatedAddress: string;
  translatedOfficeName: string;
  translatedOfficePhone: string;
  translatedOfficeHours: string;
  translatedDocuments: string[];
  translatedDocumentStatuses: string[];
  translatedEligibilityStatus: string;
  labels: {
    referralCard: string;
    refNo: string;
    date: string;
    scheme: string;
    eligibility: string;
    documents: string;
    office: string;
    phone: string;
    hours: string;
    footer: string;
  };
}> {
  const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
  const { awsConfig, bedrockConfig } = require('./config');
  
  const bedrockClient = new BedrockRuntimeClient({
    region: awsConfig.region,
    credentials: awsConfig.credentials,
  });
  
  const languageNames: Record<Language, string> = {
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
  
  const targetLanguage = languageNames[language] || 'Hindi (हिंदी)';
  
  // Build comprehensive translation query for ALL content
  const translateQuery = `Translate ALL of the following to ${targetLanguage}. Provide ONLY the translations in the exact same order, one per line. Do not include any English labels or explanations:

Referral Card
Reference Number
Date
Scheme
Eligibility Status
${eligibilityStatus}
Required Documents
Office Details
Phone
Working Hours
Jan-Awaaz | Government Scheme Assistant
${schemeName}
${officeName}
${officeAddress}
${officePhone}
${officeHours}
${documentTypes.join('\n')}
${documentStatuses.join('\n')}`;

  try {
    const command = new ConverseCommand({
      modelId: bedrockConfig.modelId,
      messages: [{ role: 'user', content: [{ text: translateQuery }] }],
      system: [{ text: `You are a translator. Translate ALL text to ${targetLanguage} and return ONLY the translations in the same order, one per line. No English text, no labels, no explanations.` }],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.3,
      },
    });
    
    const response = await bedrockClient.send(command);
    const translatedText = response.output?.message?.content?.[0]?.text || '';
    
    console.log('Translation response:', translatedText);
    
    const lines = translatedText.split('\n').filter((l: string) => l.trim()).map((l: string) => l.trim());
    
    let idx = 0;
    const translatedReferralCard = lines[idx++] || 'Referral Card';
    const translatedRefNo = lines[idx++] || 'Reference Number';
    const translatedDate = lines[idx++] || 'Date';
    const translatedSchemeLabel = lines[idx++] || 'Scheme';
    const translatedEligibilityLabel = lines[idx++] || 'Eligibility Status';
    const translatedEligibilityStatus = lines[idx++] || eligibilityStatus;
    const translatedDocumentsLabel = lines[idx++] || 'Required Documents';
    const translatedOfficeLabel = lines[idx++] || 'Office Details';
    const translatedPhoneLabel = lines[idx++] || 'Phone';
    const translatedHoursLabel = lines[idx++] || 'Working Hours';
    const translatedFooter = lines[idx++] || 'Jan-Awaaz | Government Scheme Assistant';
    
    const labels = {
      referralCard: translatedReferralCard,
      refNo: translatedRefNo,
      date: translatedDate,
      scheme: translatedSchemeLabel,
      eligibility: translatedEligibilityLabel,
      documents: translatedDocumentsLabel,
      office: translatedOfficeLabel,
      phone: translatedPhoneLabel,
      hours: translatedHoursLabel,
      footer: translatedFooter,
    };
    
    const translatedScheme = lines[idx++] || schemeName;
    const translatedOfficeName = lines[idx++] || officeName;
    const translatedAddress = lines[idx++] || officeAddress;
    const translatedOfficePhone = lines[idx++] || officePhone;
    const translatedOfficeHours = lines[idx++] || officeHours;
    
    const translatedDocuments: string[] = [];
    for (let i = 0; i < documentTypes.length; i++) {
      translatedDocuments.push(lines[idx++] || documentTypes[i]);
    }
    
    const translatedDocumentStatuses: string[] = [];
    for (let i = 0; i < documentStatuses.length; i++) {
      translatedDocumentStatuses.push(lines[idx++] || documentStatuses[i]);
    }
    
    return {
      translatedScheme,
      translatedAddress,
      translatedOfficeName,
      translatedOfficePhone,
      translatedOfficeHours,
      translatedDocuments,
      translatedDocumentStatuses,
      translatedEligibilityStatus,
      labels,
    };
  } catch (error) {
    console.error('Translation error:', error);
    // Return original if translation fails with English labels
    return {
      translatedScheme: schemeName,
      translatedAddress: officeAddress,
      translatedOfficeName: officeName,
      translatedOfficePhone: officePhone,
      translatedOfficeHours: officeHours,
      translatedDocuments: documentTypes,
      translatedDocumentStatuses: documentStatuses,
      translatedEligibilityStatus: eligibilityStatus,
      labels: {
        referralCard: 'Referral Card',
        refNo: 'Reference Number',
        date: 'Date',
        scheme: 'Scheme',
        eligibility: 'Eligibility Status',
        documents: 'Required Documents',
        office: 'Office Details',
        phone: 'Phone',
        hours: 'Working Hours',
        footer: 'Jan-Awaaz | Government Scheme Assistant',
      },
    };
  }
}

/**
 * Generate a referral card using SVG (Lambda-friendly)
 */
export async function generateCard(
  phoneNumber: string,
  schemeName: string,
  eligibilityStatus: 'ELIGIBLE' | 'PENDING_DOCS' | 'NEEDS_CORRECTION',
  requiredDocuments: DocumentStatus[],
  officeDetails: Office,
  language: Language = 'hi-IN'
): Promise<ReferralCard> {
  try {
    const cardId = uuidv4();
    const referenceNumber = generateReferenceNumber();
    const timestamp = new Date();

    // Prepare data for translation
    const documentTypes = requiredDocuments.map(doc => doc.documentType);
    const documentStatuses = requiredDocuments.map(doc => doc.message);
    const eligibilityStatusText = 
      eligibilityStatus === 'ELIGIBLE' ? 'Eligible' :
      eligibilityStatus === 'PENDING_DOCS' ? 'Documents Pending' :
      'Needs Correction';
    
    // Translate ALL content to user's language (keys and values)
    const translated = await translateCardContent(
      schemeName,
      officeDetails.address,
      officeDetails.name,
      officeDetails.contactNumber,
      officeDetails.workingHours,
      documentTypes,
      documentStatuses,
      eligibilityStatusText,
      language
    );
    
    console.log('Translated card content:', translated);

    // Generate QR code with encrypted session data
    const qrCodeData = JSON.stringify({
      cardId,
      referenceNumber,
      phoneNumber: hashPhoneNumber(phoneNumber),
      timestamp: timestamp.toISOString(),
    });
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000', // Black QR code
        light: '#FFFFFF', // White background for QR code (so it's scannable)
      },
    });

    // Build translated office details
    const translatedOfficeDetails = {
      ...officeDetails,
      name: translated.translatedOfficeName,
      address: translated.translatedAddress,
      contactNumber: translated.translatedOfficePhone,
      workingHours: translated.translatedOfficeHours,
    };
    
    // Build translated documents with translated statuses
    const translatedDocuments = requiredDocuments.map((doc, i) => ({
      ...doc,
      documentType: (translated.translatedDocuments[i] || doc.documentType) as DocumentType,
      message: translated.translatedDocumentStatuses[i] || doc.message,
    }));

    // Generate SVG card with ALL translated content
    const svgContent = generateSVGCard(
      referenceNumber,
      timestamp,
      translated.translatedScheme,
      translated.translatedEligibilityStatus,
      translatedDocuments,
      translatedOfficeDetails,
      qrCodeDataUrl,
      translated.labels
    );

    // Convert SVG to buffer
    const svgBuffer = Buffer.from(svgContent, 'utf-8');

    // Upload to S3
    const imageKey = `${cardId}.svg`;
    await s3Client.send(new PutObjectCommand({
      Bucket: s3Config.referralCardsBucket,
      Key: imageKey,
      Body: svgBuffer,
      ContentType: 'image/svg+xml',
      ServerSideEncryption: 'AES256',
    }));

    // Generate pre-signed URL for secure download (expires in 7 days)
    const getObjectCommand = new GetObjectCommand({
      Bucket: s3Config.referralCardsBucket,
      Key: imageKey,
    });
    
    const imageUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return {
      cardId,
      referenceNumber,
      timestamp,
      phoneNumber,
      schemeName,
      eligibilityStatus,
      requiredDocuments,
      officeDetails,
      qrCode: qrCodeDataUrl,
      imageUrl,
    };
  } catch (error) {
    console.error('Error generating referral card:', error);
    throw new Error('Failed to generate referral card. Please try again.');
  }
}

/**
 * Generate SVG card dynamically (Lambda-friendly, no heavy dependencies)
 */
function generateSVGCard(
  referenceNumber: string,
  timestamp: Date,
  schemeName: string,
  eligibilityStatus: string,
  requiredDocuments: DocumentStatus[],
  officeDetails: Office,
  qrCodeDataUrl: string,
  labels: {
    referralCard: string;
    refNo: string;
    date: string;
    scheme: string;
    eligibility: string;
    documents: string;
    office: string;
    phone: string;
    hours: string;
    footer: string;
  }
): string {
  let yPosition = PADDING;
  const elements: string[] = [];

  // Title
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_TITLE}" font-weight="bold" fill="${COLOR_BLACK}">
      ${escapeXml(labels.referralCard)}
    </text>
  `);
  yPosition += 60;

  // Reference number
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${COLOR_GRAY}">
      ${escapeXml(labels.refNo)}: ${escapeXml(referenceNumber)}
    </text>
  `);
  yPosition += 40;

  // Timestamp
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${COLOR_GRAY}">
      ${escapeXml(labels.date)}: ${timestamp.toLocaleDateString('en-IN')}
    </text>
  `);
  yPosition += 60;

  // Scheme name
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" font-weight="bold" fill="${COLOR_BLACK}">
      ${escapeXml(labels.scheme)}
    </text>
  `);
  yPosition += 30;
  
  // Wrap scheme name text
  const wrappedScheme = wrapTextSVG(schemeName, CARD_WIDTH - 2 * PADDING, FONT_SIZE_BODY);
  wrappedScheme.forEach(line => {
    elements.push(`
      <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${COLOR_BLACK}">
        ${escapeXml(line)}
      </text>
    `);
    yPosition += 30;
  });
  yPosition += 20;

  // Eligibility status
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" font-weight="bold" fill="${COLOR_BLACK}">
      ${escapeXml(labels.eligibility)}
    </text>
  `);
  yPosition += 30;
  
  const statusColor = 
    eligibilityStatus.toLowerCase().includes('eligible') || eligibilityStatus.toLowerCase().includes('पात्र') ? COLOR_GREEN :
    eligibilityStatus.toLowerCase().includes('pending') || eligibilityStatus.toLowerCase().includes('लंबित') ? COLOR_YELLOW : COLOR_RED;
  
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${statusColor}">
      ${escapeXml(eligibilityStatus)}
    </text>
  `);
  yPosition += 60;

  // Required documents
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" font-weight="bold" fill="${COLOR_BLACK}">
      ${escapeXml(labels.documents)}
    </text>
  `);
  yPosition += 40;

  for (const doc of requiredDocuments) {
    const iconColor = getIconColor(doc.icon);
    
    // Draw icon (rectangle)
    elements.push(`
      <rect x="${PADDING}" y="${yPosition - ICON_SIZE + 10}" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${iconColor}" />
    `);
    
    // Document name (already translated)
    elements.push(`
      <text x="${PADDING + ICON_SIZE + 20}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${COLOR_BLACK}">
        ${escapeXml(doc.documentType)}
      </text>
    `);
    
    // Document status message (already translated)
    elements.push(`
      <text x="${PADDING + ICON_SIZE + 20}" y="${yPosition + 25}" font-size="${FONT_SIZE_SMALL}" fill="${COLOR_GRAY}">
        ${escapeXml(doc.message)}
      </text>
    `);
    
    yPosition += 70;
  }
  yPosition += 20;

  // Office details
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" font-weight="bold" fill="${COLOR_BLACK}">
      ${escapeXml(labels.office)}
    </text>
  `);
  yPosition += 30;
  
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_BODY}" fill="${COLOR_BLACK}">
      ${escapeXml(officeDetails.name)}
    </text>
  `);
  yPosition += 30;
  
  // Wrap address
  const wrappedAddress = wrapTextSVG(officeDetails.address, CARD_WIDTH - 2 * PADDING, FONT_SIZE_SMALL);
  wrappedAddress.forEach(line => {
    elements.push(`
      <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_SMALL}" fill="${COLOR_GRAY}">
        ${escapeXml(line)}
      </text>
    `);
    yPosition += 25;
  });
  yPosition += 10;
  
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_SMALL}" fill="${COLOR_GRAY}">
      ${escapeXml(labels.phone)}: ${escapeXml(officeDetails.contactNumber)}
    </text>
  `);
  yPosition += 25;
  
  elements.push(`
    <text x="${PADDING}" y="${yPosition}" font-size="${FONT_SIZE_SMALL}" fill="${COLOR_GRAY}">
      ${escapeXml(labels.hours)}: ${escapeXml(officeDetails.workingHours)}
    </text>
  `);

  // QR code (embedded as image)
  elements.push(`
    <image x="${CARD_WIDTH - 220}" y="${CARD_HEIGHT - 220}" width="200" height="200" href="${qrCodeDataUrl}" />
  `);

  // Footer
  elements.push(`
    <text x="${PADDING}" y="${CARD_HEIGHT - 20}" font-size="${FONT_SIZE_SMALL}" fill="${COLOR_GRAY}">
      ${escapeXml(labels.footer)}
    </text>
  `);

  // Combine all elements into SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLOR_BACKGROUND}" />
  ${elements.join('\n')}
</svg>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap text for SVG (simple character-based wrapping)
 */
function wrapTextSVG(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const avgCharWidth = fontSize * 0.6; // Approximate character width
  const maxChars = Math.floor(maxWidth / avgCharWidth);

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate a unique reference number
 */
function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JA-${timestamp}-${random}`;
}

/**
 * Hash phone number for privacy
 */
function hashPhoneNumber(phoneNumber: string): string {
  // Simple hash for demo - in production use crypto
  return phoneNumber.substring(0, 2) + '****' + phoneNumber.substring(phoneNumber.length - 2);
}

/**
 * Get icon color based on icon type
 */
function getIconColor(iconType: IconType): string {
  switch (iconType) {
    case 'GREEN_CHECK': return COLOR_GREEN;
    case 'RED_CROSS': return COLOR_RED;
    case 'YELLOW_WARNING': return COLOR_YELLOW;
    case 'BLUE_INFO': return COLOR_BLUE;
    default: return COLOR_GRAY;
  }
}

/**
 * Wrap text to fit within width
 */
function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Get localized text
 */
function getLocalizedText(key: string, language: Language): string {
  const translations: Record<string, Record<Language, string>> = {
    referralCard: {
      'hi-IN': 'रेफरल कार्ड',
      'ta-IN': 'பரிந்துரை அட்டை',
      'te-IN': 'రిఫరల్ కార్డ్',
      'kn-IN': 'ರೆಫರಲ್ ಕಾರ್ಡ್',
      'ml-IN': 'റഫറൽ കാർഡ്',
      'mr-IN': 'रेफरल कार्ड',
      'bn-IN': 'রেফারেল কার্ড',
      'gu-IN': 'રેફરલ કાર્ડ',
      'pa-IN': 'ਰੈਫਰਲ ਕਾਰਡ',
      'or-IN': 'ରେଫରାଲ କାର୍ଡ',
    },
    refNo: {
      'hi-IN': 'संदर्भ संख्या',
      'ta-IN': 'குறிப்பு எண்',
      'te-IN': 'సూచన సంఖ్య',
      'kn-IN': 'ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ',
      'ml-IN': 'റഫറൻസ് നമ്പർ',
      'mr-IN': 'संदर्भ क्रमांक',
      'bn-IN': 'রেফারেন্স নম্বর',
      'gu-IN': 'સંદર્ભ નંબર',
      'pa-IN': 'ਹਵਾਲਾ ਨੰਬਰ',
      'or-IN': 'ସନ୍ଦର୍ଭ ସଂଖ୍ୟା',
    },
    date: {
      'hi-IN': 'तारीख',
      'ta-IN': 'தேதி',
      'te-IN': 'తేదీ',
      'kn-IN': 'ದಿನಾಂಕ',
      'ml-IN': 'തീയതി',
      'mr-IN': 'तारीख',
      'bn-IN': 'তারিখ',
      'gu-IN': 'તારીખ',
      'pa-IN': 'ਤਾਰੀਖ',
      'or-IN': 'ତାରିଖ',
    },
    scheme: {
      'hi-IN': 'योजना',
      'ta-IN': 'திட்டம்',
      'te-IN': 'పథకం',
      'kn-IN': 'ಯೋಜನೆ',
      'ml-IN': 'പദ്ധതി',
      'mr-IN': 'योजना',
      'bn-IN': 'প্রকল্প',
      'gu-IN': 'યોજના',
      'pa-IN': 'ਯੋਜਨਾ',
      'or-IN': 'ଯୋଜନା',
    },
    eligibility: {
      'hi-IN': 'पात्रता',
      'ta-IN': 'தகுதி',
      'te-IN': 'అర్హత',
      'kn-IN': 'ಅರ್ಹತೆ',
      'ml-IN': 'യോഗ്യത',
      'mr-IN': 'पात्रता',
      'bn-IN': 'যোগ্যতা',
      'gu-IN': 'પાત્રતા',
      'pa-IN': 'ਯੋਗਤਾ',
      'or-IN': 'ଯୋଗ୍ୟତା',
    },
    ELIGIBLE: {
      'hi-IN': 'पात्र',
      'ta-IN': 'தகுதியுடையவர்',
      'te-IN': 'అర్హులు',
      'kn-IN': 'ಅರ್ಹ',
      'ml-IN': 'യോഗ്യൻ',
      'mr-IN': 'पात्र',
      'bn-IN': 'যোগ্য',
      'gu-IN': 'પાત્ર',
      'pa-IN': 'ਯੋਗ',
      'or-IN': 'ଯୋଗ୍ୟ',
    },
    PENDING_DOCS: {
      'hi-IN': 'दस्तावेज़ लंबित',
      'ta-IN': 'ஆவணங்கள் நிலுவையில்',
      'te-IN': 'పత్రాలు పెండింగ్',
      'kn-IN': 'ದಾಖಲೆಗಳು ಬಾಕಿ',
      'ml-IN': 'രേഖകൾ തീർപ്പാക്കാത്തത്',
      'mr-IN': 'कागदपत्रे प्रलंबित',
      'bn-IN': 'নথি মুলতুবি',
      'gu-IN': 'દસ્તાવેજો બાકી',
      'pa-IN': 'ਦਸਤਾਵੇਜ਼ ਬਾਕੀ',
      'or-IN': 'ଦଲିଲ ବିଚାରାଧୀନ',
    },
    NEEDS_CORRECTION: {
      'hi-IN': 'सुधार की आवश्यकता',
      'ta-IN': 'திருத்தம் தேவை',
      'te-IN': 'దిద్దుబాటు అవసరం',
      'kn-IN': 'ತಿದ್ದುಪಡಿ ಅಗತ್ಯ',
      'ml-IN': 'തിരുത്തൽ ആവശ്യമാണ്',
      'mr-IN': 'दुरुस्ती आवश्यक',
      'bn-IN': 'সংশোধন প্রয়োজন',
      'gu-IN': 'સુધારણા જરૂરી',
      'pa-IN': 'ਸੁਧਾਰ ਦੀ ਲੋੜ',
      'or-IN': 'ସଂଶୋଧନ ଆବଶ୍ୟକ',
    },
    documents: {
      'hi-IN': 'आवश्यक दस्तावेज़',
      'ta-IN': 'தேவையான ஆவணங்கள்',
      'te-IN': 'అవసరమైన పత్రాలు',
      'kn-IN': 'ಅಗತ್ಯ ದಾಖಲೆಗಳು',
      'ml-IN': 'ആവശ്യമായ രേഖകൾ',
      'mr-IN': 'आवश्यक कागदपत्रे',
      'bn-IN': 'প্রয়োজনীয় নথি',
      'gu-IN': 'જરૂરી દસ્તાવેજો',
      'pa-IN': 'ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼',
      'or-IN': 'ଆବଶ୍ୟକ ଦଲିଲ',
    },
    AADHAAR: {
      'hi-IN': 'आधार कार्ड',
      'ta-IN': 'ஆதார் அட்டை',
      'te-IN': 'ఆధార్ కార్డ్',
      'kn-IN': 'ಆಧಾರ್ ಕಾರ್ಡ್',
      'ml-IN': 'ആധാർ കാർഡ്',
      'mr-IN': 'आधार कार्ड',
      'bn-IN': 'আধার কার্ড',
      'gu-IN': 'આધાર કાર્ડ',
      'pa-IN': 'ਆਧਾਰ ਕਾਰਡ',
      'or-IN': 'ଆଧାର କାର୍ଡ',
    },
    INCOME_CERTIFICATE: {
      'hi-IN': 'आय प्रमाण पत्र',
      'ta-IN': 'வருமான சான்றிதழ்',
      'te-IN': 'ఆదాయ ధృవీకరణ పత్రం',
      'kn-IN': 'ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ',
      'ml-IN': 'വരുമാന സർട്ടിഫിക്കറ്റ്',
      'mr-IN': 'उत्पन्न प्रमाणपत्र',
      'bn-IN': 'আয় সার্টিফিকেট',
      'gu-IN': 'આવક પ્રમાણપત્ર',
      'pa-IN': 'ਆਮਦਨ ਸਰਟੀਫਿਕੇਟ',
      'or-IN': 'ଆୟ ପ୍ରମାଣପତ୍ର',
    },
    LAND_PATTA: {
      'hi-IN': 'भूमि पट्टा',
      'ta-IN': 'நில பட்டா',
      'te-IN': 'భూమి పట్టా',
      'kn-IN': 'ಭೂಮಿ ಪಟ್ಟಾ',
      'ml-IN': 'ഭൂമി പട്ടാ',
      'mr-IN': 'जमीन पट्टा',
      'bn-IN': 'জমি পাট্টা',
      'gu-IN': 'જમીન પટ્ટો',
      'pa-IN': 'ਜ਼ਮੀਨ ਪੱਟਾ',
      'or-IN': 'ଜମି ପଟ୍ଟା',
    },
    office: {
      'hi-IN': 'कार्यालय विवरण',
      'ta-IN': 'அலுவலக விவரங்கள்',
      'te-IN': 'కార్యాలయ వివరాలు',
      'kn-IN': 'ಕಛೇರಿ ವಿವರಗಳು',
      'ml-IN': 'ഓഫീസ് വിശദാംശങ്ങൾ',
      'mr-IN': 'कार्यालय तपशील',
      'bn-IN': 'অফিস বিবরণ',
      'gu-IN': 'ઓફિસ વિગતો',
      'pa-IN': 'ਦਫ਼ਤਰ ਵੇਰਵੇ',
      'or-IN': 'କାର୍ଯ୍ୟାଳୟ ବିବରଣୀ',
    },
    phone: {
      'hi-IN': 'फोन',
      'ta-IN': 'தொலைபேசி',
      'te-IN': 'ఫోన్',
      'kn-IN': 'ಫೋನ್',
      'ml-IN': 'ഫോൺ',
      'mr-IN': 'फोन',
      'bn-IN': 'ফোন',
      'gu-IN': 'ફોન',
      'pa-IN': 'ਫੋਨ',
      'or-IN': 'ଫୋନ୍',
    },
    distance: {
      'hi-IN': 'दूरी',
      'ta-IN': 'தூரம்',
      'te-IN': 'దూరం',
      'kn-IN': 'ದೂರ',
      'ml-IN': 'ദൂരം',
      'mr-IN': 'अंतर',
      'bn-IN': 'দূরত্ব',
      'gu-IN': 'અંતર',
      'pa-IN': 'ਦੂਰੀ',
      'or-IN': 'ଦୂରତା',
    },
    hours: {
      'hi-IN': 'समय',
      'ta-IN': 'நேரம்',
      'te-IN': 'సమయం',
      'kn-IN': 'ಸಮಯ',
      'ml-IN': 'സമയം',
      'mr-IN': 'वेळ',
      'bn-IN': 'সময়',
      'gu-IN': 'સમય',
      'pa-IN': 'ਸਮਾਂ',
      'or-IN': 'ସମୟ',
    },
    footer: {
      'hi-IN': 'जन-आवाज़ | सरकारी योजना सहायक',
      'ta-IN': 'ஜன்-ஆவாஸ் | அரசு திட்ட உதவியாளர்',
      'te-IN': 'జన్-ఆవాజ్ | ప్రభుత్వ పథకం సహాయకుడు',
      'kn-IN': 'ಜನ-ಆವಾಜ್ | ಸರ್ಕಾರಿ ಯೋಜನೆ ಸಹಾಯಕ',
      'ml-IN': 'ജൻ-ആവാസ് | സർക്കാർ പദ്ധതി സഹായി',
      'mr-IN': 'जन-आवाज | सरकारी योजना सहाय्यक',
      'bn-IN': 'জন-আওয়াজ | সরকারি প্রকল্প সহায়ক',
      'gu-IN': 'જન-આવાજ | સરકારી યોજના સહાયક',
      'pa-IN': 'ਜਨ-ਆਵਾਜ਼ | ਸਰਕਾਰੀ ਯੋਜਨਾ ਸਹਾਇਕ',
      'or-IN': 'ଜନ-ଆୱାଜ | ସରକାରୀ ଯୋଜନା ସହାୟକ',
    },
  };

  return translations[key]?.[language] || key;
}

/**
 * Retrieve referral card from S3
 */
export async function getCardUrl(cardId: string): Promise<string> {
  try {
    const imageKey = `${cardId}.svg`;
    
    // Generate pre-signed URL for secure download (expires in 7 days)
    const getObjectCommand = new GetObjectCommand({
      Bucket: s3Config.referralCardsBucket,
      Key: imageKey,
    });
    
    const url = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    });
    
    return url;
  } catch (error) {
    console.error('Error retrieving card URL:', error);
    throw new Error('Failed to retrieve referral card. Please try again.');
  }
}

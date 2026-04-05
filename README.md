# Jan-Awaaz - Government Scheme Assistant

Voice-first Progressive Web App (PWA) that helps rural Indian citizens access government schemes through intelligent voice interaction, document verification, and smart routing to CSC centers.

##  Project Overview

Jan-Awaaz is a multilingual voice assistant that guides users through:
1. **Voice Conversation**: Speak about your situation in 10 Indian languages
2. **Scheme Matching**: AI finds the best government scheme for you
3. **Document Capture**: Take photos of required documents with skip option
4. **CSC Routing**: Get directions to nearest Common Service Centre
5. **Referral Card**: Receive digital card to show at CSC office

##  Key Features

-  **Voice-First Interface**: Web Speech API for Chrome/Edge browsers
-  **10 Indian Languages**: Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia
-  **AI-Powered Matching**: Amazon Bedrock Knowledge Base with Claude Haiku
-  **Smart Document Capture**: Camera with skip functionality for missing documents
-  **Location Services**: Google Maps integration for CSC centers
-  **Digital Referral Cards**: QR code enabled cards for office visits
-  **PWA Support**: Install on mobile devices, works offline
-  **Conversational AI**: Natural multi-turn conversations with context

##  Architecture

### RAG Stack (Bedrock + Pinecone)

```
User Voice → Web Speech API → Claude Haiku (Bedrock) → Scheme Match
                                      ↓
                            Knowledge Base (Pinecone)
                                      ↓
                            Scheme PDFs (S3)
```

### Components

1. **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
2. **Voice**: Web Speech API (Recognition + Synthesis)
3. **AI**: Amazon Bedrock (Claude Haiku + Titan Embeddings)
4. **Vector Store**: Pinecone Serverless (Free Tier)
5. **Storage**: AWS S3 + DynamoDB
6. **Document Processing**: Camera API with skip functionality
7. **Location**: Google Maps API

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Voice**: Web Speech API (Chrome/Edge)
- **PWA**: Service Worker for offline support
- **Deployment**: Vercel

### Backend (AWS Mumbai - ap-south-1)
- **Conversational AI**: Amazon Bedrock (Claude Haiku)
- **Knowledge Base**: Amazon Bedrock Knowledge Base
- **Embeddings**: Amazon Titan Embeddings v2 (1024-dim)
- **Vector Store**: Pinecone Serverless (Free Tier)
- **Storage**: S3 (documents, schemes), DynamoDB (sessions)
- **Document Processing**: Camera API (browser-based)
- **Location**: Google Maps API

### AWS Services (Available but Optional)
- Amazon Transcribe (voice-to-text)
- Amazon Polly (text-to-speech)
- Amazon Textract (document OCR)
- AWS Location Service (geolocation)
- AWS Lambda (serverless functions)
- API Gateway (REST API)

##  Quick Start

### Prerequisites

- Node.js 20.x or higher
- AWS Account with credentials
- Pinecone account (free tier)
- Chrome or Edge browser (for voice features)

### 1. Clone and Install

```bash
git clone <repository-url>
cd jan-awaaz-app
npm install
```

### 2. Setup Pinecone (5 minutes)

1. Sign up at https://www.pinecone.io/
2. Create serverless index:
   - Name: `jan-awaaz-schemes`
   - Dimensions: `1024`
   - Metric: `cosine`
   - Cloud: `AWS`, Region: `us-east-1`
3. Copy API Key and Index Host

### 3. Setup AWS Bedrock Knowledge Base

1. Create S3 bucket for scheme PDFs
2. Upload scheme documents (e.g., `widow-pension-scheme.txt`)
3. Create Bedrock Knowledge Base:
   - Data source: S3 bucket
   - Embeddings: Titan Embeddings v2
   - Vector store: Pinecone
4. Run ingestion job to sync PDFs to Pinecone

### 4. Configure Environment

Create `.env.local`:

```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS Services
AWS_S3_BUCKET_SCHEME_PDFS=jan-awaaz-scheme-pdfs-dev
AWS_S3_BUCKET_USER_DOCS=jan-awaaz-user-documents-dev
AWS_S3_BUCKET_REFERRAL_CARDS=jan-awaaz-referral-cards-dev
AWS_DYNAMODB_TABLE_SESSIONS=jan-awaaz-sessions-dev
AWS_DYNAMODB_TABLE_OFFICES=jan-awaaz-offices-dev

# Bedrock Configuration
AWS_BEDROCK_KNOWLEDGE_BASE_ID=your_kb_id
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v2:0

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_HOST=your-index-xxxxx.svc.pinecone.io
PINECONE_INDEX_NAME=jan-awaaz-schemes

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in Chrome or Edge

### 6. Test the Flow

1. Select language (e.g., Hindi)
2. Enter phone number
3. Click microphone and speak: "मेरे पति की मृत्यु हो गई है, मुझे आर्थिक सहायता चाहिए"
4. AI will suggest Widow Pension Scheme
5. Confirm you have documents
6. Take photos or skip documents
7. Provide your location
8. Receive referral card with CSC center details
9. Click "Open in Maps" to get directions

##  Project Structure

```
jan-awaaz-app/
├── app/
│   ├── api/
│   │   ├── chat/          # Conversational AI endpoint
│   │   ├── document/      # Document upload endpoint
│   │   ├── location/      # Location services
│   │   ├── orchestrate/   # Main orchestration
│   │   ├── scheme/        # Scheme matching
│   │   └── voice/         # Voice processing
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── VoiceInput.tsx     # Voice recording component
│   ├── CameraCapture.tsx  # Document camera with skip
│   ├── LanguageSelector.tsx
│   ├── PhoneInput.tsx
│   ├── MapDisplay.tsx
│   └── ReferralCardDisplay.tsx
├── lib/
│   ├── aws/
│   │   ├── config.ts      # AWS configuration
│   │   ├── scheme-service.ts  # Bedrock KB integration
│   │   ├── session-service.ts # DynamoDB sessions
│   │   ├── document-service.ts
│   │   ├── location-service.ts
│   │   └── referral-card-service.ts
│   ├── types/
│   │   └── index.ts       # TypeScript types
│   └── utils/
│       ├── translations.ts
│       ├── validation.ts
│       └── error-handler.ts
├── public/
│   ├── manifest.json      # PWA manifest
│   └── sw.js             # Service worker
└── scheme/
    └── widow-pension-scheme.txt  # Sample scheme
```

##  Current Implementation Status

###  Completed Features

1. **Multi-language Support**: 10 Indian languages with translations
2. **Voice Interface**: Web Speech API for speech-to-text and text-to-speech
3. **Conversational AI**: Claude Haiku with multi-turn context
4. **Scheme Matching**: Bedrock Knowledge Base with Pinecone vector search
5. **Metadata Extraction**: Parallel API calls for scheme name, document count, and names
6. **Document Capture**: Camera with skip button for each document
7. **Session Management**: DynamoDB for conversation history
8. **CSC Routing**: AI-powered location search with Google Maps
9. **Referral Cards**: Digital cards with QR codes
10. **PWA Support**: Installable on mobile devices

###  Technical Highlights

- **Dual API Calls**: Speech response + metadata extraction run in parallel
- **Smart Parsing**: Extracts 3 mandatory documents from scheme text
- **Echo Prevention**: Stops recording during speech synthesis
- **Skip Functionality**: Users can skip documents they don't have
- **Google Maps Integration**: Clean address extraction for accurate location
- **Multi-language TTS**: Speaks responses in user's selected language

##  Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Bedrock (Claude Haiku) | $1-2 | Pay-per-use |
| Bedrock (Titan Embeddings) | $0.50 | Ingestion only |
| Pinecone | $0 | Free tier (100K vectors) |
| DynamoDB | $1-2 | On-demand pricing |
| S3 | $1 | Document storage |
| **Total** | **~$3-6** | **Very cost-effective** |

**Key Savings**: 
- Pinecone free tier instead of OpenSearch (~$700/month saved)
- Web Speech API instead of Transcribe/Polly (~$5-10/month saved)
- Browser-based camera instead of Textract (~$10-20/month saved)

##  Security Features

-  HTTPS/TLS encryption
-  S3 and DynamoDB encryption at rest
-  IAM roles with least privilege
-  Session-based authentication
-  PII protection (phone number hashing)
-  Data retention policies

##  Browser Support

-  Chrome (recommended)
-  Edge
-  Firefox (no voice support)
-  Safari (no voice support)

**Note**: Voice features require Web Speech API (Chrome/Edge only). Other browsers can use text input.

##  PWA Features

- Install on home screen
- Offline support for UI
- Fast loading with service worker
- Mobile-optimized interface


##  Deployment

### Deploy to Vercel

```bash
vercel
```

Set environment variables in Vercel dashboard.

##  Documentation

- **README.md** (this file): Project overview and setup
- **jan-awaaz-app/README.md**: App-specific documentation
- **.env.example**: Environment variable template

##  Contributing

This is a government project for rural citizens. Contributions welcome!




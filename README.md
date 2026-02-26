# Jan-Awaaz - Government Scheme Assistant

Voice-first Progressive Web App (PWA) that helps rural Indian citizens access government schemes through intelligent voice interaction, document verification, and smart routing.

## Highlights

- 🎤 **Voice-First Interface**: Speak in 10 Indian regional languages
- 🧠 **Professional RAG Architecture**: Bedrock Knowledge Base + Titan Embeddings + Pinecone
- 📸 **Document Verification**: AI-powered validation using Amazon Textract
- 🤖 **Smart Scheme Matching**: Semantic search with vector embeddings
- 📍 **Location Routing**: Find nearest government offices with AWS Location Service
- 🎫 **Digital Referral Cards**: Generate visual cards for office visits
- 📱 **PWA Support**: Install on mobile devices, works offline
- 💰 **Budget-Friendly**: ~$7-12/month using Pinecone free tier

## Architecture

### RAG Stack (Bedrock + Titan + Pinecone)

```
User Query → Titan Embeddings → Pinecone Vector Search → Claude → Scheme Matches
```

- **Amazon Bedrock Knowledge Base**: Managed RAG service
- **Amazon Titan Embeddings v2**: 1024-dimensional vectors
- **Pinecone Serverless**: Free tier vector database (replaces OpenSearch Serverless)
- **Cost Savings**: ~$700/month saved by using Pinecone instead of OpenSearch

See `ARCHITECTURE-SUMMARY.md` for detailed architecture explanation.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **PWA**: next-pwa for service worker and offline support
- **Hosting**: Vercel

### Backend (AWS Mumbai - ap-south-1)
- **API**: AWS API Gateway + Lambda (serverless)
- **Voice**: Amazon Transcribe, Amazon Polly
- **Documents**: Amazon Textract
- **RAG**: Amazon Bedrock Knowledge Base, Titan Embeddings v2
- **Vector Store**: Pinecone (free tier)
- **Location**: AWS Location Service
- **Storage**: S3, DynamoDB
- **Monitoring**: CloudWatch, CloudTrail

### Testing
- **Unit Tests**: Jest
- **Property-Based Tests**: fast-check (with mocks, no AWS charges)

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- AWS Account with configured credentials
- Pinecone account (free tier)
- Terraform >= 1.0
- 15 government scheme PDFs

### 1. Pinecone Setup (5 minutes)

1. Sign up at https://www.pinecone.io/
2. Create serverless index:
   - Name: `jan-awaaz-schemes`
   - Dimensions: `1024`
   - Metric: `cosine`
   - Cloud: `AWS`, Region: `us-east-1`
3. Copy API Key and Index Host

See `PINECONE-SETUP.md` for detailed instructions.

### 2. Deploy Infrastructure (10 minutes)

```bash
# Export Pinecone credentials
export TF_VAR_pinecone_api_key="your-pinecone-api-key"
export TF_VAR_pinecone_index_host="jan-awaaz-schemes-xxxxx.svc.pinecone.io"

# Deploy with Terraform
cd infrastructure/terraform
terraform init
terraform apply -var="environment=dev"
```

This creates all AWS resources including Bedrock Knowledge Base with Pinecone.

### 3. Upload Scheme PDFs and Sync (5 minutes)

```bash
# Upload PDFs to S3
aws s3 cp ./scheme-pdfs/ s3://$(terraform output -raw scheme_pdfs_bucket)/ --recursive

# Trigger Bedrock ingestion (PDFs → Pinecone)
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id $(terraform output -raw knowledge_base_id) \
  --data-source-id $(terraform output -raw data_source_id) \
  --region ap-south-1
```

### 4. Configure and Run Frontend (3 minutes)

```bash
cd ../..
npm install

# Create .env.local with Terraform outputs
cp .env.example .env.local
# Update with your AWS credentials and Terraform outputs

# Run development server
npm run dev
```

Open http://localhost:3000

See `QUICK-START.md` for complete setup guide.

## Project Structure

See `docs/aws-setup.md` for detailed AWS infrastructure setup instructions.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
jan-awaaz-app/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── voice/        # Voice processing endpoints
│   │   ├── document/     # Document verification endpoints
│   │   ├── scheme/       # Scheme matching endpoints
│   │   ├── session/      # Session management endpoints
│   │   └── location/     # Location routing endpoints
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── lib/
│   ├── aws/              # AWS service clients
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── public/
│   └── manifest.json     # PWA manifest
├── tests/                # Test files
└── next.config.ts        # Next.js configuration with PWA
```

## Deployment

### Deploy to Vercel

```bash
vercel
```

Set environment variables in Vercel dashboard.

## Testing

Run tests with mocked AWS services:

```bash
npm test
```

Run property-based tests:

```bash
npm run test:property
```

## Cost Optimization

This project uses a cost-optimized AWS configuration:
- **Estimated cost**: ~$7-12/month for testing phase
- VPC endpoints and AWS WAF are optional (~$43/month savings)
- All tests use mocks to avoid AWS charges

## Security Features

- ✅ HTTPS/TLS 1.2+ encryption
- ✅ S3 and DynamoDB encryption at rest
- ✅ IAM roles with least privilege
- ✅ API key authentication
- ✅ CloudTrail audit logging
- ✅ PII protection (Aadhaar masking, phone hashing)
- ✅ Data retention policies (30/90 days)

## Documentation

### Setup & Deployment
- **[QUICK-START.md](./QUICK-START.md)**: 30-minute setup guide with step-by-step instructions
- **[PINECONE-SETUP.md](./PINECONE-SETUP.md)**: Detailed Pinecone configuration guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Complete production deployment guide
- **[infrastructure/terraform/README.md](./infrastructure/terraform/README.md)**: Terraform infrastructure guide

### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Technical architecture documentation
- **[ARCHITECTURE-SUMMARY.md](./ARCHITECTURE-SUMMARY.md)**: Executive summary of RAG architecture
- **[.kiro/specs/jan-awaaz/design.md](./.kiro/specs/jan-awaaz/design.md)**: Detailed design document

### Operations & Security
- **[RUNBOOK.md](./RUNBOOK.md)**: Operations runbook for common issues
- **[SECURITY.md](./SECURITY.md)**: Security measures and compliance
- **[TESTING-CHECKLIST.md](./TESTING-CHECKLIST.md)**: Comprehensive testing guide

### Development
- **[.kiro/specs/jan-awaaz/requirements.md](./.kiro/specs/jan-awaaz/requirements.md)**: Feature requirements
- **[.kiro/specs/jan-awaaz/tasks.md](./.kiro/specs/jan-awaaz/tasks.md)**: Implementation tasks

## Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Lambda | $1-2 | Serverless compute |
| API Gateway | $1 | REST API |
| DynamoDB | $1-2 | On-demand pricing |
| S3 | $1 | 5GB storage |
| Transcribe/Polly | $2-3 | Voice services |
| Bedrock (Claude + Titan) | $1-2 | Pay-per-use |
| **Pinecone** | **$0** | **Free tier (100K vectors)** |
| CloudTrail | $2 | Audit logs |
| **Total** | **~$7-12** | **Within budget** |

**Key Savings**: Using Pinecone free tier instead of OpenSearch Serverless saves ~$700/month while maintaining professional RAG architecture.



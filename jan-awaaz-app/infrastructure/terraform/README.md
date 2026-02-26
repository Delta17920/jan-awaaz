# Terraform Infrastructure Setup

## Prerequisites

1. Install Terraform (>= 1.0)
2. Configure AWS CLI with credentials
3. Ensure you have permissions to create resources in ap-south-1 region
4. **Create Pinecone account and serverless index** (see Pinecone Setup below)

## Pinecone Setup (Required First)

Before running Terraform, you must create a Pinecone serverless index:

### 1. Create Pinecone Account

1. Go to https://www.pinecone.io/ and sign up for a free account
2. Create a new project (e.g., "jan-awaaz")

### 2. Create Serverless Index

1. In Pinecone console, click "Create Index"
2. Configure:
   - **Name**: `jan-awaaz-schemes`
   - **Dimensions**: `1024` (for Amazon Titan Embeddings v2)
   - **Metric**: `cosine`
   - **Cloud**: `AWS`
   - **Region**: `us-east-1` (free tier available)
3. Click "Create Index"

### 3. Get Credentials

1. Go to "API Keys" in Pinecone console
2. Copy your API Key
3. Go to your index and copy the Index Host (e.g., `jan-awaaz-schemes-xxxxx.svc.pinecone.io`)

## Deployment Steps

### 1. Set Environment Variables

Export Pinecone credentials as environment variables:

```bash
export TF_VAR_pinecone_api_key="your-pinecone-api-key"
export TF_VAR_pinecone_index_host="jan-awaaz-schemes-xxxxx.svc.pinecone.io"
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 3. Review the Plan

```bash
terraform plan -var="environment=dev"
```

### 4. Apply the Configuration

```bash
terraform apply -var="environment=dev"
```

### 5. Note the Outputs

After successful deployment, note the following outputs:
- `user_documents_bucket`: S3 bucket for user documents
- `scheme_pdfs_bucket`: S3 bucket for scheme PDFs
- `referral_cards_bucket`: S3 bucket for referral cards
- `sessions_table`: DynamoDB table for sessions
- `offices_table`: DynamoDB table for office locations
- `lambda_execution_role_arn`: IAM role ARN for Lambda functions
- `knowledge_base_id`: Bedrock Knowledge Base ID (use in .env)
- `knowledge_base_arn`: Bedrock Knowledge Base ARN
- `data_source_id`: Data Source ID for scheme PDFs

## Environments

- **dev**: Development environment
- **staging**: Staging environment for testing
- **prod**: Production environment

To deploy to a specific environment:

```bash
terraform apply -var="environment=staging"
```

## Resources Created

### S3 Buckets
1. **user-documents**: Encrypted with KMS, 30-day lifecycle, versioning enabled
2. **scheme-pdfs**: Encrypted with SSE-S3, source for Bedrock Knowledge Base
3. **referral-cards**: Encrypted with SSE-S3, 90-day lifecycle

### DynamoDB Tables
1. **sessions**: With TTL, GSI, and DynamoDB Streams
2. **offices**: With GSI for office type queries

### Bedrock Knowledge Base
1. **Knowledge Base**: Configured with Pinecone vector store
2. **Data Source**: S3 bucket (scheme-pdfs) with automatic syncing
3. **Embeddings**: Amazon Titan Embeddings v2 (1024 dimensions)
4. **Chunking**: Fixed-size (512 tokens, 20% overlap)

### IAM
- Lambda execution role with least privilege permissions
- Bedrock Knowledge Base role with S3 and Bedrock access
- KMS key for user documents encryption

### Secrets Manager
- Pinecone credentials stored securely

### Monitoring
- CloudWatch Log Groups (30-day retention)
- SNS topic for alerts
- CloudWatch alarms for Lambda errors

## Architecture: Bedrock + Titan + Pinecone

This setup uses a professional RAG architecture while staying within budget:

- **Amazon Bedrock Knowledge Base**: Managed RAG service
- **Amazon Titan Embeddings v2**: High-quality embeddings (1024 dimensions)
- **Pinecone Serverless**: Free tier vector database (replaces OpenSearch Serverless)
- **Cost savings**: ~$700/month saved by using Pinecone instead of OpenSearch

## Cost Estimation

**Monthly cost (dev/staging)**: ~$7-12
- S3: ~$1-2
- DynamoDB: ~$1-2 (on-demand)
- Lambda: ~$1-2
- Bedrock (Claude + Titan): ~$1-2 (pay-per-use)
- Pinecone: **$0** (free tier, up to 100K vectors)
- Other services: ~$2-4

**Monthly cost (production with optional features)**:
- Base: ~$7-12
- Pinecone: **$0** (free tier sufficient for 15 schemes)
- VPC endpoints: +$35 (optional, skip for budget)
- AWS WAF: +$8 (optional, skip for budget)
- Total: ~$7-12

**Scaling**: Pinecone free tier supports ~200-300 PDFs. Beyond that, Pinecone Serverless costs ~$0.096/GB/month + $0.20/million reads (still much cheaper than OpenSearch).

## Cleanup

To destroy all resources:

```bash
terraform destroy -var="environment=dev"
```

**Warning**: This will delete all data. Ensure you have backups before destroying.

## Next Steps

After infrastructure is deployed:

1. **Upload scheme PDFs** to the `scheme_pdfs_bucket`
   ```bash
   aws s3 cp ./scheme-pdfs/ s3://$(terraform output -raw scheme_pdfs_bucket)/ --recursive
   ```

2. **Sync Bedrock Knowledge Base** (ingests PDFs into Pinecone)
   ```bash
   aws bedrock-agent start-ingestion-job \
     --knowledge-base-id $(terraform output -raw knowledge_base_id) \
     --data-source-id $(terraform output -raw data_source_id) \
     --region ap-south-1
   ```

3. **Populate office locations** in the `offices_table`
   ```bash
   cd ../../
   node scripts/populate-offices.js
   ```

4. **Update .env.local** with Terraform outputs
   ```bash
   AWS_BEDROCK_KNOWLEDGE_BASE_ID=$(terraform output -raw knowledge_base_id)
   AWS_S3_BUCKET_SCHEME_PDFS=$(terraform output -raw scheme_pdfs_bucket)
   # ... other outputs
   ```

5. **Deploy Lambda functions** (see DEPLOYMENT.md)

6. **Configure API Gateway** (see DEPLOYMENT.md)

7. **Deploy Next.js PWA to Vercel** (see DEPLOYMENT.md)

## Troubleshooting

### Pinecone Connection Issues

If Bedrock Knowledge Base fails to connect to Pinecone:
1. Verify Pinecone index exists and is active
2. Check Pinecone API key in Secrets Manager
3. Verify index host URL is correct (no https://, just hostname)
4. Ensure index dimensions match (1024 for Titan v2)

### Knowledge Base Sync Failures

If PDF ingestion fails:
1. Check S3 bucket permissions (Bedrock role needs s3:GetObject)
2. Verify PDFs are text-based (not scanned images)
3. Check CloudWatch logs for Bedrock Knowledge Base
4. Manually trigger sync from Bedrock console

### Terraform Apply Errors

If you get "knowledge base already exists":
```bash
terraform import aws_bedrockagent_knowledge_base.jan_awaaz_kb <knowledge-base-id>
```

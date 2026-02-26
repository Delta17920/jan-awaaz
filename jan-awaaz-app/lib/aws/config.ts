/**
 * AWS SDK Configuration
 * Centralized configuration for all AWS services
 */

export const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

export const s3Config = {
  schemePdfsBucket: process.env.AWS_S3_BUCKET_SCHEME_PDFS || 'jan-awaaz-scheme-pdfs',
  userDocsBucket: process.env.AWS_S3_BUCKET_USER_DOCS || 'jan-awaaz-user-documents',
  referralCardsBucket: process.env.AWS_S3_BUCKET_REFERRAL_CARDS || 'jan-awaaz-referral-cards',
};

export const dynamoDbConfig = {
  sessionsTable: process.env.AWS_DYNAMODB_TABLE_SESSIONS || 'jan-awaaz-sessions',
};

export const bedrockConfig = {
  knowledgeBaseId: process.env.AWS_BEDROCK_KNOWLEDGE_BASE_ID || '',
  modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
  embeddingModel: process.env.AWS_BEDROCK_EMBEDDING_MODEL || 'amazon.titan-embed-text-v2:0',
};

export const pineconeConfig = {
  apiKey: process.env.PINECONE_API_KEY || '',
  indexHost: process.env.PINECONE_INDEX_HOST || '',
  indexName: process.env.PINECONE_INDEX_NAME || 'jan-awaaz-schemes',
};

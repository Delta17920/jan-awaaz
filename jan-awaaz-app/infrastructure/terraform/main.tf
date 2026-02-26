# Jan-Awaaz Infrastructure - Terraform Configuration
# Region: ap-south-1 (Mumbai) for data residency

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "jan-awaaz"
}

# S3 Buckets
resource "aws_s3_bucket" "user_documents" {
  bucket = "${var.project_name}-user-documents-${var.environment}"
  
  tags = {
    Name        = "User Documents"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "user_documents" {
  bucket = aws_s3_bucket.user_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.user_documents.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "user_documents" {
  bucket = aws_s3_bucket.user_documents.id

  rule {
    id     = "delete-after-30-days"
    status = "Enabled"

    filter {}
    
    expiration {
      days = 30
    }
  }
}

resource "aws_s3_bucket_public_access_block" "user_documents" {
  bucket = aws_s3_bucket.user_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "user_documents" {
  bucket = aws_s3_bucket.user_documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket" "scheme_pdfs" {
  bucket = "${var.project_name}-scheme-pdfs-${var.environment}"
  
  tags = {
    Name        = "Scheme PDFs"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "scheme_pdfs" {
  bucket = aws_s3_bucket.scheme_pdfs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "scheme_pdfs" {
  bucket = aws_s3_bucket.scheme_pdfs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "referral_cards" {
  bucket = "${var.project_name}-referral-cards-${var.environment}"
  
  tags = {
    Name        = "Referral Cards"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "referral_cards" {
  bucket = aws_s3_bucket.referral_cards.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "referral_cards" {
  bucket = aws_s3_bucket.referral_cards.id

  rule {
    id     = "delete-after-90-days"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_public_access_block" "referral_cards" {
  bucket = aws_s3_bucket.referral_cards.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# KMS Key for User Documents
resource "aws_kms_key" "user_documents" {
  description             = "KMS key for user documents encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name        = "User Documents KMS Key"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_alias" "user_documents" {
  name          = "alias/${var.project_name}-user-documents-${var.environment}"
  target_key_id = aws_kms_key.user_documents.key_id
}

# DynamoDB Table for Sessions
resource "aws_dynamodb_table" "sessions" {
  name           = "${var.project_name}-sessions-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "phoneNumber"
  range_key      = "sessionId"

  attribute {
    name = "phoneNumber"
    type = "S"
  }

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "SessionsByStatus"
    hash_key        = "status"
    range_key       = "sessionId"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Name        = "Sessions Table"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB Table for Office Locations
resource "aws_dynamodb_table" "offices" {
  name         = "${var.project_name}-offices-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "officeId"

  attribute {
    name = "officeId"
    type = "S"
  }

  attribute {
    name = "officeType"
    type = "S"
  }

  global_secondary_index {
    name            = "OfficesByType"
    hash_key        = "officeType"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Office Locations Table"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-execution-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "Lambda Execution Role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Policy for Lambda Functions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:ap-south-1:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.user_documents.arn}/*",
          "${aws_s3_bucket.scheme_pdfs.arn}/*",
          "${aws_s3_bucket.referral_cards.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.sessions.arn,
          "${aws_dynamodb_table.sessions.arn}/index/*",
          aws_dynamodb_table.offices.arn,
          "${aws_dynamodb_table.offices.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartStreamTranscription",
          "transcribe:StartTranscriptionJob"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "textract:AnalyzeDocument",
          "textract:DetectDocumentText"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate"
        ]
        Resource = [
          "arn:aws:bedrock:ap-south-1::foundation-model/*",
          aws_bedrockagent_knowledge_base.jan_awaaz_kb.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "geo:SearchPlaceIndexForPosition",
          "geo:CalculateRoute"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.user_documents.arn
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "Lambda Logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"

  tags = {
    Name        = "Alerts Topic"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors lambda errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "Lambda Errors Alarm"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bedrock Knowledge Base with Pinecone Vector Store
variable "pinecone_api_key" {
  description = "Pinecone API Key (from environment variable)"
  type        = string
  sensitive   = true
}

variable "pinecone_index_host" {
  description = "Pinecone Index Host/Endpoint (from environment variable)"
  type        = string
}

# IAM Role for Bedrock Knowledge Base
resource "aws_iam_role" "bedrock_kb_role" {
  name = "${var.project_name}-bedrock-kb-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Bedrock Knowledge Base Role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Policy for Bedrock Knowledge Base
resource "aws_iam_role_policy" "bedrock_kb_policy" {
  name = "${var.project_name}-bedrock-kb-policy-${var.environment}"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.scheme_pdfs.arn,
          "${aws_s3_bucket.scheme_pdfs.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v1",
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v2:0"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.pinecone_credentials.arn
      }
    ]
  })
}

# Store Pinecone credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "pinecone_credentials" {
  name        = "${var.project_name}-pinecone-credentials-${var.environment}"
  description = "Pinecone API credentials for Bedrock Knowledge Base"

  tags = {
    Name        = "Pinecone Credentials"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "pinecone_credentials" {
  secret_id = aws_secretsmanager_secret.pinecone_credentials.id
  secret_string = jsonencode({
    apiKey = var.pinecone_api_key
  })
}

# Bedrock Knowledge Base with Pinecone
resource "aws_bedrockagent_knowledge_base" "jan_awaaz_kb" {
  name     = "${var.project_name}-knowledge-base-${var.environment}"
  role_arn = aws_iam_role.bedrock_kb_role.arn
  
  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v2:0"
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions          = 1024
          embedding_data_type = "FLOAT32"
        }
      }
    }
  }

  storage_configuration {
    type = "PINECONE"
    pinecone_configuration {
      connection_string      = "https://${var.pinecone_index_host}"
      credentials_secret_arn = aws_secretsmanager_secret.pinecone_credentials.arn
      field_mapping {
        metadata_field = "metadata"
        text_field     = "text"
      }
    }
  }

  tags = {
    Name        = "Jan-Awaaz Knowledge Base"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bedrock Data Source (S3 bucket with scheme PDFs)
resource "aws_bedrockagent_data_source" "scheme_pdfs" {
  name              = "${var.project_name}-scheme-pdfs-datasource-${var.environment}"
  knowledge_base_id = aws_bedrockagent_knowledge_base.jan_awaaz_kb.id
  
  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = aws_s3_bucket.scheme_pdfs.arn
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = 512
        overlap_percentage = 20
      }
    }
  }
}

# Data sources for AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Outputs
output "user_documents_bucket" {
  value = aws_s3_bucket.user_documents.id
}

output "scheme_pdfs_bucket" {
  value = aws_s3_bucket.scheme_pdfs.id
}

output "referral_cards_bucket" {
  value = aws_s3_bucket.referral_cards.id
}

output "sessions_table" {
  value = aws_dynamodb_table.sessions.name
}

output "offices_table" {
  value = aws_dynamodb_table.offices.name
}

output "lambda_execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}

output "knowledge_base_id" {
  value       = aws_bedrockagent_knowledge_base.jan_awaaz_kb.id
  description = "Bedrock Knowledge Base ID for scheme matching"
}

output "knowledge_base_arn" {
  value       = aws_bedrockagent_knowledge_base.jan_awaaz_kb.arn
  description = "Bedrock Knowledge Base ARN"
}

output "data_source_id" {
  value       = aws_bedrockagent_data_source.scheme_pdfs.id
  description = "Data Source ID for scheme PDFs"
}

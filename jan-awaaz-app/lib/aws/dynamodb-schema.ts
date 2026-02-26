/**
 * DynamoDB Table Schema for Jan-Awaaz Sessions
 * 
 * Table Name: jan-awaaz-sessions
 * Partition Key: phoneNumber (String)
 * Sort Key: sessionId (String)
 * TTL Attribute: ttl (Number - Unix timestamp)
 * 
 * GSI: SessionsByStatus
 * - Partition Key: status (String)
 * - Sort Key: lastAccessedAt (Number - Unix timestamp)
 */

export const DynamoDBTableSchema = {
  TableName: 'jan-awaaz-sessions',
  KeySchema: [
    { AttributeName: 'phoneNumber', KeyType: 'HASH' },  // Partition key
    { AttributeName: 'sessionId', KeyType: 'RANGE' }     // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'phoneNumber', AttributeType: 'S' },
    { AttributeName: 'sessionId', AttributeType: 'S' },
    { AttributeName: 'status', AttributeType: 'S' },
    { AttributeName: 'lastAccessedAt', AttributeType: 'N' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'SessionsByStatus',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'lastAccessedAt', KeyType: 'RANGE' }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  BillingMode: 'PAY_PER_REQUEST', // On-demand pricing for cost optimization
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  },
  SSESpecification: {
    Enabled: true,
    SSEType: 'KMS' // Encryption at rest
  },
  TimeToLiveSpecification: {
    Enabled: true,
    AttributeName: 'ttl' // Automatic archival after 30 days
  },
  Tags: [
    { Key: 'Project', Value: 'Jan-Awaaz' },
    { Key: 'Environment', Value: 'Production' },
    { Key: 'DataRetention', Value: '30days' }
  ]
};

/**
 * CloudFormation/CDK template for creating the table
 */
export const CloudFormationTemplate = `
Resources:
  JanAwaazSessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: jan-awaaz-sessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: phoneNumber
          AttributeType: S
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: status
          AttributeType: S
        - AttributeName: lastAccessedAt
          AttributeType: N
      KeySchema:
        - AttributeName: phoneNumber
          KeyType: HASH
        - AttributeName: sessionId
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: SessionsByStatus
          KeySchema:
            - AttributeName: status
              KeyType: HASH
            - AttributeName: lastAccessedAt
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamEnabled: true
        StreamViewType: NEW_AND_OLD_IMAGES
      SSESpecification:
        SSEEnabled: true
        SSEType: KMS
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: ttl
      Tags:
        - Key: Project
          Value: Jan-Awaaz
        - Key: Environment
          Value: Production
        - Key: DataRetention
          Value: 30days
`;

/**
 * AWS CLI command to create the table
 */
export const AWSCLICommand = `
aws dynamodb create-table \\
  --table-name jan-awaaz-sessions \\
  --attribute-definitions \\
    AttributeName=phoneNumber,AttributeType=S \\
    AttributeName=sessionId,AttributeType=S \\
    AttributeName=status,AttributeType=S \\
    AttributeName=lastAccessedAt,AttributeType=N \\
  --key-schema \\
    AttributeName=phoneNumber,KeyType=HASH \\
    AttributeName=sessionId,KeyType=RANGE \\
  --global-secondary-indexes \\
    "[{
      \\"IndexName\\": \\"SessionsByStatus\\",
      \\"KeySchema\\": [
        {\\"AttributeName\\": \\"status\\", \\"KeyType\\": \\"HASH\\"},
        {\\"AttributeName\\": \\"lastAccessedAt\\", \\"KeyType\\": \\"RANGE\\"}
      ],
      \\"Projection\\": {\\"ProjectionType\\": \\"ALL\\"}
    }]" \\
  --billing-mode PAY_PER_REQUEST \\
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \\
  --sse-specification Enabled=true,SSEType=KMS \\
  --tags Key=Project,Value=Jan-Awaaz Key=Environment,Value=Production \\
  --region ap-south-1

# Enable TTL
aws dynamodb update-time-to-live \\
  --table-name jan-awaaz-sessions \\
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \\
  --region ap-south-1
`;

// Script to populate office locations in DynamoDB
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

interface Office {
  officeId: string;
  officeType: 'CSC' | 'PANCHAYAT' | 'DISTRICT' | 'TALUK';
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contactNumber: string;
  workingHours: string;
  district: string;
  state: string;
}

// Sample office data (replace with actual data)
const offices: Office[] = [
  // Karnataka - Bangalore Rural
  {
    officeId: 'CSC-KA-BR-001',
    officeType: 'CSC',
    name: 'CSC Devanahalli',
    address: 'Main Road, Devanahalli, Bangalore Rural',
    latitude: 13.2443,
    longitude: 77.7122,
    contactNumber: '+91-80-12345678',
    workingHours: '9:00 AM - 5:00 PM',
    district: 'Bangalore Rural',
    state: 'Karnataka',
  },
  {
    officeId: 'PANCH-KA-BR-001',
    officeType: 'PANCHAYAT',
    name: 'Devanahalli Gram Panchayat',
    address: 'Panchayat Office, Devanahalli',
    latitude: 13.2450,
    longitude: 77.7130,
    contactNumber: '+91-80-23456789',
    workingHours: '10:00 AM - 4:00 PM',
    district: 'Bangalore Rural',
    state: 'Karnataka',
  },
  
  // Tamil Nadu - Chennai
  {
    officeId: 'CSC-TN-CH-001',
    officeType: 'CSC',
    name: 'CSC Tambaram',
    address: 'GST Road, Tambaram, Chennai',
    latitude: 12.9249,
    longitude: 80.1000,
    contactNumber: '+91-44-12345678',
    workingHours: '9:00 AM - 5:00 PM',
    district: 'Chennai',
    state: 'Tamil Nadu',
  },
  {
    officeId: 'PANCH-TN-CH-001',
    officeType: 'PANCHAYAT',
    name: 'Tambaram Panchayat Office',
    address: 'Panchayat Building, Tambaram',
    latitude: 12.9255,
    longitude: 80.1010,
    contactNumber: '+91-44-23456789',
    workingHours: '10:00 AM - 4:00 PM',
    district: 'Chennai',
    state: 'Tamil Nadu',
  },
  
  // Maharashtra - Pune
  {
    officeId: 'CSC-MH-PU-001',
    officeType: 'CSC',
    name: 'CSC Hadapsar',
    address: 'Pune-Solapur Road, Hadapsar, Pune',
    latitude: 18.5018,
    longitude: 73.9260,
    contactNumber: '+91-20-12345678',
    workingHours: '9:00 AM - 5:00 PM',
    district: 'Pune',
    state: 'Maharashtra',
  },
  {
    officeId: 'PANCH-MH-PU-001',
    officeType: 'PANCHAYAT',
    name: 'Hadapsar Gram Panchayat',
    address: 'Panchayat Office, Hadapsar',
    latitude: 18.5025,
    longitude: 73.9270,
    contactNumber: '+91-20-23456789',
    workingHours: '10:00 AM - 4:00 PM',
    district: 'Pune',
    state: 'Maharashtra',
  },
  
  // Add more offices as needed...
];

async function populateOffices() {
  const tableName = process.env.OFFICES_TABLE_NAME || 'jan-awaaz-offices-dev';
  
  console.log(`Populating ${offices.length} offices to ${tableName}...`);
  
  for (const office of offices) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: office,
        })
      );
      console.log(`✓ Added: ${office.name}`);
    } catch (error) {
      console.error(`✗ Failed to add ${office.name}:`, error);
    }
  }
  
  console.log('Done!');
}

// Run the script
populateOffices().catch(console.error);

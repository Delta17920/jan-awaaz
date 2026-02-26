/**
 * Location Routing Service
 * Integrates with Amazon Location Service for office search and routing
 */

import {
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  CalculateRouteCommand,
} from '@aws-sdk/client-location';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { awsConfig } from './config';
import {
  GPSCoordinates,
  Office,
  OfficeType,
  Directions,
  Defect,
  ApplicationProcessType,
} from '../types';

const locationClient = new LocationClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
}));

const PLACE_INDEX_NAME = process.env.AWS_LOCATION_PLACE_INDEX || 'jan-awaaz-places';
const ROUTE_CALCULATOR_NAME = process.env.AWS_LOCATION_ROUTE_CALCULATOR || 'jan-awaaz-routes';
const OFFICES_TABLE = process.env.AWS_DYNAMODB_TABLE_OFFICES || 'jan-awaaz-offices';

// Search radius in kilometers
const INITIAL_SEARCH_RADIUS_KM = 10;
const FALLBACK_SEARCH_RADIUS_KM = 25;

/**
 * Determine which office type is needed based on document defects and scheme process
 */
export function determineOfficeType(
  defects: Defect[],
  applicationProcess: ApplicationProcessType
): OfficeType {
  // Priority 1: Document defects requiring physical correction
  const criticalDefects = defects.filter(d => 
    d.type === 'MISSING_SEAL' || 
    d.type === 'MISSING_SIGNATURE' || 
    d.type === 'TAMPERED'
  );
  
  if (criticalDefects.length > 0) {
    // Force Panchayat for physical document correction
    return 'PANCHAYAT';
  }
  
  // Priority 2: Scheme application process type
  if (applicationProcess === 'ONLINE') {
    return 'CSC'; // Common Service Centre for online applications
  } else if (applicationProcess === 'PHYSICAL') {
    return 'PANCHAYAT'; // Panchayat office for physical applications
  } else {
    // HYBRID - default to CSC
    return 'CSC';
  }
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(coord1: GPSCoordinates, coord2: GPSCoordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * 
    Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest offices of a specific type within radius
 */
export async function findNearestOffices(
  userLocation: GPSCoordinates,
  officeType: OfficeType,
  radiusKm: number = INITIAL_SEARCH_RADIUS_KM
): Promise<Office[]> {
  try {
    // Query DynamoDB for offices of the specified type
    const command = new ScanCommand({
      TableName: OFFICES_TABLE,
      FilterExpression: '#type = :officeType AND #active = :active',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#active': 'isActive',
      },
      ExpressionAttributeValues: {
        ':officeType': officeType,
        ':active': true,
      },
    });

    const response = await dynamoClient.send(command);
    const offices = response.Items || [];

    // Calculate distance for each office and filter by radius
    const officesWithDistance = offices
      .map(office => {
        const distance = calculateDistance(userLocation, office.location);
        return {
          officeId: office.officeId,
          name: office.name,
          type: office.type,
          location: office.location,
          address: formatAddress(office.address),
          contactNumber: office.contactNumber,
          workingHours: formatWorkingHours(office.workingHours),
          distanceKm: distance,
        } as Office;
      })
      .filter(office => office.distanceKm <= radiusKm);

    // Sort by distance (ascending)
    officesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    // If no results found and using initial radius, try fallback radius
    if (officesWithDistance.length === 0 && radiusKm === INITIAL_SEARCH_RADIUS_KM) {
      return findNearestOffices(userLocation, officeType, FALLBACK_SEARCH_RADIUS_KM);
    }

    return officesWithDistance;
  } catch (error) {
    console.error('Error finding nearest offices:', error);
    throw new Error('Failed to find nearby offices. Please try again.');
  }
}

/**
 * Format address object to string
 */
function formatAddress(address: any): string {
  if (typeof address === 'string') return address;
  
  const parts = [
    address.line1,
    address.line2,
    address.village,
    address.taluk,
    address.district,
    address.state,
    address.pincode,
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Format working hours object to string
 */
function formatWorkingHours(hours: any): string {
  if (typeof hours === 'string') return hours;
  
  const { openTime, closeTime, lunchBreak } = hours;
  let formatted = `${openTime} - ${closeTime}`;
  
  if (lunchBreak) {
    formatted += ` (Lunch: ${lunchBreak.start} - ${lunchBreak.end})`;
  }
  
  return formatted;
}

/**
 * Get directions from user location to office
 */
export async function getDirections(
  from: GPSCoordinates,
  to: GPSCoordinates
): Promise<Directions> {
  try {
    const command = new CalculateRouteCommand({
      CalculatorName: ROUTE_CALCULATOR_NAME,
      DeparturePosition: [from.longitude, from.latitude],
      DestinationPosition: [to.longitude, to.latitude],
      TravelMode: 'Car',
      DistanceUnit: 'Kilometers',
    });

    const response = await locationClient.send(command);
    const leg = response.Legs?.[0];
    
    if (!leg) {
      throw new Error('No route found');
    }

    const distanceKm = Math.round((leg.Distance || 0) * 10) / 10;
    const durationMinutes = Math.round((leg.DurationSeconds || 0) / 60);
    
    // Extract turn-by-turn steps
    const steps = leg.Steps?.map(step => step.StartPosition?.toString() || '') || [];
    
    // Generate map URL (using Google Maps as fallback)
    const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}`;

    return {
      distanceKm,
      estimatedTimeMinutes: durationMinutes,
      steps,
      mapUrl,
    };
  } catch (error) {
    console.error('Error calculating directions:', error);
    
    // Fallback: Calculate straight-line distance
    const distanceKm = calculateDistance(from, to);
    const estimatedTimeMinutes = Math.round(distanceKm * 2); // Rough estimate: 30 km/h average
    
    const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}`;
    
    return {
      distanceKm,
      estimatedTimeMinutes,
      steps: ['Route calculation unavailable. Please use the map link for directions.'],
      mapUrl,
    };
  }
}

/**
 * Generate map URL with color-coded pins
 */
export function generateMapUrl(
  userLocation: GPSCoordinates,
  office: Office
): string {
  // Green pin for CSC (online), Red pin for Panchayat (physical)
  const pinColor = office.type === 'CSC' ? 'green' : 'red';
  
  // Google Maps URL with markers
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('origin', `${userLocation.latitude},${userLocation.longitude}`);
  url.searchParams.set('destination', `${office.location.latitude},${office.location.longitude}`);
  url.searchParams.set('travelmode', 'driving');
  
  return url.toString();
}

/**
 * Smart routing: Determine office type and find nearest office
 */
export async function smartRoute(
  userLocation: GPSCoordinates,
  defects: Defect[],
  applicationProcess: ApplicationProcessType
): Promise<{ office: Office; directions: Directions } | null> {
  try {
    // Determine which office type is needed
    const officeType = determineOfficeType(defects, applicationProcess);
    
    // Find nearest offices of that type
    const offices = await findNearestOffices(userLocation, officeType);
    
    if (offices.length === 0) {
      return null;
    }
    
    // Get the nearest office
    const nearestOffice = offices[0];
    
    // Calculate directions
    const directions = await getDirections(userLocation, nearestOffice.location);
    
    return {
      office: nearestOffice,
      directions,
    };
  } catch (error) {
    console.error('Error in smart routing:', error);
    throw new Error('Failed to find route to office. Please try again.');
  }
}

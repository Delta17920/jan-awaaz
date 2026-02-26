/**
 * Location Routing API Route
 * Handles office search and routing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findNearestOffices,
  getDirections,
  smartRoute,
  determineOfficeType,
  generateMapUrl,
} from '@/lib/aws/location-service';
import { GPSCoordinates, OfficeType, Defect, ApplicationProcessType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userLocation, officeType, defects, applicationProcess, destination } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!userLocation || typeof userLocation.latitude !== 'number' || typeof userLocation.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid or missing userLocation. Must include latitude and longitude.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'findOffices': {
        // Find nearest offices of a specific type
        if (!officeType) {
          return NextResponse.json(
            { error: 'Missing required field: officeType' },
            { status: 400 }
          );
        }

        const offices = await findNearestOffices(
          userLocation as GPSCoordinates,
          officeType as OfficeType
        );

        if (offices.length === 0) {
          return NextResponse.json({
            success: true,
            offices: [],
            message: 'No offices found within 25km. Please try a different location or contact the helpline.',
          });
        }

        return NextResponse.json({
          success: true,
          offices,
          count: offices.length,
        });
      }

      case 'getDirections': {
        // Get directions from user location to a specific office
        if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
          return NextResponse.json(
            { error: 'Invalid or missing destination. Must include latitude and longitude.' },
            { status: 400 }
          );
        }

        const directions = await getDirections(
          userLocation as GPSCoordinates,
          destination as GPSCoordinates
        );

        return NextResponse.json({
          success: true,
          directions,
        });
      }

      case 'smartRoute': {
        // Smart routing based on defects and application process
        if (!defects || !Array.isArray(defects)) {
          return NextResponse.json(
            { error: 'Missing or invalid field: defects (must be an array)' },
            { status: 400 }
          );
        }

        if (!applicationProcess) {
          return NextResponse.json(
            { error: 'Missing required field: applicationProcess' },
            { status: 400 }
          );
        }

        const result = await smartRoute(
          userLocation as GPSCoordinates,
          defects as Defect[],
          applicationProcess as ApplicationProcessType
        );

        if (!result) {
          return NextResponse.json({
            success: true,
            office: null,
            directions: null,
            message: 'No suitable office found within 25km. Please contact the helpline for assistance.',
          });
        }

        // Generate map URL with color-coded pin
        const mapUrl = generateMapUrl(userLocation as GPSCoordinates, result.office);

        return NextResponse.json({
          success: true,
          office: result.office,
          directions: result.directions,
          mapUrl,
          officeType: result.office.type,
          reason: determineOfficeType(defects as Defect[], applicationProcess as ApplicationProcessType),
        });
      }

      case 'determineOfficeType': {
        // Determine which office type is needed
        if (!defects || !Array.isArray(defects)) {
          return NextResponse.json(
            { error: 'Missing or invalid field: defects (must be an array)' },
            { status: 400 }
          );
        }

        if (!applicationProcess) {
          return NextResponse.json(
            { error: 'Missing required field: applicationProcess' },
            { status: 400 }
          );
        }

        const recommendedOfficeType = determineOfficeType(
          defects as Defect[],
          applicationProcess as ApplicationProcessType
        );

        return NextResponse.json({
          success: true,
          officeType: recommendedOfficeType,
          reason: defects.length > 0 
            ? 'Document defects require physical correction'
            : `Scheme application process is ${applicationProcess}`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Location API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process location request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for finding offices by type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const officeType = searchParams.get('officeType') as OfficeType;

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid or missing latitude/longitude parameters' },
        { status: 400 }
      );
    }

    if (!officeType) {
      return NextResponse.json(
        { error: 'Missing required parameter: officeType' },
        { status: 400 }
      );
    }

    const offices = await findNearestOffices(
      { latitude, longitude },
      officeType
    );

    if (offices.length === 0) {
      return NextResponse.json({
        success: true,
        offices: [],
        message: 'No offices found within 25km.',
      });
    }

    return NextResponse.json({
      success: true,
      offices,
      count: offices.length,
    });
  } catch (error) {
    console.error('Location API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to find offices. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

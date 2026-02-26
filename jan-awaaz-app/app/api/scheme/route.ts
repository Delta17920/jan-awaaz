/**
 * Scheme Matching API Route
 * Handles scheme queries and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { findMatchingSchemes, getSchemeDetails, validateSchemeExists } from '@/lib/aws/scheme-service';
import { Language } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userStory, schemeId, language } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'find': {
        // Find matching schemes based on user story
        if (!userStory) {
          return NextResponse.json(
            { error: 'Missing required field: userStory' },
            { status: 400 }
          );
        }

        const schemes = await findMatchingSchemes(
          userStory,
          language as Language || 'hi-IN'
        );

        if (schemes.length === 0) {
          return NextResponse.json({
            success: true,
            schemes: [],
            message: 'No matching schemes found. Please provide more details about your situation.',
          });
        }

        return NextResponse.json({
          success: true,
          schemes,
          count: schemes.length,
        });
      }

      case 'details': {
        // Get detailed information about a specific scheme
        if (!schemeId) {
          return NextResponse.json(
            { error: 'Missing required field: schemeId' },
            { status: 400 }
          );
        }

        const details = await getSchemeDetails(schemeId);

        if (!details) {
          return NextResponse.json(
            { error: 'Scheme not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          scheme: details,
        });
      }

      case 'validate': {
        // Validate that a scheme exists (prevent hallucination)
        if (!schemeId) {
          return NextResponse.json(
            { error: 'Missing required field: schemeId' },
            { status: 400 }
          );
        }

        const exists = await validateSchemeExists(schemeId);

        return NextResponse.json({
          success: true,
          exists,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Scheme API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process scheme request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving scheme details by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schemeId = searchParams.get('schemeId');

    if (!schemeId) {
      return NextResponse.json(
        { error: 'Missing required parameter: schemeId' },
        { status: 400 }
      );
    }

    const details = await getSchemeDetails(schemeId);

    if (!details) {
      return NextResponse.json(
        { error: 'Scheme not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      scheme: details,
    });
  } catch (error) {
    console.error('Scheme API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve scheme details. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

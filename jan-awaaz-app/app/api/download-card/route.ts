/**
 * Download Card Proxy API
 * Proxies S3 image downloads to bypass CORS restrictions
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('Proxying download for:', imageUrl);

    // Fetch the image from S3
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the image with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'image/svg+xml',
        'Content-Disposition': 'attachment; filename="referral-card.svg"',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download card',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

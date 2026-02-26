/**
 * Document Verification API Route
 * Handles document upload and verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyDocument, compressImage, detectBlur } from '@/lib/aws/document-service';
import type { DocumentImage } from '@/lib/types';

/**
 * POST /api/document
 * Upload and verify document
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const documentFile = formData.get('document') as File;
    
    if (!documentFile) {
      return NextResponse.json(
        { error: 'Document file is required' },
        { status: 400 }
      );
    }
    
    // Validate file size (should be < 5MB before compression)
    if (documentFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!documentFile.type.includes('image')) {
      return NextResponse.json(
        { error: 'File must be an image (jpg or png)' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const arrayBuffer = await documentFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine format
    const format = documentFile.type.includes('png') ? 'png' : 'jpg';
    
    let documentImage: DocumentImage = {
      data: buffer,
      format: format as 'jpg' | 'png',
      size: buffer.length,
      captureTimestamp: new Date(),
    };
    
    // Check for blur
    if (detectBlur(documentImage)) {
      return NextResponse.json(
        { 
          error: 'Image is too blurry. Please recapture with better lighting.',
          blurDetected: true,
        },
        { status: 400 }
      );
    }
    
    // Compress image to <500KB
    documentImage = compressImage(documentImage);
    
    // Verify document
    const result = await verifyDocument(documentImage);
    
    return NextResponse.json({
      success: true,
      verification: result,
    });
  } catch (error) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    );
  }
}

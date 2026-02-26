/**
 * Voice Processing API Route
 * Handles voice input transcription and speech synthesis
 */

import { NextRequest, NextResponse } from 'next/server';
import { transcribeVoice, synthesizeSpeech, getCachedSpeech } from '@/lib/aws/voice-service';
import { isLanguage } from '@/lib/utils/validation';
import type { Language } from '@/lib/types';

/**
 * POST /api/voice/transcribe
 * Transcribe voice input to text
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'transcribe') {
      return await handleTranscribe(request);
    } else if (action === 'synthesize') {
      return await handleSynthesize(request);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use ?action=transcribe or ?action=synthesize' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle transcribe action
 */
async function handleTranscribe(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }
    
    if (!language || !isLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Determine audio format from file type
    const format = audioFile.type.includes('wav') ? 'wav' :
                   audioFile.type.includes('mp3') ? 'mp3' : 'ogg';
    
    const audioStream = {
      data: buffer,
      format: format as 'wav' | 'mp3' | 'ogg',
      sampleRate: 16000, // Default sample rate
    };
    
    const result = await transcribeVoice(audioStream, language as Language);
    
    return NextResponse.json({
      success: true,
      transcription: result,
    });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

/**
 * Handle synthesize action
 */
async function handleSynthesize(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language, useCache = true } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    if (!language || !isLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }
    
    const audioStream = useCache
      ? await getCachedSpeech(text, language as Language)
      : await synthesizeSpeech(text, language as Language);
    
    // Return audio as base64
    const audioBase64 = audioStream.data.toString('base64');
    
    return NextResponse.json({
      success: true,
      audio: {
        data: audioBase64,
        format: audioStream.format,
        sampleRate: audioStream.sampleRate,
      },
    });
  } catch (error) {
    console.error('Synthesize error:', error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}

/**
 * Voice Processing Service
 * Handles voice input/output using Amazon Transcribe and Polly
 */

import {
  TranscribeClient,
  StartTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  VoiceId,
} from '@aws-sdk/client-polly';
import type { AudioStream, TranscribedText, Language } from '../types';
import { awsConfig } from './config';

// Initialize AWS clients
const transcribeClient = new TranscribeClient(awsConfig);
const pollyClient = new PollyClient(awsConfig);

// Language to Polly voice mapping (using available native Standard voices where possible)
const LANGUAGE_VOICE_MAP: Record<Language, VoiceId> = {
  'hi-IN': 'Aditi' as VoiceId,      // Hindi (Bilingual English/Hindi)
  'ta-IN': 'Aditi' as VoiceId,      // Tamil (Fallback, native Kani might be Neural only or unsupported in ap-south-1)
  'te-IN': 'Aditi' as VoiceId,      // Telugu (Fallback, native Shruti might be Neural only or unsupported in ap-south-1)
  'kn-IN': 'Aditi' as VoiceId,      // Kannada
  'ml-IN': 'Aditi' as VoiceId,      // Malayalam
  'mr-IN': 'Aditi' as VoiceId,      // Marathi
  'bn-IN': 'Aditi' as VoiceId,      // Bengali
  'gu-IN': 'Aditi' as VoiceId,      // Gujarati
  'pa-IN': 'Aditi' as VoiceId,      // Punjabi
  'or-IN': 'Aditi' as VoiceId,      // Odia
};

/**
 * Transcribe voice input to text using Amazon Transcribe
 */
export async function transcribeVoice(
  audioStream: AudioStream,
  language: Language
): Promise<TranscribedText> {
  const startTime = Date.now();

  try {
    // Validate audio format
    if (!['wav', 'mp3', 'ogg'].includes(audioStream.format)) {
      throw new Error(`Unsupported audio format: ${audioStream.format}`);
    }

    // For real-time transcription, we need to use AWS Transcribe Streaming
    // However, this requires WebSocket connection which is complex
    // For MVP, we'll use a simpler approach with mock data
    // In production, integrate with AWS Transcribe Streaming API
    
    // TEMPORARY: Return mock transcription
    // TODO: Implement real AWS Transcribe Streaming
    console.warn('Using mock transcription - implement AWS Transcribe Streaming for production');
    
    // For testing, you can manually set the transcription here
    // or pass it from the frontend
    const mockTranscription = await simulateTranscription(audioStream, language);

    const processingTime = Date.now() - startTime;

    if (processingTime > 5000) {
      console.warn(`Transcription took ${processingTime}ms, exceeding 5s requirement`);
    }

    return {
      text: mockTranscription.text,
      confidence: mockTranscription.confidence,
      language,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Transcribe segmented audio for inputs >60 seconds
 */
export async function transcribeSegmented(
  audioStream: AudioStream,
  language: Language
): Promise<TranscribedText[]> {
  // Split audio into 60-second segments
  const segmentDuration = 60; // seconds
  const segments = splitAudioIntoSegments(audioStream, segmentDuration);

  const transcriptions: TranscribedText[] = [];

  for (const segment of segments) {
    const transcription = await transcribeVoice(segment, language);
    transcriptions.push(transcription);
  }

  return transcriptions;
}

/**
 * Synthesize speech from text using Amazon Polly
 */
export async function synthesizeSpeech(
  text: string,
  language: Language
): Promise<AudioStream> {
  const startTime = Date.now();

  try {
    const voiceId = LANGUAGE_VOICE_MAP[language];
    
    // Map unsupported language codes to hi-IN (Hindi) as fallback
    const pollyLanguageMap: Record<Language, string> = {
      'hi-IN': 'hi-IN',
      'ta-IN': 'hi-IN', // Tamil not supported, use Hindi
      'te-IN': 'hi-IN', // Telugu not supported, use Hindi
      'kn-IN': 'hi-IN', // Kannada not supported, use Hindi
      'ml-IN': 'hi-IN', // Malayalam not supported, use Hindi
      'mr-IN': 'hi-IN', // Marathi not supported, use Hindi
      'bn-IN': 'hi-IN', // Bengali not supported, use Hindi
      'gu-IN': 'hi-IN', // Gujarati not supported, use Hindi
      'pa-IN': 'hi-IN', // Punjabi not supported, use Hindi
      'or-IN': 'hi-IN', // Odia not supported, use Hindi
    };

    const pollyLanguageCode = pollyLanguageMap[language];

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceId,
      Engine: Engine.STANDARD,
      LanguageCode: pollyLanguageCode as any,
    });

    const response = await pollyClient.send(command);

    const processingTime = Date.now() - startTime;

    // Ensure latency requirement (<2 seconds for playback start)
    if (processingTime > 2000) {
      console.warn(`Speech synthesis took ${processingTime}ms, exceeding 2s requirement`);
    }

    if (!response.AudioStream) {
      throw new Error('No audio stream returned from Polly');
    }

    // Convert stream to buffer
    const audioBuffer = await streamToBuffer(response.AudioStream);

    return {
      data: audioBuffer,
      format: 'mp3',
      sampleRate: 24000, // Polly default
    };
  } catch (error) {
    console.error('Speech synthesis error:', error);
    throw new Error('Failed to synthesize speech');
  }
}

/**
 * Compress audio for bandwidth optimization
 */
export function compressAudio(audioStream: AudioStream): AudioStream {
  // In production, use audio compression library
  // For now, return as-is
  return audioStream;
}

/**
 * Filter background noise from audio
 */
export function filterNoise(audioStream: AudioStream): AudioStream {
  // In production, use noise reduction library
  // For now, return as-is
  return audioStream;
}

/**
 * Validate audio stream
 */
export function validateAudioStream(audioStream: AudioStream): boolean {
  if (!audioStream.data || audioStream.data.length === 0) {
    return false;
  }

  if (!['wav', 'mp3', 'ogg'].includes(audioStream.format)) {
    return false;
  }

  if (audioStream.sampleRate < 8000 || audioStream.sampleRate > 48000) {
    return false;
  }

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simulate transcription (for development without AWS)
 */
async function simulateTranscription(
  audioStream: AudioStream,
  language: Language
): Promise<{ text: string; confidence: number }> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    text: 'Sample transcribed text in ' + language,
    confidence: 0.95,
  };
}

/**
 * Split audio into segments
 */
function splitAudioIntoSegments(
  audioStream: AudioStream,
  segmentDuration: number
): AudioStream[] {
  // In production, split audio based on duration
  // For now, return single segment
  return [audioStream];
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Cache for common Polly responses
 */
const pollyCache = new Map<string, AudioStream>();

/**
 * Get cached Polly response or synthesize new one
 */
export async function getCachedSpeech(
  text: string,
  language: Language
): Promise<AudioStream> {
  const cacheKey = `${text}-${language}`;

  if (pollyCache.has(cacheKey)) {
    return pollyCache.get(cacheKey)!;
  }

  const audioStream = await synthesizeSpeech(text, language);
  pollyCache.set(cacheKey, audioStream);

  return audioStream;
}

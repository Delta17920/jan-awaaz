'use client';

import React, { useState, useRef } from 'react';
import { Language } from '@/lib/types';
import { getTranslation } from '@/lib/utils/translations';

interface VoiceInputProps {
  language: Language;
  phoneNumber: string;
  onComplete: (schemes: any[], action?: 'document' | 'card', cscCenter?: any) => void;
}

export default function VoiceInput({ language, phoneNumber, onComplete }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [hasCheckedDocumentStatus, setHasCheckedDocumentStatus] = useState(false);

  // Check if we just returned from document verification
  React.useEffect(() => {
    const documentVerified = localStorage.getItem('jan-awaaz-document-verified');
    if (documentVerified === 'true' && !hasCheckedDocumentStatus) {
      setHasCheckedDocumentStatus(true);
      localStorage.removeItem('jan-awaaz-document-verified');
      
      // Automatically send message to Haiku about document verification
      processTranscription('[DOCUMENT_VERIFIED]');
    }
  }, [hasCheckedDocumentStatus]);

  const startRecording = async () => {
    try {
      // Use Web Speech API for transcription (works in Chrome/Edge)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      const recognition = new SpeechRecognition();
      
      // Map language codes - Web Speech API uses different codes
      const speechLangMap: Record<string, string> = {
        'hi-IN': 'hi-IN',
        'ta-IN': 'ta-IN',
        'te-IN': 'te-IN',
        'kn-IN': 'kn-IN',
        'ml-IN': 'ml-IN',
        'mr-IN': 'mr-IN',
        'bn-IN': 'bn-IN',
        'gu-IN': 'gu-IN',
        'pa-IN': 'pa-Guru-IN',
        'or-IN': 'or-IN',
      };
      
      recognition.lang = speechLangMap[language] || 'en-IN';
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Show interim results
      recognition.maxAlternatives = 1;

      console.log('Starting speech recognition with language:', recognition.lang);

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started - speak now!');
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('Final transcript:', finalTranscript);
          } else {
            interimTranscript += transcript;
            console.log('Interim transcript:', interimTranscript);
          }
        }
        
        // Show interim results
        setTranscription(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'no-speech') {
          console.log('No speech detected, but continuing to listen...');
          // Don't stop on no-speech, let user try again
        } else if (event.error === 'not-allowed') {
          setIsRecording(false);
          alert('Microphone permission denied. Please allow microphone access and try again.');
        } else if (event.error === 'aborted') {
          console.log('Speech recognition aborted');
          setIsRecording(false);
        } else {
          console.error('Speech error:', event.error);
          setIsRecording(false);
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = async () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        
        // Process the final transcript
        if (finalTranscript.trim()) {
          console.log('Processing final transcript:', finalTranscript);
          await processTranscription(finalTranscript.trim());
        } else {
          alert('No speech detected. Please click the microphone and speak clearly.');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      alert('Failed to start speech recognition. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const processTranscription = async (transcript: string) => {
    console.log('Processing transcription:', transcript);
    setIsProcessing(true);
    
    try {
      // Call conversational chat API - Haiku handles everything
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          language,
          phoneNumber, // Send phone number for session management
        }),
      });

      const data = await response.json();
      console.log('Chat response:', data);
      
      if (data.success) {
        // Clean and speak the response
        let speechText = data.message
          .replace(/\s+/g, ' ')
          .replace(/\n/g, ' ')
          .trim();
        
        console.log('Speaking:', speechText);
        speakText(speechText);
        
        // Check if we need to generate referral card and show map
        if (data.generateReferral) {
          console.log('Generating referral card - proceeding to card');
          console.log('CSC center from chat API:', data.cscCenter);
          // Wait for speech to finish, then show referral card
          setTimeout(() => {
            onComplete(data.schemes || [], 'card', data.cscCenter);
          }, speechText.length * 80);
        }
        // Check if user is ready for document capture
        else if (data.readyForDocuments) {
          console.log('User ready for documents - triggering camera');
          // Wait for speech to finish, then open camera
          setTimeout(() => {
            // Use schemes from session if available
            const schemesToPass = data.schemes && data.schemes.length > 0 ? data.schemes : [];
            onComplete(schemesToPass, 'document');
          }, speechText.length * 80); // Wait for speech
        }
        // If schemes were found but not ready for documents yet, don't proceed
        else if (data.schemes && data.schemes.length > 0) {
          console.log('Schemes found but waiting for user confirmation');
        }
      } else {
        console.error('Chat error:', data);
        speakText('कुछ गलत हो गया। कृपया फिर से प्रयास करें।');
      }
    } catch (error) {
      console.error('Error processing transcription:', error);
      speakText('कुछ गलत हो गया। कृपया फिर से प्रयास करें।');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    // Stop speech recognition while speaking to prevent echo/feedback
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    
    // Use Web Speech API for text-to-speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Force Hindi voice
    utterance.lang = 'hi-IN';
    utterance.rate = 0.85; // Slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to find a Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(voice => 
      voice.lang === 'hi-IN' || 
      voice.lang.startsWith('hi') ||
      voice.name.includes('Hindi')
    );
    
    if (hindiVoice) {
      utterance.voice = hindiVoice;
      console.log('Using Hindi voice:', hindiVoice.name);
    } else {
      console.warn('No Hindi voice found, using default');
    }
    
    console.log('Speaking in Hindi:', text);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Speak
    window.speechSynthesis.speak(utterance);
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {getTranslation('tellYourSituation', language)}
      </h2>
      <p className="text-center text-gray-600 mb-8">
        {getTranslation('whichSchemeNeeded', language)}
      </p>

      <div className="flex flex-col items-center gap-6">
        {/* Microphone Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl transition-all ${isRecording
              ? 'bg-red-500 animate-pulse'
              : isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
        >
          {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
        </button>

        {/* Manual Text Input (Fallback) */}
        <div className="w-full">
          <p className="text-center text-sm text-gray-500 mb-2">Or type your situation:</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as any).userInput.value;
            if (input.trim()) {
              setTranscription(input);
              processTranscription(input);
            }
          }} className="flex gap-2">
            <input
              type="text"
              name="userInput"
              placeholder="e.g., My husband died, I need financial support"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Status */}
        <div className="text-center">
          {isRecording && (
            <p className="text-red-500 font-semibold">
              {getTranslation('recordingInProgress', language)}
            </p>
          )}
          {isProcessing && (
            <p className="text-blue-500 font-semibold">
              {getTranslation('processing', language)}
            </p>
          )}
        </div>

        {/* Transcription */}
        {transcription && (
          <div className="w-full p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              {getTranslation('youSaid', language)}
            </p>
            <p className="text-lg">{transcription}</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { getTranslation } from '@/lib/utils/translations';
import { Language } from '@/lib/types';

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => void;
  language: Language;
}

export default function PhoneInput({ onSubmit, language }: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number validation: 10 digits
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const extractPhoneNumber = (text: string): string => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Try to find 10 consecutive digits starting with 6-9
    const match = digits.match(/[6-9]\d{9}/);
    return match ? match[0] : digits.slice(-10);
  };

  const startVoiceInput = async () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert('Speech recognition not supported. Please type your number.');
        return;
      }

      const recognition = new SpeechRecognition();
      
      // Map language codes
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
      
      recognition.lang = speechLangMap[language] || 'hi-IN';
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Show interim results
      recognition.maxAlternatives = 1;

      console.log('Starting phone number voice input:', recognition.lang);

      let finalTranscript = '';
      let silenceTimer: any = null;

      recognition.onstart = () => {
        console.log('Listening for phone number...');
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
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
        
        // Extract phone number from speech
        const currentText = finalTranscript + interimTranscript;
        const extractedPhone = extractPhoneNumber(currentText);
        console.log('Extracted phone:', extractedPhone);
        
        if (extractedPhone.length >= 10) {
          setPhoneNumber(extractedPhone.slice(0, 10));
          setError('');
          
          // Auto-stop after getting 10 digits and 2 seconds of silence
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, 2000);
        } else {
          setPhoneNumber(extractedPhone);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setIsListening(false);
          alert('Microphone permission denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected, continuing to listen...');
          // Don't stop on no-speech
        } else if (event.error !== 'aborted') {
          setIsListening(false);
          setError('Voice input failed. Please try typing.');
        }
      };

      recognition.onend = () => {
        console.log('Voice input ended');
        setIsListening(false);
        
        if (silenceTimer) clearTimeout(silenceTimer);
        
        // Validate final phone number
        if (phoneNumber.length > 0 && phoneNumber.length !== 10) {
          setError(getTranslation('invalidPhone', language));
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error starting voice input:', error);
      alert('Failed to start voice input. Please type your number.');
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError(getTranslation('invalidPhone', language));
      return;
    }

    setError('');
    onSubmit(phoneNumber);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {getTranslation('enterPhone', language)}
        </h2>
        <p className="text-gray-600 text-sm">
          {getTranslation('phoneDescription', language)}
        </p>
        <p className="text-blue-600 text-xs mt-2">
          {language === 'hi-IN' 
            ? '🎤 माइक बटन दबाएं और अपना नंबर बोलें' 
            : '🎤 Press mic button and speak your number'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            {getTranslation('phoneLabel', language)}
          </label>
          <div className="flex gap-2">
            <div className="flex flex-1">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +91
              </span>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(value);
                  setError('');
                }}
                placeholder="9876543210"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-lg"
                maxLength={10}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              className={`px-4 py-2 rounded-md text-white font-semibold transition-colors ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          {isListening && (
            <p className="mt-2 text-sm text-blue-600 animate-pulse">
              {language === 'hi-IN' ? '🎤 सुन रहा हूं... अपना नंबर बोलें' : '🎤 Listening... Speak your number'}
            </p>
          )}
          {phoneNumber.length > 0 && phoneNumber.length < 10 && !isListening && (
            <p className="mt-2 text-sm text-orange-600">
              {language === 'hi-IN' 
                ? `${phoneNumber.length}/10 अंक मिले` 
                : `${phoneNumber.length}/10 digits received`}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={phoneNumber.length !== 10}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {getTranslation('continue', language)}
        </button>
      </form>

      <div className="mt-4 text-center text-xs text-gray-500">
        <p>{getTranslation('privacyNote', language)}</p>
      </div>
    </div>
  );
}

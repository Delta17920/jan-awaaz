'use client';

import { useState, useEffect } from 'react';
import VoiceInput from '@/components/VoiceInput';
import CameraCapture from '@/components/CameraCapture';
import MapDisplay from '@/components/MapDisplay';
import ReferralCardDisplay from '@/components/ReferralCardDisplay';
import LanguageSelector from '@/components/LanguageSelector';
import PhoneInput from '@/components/PhoneInput';
import InstallPrompt from '@/components/InstallPrompt';
import { Language } from '@/lib/types';
import { offlineStorage } from '@/lib/utils/offline-storage';
import { syncManager } from '@/lib/utils/sync-manager';
import { getTranslation } from '@/lib/utils/translations';

export default function Home() {
  const [language, setLanguage] = useState<Language>('hi-IN');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'phone' | 'language' | 'voice' | 'document' | 'card'>('phone');
  const [schemeMatches, setSchemeMatches] = useState<any[]>([]);
  const [cscCenter, setCscCenter] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [referralCard, setReferralCard] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [documentsRequired, setDocumentsRequired] = useState<number>(1);
  const [documentsUploaded, setDocumentsUploaded] = useState<number>(0);

  useEffect(() => {
    // Initialize offline storage
    offlineStorage.init();

    // Check for existing phone number and session
    const savedPhone = localStorage.getItem('jan-awaaz-phone');
    const savedSession = localStorage.getItem('jan-awaaz-session');
    
    if (savedPhone && savedSession) {
      const session = JSON.parse(savedSession);
      setPhoneNumber(savedPhone);
      setSessionId(session.sessionId);
      setLanguage(session.language || 'hi-IN');
      // Skip to language selection if we have phone number
      setCurrentStep('language');
    }

    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(syncManager.getOnlineStatus());
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handlePhoneSubmit = (phone: string) => {
    setPhoneNumber(phone);
    localStorage.setItem('jan-awaaz-phone', phone);
    setCurrentStep('language');
  };

  const handleLanguageSelect = async (lang: Language) => {
    setLanguage(lang);
    
    // Save language preference
    localStorage.setItem('jan-awaaz-language', lang);
    
    // Save session info
    const sessionData = {
      sessionId: sessionId || `temp-${Date.now()}`,
      language: lang,
    };
    localStorage.setItem('jan-awaaz-session', JSON.stringify(sessionData));
    
    // Save to IndexedDB for offline access
    if (phoneNumber) {
      await offlineStorage.saveSession({
        sessionId: sessionData.sessionId,
        phoneNumber: phoneNumber,
        language: lang,
        timestamp: Date.now(),
        data: {},
      });
    }
    
    setCurrentStep('voice');
  };

  const handleVoiceComplete = async (schemes: any[], action?: 'document' | 'card', cscCenterInfo?: any) => {
    console.log('Voice complete - schemes:', schemes, 'action:', action, 'cscCenter:', cscCenterInfo);
    setSchemeMatches(schemes);
    
    // Get document requirements from scheme
    if (schemes.length > 0) {
      const requiredDocs = schemes[0].requiredDocuments?.length || 1;
      console.log(`Scheme requires ${requiredDocs} documents`);
      setDocumentsRequired(requiredDocs);
      setDocumentsUploaded(0); // Reset counter
    }
    
    if (cscCenterInfo) {
      console.log('Saving CSC center info:', cscCenterInfo);
      setCscCenter(cscCenterInfo);
    }
    
    if (action === 'card') {
      // Generate referral card directly
      await generateReferralCard(cscCenterInfo);
    } else if (action === 'document') {
      // Go to document capture
      setCurrentStep('document');
    }
  };

  const generateReferralCard = async (cscCenterInfo?: any) => {
    try {
      // Use mock location since we get location through chat
      const location = {
        latitude: 13.0827, // Chennai coordinates (mock)
        longitude: 80.2707,
      };

      // Call orchestrate API to generate referral
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateReferral',
          phoneNumber,
          location,
          language,
          cscCenter: cscCenterInfo || cscCenter, // Pass CSC center info from chat API
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setOffice(data.office);
        setReferralCard(data.card);
        setCurrentStep('card');
      }
    } catch (error) {
      console.error('Error generating referral card:', error);
      alert('कुछ गलत हो गया। कृपया पुनः प्रयास करें।');
    }
  };

  const handleDocumentComplete = (allComplete: boolean, progress?: any) => {
    console.log('Document complete:', { allComplete, progress });
    
    if (allComplete) {
      // All documents uploaded - notify Haiku
      if (progress) {
        setDocumentsUploaded(progress.uploaded);
      }
      
      // Set flag so VoiceInput knows to send [DOCUMENT_VERIFIED]
      localStorage.setItem('jan-awaaz-document-verified', 'true');
      
      // Return to voice for Haiku to explain next steps
      setCurrentStep('voice');
    } else {
      // More documents needed - stay in document capture
      if (progress) {
        setDocumentsUploaded(progress.uploaded);
        console.log(`Progress: ${progress.uploaded}/${progress.required} documents uploaded`);
      }
      // Stay on document step - CameraCapture will re-render with new progress
    }
  };

  const handleLocationSelect = async (selectedOffice: any, card: any) => {
    setOffice(selectedOffice);
    setReferralCard(card);
    
    // Save card for offline viewing
    if (card) {
      await offlineStorage.saveCard(card);
    }
    
    setCurrentStep('card');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">
            {getTranslation('appTitle', language)}
          </h1>
          <p className="text-gray-600">
            {getTranslation('appSubtitle', language)}
          </p>
          
          {/* Online Status Indicator */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isOnline ? getTranslation('online', language) : getTranslation('offline', language)}
            </span>
          </div>
        </header>

        {/* Phone Number Input */}
        {currentStep === 'phone' && (
          <PhoneInput 
            onSubmit={handlePhoneSubmit}
            language={language}
          />
        )}

        {/* Language Selection */}
        {currentStep === 'language' && (
          <LanguageSelector 
            onSelect={handleLanguageSelect}
            onPreview={setLanguage}
          />
        )}

        {/* Voice Input */}
        {currentStep === 'voice' && phoneNumber && (
          <VoiceInput 
            language={language}
            phoneNumber={phoneNumber}
            onComplete={handleVoiceComplete}
          />
        )}

        {/* Document Capture */}
        {currentStep === 'document' && (
          <CameraCapture 
            language={language}
            phoneNumber={phoneNumber || ''}
            schemes={schemeMatches}
            documentsRequired={documentsRequired}
            documentsUploaded={documentsUploaded}
            onComplete={handleDocumentComplete}
          />
        )}

        {/* Referral Card */}
        {currentStep === 'card' && referralCard && office && (
          <ReferralCardDisplay 
            card={referralCard}
            office={office}
            language={language}
          />
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>Powered by AI4Bharat</p>
        </footer>
      </div>

      {/* Install Prompt */}
      <InstallPrompt />
    </main>
  );
}

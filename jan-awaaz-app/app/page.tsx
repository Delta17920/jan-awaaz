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
  const [currentStep, setCurrentStep] = useState<'phone' | 'language' | 'voice' | 'document' | 'card'>('language');
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
    const savedLanguage = localStorage.getItem('jan-awaaz-language');
    
    if (savedLanguage) {
      setLanguage(savedLanguage as Language);
    }
    
    if (savedPhone && savedSession) {
      const session = JSON.parse(savedSession);
      setPhoneNumber(savedPhone);
      setSessionId(session.sessionId);
      setLanguage(session.language || 'hi-IN');
      // Skip to voice if we have both phone and language
      setCurrentStep('voice');
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

  const handleLanguageSelect = async (lang: Language) => {
    setLanguage(lang);
    
    // Save language preference
    localStorage.setItem('jan-awaaz-language', lang);
    
    // Move to phone number input
    setCurrentStep('phone');
  };

  const handlePhoneSubmit = async (phone: string) => {
    setPhoneNumber(phone);
    localStorage.setItem('jan-awaaz-phone', phone);
    
    // Save session info
    const sessionData = {
      sessionId: sessionId || `temp-${Date.now()}`,
      language: language,
    };
    localStorage.setItem('jan-awaaz-session', JSON.stringify(sessionData));
    
    // Save to IndexedDB for offline access
    await offlineStorage.saveSession({
      sessionId: sessionData.sessionId,
      phoneNumber: phone,
      language: language,
      timestamp: Date.now(),
      data: {},
    });
    
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

  const handleStartOver = () => {
    // Clear all saved data
    localStorage.removeItem('jan-awaaz-phone');
    localStorage.removeItem('jan-awaaz-session');
    localStorage.removeItem('jan-awaaz-language');
    localStorage.removeItem('jan-awaaz-document-verified');
    
    // Reset all state
    setPhoneNumber(null);
    setSessionId(null);
    setLanguage('hi-IN');
    setSchemeMatches([]);
    setCscCenter(null);
    setOffice(null);
    setReferralCard(null);
    setDocumentsRequired(1);
    setDocumentsUploaded(0);
    
    // Go back to language selection
    setCurrentStep('language');
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Floating Words Background */}
      <div className="fixed inset-0 z-[1] overflow-hidden">
        {/* Hindi - योजना */}
        <div className="absolute text-6xl font-bold text-blue-500/20 animate-float-slow cursor-pointer hover:text-blue-600/40 hover:scale-110 transition-all duration-300" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
          योजना
        </div>
        <div className="absolute text-5xl font-bold text-blue-400/15 animate-float-medium cursor-pointer hover:text-blue-500/35 hover:scale-110 transition-all duration-300" style={{ top: '45%', left: '8%', animationDelay: '4s' }}>
          योजना
        </div>
        <div className="absolute text-4xl font-bold text-blue-300/15 animate-float-slow cursor-pointer hover:text-blue-400/35 hover:scale-110 transition-all duration-300" style={{ top: '5%', left: '2%', animationDelay: '7s' }}>
          योजना
        </div>
        <div className="absolute text-5xl font-bold text-blue-500/18 animate-float-fast cursor-pointer hover:text-blue-600/38 hover:scale-110 transition-all duration-300" style={{ top: '78%', left: '3%', animationDelay: '9s' }}>
          योजना
        </div>
        {/* Tamil - திட்டம் */}
        <div className="absolute text-5xl font-bold text-green-500/20 animate-float-medium cursor-pointer hover:text-green-600/40 hover:scale-110 transition-all duration-300" style={{ top: '20%', right: '10%', animationDelay: '2s' }}>
          திட்டம்
        </div>
        <div className="absolute text-6xl font-bold text-green-400/15 animate-float-slow cursor-pointer hover:text-green-500/35 hover:scale-110 transition-all duration-300" style={{ top: '55%', right: '8%', animationDelay: '5s' }}>
          திட்டம்
        </div>
        <div className="absolute text-4xl font-bold text-green-300/15 animate-float-medium cursor-pointer hover:text-green-400/35 hover:scale-110 transition-all duration-300" style={{ top: '90%', left: '25%', animationDelay: '7.5s' }}>
          திட்டம்
        </div>
        {/* Telugu - పథకం */}
        <div className="absolute text-7xl font-bold text-purple-500/20 animate-float-fast cursor-pointer hover:text-purple-600/40 hover:scale-110 transition-all duration-300" style={{ top: '60%', left: '15%', animationDelay: '1s' }}>
          పథకం
        </div>
        <div className="absolute text-5xl font-bold text-purple-400/15 animate-float-medium cursor-pointer hover:text-purple-500/35 hover:scale-110 transition-all duration-300" style={{ top: '25%', left: '12%', animationDelay: '3.5s' }}>
          పథకం
        </div>
        <div className="absolute text-4xl font-bold text-purple-300/15 animate-float-fast cursor-pointer hover:text-purple-400/35 hover:scale-110 transition-all duration-300" style={{ top: '12%', right: '35%', animationDelay: '8s' }}>
          పథకం
        </div>
        <div className="absolute text-6xl font-bold text-purple-400/18 animate-float-slow cursor-pointer hover:text-purple-500/38 hover:scale-110 transition-all duration-300" style={{ top: '35%', left: '1%', animationDelay: '10s' }}>
          పథకం
        </div>
        {/* Kannada - ಯೋಜನೆ */}
        <div className="absolute text-5xl font-bold text-orange-500/20 animate-float-slow cursor-pointer hover:text-orange-600/40 hover:scale-110 transition-all duration-300" style={{ top: '70%', right: '20%', animationDelay: '3s' }}>
          ಯೋಜನೆ
        </div>
        <div className="absolute text-6xl font-bold text-orange-400/15 animate-float-fast cursor-pointer hover:text-orange-500/35 hover:scale-110 transition-all duration-300" style={{ top: '35%', right: '25%', animationDelay: '6s' }}>
          ಯೋಜನೆ
        </div>
        <div className="absolute text-4xl font-bold text-orange-300/15 animate-float-slow cursor-pointer hover:text-orange-400/35 hover:scale-110 transition-all duration-300" style={{ top: '88%', right: '40%', animationDelay: '8.5s' }}>
          ಯೋಜನೆ
        </div>
        <div className="absolute text-5xl font-bold text-orange-500/18 animate-float-medium cursor-pointer hover:text-orange-600/38 hover:scale-110 transition-all duration-300" style={{ top: '52%', left: '6%', animationDelay: '11s' }}>
          ಯೋಜನೆ
        </div>
        {/* Malayalam - പദ്ധതി */}
        <div className="absolute text-6xl font-bold text-pink-500/20 animate-float-medium cursor-pointer hover:text-pink-600/40 hover:scale-110 transition-all duration-300" style={{ top: '40%', right: '5%', animationDelay: '1.5s' }}>
          പദ്ധതി
        </div>
        <div className="absolute text-5xl font-bold text-pink-400/15 animate-float-slow cursor-pointer hover:text-pink-500/35 hover:scale-110 transition-all duration-300" style={{ top: '75%', right: '12%', animationDelay: '4.5s' }}>
          പദ്ധതി
        </div>
        <div className="absolute text-4xl font-bold text-pink-400/18 animate-float-fast cursor-pointer hover:text-pink-500/38 hover:scale-110 transition-all duration-300" style={{ top: '18%', left: '10%', animationDelay: '12s' }}>
          പദ്ധതി
        </div>
        {/* Marathi - योजना */}
        <div className="absolute text-5xl font-bold text-indigo-500/20 animate-float-fast cursor-pointer hover:text-indigo-600/40 hover:scale-110 transition-all duration-300" style={{ top: '30%', left: '25%', animationDelay: '2.5s' }}>
          योजना
        </div>
        <div className="absolute text-6xl font-bold text-indigo-400/15 animate-float-medium cursor-pointer hover:text-indigo-500/35 hover:scale-110 transition-all duration-300" style={{ top: '65%', left: '30%', animationDelay: '5.5s' }}>
          योजना
        </div>
        <div className="absolute text-4xl font-bold text-indigo-400/18 animate-float-slow cursor-pointer hover:text-indigo-500/38 hover:scale-110 transition-all duration-300" style={{ top: '92%', left: '7%', animationDelay: '13s' }}>
          योजना
        </div>
        {/* Bengali - প্রকল্প */}
        <div className="absolute text-6xl font-bold text-red-500/20 animate-float-slow cursor-pointer hover:text-red-600/40 hover:scale-110 transition-all duration-300" style={{ top: '80%', left: '40%', animationDelay: '0.5s' }}>
          প্রকল্প
        </div>
        <div className="absolute text-5xl font-bold text-red-400/15 animate-float-fast cursor-pointer hover:text-red-500/35 hover:scale-110 transition-all duration-300" style={{ top: '18%', left: '45%', animationDelay: '3.8s' }}>
          প্রকল্প
        </div>
        <div className="absolute text-4xl font-bold text-red-400/18 animate-float-medium cursor-pointer hover:text-red-500/38 hover:scale-110 transition-all duration-300" style={{ top: '48%', left: '4%', animationDelay: '14s' }}>
          প্রকল্প
        </div>
        {/* Gujarati - યોજના */}
        <div className="absolute text-5xl font-bold text-teal-500/20 animate-float-medium cursor-pointer hover:text-teal-600/40 hover:scale-110 transition-all duration-300" style={{ top: '15%', left: '60%', animationDelay: '3.5s' }}>
          યોજના
        </div>
        <div className="absolute text-6xl font-bold text-teal-400/15 animate-float-slow cursor-pointer hover:text-teal-500/35 hover:scale-110 transition-all duration-300" style={{ top: '52%', left: '55%', animationDelay: '6.5s' }}>
          યોજના
        </div>
        <div className="absolute text-4xl font-bold text-teal-400/18 animate-float-fast cursor-pointer hover:text-teal-500/38 hover:scale-110 transition-all duration-300" style={{ top: '68%', left: '9%', animationDelay: '15s' }}>
          યોજના
        </div>
        {/* Punjabi - ਯੋਜਨਾ */}
        <div className="absolute text-7xl font-bold text-yellow-500/20 animate-float-fast cursor-pointer hover:text-yellow-600/40 hover:scale-110 transition-all duration-300" style={{ top: '50%', left: '70%', animationDelay: '1.8s' }}>
          ਯੋਜਨਾ
        </div>
        <div className="absolute text-5xl font-bold text-yellow-400/15 animate-float-medium cursor-pointer hover:text-yellow-500/35 hover:scale-110 transition-all duration-300" style={{ top: '22%', left: '75%', animationDelay: '4.8s' }}>
          ਯੋਜਨਾ
        </div>
        <div className="absolute text-4xl font-bold text-yellow-400/18 animate-float-slow cursor-pointer hover:text-yellow-500/38 hover:scale-110 transition-all duration-300" style={{ top: '82%', left: '11%', animationDelay: '16s' }}>
          ਯੋਜਨਾ
        </div>
        {/* Odia - ଯୋଜନା */}
        <div className="absolute text-6xl font-bold text-cyan-500/20 animate-float-slow cursor-pointer hover:text-cyan-600/40 hover:scale-110 transition-all duration-300" style={{ top: '85%', right: '15%', animationDelay: '2.8s' }}>
          ଯୋଜନା
        </div>
        <div className="absolute text-5xl font-bold text-cyan-400/15 animate-float-fast cursor-pointer hover:text-cyan-500/35 hover:scale-110 transition-all duration-300" style={{ top: '42%', right: '18%', animationDelay: '5.8s' }}>
          ଯୋଜନା
        </div>
        <div className="absolute text-4xl font-bold text-cyan-400/18 animate-float-medium cursor-pointer hover:text-cyan-500/38 hover:scale-110 transition-all duration-300" style={{ top: '28%', left: '7%', animationDelay: '17s' }}>
          ଯୋଜନା
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <header className="text-center mb-8 backdrop-blur-md bg-white/50 p-6 rounded-2xl border-4 border-black shadow-xl">
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

          {/* Start Over Button - Show only after language selection */}
          {currentStep !== 'language' && (
            <div className="mt-4">
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-300"
              >
                {getTranslation('startOver', language)}
              </button>
            </div>
          )}
        </header>

        {/* Language Selection */}
        {currentStep === 'language' && (
          <LanguageSelector 
            onSelect={handleLanguageSelect}
            onPreview={setLanguage}
          />
        )}

        {/* Phone Number Input */}
        {currentStep === 'phone' && (
          <PhoneInput 
            onSubmit={handlePhoneSubmit}
            language={language}
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

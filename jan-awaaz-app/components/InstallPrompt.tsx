'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-2xl p-4 border-2 border-blue-500 z-50 max-w-md mx-auto">
      <div className="flex items-start gap-3">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 mb-1">
            ऐप इंस्टॉल करें
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            जन-आवाज़ को अपने होम स्क्रीन पर जोड़ें और ऑफ़लाइन उपयोग करें।
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-semibold"
            >
              इंस्टॉल करें
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              बाद में
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

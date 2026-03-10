'use client';

import React from 'react';
import { Language } from '@/lib/types';
import { getTranslation } from '@/lib/utils/translations';

interface WelcomeLandingProps {
  language: Language;
  onContinue: () => void;
}

export default function WelcomeLanding({ language, onContinue }: WelcomeLandingProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-12 border-4 border-black">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          {getTranslation('appTitle', language)}
        </h1>
        <p className="text-2xl text-gray-600">
          {getTranslation('appSubtitle', language)}
        </p>
      </div>

      {/* Let's Go Button */}
      <div className="flex justify-center">
        <button
          onClick={onContinue}
          className="px-12 py-6 bg-blue-500 hover:bg-blue-600 text-white text-2xl font-bold rounded-xl transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
        >
          {getTranslation('letsGo', language)} 🚀
        </button>
      </div>
    </div>
  );
}

'use client';

import { Language } from '@/lib/types';

interface LanguageSelectorProps {
  onSelect: (language: Language) => void;
  onPreview?: (language: Language) => void;
}

const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
];

export default function LanguageSelector({ onSelect, onPreview }: LanguageSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        अपनी भाषा चुनें / Select Your Language
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            onMouseEnter={() => onPreview?.(lang.code)}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-2xl font-bold mb-1">{lang.nativeName}</div>
            <div className="text-sm text-gray-600">{lang.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

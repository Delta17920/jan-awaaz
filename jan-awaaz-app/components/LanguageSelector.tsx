'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';

interface LanguageSelectorProps {
  onSelect: (language: Language) => void;
  onPreview?: (language: Language) => void;
}

// Translation helper for browser and patience messages
const getBrowserMessage = (lang: Language): string => {
  const messages: Record<Language, string> = {
    'hi-IN': '💡 सर्वोत्तम अनुभव के लिए Chrome या Edge ब्राउज़र का उपयोग करें',
    'ta-IN': '💡 சிறந்த அனுபவத்திற்கு Chrome அல்லது Edge உலாவியைப் பயன்படுத்தவும்',
    'te-IN': '💡 ఉత్తమ అనుభవం కోసం Chrome లేదా Edge బ్రౌజర్‌ను ఉపయోగించండి',
    'kn-IN': '💡 ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ Chrome ಅಥವಾ Edge ಬ್ರೌಸರ್ ಬಳಸಿ',
    'ml-IN': '💡 മികച്ച അനുഭവത്തിനായി Chrome അല്ലെങ്കിൽ Edge ബ്രൗസർ ഉപയോഗിക്കുക',
    'mr-IN': '💡 सर्वोत्तम अनुभवासाठी Chrome किंवा Edge ब्राउझर वापरा',
    'bn-IN': '💡 সেরা অভিজ্ঞতার জন্য Chrome বা Edge ব্রাউজার ব্যবহার করুন',
    'gu-IN': '💡 શ્રેષ્ઠ અનુભવ માટે Chrome અથવા Edge બ્રાઉઝરનો ઉપયોગ કરો',
    'pa-IN': '💡 ਵਧੀਆ ਅਨੁਭਵ ਲਈ Chrome ਜਾਂ Edge ਬ੍ਰਾਊਜ਼ਰ ਵਰਤੋ',
    'or-IN': '💡 ସର୍ବୋତ୍ତମ ଅନୁଭୂତି ପାଇଁ Chrome କିମ୍ବା Edge ବ୍ରାଉଜର୍ ବ୍ୟବହାର କରନ୍ତୁ',
  };
  return messages[lang];
};

const getPatienceMessage = (lang: Language): string => {
  const messages: Record<Language, string> = {
    'hi-IN': '⏳ कृपया धैर्य रखें, प्रतिक्रिया आने में कुछ समय लग सकता है',
    'ta-IN': '⏳ பொறுமையாக இருங்கள், பதில் வர சிறிது நேரம் ஆகலாம்',
    'te-IN': '⏳ దయచేసి ఓపిక పట్టండి, ప్రతిస్పందన రావడానికి కొంత సమయం పట్టవచ్చు',
    'kn-IN': '⏳ ದಯವಿಟ್ಟು ತಾಳ್ಮೆ ಇರಿಸಿ, ಪ್ರತಿಕ್ರಿಯೆ ಬರಲು ಸ್ವಲ್ಪ ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಬಹುದು',
    'ml-IN': '⏳ ദയവായി ക്ഷമിക്കുക, പ്രതികരണം വരാൻ കുറച്ച് സമയമെടുത്തേക്കാം',
    'mr-IN': '⏳ कृपया धीर धरा, प्रतिसाद येण्यास थोडा वेळ लागू शकतो',
    'bn-IN': '⏳ অনুগ্রহ করে ধৈর্য ধরুন, প্রতিক্রিয়া আসতে কিছুটা সময় লাগতে পারে',
    'gu-IN': '⏳ કૃપા કરીને ધીરજ રાખો, પ્રતિસાદ આવવામાં થોડો સમય લાગી શકે છે',
    'pa-IN': '⏳ ਕਿਰਪਾ ਕਰਕੇ ਸਬਰ ਰੱਖੋ, ਜਵਾਬ ਆਉਣ ਵਿੱਚ ਕੁਝ ਸਮਾਂ ਲੱਗ ਸਕਦਾ ਹੈ',
    'or-IN': '⏳ ଦୟାକରି ଧୈର୍ଯ୍ୟ ରଖନ୍ତୁ, ପ୍ରତିକ୍ରିୟା ଆସିବାକୁ କିଛି ସମୟ ଲାଗିପାରେ',
  };
  return messages[lang];
};

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
  const [previewLang, setPreviewLang] = useState<Language>('hi-IN');

  const handleLanguageHover = (lang: Language) => {
    setPreviewLang(lang);
    onPreview?.(lang);
  };

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
            onMouseEnter={() => handleLanguageHover(lang.code)}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-2xl font-bold mb-1">{lang.nativeName}</div>
            <div className="text-sm text-gray-600">{lang.name}</div>
          </button>
        ))}
      </div>

      {/* Browser Recommendation */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 text-center">
          {getBrowserMessage(previewLang)}
        </p>
      </div>

      {/* Patience Message */}
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 text-center">
          {getPatienceMessage(previewLang)}
        </p>
      </div>
    </div>
  );
}

'use client';

import { Language } from '@/lib/types';

interface ReferralCardDisplayProps {
  card: any;
  office: any;
  language: Language;
}

// Translation helper
function getLocalizedText(key: string, language: Language): string {
  const translations: Record<string, Record<Language, string>> = {
    title: {
      'hi-IN': 'आपका रेफरल कार्ड तैयार है! 🎉',
      'ta-IN': 'உங்கள் பரிந்துரை அட்டை தயார்! 🎉',
      'te-IN': 'మీ రిఫరల్ కార్డ్ సిద్ధంగా ఉంది! 🎉',
      'kn-IN': 'ನಿಮ್ಮ ರೆಫರಲ್ ಕಾರ್ಡ್ ಸಿದ್ಧವಾಗಿದೆ! 🎉',
      'ml-IN': 'നിങ്ങളുടെ റഫറൽ കാർഡ് തയ്യാറാണ്! 🎉',
      'mr-IN': 'तुमचे रेफरल कार्ड तयार आहे! 🎉',
      'bn-IN': 'আপনার রেফারেল কার্ড প্রস্তুত! 🎉',
      'gu-IN': 'તમારું રેફરલ કાર્ડ તૈયાર છે! 🎉',
      'pa-IN': 'ਤੁਹਾਡਾ ਰੈਫਰਲ ਕਾਰਡ ਤਿਆਰ ਹੈ! 🎉',
      'or-IN': 'ଆପଣଙ୍କର ରେଫରାଲ କାର୍ଡ ପ୍ରସ୍ତୁତ! 🎉',
    },
    referralCard: {
      'hi-IN': 'रेफरल कार्ड',
      'ta-IN': 'பரிந்துரை அட்டை',
      'te-IN': 'రిఫరల్ కార్డ్',
      'kn-IN': 'ರೆಫರಲ್ ಕಾರ್ಡ್',
      'ml-IN': 'റഫറൽ കാർഡ്',
      'mr-IN': 'रेफरल कार्ड',
      'bn-IN': 'রেফারেল কার্ড',
      'gu-IN': 'રેફરલ કાર્ડ',
      'pa-IN': 'ਰੈਫਰਲ ਕਾਰਡ',
      'or-IN': 'ରେଫରାଲ କାର୍ଡ',
    },
    refNo: {
      'hi-IN': 'संदर्भ संख्या',
      'ta-IN': 'குறிப்பு எண்',
      'te-IN': 'సూచన సంఖ్య',
      'kn-IN': 'ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ',
      'ml-IN': 'റഫറൻസ് നമ്പർ',
      'mr-IN': 'संदर्भ क्रमांक',
      'bn-IN': 'রেফারেন্স নম্বর',
      'gu-IN': 'સંદર્ભ નંબર',
      'pa-IN': 'ਹਵਾਲਾ ਨੰਬਰ',
      'or-IN': 'ସନ୍ଦର୍ଭ ସଂଖ୍ୟା',
    },
    date: {
      'hi-IN': 'तारीख',
      'ta-IN': 'தேதி',
      'te-IN': 'తేదీ',
      'kn-IN': 'ದಿನಾಂಕ',
      'ml-IN': 'തീയതി',
      'mr-IN': 'तारीख',
      'bn-IN': 'তারিখ',
      'gu-IN': 'તારીખ',
      'pa-IN': 'ਤਾਰੀਖ',
      'or-IN': 'ତାରିଖ',
    },
    scheme: {
      'hi-IN': 'योजना',
      'ta-IN': 'திட்டம்',
      'te-IN': 'పథకం',
      'kn-IN': 'ಯೋಜನೆ',
      'ml-IN': 'പദ്ധതി',
      'mr-IN': 'योजना',
      'bn-IN': 'প্রকল্প',
      'gu-IN': 'યોજના',
      'pa-IN': 'ਯੋਜਨਾ',
      'or-IN': 'ଯୋଜନା',
    },
    eligibility: {
      'hi-IN': 'पात्रता स्थिति',
      'ta-IN': 'தகுதி நிலை',
      'te-IN': 'అర్హత స్థితి',
      'kn-IN': 'ಅರ್ಹತೆ ಸ್ಥಿತಿ',
      'ml-IN': 'യോഗ്യത നില',
      'mr-IN': 'पात्रता स्थिती',
      'bn-IN': 'যোগ্যতার অবস্থা',
      'gu-IN': 'પાત્રતા સ્થિતિ',
      'pa-IN': 'ਯੋਗਤਾ ਸਥਿਤੀ',
      'or-IN': 'ଯୋଗ୍ୟତା ସ୍ଥିତି',
    },
    eligible: {
      'hi-IN': '✓ पात्र',
      'ta-IN': '✓ தகுதியுடையவர்',
      'te-IN': '✓ అర్హులు',
      'kn-IN': '✓ ಅರ್ಹ',
      'ml-IN': '✓ യോഗ്യൻ',
      'mr-IN': '✓ पात्र',
      'bn-IN': '✓ যোগ্য',
      'gu-IN': '✓ પાત્ર',
      'pa-IN': '✓ ਯੋਗ',
      'or-IN': '✓ ଯୋଗ୍ୟ',
    },
    pendingDocs: {
      'hi-IN': '⚠ दस्तावेज़ लंबित',
      'ta-IN': '⚠ ஆவணங்கள் நிலுவையில்',
      'te-IN': '⚠ పత్రాలు పెండింగ్',
      'kn-IN': '⚠ ದಾಖಲೆಗಳು ಬಾಕಿ',
      'ml-IN': '⚠ രേഖകൾ തീർപ്പാക്കാത്തത്',
      'mr-IN': '⚠ कागदपत्रे प्रलंबित',
      'bn-IN': '⚠ নথি মুলতুবি',
      'gu-IN': '⚠ દસ્તાવેજો બાકી',
      'pa-IN': '⚠ ਦਸਤਾਵੇਜ਼ ਬਾਕੀ',
      'or-IN': '⚠ ଦଲିଲ ବିଚାରାଧୀନ',
    },
    needsCorrection: {
      'hi-IN': '✗ सुधार की आवश्यकता',
      'ta-IN': '✗ திருத்தம் தேவை',
      'te-IN': '✗ దిద్దుబాటు అవసరం',
      'kn-IN': '✗ ತಿದ್ದುಪಡಿ ಅಗತ್ಯ',
      'ml-IN': '✗ തിരുത്തൽ ആവശ്യമാണ്',
      'mr-IN': '✗ दुरुस्ती आवश्यक',
      'bn-IN': '✗ সংশোধন প্রয়োজন',
      'gu-IN': '✗ સુધારણા જરૂરી',
      'pa-IN': '✗ ਸੁਧਾਰ ਦੀ ਲੋੜ',
      'or-IN': '✗ ସଂଶୋଧନ ଆବଶ୍ୟକ',
    },
    office: {
      'hi-IN': 'कार्यालय',
      'ta-IN': 'அலுவலகம்',
      'te-IN': 'కార్యాలయం',
      'kn-IN': 'ಕಛೇರಿ',
      'ml-IN': 'ഓഫീസ്',
      'mr-IN': 'कार्यालय',
      'bn-IN': 'অফিস',
      'gu-IN': 'ઓફિસ',
      'pa-IN': 'ਦਫ਼ਤਰ',
      'or-IN': 'କାର୍ଯ୍ୟାଳୟ',
    },
    download: {
      'hi-IN': 'कार्ड डाउनलोड करें',
      'ta-IN': 'அட்டையைப் பதிவிறக்கவும்',
      'te-IN': 'కార్డ్ డౌన్‌లోడ్ చేయండి',
      'kn-IN': 'ಕಾರ್ಡ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      'ml-IN': 'കാർഡ് ഡൗൺലോഡ് ചെയ്യുക',
      'mr-IN': 'कार्ड डाउनलोड करा',
      'bn-IN': 'কার্ড ডাউনলোড করুন',
      'gu-IN': 'કાર્ડ ડાઉનલોડ કરો',
      'pa-IN': 'ਕਾਰਡ ਡਾਊਨਲੋਡ ਕਰੋ',
      'or-IN': 'କାର୍ଡ ଡାଉନଲୋଡ୍ କରନ୍ତୁ',
    },
    share: {
      'hi-IN': 'कार्ड साझा करें',
      'ta-IN': 'அட்டையைப் பகிரவும்',
      'te-IN': 'కార్డ్ షేర్ చేయండి',
      'kn-IN': 'ಕಾರ್ಡ್ ಹಂಚಿಕೊಳ್ಳಿ',
      'ml-IN': 'കാർഡ് പങ്കിടുക',
      'mr-IN': 'कार्ड शेअर करा',
      'bn-IN': 'কার্ড শেয়ার করুন',
      'gu-IN': 'કાર્ડ શેર કરો',
      'pa-IN': 'ਕਾਰਡ ਸਾਂਝਾ ਕਰੋ',
      'or-IN': 'କାର୍ଡ ସେୟାର କରନ୍ତୁ',
    },
    openMaps: {
      'hi-IN': '📍 मानचित्र में खोलें',
      'ta-IN': '📍 வரைபடத்தில் திறக்கவும்',
      'te-IN': '📍 మ్యాప్‌లో తెరవండి',
      'kn-IN': '📍 ನಕ್ಷೆಯಲ್ಲಿ ತೆರೆಯಿರಿ',
      'ml-IN': '📍 മാപ്പിൽ തുറക്കുക',
      'mr-IN': '📍 नकाशात उघडा',
      'bn-IN': '📍 মানচিত্রে খুলুন',
      'gu-IN': '📍 નકશામાં ખોલો',
      'pa-IN': '📍 ਨਕਸ਼ੇ ਵਿੱਚ ਖੋਲ੍ਹੋ',
      'or-IN': '📍 ମାନଚିତ୍ରରେ ଖୋଲନ୍ତୁ',
    },
    important: {
      'hi-IN': 'महत्वपूर्ण',
      'ta-IN': 'முக்கியமானது',
      'te-IN': 'ముఖ్యమైనది',
      'kn-IN': 'ಮುಖ್ಯ',
      'ml-IN': 'പ്രധാനം',
      'mr-IN': 'महत्त्वाचे',
      'bn-IN': 'গুরুত্বপূর্ণ',
      'gu-IN': 'મહત્વપૂર્ણ',
      'pa-IN': 'ਮਹੱਤਵਪੂਰਨ',
      'or-IN': 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ',
    },
    instruction: {
      'hi-IN': 'कृपया यह कार्ड {office} पर दिखाएं। सभी आवश्यक दस्तावेज़ अपने साथ लाएं।',
      'ta-IN': 'இந்த அட்டையை {office} இல் காட்டவும். அனைத்து தேவையான ஆவணங்களையும் கொண்டு வாருங்கள்.',
      'te-IN': 'దయచేసి ఈ కార్డ్‌ను {office} వద్ద చూపించండి. అన్ని అవసరమైన పత్రాలను తీసుకురండి.',
      'kn-IN': 'ದಯವಿಟ್ಟು ಈ ಕಾರ್ಡ್ ಅನ್ನು {office} ನಲ್ಲಿ ತೋರಿಸಿ. ಎಲ್ಲಾ ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ತನ್ನಿ.',
      'ml-IN': 'ദയവായി ഈ കാർഡ് {office} ൽ കാണിക്കുക. എല്ലാ ആവശ്യമായ രേഖകളും കൊണ്ടുവരിക.',
      'mr-IN': 'कृपया हे कार्ड {office} येथे दाखवा. सर्व आवश्यक कागदपत्रे सोबत आणा.',
      'bn-IN': 'অনুগ্রহ করে এই কার্ডটি {office} এ দেখান। সমস্ত প্রয়োজনীয় নথি সাথে আনুন।',
      'gu-IN': 'કૃપા કરીને આ કાર્ડ {office} પર બતાવો. બધા જરૂરી દસ્તાવેજો સાથે લાવો.',
      'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਇਹ ਕਾਰਡ {office} ਤੇ ਦਿਖਾਓ। ਸਾਰੇ ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼ ਨਾਲ ਲਿਆਓ।',
      'or-IN': 'ଦୟାକରି ଏହି କାର୍ଡକୁ {office} ରେ ଦେଖାନ୍ତୁ। ସମସ୍ତ ଆବଶ୍ୟକ ଦଲିଲ ସାଙ୍ଗରେ ଆଣନ୍ତୁ।',
    },
    backHome: {
      'hi-IN': '🏠 होम पर वापस जाएं',
      'ta-IN': '🏠 முகப்புக்குத் திரும்பு',
      'te-IN': '🏠 హోమ్‌కు తిరిగి వెళ్ళు',
      'kn-IN': '🏠 ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
      'ml-IN': '🏠 ഹോമിലേക്ക് മടങ്ങുക',
      'mr-IN': '🏠 होमवर परत जा',
      'bn-IN': '🏠 হোমে ফিরে যান',
      'gu-IN': '🏠 હોમ પર પાછા જાઓ',
      'pa-IN': '🏠 ਘਰ ਵਾਪਸ ਜਾਓ',
      'or-IN': '🏠 ହୋମକୁ ଫେରନ୍ତୁ',
    },
  };

  return translations[key]?.[language] || key;
}

export default function ReferralCardDisplay({ card, office, language }: ReferralCardDisplayProps) {
  const downloadCard = () => {
    if (card.imageUrl) {
      window.open(card.imageUrl, '_blank');
    }
  };

  const shareCard = async () => {
    if (navigator.share && card.imageUrl) {
      try {
        await navigator.share({
          title: getLocalizedText('referralCard', language),
          text: `${getLocalizedText('scheme', language)}: ${card.schemeName}\n${getLocalizedText('office', language)}: ${office.name}`,
          url: card.imageUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const openInMaps = () => {
    // Extract clean address from office.address
    // Remove labels like "Name:", "Address:", "Landmark:", "Contact Number:"
    let cleanAddress = office.address;
    
    // If address contains multiple lines with labels, extract just the address line
    if (cleanAddress.includes('Address:')) {
      const lines = cleanAddress.split('\n');
      const addressLine = lines.find((line: string) => line.includes('Address:') || line.includes('पता:') || line.includes('முகவரி:'));
      if (addressLine) {
        // Remove the label and get just the address
        cleanAddress = addressLine.replace(/^(Address:|पता:|முகவரி:|చిరునామా:|വിലാസം:|ವಿಳಾಸ:|ঠিকানা:|સરનામું:|ਪਤਾ:|ଠିକଣା:)\s*/i, '').trim();
      }
    }
    
    // Create Google Maps search URL with the clean address
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
    console.log('Opening Google Maps with address:', cleanAddress);
    console.log('Maps URL:', mapsUrl);
    window.open(mapsUrl, '_blank');
  };

  const getEligibilityText = (status: string) => {
    if (status === 'ELIGIBLE') return getLocalizedText('eligible', language);
    if (status === 'PENDING_DOCS') return getLocalizedText('pendingDocs', language);
    return getLocalizedText('needsCorrection', language);
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">
        {getLocalizedText('title', language)}
      </h2>

      {/* Card Preview - Dark Theme */}
      <div className="mb-6 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-emerald-500">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-emerald-400">Jan-Awaaz</h3>
          <p className="text-sm text-gray-400">{getLocalizedText('referralCard', language)}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-300">{getLocalizedText('refNo', language)}:</span>
            <span className="font-mono text-white">{card.referenceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-300">{getLocalizedText('date', language)}:</span>
            <span className="text-white">{new Date(card.timestamp).toLocaleDateString('en-IN')}</span>
          </div>
          <hr className="border-gray-700" />
          <div>
            <p className="font-semibold mb-1 text-gray-300">{getLocalizedText('scheme', language)}:</p>
            <p className="text-white">{card.schemeName}</p>
          </div>
          <div>
            <p className="font-semibold mb-1 text-gray-300">{getLocalizedText('eligibility', language)}:</p>
            <p className={`font-semibold ${
              card.eligibilityStatus === 'ELIGIBLE' ? 'text-emerald-400' :
              card.eligibilityStatus === 'PENDING_DOCS' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {getEligibilityText(card.eligibilityStatus)}
            </p>
          </div>
          <hr className="border-gray-700" />
          <div>
            <p className="font-semibold mb-1 text-gray-300">{getLocalizedText('office', language)}:</p>
            <p className="text-sm text-gray-400">{office.address}</p>
          </div>
        </div>

        {/* QR Code */}
        {card.qrCode && (
          <div className="mt-4 flex justify-center">
            <img src={card.qrCode} alt="QR Code" className="w-32 h-32 bg-white p-2 rounded" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={downloadCard}
          className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 font-semibold"
        >
          <span>📥</span>
          <span>{getLocalizedText('download', language)}</span>
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={shareCard}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-semibold"
          >
            <span>📤</span>
            <span>{getLocalizedText('share', language)}</span>
          </button>
        )}

        <button
          onClick={openInMaps}
          className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-semibold"
        >
          <span>{getLocalizedText('openMaps', language)}</span>
        </button>

        <div className="p-4 bg-amber-900 border-2 border-amber-600 rounded-lg">
          <p className="text-sm text-amber-100">
            <strong>{getLocalizedText('important', language)}:</strong>{' '}
            {getLocalizedText('instruction', language).replace('{office}', office.name)}
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-semibold"
        >
          {getLocalizedText('backHome', language)}
        </button>
      </div>
    </div>
  );
}

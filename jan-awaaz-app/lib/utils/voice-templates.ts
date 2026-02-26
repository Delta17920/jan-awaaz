/**
 * Voice Response Templates
 * Multi-language templates for voice output generation
 */

import { Language, SchemeMatch, VerificationResult, Defect } from '../types';

/**
 * Voice templates for different scenarios
 */
export const voiceTemplates = {
  // Welcome and language selection
  welcome: {
    'hi-IN': 'नमस्ते। जन-आवाज़ में आपका स्वागत है। कृपया अपनी भाषा चुनें।',
    'ta-IN': 'வணக்கம். ஜன்-ஆவாஸ் க்கு வரவேற்கிறோம். உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.',
    'te-IN': 'నమస్కారం. జన్-ఆవాజ్ కు స్వాగతం. దయచేసి మీ భాషను ఎంచుకోండి.',
    'kn-IN': 'ನಮಸ್ಕಾರ. ಜನ-ಆವಾಜ್ ಗೆ ಸ್ವಾಗತ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    'ml-IN': 'നമസ്കാരം. ജൻ-ആവാസിലേക്ക് സ്വാഗതം. നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക.',
    'mr-IN': 'नमस्कार। जन-आवाज मध्ये आपले स्वागत आहे। कृपया आपली भाषा निवडा।',
    'bn-IN': 'নমস্কার। জন-আওয়াজে স্বাগতম। আপনার ভাষা নির্বাচন করুন।',
    'gu-IN': 'નમસ્તે. જન-આવાજમાં આપનું સ્વાગત છે. કૃપા કરીને તમારી ભાષા પસંદ કરો.',
    'pa-IN': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਜਨ-ਆਵਾਜ਼ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ।',
    'or-IN': 'ନମସ୍କାର। ଜନ-ଆୱାଜକୁ ସ୍ୱାଗତ। ଦୟାକରି ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ।',
  },

  // Phone number request
  phoneRequest: {
    'hi-IN': 'कृपया अपना मोबाइल नंबर बोलें।',
    'ta-IN': 'உங்கள் மொபைல் எண்ணைச் சொல்லுங்கள்.',
    'te-IN': 'దయచేసి మీ మొబైల్ నంబర్ చెప్పండి.',
    'kn-IN': 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.',
    'ml-IN': 'നിങ്ങളുടെ മൊബൈൽ നമ്പർ പറയുക.',
    'mr-IN': 'कृपया आपला मोबाइल नंबर सांगा।',
    'bn-IN': 'আপনার মোবাইল নম্বর বলুন।',
    'gu-IN': 'કૃપા કરીને તમારો મોબાઇલ નંબર બોલો.',
    'pa-IN': 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਮੋਬਾਈਲ ਨੰਬਰ ਬੋਲੋ।',
    'or-IN': 'ଦୟାକରି ଆପଣଙ୍କ ମୋବାଇଲ୍ ନମ୍ବର କୁହନ୍ତୁ।',
  },

  // Story request
  storyRequest: {
    'hi-IN': 'कृपया अपनी स्थिति के बारे में बताएं। आपको किस योजना की आवश्यकता है?',
    'ta-IN': 'உங்கள் நிலைமையைப் பற்றி சொல்லுங்கள். உங்களுக்கு என்ன திட்டம் தேவை?',
    'te-IN': 'మీ పరిస్థితి గురించి చెప్పండి. మీకు ఏ పథకం అవసరం?',
    'kn-IN': 'ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಯ ಬಗ್ಗೆ ಹೇಳಿ. ನಿಮಗೆ ಯಾವ ಯೋಜನೆ ಬೇಕು?',
    'ml-IN': 'നിങ്ങളുടെ സാഹചര്യത്തെക്കുറിച്ച് പറയുക. നിങ്ങൾക്ക് ഏത് പദ്ധതി വേണം?',
    'mr-IN': 'कृपया आपल्या परिस्थितीबद्दल सांगा। तुम्हाला कोणती योजना हवी आहे?',
    'bn-IN': 'আপনার পরিস্থিতি সম্পর্কে বলুন। আপনার কোন প্রকল্প প্রয়োজন?',
    'gu-IN': 'તમારી પરિસ્થિતિ વિશે કહો. તમને કઈ યોજના જોઈએ છે?',
    'pa-IN': 'ਆਪਣੀ ਸਥਿਤੀ ਬਾਰੇ ਦੱਸੋ। ਤੁਹਾਨੂੰ ਕਿਹੜੀ ਯੋਜਨਾ ਚਾਹੀਦੀ ਹੈ?',
    'or-IN': 'ଆପଣଙ୍କ ପରିସ୍ଥିତି ବିଷୟରେ କୁହନ୍ତୁ। ଆପଣଙ୍କୁ କେଉଁ ଯୋଜନା ଦରକାର?',
  },
};

/**
 * Generate voice output for scheme matching results
 */
export function generateSchemeVoiceOutput(
  schemes: SchemeMatch[],
  language: Language
): string {
  if (schemes.length === 0) {
    return getTemplate('noSchemesFound', language);
  }

  const intro = getTemplate('schemesFound', language, { count: schemes.length });
  const schemeDescriptions = schemes.map((scheme, index) => {
    return getTemplate('schemeDescription', language, {
      number: index + 1,
      name: scheme.schemeName,
      eligibility: scheme.eligibilityCriteria.join(', '),
      documents: scheme.requiredDocuments.join(', '),
    });
  }).join(' ');

  return `${intro} ${schemeDescriptions}`;
}

/**
 * Generate voice output for document verification results
 */
export function generateVerificationVoiceOutput(
  result: VerificationResult,
  language: Language
): string {
  if (result.isValid) {
    return getTemplate('documentValid', language, {
      type: result.documentType,
    });
  }

  const defectMessages = result.defects.map(d => 
    getTemplate(`defect_${d.type}`, language)
  ).join('. ');

  return getTemplate('documentInvalid', language, {
    type: result.documentType,
    defects: defectMessages,
  });
}

/**
 * Generate voice output for error messages
 */
export function generateErrorVoiceOutput(
  errorType: string,
  language: Language
): string {
  return getTemplate(`error_${errorType}`, language);
}

/**
 * Generate voice output for guidance and prompts
 */
export function generateGuidanceVoiceOutput(
  guidanceType: string,
  language: Language,
  params?: Record<string, any>
): string {
  return getTemplate(guidanceType, language, params);
}

/**
 * Get template with parameter substitution
 */
function getTemplate(
  key: string,
  language: Language,
  params?: Record<string, any>
): string {
  const templates: Record<string, Record<Language, string>> = {
    noSchemesFound: {
      'hi-IN': 'कोई योजना नहीं मिली। कृपया अधिक विवरण दें।',
      'ta-IN': 'எந்த திட்டமும் கிடைக்கவில்லை. மேலும் விவரங்களை வழங்கவும்.',
      'te-IN': 'ఏ పథకం కనుగొనబడలేదు. దయచేసి మరిన్ని వివరాలు ఇవ్వండి.',
      'kn-IN': 'ಯಾವುದೇ ಯೋಜನೆ ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಹೆಚ್ಚಿನ ವಿವರಗಳನ್ನು ನೀಡಿ.',
      'ml-IN': 'ഒരു പദ്ധതിയും കണ്ടെത്തിയില്ല. കൂടുതൽ വിശദാംശങ്ങൾ നൽകുക.',
      'mr-IN': 'कोणतीही योजना सापडली नाही। कृपया अधिक तपशील द्या।',
      'bn-IN': 'কোনো প্রকল্প পাওয়া যায়নি। আরও বিস্তারিত দিন।',
      'gu-IN': 'કોઈ યોજના મળી નથી. વધુ વિગતો આપો.',
      'pa-IN': 'ਕੋਈ ਯੋਜਨਾ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਹੋਰ ਵੇਰਵੇ ਦਿਓ।',
      'or-IN': 'କୌଣସି ଯୋଜନା ମିଳିଲା ନାହିଁ। ଅଧିକ ବିବରଣୀ ଦିଅନ୍ତୁ।',
    },
    schemesFound: {
      'hi-IN': 'मुझे {count} योजनाएं मिलीं जो आपके लिए उपयुक्त हैं।',
      'ta-IN': 'உங்களுக்கு ஏற்ற {count} திட்டங்கள் கிடைத்தன.',
      'te-IN': 'మీకు సరిపోయే {count} పథకాలు దొరికాయి.',
      'kn-IN': 'ನಿಮಗೆ ಸೂಕ್ತವಾದ {count} ಯೋಜನೆಗಳು ಸಿಕ್ಕಿವೆ.',
      'ml-IN': 'നിങ്ങൾക്ക് അനുയോജ്യമായ {count} പദ്ധതികൾ കണ്ടെത്തി.',
      'mr-IN': 'मला तुमच्यासाठी योग्य {count} योजना सापडल्या.',
      'bn-IN': 'আপনার জন্য উপযুক্ত {count}টি প্রকল্প পাওয়া গেছে।',
      'gu-IN': 'તમારા માટે યોગ્ય {count} યોજનાઓ મળી.',
      'pa-IN': 'ਮੈਨੂੰ ਤੁਹਾਡੇ ਲਈ ਢੁਕਵੀਆਂ {count} ਯੋਜਨਾਵਾਂ ਮਿਲੀਆਂ।',
      'or-IN': 'ମୁଁ ଆପଣଙ୍କ ପାଇଁ ଉପଯୁକ୍ତ {count} ଯୋଜନା ପାଇଲି।',
    },
    schemeDescription: {
      'hi-IN': 'योजना {number}: {name}। पात्रता: {eligibility}। आवश्यक दस्तावेज़: {documents}।',
      'ta-IN': 'திட்டம் {number}: {name}. தகுதி: {eligibility}. தேவையான ஆவணங்கள்: {documents}.',
      'te-IN': 'పథకం {number}: {name}. అర్హత: {eligibility}. అవసరమైన పత్రాలు: {documents}.',
      'kn-IN': 'ಯೋಜನೆ {number}: {name}. ಅರ್ಹತೆ: {eligibility}. ಅಗತ್ಯ ದಾಖಲೆಗಳು: {documents}.',
      'ml-IN': 'പദ്ധതി {number}: {name}. യോഗ്യത: {eligibility}. ആവശ്യമായ രേഖകൾ: {documents}.',
      'mr-IN': 'योजना {number}: {name}. पात्रता: {eligibility}. आवश्यक कागदपत्रे: {documents}.',
      'bn-IN': 'প্রকল্প {number}: {name}. যোগ্যতা: {eligibility}. প্রয়োজনীয় নথি: {documents}.',
      'gu-IN': 'યોજના {number}: {name}. પાત્રતા: {eligibility}. જરૂરી દસ્તાવેજો: {documents}.',
      'pa-IN': 'ਯੋਜਨਾ {number}: {name}. ਯੋਗਤਾ: {eligibility}. ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼: {documents}.',
      'or-IN': 'ଯୋଜନା {number}: {name}. ଯୋଗ୍ୟତା: {eligibility}. ଆବଶ୍ୟକ ଦଲିଲ: {documents}.',
    },
    documentValid: {
      'hi-IN': 'आपका {type} दस्तावेज़ मान्य है।',
      'ta-IN': 'உங்கள் {type} ஆவணம் செல்லுபடியாகும்.',
      'te-IN': 'మీ {type} పత్రం చెల్లుబాటు అవుతుంది.',
      'kn-IN': 'ನಿಮ್ಮ {type} ದಾಖಲೆ ಮಾನ್ಯವಾಗಿದೆ.',
      'ml-IN': 'നിങ്ങളുടെ {type} രേഖ സാധുവാണ്.',
      'mr-IN': 'तुमचे {type} कागदपत्र वैध आहे.',
      'bn-IN': 'আপনার {type} নথি বৈধ।',
      'gu-IN': 'તમારો {type} દસ્તાવેજ માન્ય છે.',
      'pa-IN': 'ਤੁਹਾਡਾ {type} ਦਸਤਾਵੇਜ਼ ਵੈਧ ਹੈ।',
      'or-IN': 'ଆପଣଙ୍କ {type} ଦଲିଲ ବୈଧ ଅଟେ।',
    },
    documentInvalid: {
      'hi-IN': 'आपके {type} दस्तावेज़ में समस्या है: {defects}',
      'ta-IN': 'உங்கள் {type} ஆவணத்தில் சிக்கல் உள்ளது: {defects}',
      'te-IN': 'మీ {type} పత్రంలో సమస్య ఉంది: {defects}',
      'kn-IN': 'ನಿಮ್ಮ {type} ದಾಖಲೆಯಲ್ಲಿ ಸಮಸ್ಯೆ ಇದೆ: {defects}',
      'ml-IN': 'നിങ്ങളുടെ {type} രേഖയിൽ പ്രശ്നമുണ്ട്: {defects}',
      'mr-IN': 'तुमच्या {type} कागदपत्रात समस्या आहे: {defects}',
      'bn-IN': 'আপনার {type} নথিতে সমস্যা আছে: {defects}',
      'gu-IN': 'તમારા {type} દસ્તાવેજમાં સમસ્યા છે: {defects}',
      'pa-IN': 'ਤੁਹਾਡੇ {type} ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਸਮੱਸਿਆ ਹੈ: {defects}',
      'or-IN': 'ଆପଣଙ୍କ {type} ଦଲିଲରେ ସମସ୍ୟା ଅଛି: {defects}',
    },
    defect_MISSING_SEAL: {
      'hi-IN': 'मुहर गायब है',
      'ta-IN': 'முத்திரை இல்லை',
      'te-IN': 'ముద్ర లేదు',
      'kn-IN': 'ಮುದ್ರೆ ಇಲ್ಲ',
      'ml-IN': 'മുദ്ര ഇല്ല',
      'mr-IN': 'शिक्का नाही',
      'bn-IN': 'সিল নেই',
      'gu-IN': 'સીલ નથી',
      'pa-IN': 'ਮੋਹਰ ਨਹੀਂ',
      'or-IN': 'ମୋହର ନାହିଁ',
    },
    defect_MISSING_SIGNATURE: {
      'hi-IN': 'हस्ताक्षर गायब है',
      'ta-IN': 'கையொப்பம் இல்லை',
      'te-IN': 'సంతకం లేదు',
      'kn-IN': 'ಸಹಿ ಇಲ್ಲ',
      'ml-IN': 'ഒപ്പ് ഇല്ല',
      'mr-IN': 'स्वाक्षरी नाही',
      'bn-IN': 'স্বাক্ষর নেই',
      'gu-IN': 'સહી નથી',
      'pa-IN': 'ਦਸਤਖਤ ਨਹੀਂ',
      'or-IN': 'ଦସ୍ତଖତ ନାହିଁ',
    },
    defect_EXPIRED: {
      'hi-IN': 'दस्तावेज़ की समय सीमा समाप्त हो गई है',
      'ta-IN': 'ஆவணம் காலாவதியானது',
      'te-IN': 'పత్రం గడువు ముగిసింది',
      'kn-IN': 'ದಾಖಲೆ ಅವಧಿ ಮುಗಿದಿದೆ',
      'ml-IN': 'രേഖ കാലഹരണപ്പെട്ടു',
      'mr-IN': 'कागदपत्र कालबाह्य झाले',
      'bn-IN': 'নথির মেয়াদ শেষ',
      'gu-IN': 'દસ્તાવેજની મુદત સમાપ્ત',
      'pa-IN': 'ਦਸਤਾਵੇਜ਼ ਦੀ ਮਿਆਦ ਖਤਮ',
      'or-IN': 'ଦଲିଲର ମିଆଦ ସମାପ୍ତ',
    },
    defect_BLURRY: {
      'hi-IN': 'दस्तावेज़ धुंधला है',
      'ta-IN': 'ஆவணம் தெளிவற்றது',
      'te-IN': 'పత్రం అస్పష్టంగా ఉంది',
      'kn-IN': 'ದಾಖಲೆ ಅಸ್ಪಷ್ಟವಾಗಿದೆ',
      'ml-IN': 'രേഖ മങ്ങിയതാണ്',
      'mr-IN': 'कागदपत्र अस्पष्ट आहे',
      'bn-IN': 'নথি অস্পষ্ট',
      'gu-IN': 'દસ્તાવેજ અસ્પષ્ટ છે',
      'pa-IN': 'ਦਸਤਾਵੇਜ਼ ਧੁੰਦਲਾ ਹੈ',
      'or-IN': 'ଦଲିଲ ଅସ୍ପଷ୍ଟ',
    },
    defect_TAMPERED: {
      'hi-IN': 'दस्तावेज़ में छेड़छाड़ की गई है',
      'ta-IN': 'ஆவணம் மாற்றப்பட்டுள்ளது',
      'te-IN': 'పత్రం తారుమారు చేయబడింది',
      'kn-IN': 'ದಾಖಲೆ ಬದಲಾಯಿಸಲಾಗಿದೆ',
      'ml-IN': 'രേഖ കൃത്രിമം ചെയ്തിരിക്കുന്നു',
      'mr-IN': 'कागदपत्रात फेरफार केला आहे',
      'bn-IN': 'নথি পরিবর্তন করা হয়েছে',
      'gu-IN': 'દસ્તાવેજમાં ફેરફાર કરવામાં આવ્યો છે',
      'pa-IN': 'ਦਸਤਾਵੇਜ਼ ਵਿੱਚ ਛੇੜਛਾੜ ਕੀਤੀ ਗਈ ਹੈ',
      'or-IN': 'ଦଲିଲରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି',
    },
    error_network: {
      'hi-IN': 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।',
      'ta-IN': 'நெட்வொர்க் பிழை. மீண்டும் முயற்சிக்கவும்.',
      'te-IN': 'నెట్‌వర్క్ లోపం. దయచేసి మళ్లీ ప్రయత్నించండి.',
      'kn-IN': 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'നെറ്റ്‌വർക്ക് പിശക്. വീണ്ടും ശ്രമിക്കുക.',
      'mr-IN': 'नेटवर्क त्रुटी. कृपया पुन्हा प्रयत्न करा।',
      'bn-IN': 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।',
      'gu-IN': 'નેટવર્ક ભૂલ. ફરીથી પ્રયાસ કરો.',
      'pa-IN': 'ਨੈੱਟਵਰਕ ਗਲਤੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      'or-IN': 'ନେଟୱାର୍କ ତ୍ରୁଟି। ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।',
    },
    error_processing: {
      'hi-IN': 'प्रसंस्करण त्रुटि। कृपया बाद में पुनः प्रयास करें।',
      'ta-IN': 'செயலாக்க பிழை. பின்னர் முயற்சிக்கவும்.',
      'te-IN': 'ప్రాసెసింగ్ లోపం. తర్వాత ప్రయత్నించండి.',
      'kn-IN': 'ಪ್ರಕ್ರಿಯೆ ದೋಷ. ನಂತರ ಪ್ರಯತ್ನಿಸಿ.',
      'ml-IN': 'പ്രോസസ്സിംഗ് പിശക്. പിന്നീട് ശ്രമിക്കുക.',
      'mr-IN': 'प्रक्रिया त्रुटी. नंतर प्रयत्न करा।',
      'bn-IN': 'প্রক্রিয়াকরণ ত্রুটি। পরে চেষ্টা করুন।',
      'gu-IN': 'પ્રક્રિયા ભૂલ. પછી પ્રયાસ કરો.',
      'pa-IN': 'ਪ੍ਰੋਸੈਸਿੰਗ ਗਲਤੀ। ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      'or-IN': 'ପ୍ରକ୍ରିୟାକରଣ ତ୍ରୁଟି। ପରେ ଚେଷ୍ଟା କରନ୍ତୁ।',
    },
  };

  let template = templates[key]?.[language] || key;

  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      template = template.replace(`{${key}}`, String(value));
    });
  }

  return template;
}

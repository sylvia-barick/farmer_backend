const axios = require('axios');
const { getGroqAnalysis } = require('../services/groqService');

// Server configuration
const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:4111';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Conversation context store
const conversationStore = new Map();

// Supported languages
const LANGUAGES = {
    hi: 'Hindi',
    en: 'English',
    hinglish: 'Hinglish'
};

/**
 * Detect language from text using simple heuristics
 */
function detectLanguage(text) {
    // Check for Devanagari script (Hindi)
    const devanagariPattern = /[\u0900-\u097F]/;
    if (devanagariPattern.test(text)) {
        return 'hi';
    }
    
    // Check for common Hindi words in Roman script (Hinglish)
    const hinglishWords = ['kya', 'hai', 'mein', 'hoon', 'chahiye', 'kaise', 'kab', 'kahan', 'mujhe', 'aap', 'haan', 'nahi', 'theek', 'accha', 'bahut', 'karo', 'bolo', 'batao', 'lena', 'dena'];
    const lowerText = text.toLowerCase();
    const hinglishCount = hinglishWords.filter(word => lowerText.includes(word)).length;
    
    if (hinglishCount >= 2) {
        return 'hinglish';
    }
    
    // Default to English
    return 'en';
}

/**
 * Get localized responses based on language
 */
function getLocalizedResponses(lang) {
    const responses = {
        hi: {
            loanIntro: '🌾 मैं आपकी लोन आवेदन में मदद कर सकता हूं!',
            insuranceIntro: '🛡️ मैं आपकी बीमा दावे में मदद कर सकता हूं!',
            weatherIntro: '🌤️ मैं आपको मौसम की जानकारी दे सकता हूं!',
            greeting: '🙏 नमस्ते! KisaanSathi में आपका स्वागत है!\n\nमैं इनमें मदद कर सकता हूं:\n• 💰 लोन आवेदन\n• 🛡️ बीमा दावा\n• 🌤️ मौसम जानकारी\n• 🌾 फसल सलाह\n• 📋 सरकारी योजनाएं',
            cancelled: '🔄 कोई बात नहीं! मैंने अनुरोध रद्द कर दिया है।',
            error: '❌ माफ कीजिए, कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।',
            questions: {
                cropType: 'आप कौन सी फसल उगा रहे हैं?',
                purpose: 'लोन किस काम के लिए चाहिए?',
                amount: 'कितने रुपये का लोन चाहिए?',
                repaymentYears: 'कितने सालों में वापस करना चाहेंगे? (1-5 साल)',
                provider: 'आपका बीमा किस कंपनी का है?',
                damageReason: 'फसल को क्या नुकसान हुआ?',
                location: 'किस जगह का मौसम जानना है?'
            }
        },
        en: {
            loanIntro: '🌾 I can help you with a loan application!',
            insuranceIntro: '🛡️ I can help you with your insurance claim!',
            weatherIntro: '🌤️ I can help you with weather information!',
            greeting: '🙏 Welcome to KisaanSathi - your farming assistant!\n\nI can help you with:\n• 💰 Loan applications\n• 🛡️ Insurance claims\n• 🌤️ Weather updates\n• 🌾 Crop advice\n• 📋 Government schemes',
            cancelled: '🔄 No problem! I\'ve cancelled the request.',
            error: '❌ Sorry, something went wrong. Please try again.',
            questions: {
                cropType: 'What crop are you growing or planning to grow?',
                purpose: 'What is the purpose of this loan? (seeds, equipment, irrigation)',
                amount: 'How much loan amount do you need? (in rupees)',
                repaymentYears: 'Over how many years would you like to repay? (1-5 years)',
                provider: 'Which insurance provider do you have?',
                damageReason: 'What caused the crop damage? (drought, flood, pest, disease)',
                location: 'Which location would you like weather for?'
            }
        },
        hinglish: {
            loanIntro: '🌾 Main aapki loan application mein madad kar sakta hoon!',
            insuranceIntro: '🛡️ Main aapki insurance claim mein madad kar sakta hoon!',
            weatherIntro: '🌤️ Main aapko mausam ki jaankari de sakta hoon!',
            greeting: '🙏 नमस्ते! KisaanSathi mein aapka swagat hai!\n\nMain aapki in cheezon mein madad kar sakta hoon:\n• 💰 Loan ke liye apply\n• 🛡️ Insurance claim\n• 🌤️ Mausam ki jaankari\n• 🌾 Fasal salah\n• 📋 Sarkari yojanaein',
            cancelled: '🔄 Koi baat nahi! Maine request cancel kar di hai.',
            error: '❌ Maaf kijiye, kuch gadbad ho gayi. Kripya dobara try karein.',
            questions: {
                cropType: 'Aap kaun si fasal uga rahe hain ya ugaane wale hain?',
                purpose: 'Loan kis kaam ke liye chahiye? (beej, equipment, sinchai)',
                amount: 'Kitne rupaye ka loan chahiye?',
                repaymentYears: 'Kitne saalon mein wapas karna chahenge? (1-5 saal)',
                provider: 'Aapka insurance kis company ka hai?',
                damageReason: 'Fasal ko kya nuksan hua? (sukha, baadh, keede, bimari)',
                location: 'Kis jagah ka mausam jaanna hai?'
            }
        }
    };
    
    return responses[lang] || responses.hinglish;
}

/**
 * Intent detection patterns (language-independent keywords)
 */
const INTENT_PATTERNS = {
    loan: {
        keywords: ['loan', 'ऋण', 'कर्ज', 'karz', 'karza', 'paise chahiye', 'money need', 'borrow', 'finance', 'credit', 'apply loan', 'loan apply', 'rin', 'udhar', 'लोन'],
        requiredFields: ['cropType', 'purpose', 'amount', 'repaymentYears']
    },
    insurance: {
        keywords: ['insurance', 'bima', 'बीमा', 'claim', 'fasal bima', 'crop insurance', 'pmfby', 'damage claim', 'beema', 'dawa', 'दावा'],
        requiredFields: ['provider', 'damageReason'],
        optionalFields: ['uin', 'policyNumber', 'claimAmount', 'crop']
    },
    weather: {
        keywords: ['weather', 'mausam', 'मौसम', 'rain', 'barish', 'temperature', 'forecast', 'climate', 'baarish', 'बारिश'],
        requiredFields: ['location']
    },
    disease: {
        keywords: ['disease', 'rog', 'रोग', 'bimari', 'pest', 'infection', 'plant sick', 'leaf', 'yellow', 'spots', 'keeda', 'keet', 'बीमारी'],
        requiredFields: ['crop', 'symptoms']
    },
    scheme: {
        keywords: ['scheme', 'yojana', 'योजना', 'subsidy', 'government', 'sarkar', 'pm kisan', 'pmfby', 'sarkari', 'सरकारी'],
        requiredFields: []
    },
    greeting: {
        keywords: ['hello', 'hi', 'namaste', 'नमस्ते', 'hey', 'good morning', 'good evening', 'namaskar', 'नमस्कार'],
        requiredFields: []
    }
};

/**
 * Detect user intent from message
 */
function detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
        for (const keyword of config.keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                return intent;
            }
        }
    }
    return 'general';
}

/**
 * Extract field values from message using patterns
 */
function extractFields(message, intent) {
    const extracted = {};
    const lowerMessage = message.toLowerCase();
    
    // Amount extraction
    const amountMatch = message.match(/(?:₹|rs\.?|rupees?)\s*(\d[\d,]*)/i) || 
                        message.match(/(\d[\d,]*)\s*(?:₹|rs\.?|rupees?|lakh|thousand)/i) ||
                        message.match(/(\d[\d,]+)/);
    if (amountMatch) {
        let amount = amountMatch[1].replace(/,/g, '');
        if (lowerMessage.includes('lakh')) amount = parseInt(amount) * 100000;
        else if (lowerMessage.includes('thousand')) amount = parseInt(amount) * 1000;
        extracted.amount = parseInt(amount);
        extracted.claimAmount = parseInt(amount);
    }
    
    // Years extraction
    const yearsMatch = message.match(/(\d+)\s*(?:year|sal|वर्ष)/i);
    if (yearsMatch) {
        extracted.repaymentYears = parseInt(yearsMatch[1]);
    }
    
    // Crop extraction - expanded list with Hindi/Hinglish names
    const crops = [
        // English
        'wheat', 'rice', 'cotton', 'sugarcane', 'maize', 'soybean', 'groundnut', 'potato', 'tomato', 'onion',
        'mustard', 'chickpea', 'lentil', 'millet', 'barley', 'jowar', 'bajra', 'sunflower', 'sesame',
        // Hindi
        'गेहूं', 'चावल', 'कपास', 'गन्ना', 'मक्का', 'सोयाबीन', 'मूंगफली', 'आलू', 'टमाटर', 'प्याज',
        'सरसों', 'चना', 'मसूर', 'बाजरा', 'जौ', 'ज्वार', 'तिल',
        // Hinglish/Romanized
        'gehun', 'chawal', 'kapas', 'ganna', 'makka', 'moongfali', 'aloo', 'tamatar', 'pyaaz',
        'sarson', 'chana', 'masoor', 'dhan', 'dhaan'
    ];
    for (const crop of crops) {
        if (lowerMessage.includes(crop.toLowerCase())) {
            extracted.cropType = crop;
            extracted.crop = crop;
            break;
        }
    }
    
    // Purpose extraction for loans - expanded with Hindi/Hinglish
    const purposes = [
        // English
        'seeds', 'equipment', 'irrigation', 'fertilizer', 'tractor', 'land', 'farming', 'harvesting',
        'pesticide', 'pump', 'well', 'borewell', 'machinery',
        // Hindi
        'बीज', 'उपकरण', 'सिंचाई', 'खाद', 'ट्रैक्टर', 'जमीन', 'कटाई', 'कीटनाशक', 'पंप', 'कुआं',
        // Hinglish
        'beej', 'khaad', 'sinchai', 'katai', 'zameen', 'kheti', 'pump'
    ];
    for (const purpose of purposes) {
        if (lowerMessage.includes(purpose.toLowerCase())) {
            extracted.purpose = purpose;
            break;
        }
    }
    
    // Insurance provider extraction
    const providers = ['aic', 'iffco tokio', 'bajaj allianz', 'hdfc ergo', 'tata aig', 'icici lombard'];
    for (const provider of providers) {
        if (lowerMessage.includes(provider.toLowerCase())) {
            extracted.provider = provider.toUpperCase();
            break;
        }
    }
    
    // Damage reason extraction
    const damageReasons = ['drought', 'flood', 'pest', 'disease', 'hailstorm', 'सूखा', 'बाढ़', 'कीट'];
    for (const reason of damageReasons) {
        if (lowerMessage.includes(reason.toLowerCase())) {
            extracted.damageReason = reason;
            break;
        }
    }
    
    // Location extraction (basic)
    const locationMatch = message.match(/(?:in|at|from|near)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (locationMatch) {
        extracted.location = locationMatch[1];
    }
    
    return extracted;
}

/**
 * Call backend API for loan application
 */
async function submitLoanApplication(userId, data) {
    try {
        console.log(`[Fallback] Submitting loan to ${BACKEND_URL}/loan/apply`);
        
        // Convert repayment years to months
        const tenureMonths = (data.repaymentYears || 3) * 12;
        
        const loanPayload = {
            firebaseUid: userId,
            farmerUid: userId,
            cropType: data.cropType || 'General',
            loanPurpose: data.purpose || 'Agricultural',
            requestedAmount: data.amount || 50000,
            tenureMonths: tenureMonths,
            repaymentPeriod: data.repaymentYears || 3,
            acres: data.acres || 5,
            landSize: data.landSize || 5,
            status: 'PENDING'
        };
        
        console.log(`[Fallback] Loan payload:`, loanPayload);
        
        const response = await axios.post(`${BACKEND_URL}/loan/apply`, loanPayload, { timeout: 30000 });
        
        console.log(`[Fallback] Loan API response:`, response.data);
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('[Fallback] Loan API error:', error.message);
        if (error.response) {
            console.error('[Fallback] Loan API response status:', error.response.status);
            console.error('[Fallback] Loan API response data:', error.response.data);
        }
        return { success: false, error: error.response?.data?.message || error.message };
    }
}

/**
 * Call backend API for insurance claim
 */
async function submitInsuranceClaim(userId, data) {
    try {
        const response = await axios.post(`${BACKEND_URL}/insurance/create`, {
            firebaseUid: userId,
            provider: data.provider || 'Unknown Provider',
            uin: data.uin || '',
            policyNumber: data.policyNumber || '',
            claimAmount: data.claimAmount || 0,
            crop: data.crop || 'General',
            damageReason: data.damageReason || 'Crop damage',
            status: 'PENDING'
        }, { timeout: 30000 });
        
        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('[Fallback] Insurance API error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get weather data from backend
 */
async function getWeatherData(location) {
    try {
        const response = await axios.get(`${BACKEND_URL}/weather/current`, {
            params: { location },
            timeout: 15000
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('[Fallback] Weather API error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Format loan response (multilingual)
 */
function formatLoanResponse(result, lang = 'hinglish') {
    if (!result.success) {
        const errors = {
            hi: '❌ माफ कीजिए, लोन आवेदन में कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।',
            en: '❌ Sorry, there was an error submitting your loan application. Please try again.',
            hinglish: '❌ Maaf kijiye, loan application mein kuch gadbad ho gayi. Kripya dobara try karein.'
        };
        return errors[lang] || errors.hinglish;
    }
    
    const data = result.data;
    const loanId = data._id || data.id || data.loanId || 'PENDING';
    const fraudScore = data.fraudRiskScore || 'N/A';
    
    const templates = {
        hi: {
            title: '✅ **लोन आवेदन सफलतापूर्वक जमा हो गया!**\n\n',
            appId: '📋 **आवेदन ID:** ',
            amount: '💰 **राशि:** ',
            crop: '🌾 **फसल:** ',
            status: '📊 **स्थिति:** PENDING (विचाराधीन)\n',
            fraud: '🔒 **Fraud Risk Score:** ',
            nextSteps: '📋 **अगले कदम:**\n1. सत्यापन का इंतजार करें (2-3 दिन)\n2. संपर्क होने पर दस्तावेज जमा करें\n3. Loan Status पेज पर ट्रैक करें'
        },
        en: {
            title: '✅ **Loan Application Submitted Successfully!**\n\n',
            appId: '📋 **Application ID:** ',
            amount: '💰 **Amount:** ',
            crop: '🌾 **Crop:** ',
            status: '📊 **Status:** PENDING\n',
            fraud: '🔒 **Fraud Risk Score:** ',
            nextSteps: '📋 **Next Steps:**\n1. Wait for verification (2-3 days)\n2. Submit documents if contacted\n3. Track on Loan Status page'
        },
        hinglish: {
            title: '✅ **Loan Application Safalta Se Submit Ho Gayi!**\n\n',
            appId: '📋 **Application ID:** ',
            amount: '💰 **Rashi:** ',
            crop: '🌾 **Fasal:** ',
            status: '📊 **Status:** PENDING (Vichar Adheen)\n',
            fraud: '🔒 **Fraud Risk Score:** ',
            nextSteps: '📋 **Aage Ke Steps:**\n1. Verification ka intezaar karein (2-3 din)\n2. Zaruri documents submit karein\n3. Loan Status page pe track karein'
        }
    };
    
    const t = templates[lang] || templates.hinglish;
    
    let msg = t.title;
    msg += `${t.appId}${loanId}\n`;
    msg += `${t.amount}₹${(data.requestedAmount || 0).toLocaleString('en-IN')}\n`;
    msg += `${t.crop}${data.cropType || 'N/A'}\n`;
    msg += t.status;
    msg += `${t.fraud}${fraudScore}\n\n`;
    msg += t.nextSteps;
    
    return msg;
}

/**
 * Format insurance response (multilingual)
 */
function formatInsuranceResponse(result, lang = 'hinglish') {
    if (!result.success) {
        const errors = {
            hi: '❌ माफ कीजिए, बीमा दावे में कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।',
            en: '❌ Sorry, there was an error submitting your insurance claim. Please try again.',
            hinglish: '❌ Maaf kijiye, insurance claim mein kuch gadbad ho gayi. Kripya dobara try karein.'
        };
        return errors[lang] || errors.hinglish;
    }
    
    const data = result.data;
    const claimId = data._id || data.id || data.claimId || 'PENDING';
    
    const templates = {
        hi: {
            title: '✅ **बीमा दावा सफलतापूर्वक जमा हो गया!**\n\n',
            claimId: '📋 **Claim ID:** ',
            company: '🏢 **कंपनी:** ',
            status: '📊 **स्थिति:** PENDING\n\n',
            docs: '📝 **जरूरी दस्तावेज:**\n1. आधार कार्ड\n2. जमीन का कागज (7/12 extract)\n3. फसल की फोटो जिसमें नुकसान दिखे\n4. बैंक खाता विवरण\n\n',
            nextSteps: '📋 **अगले कदम:**\n1. 72 घंटे में नुकसान की रिपोर्ट करें\n2. दस्तावेज जमा करें\n3. फील्ड इंस्पेक्शन का इंतजार करें'
        },
        en: {
            title: '✅ **Insurance Claim Submitted Successfully!**\n\n',
            claimId: '📋 **Claim ID:** ',
            company: '🏢 **Provider:** ',
            status: '📊 **Status:** PENDING\n\n',
            docs: '📝 **Required Documents:**\n1. Aadhaar card\n2. Land document (7/12 extract)\n3. Crop photos showing damage\n4. Bank account details\n\n',
            nextSteps: '📋 **Next Steps:**\n1. Report crop loss within 72 hours\n2. Submit required documents\n3. Wait for field inspection'
        },
        hinglish: {
            title: '✅ **Insurance Claim Safalta Se Submit Ho Gayi!**\n\n',
            claimId: '📋 **Claim ID:** ',
            company: '🏢 **Company:** ',
            status: '📊 **Status:** PENDING (Vichar Adheen)\n\n',
            docs: '📝 **Zaruri Documents:**\n1. Aadhaar card\n2. Zameen ka kagaz (7/12 extract)\n3. Fasal ki photo jisme nuksan dikhe\n4. Bank account details\n\n',
            nextSteps: '📋 **Aage Ke Steps:**\n1. 72 ghante mein nuksan ki report karein\n2. Zaruri documents submit karein\n3. Field inspection ka intezaar karein'
        }
    };
    
    const t = templates[lang] || templates.hinglish;
    
    let msg = t.title;
    msg += `${t.claimId}${claimId}\n`;
    msg += `${t.company}${data.provider || 'N/A'}\n`;
    msg += t.status;
    msg += t.docs;
    msg += t.nextSteps;
    
    return msg;
}

/**
 * Multilingual Chat Handler - Primary chat system with language-aware responses
 * Supports Hindi (Devanagari), English, and Hinglish (Roman Hindi)
 */
async function multilingualChat(message, userId, threadId, preferredLang = null) {
    // Detect language from message or use preferred language
    const detectedLang = detectLanguage(message);
    const lang = preferredLang || detectedLang;
    const localizedResponses = getLocalizedResponses(lang);
    
    console.log(`[Multilingual Chat] Processing message for user ${userId}`);
    console.log(`[Multilingual Chat] Message: "${message}", Language: ${lang}`);
    
    // Use userId for context key to ensure conversation persists
    const contextKey = `chat-${userId}`;
    let context = conversationStore.get(contextKey) || {
        intent: null,
        collectedFields: {},
        lastQuestion: null,
        history: [],
        language: lang // Store user's preferred language
    };
    
    // Update language preference if changed
    context.language = lang;
    
    console.log(`[Multilingual Chat] Context key: ${contextKey}`);
    console.log(`[Multilingual Chat] Context loaded: intent=${context.intent}, lastQuestion=${context.lastQuestion}, fields=${JSON.stringify(context.collectedFields)}`);
    
    // Add message to history
    context.history.push({ role: 'user', content: message });
    
    // Detect intent from current message
    const newIntent = detectIntent(message);
    console.log(`[Multilingual Chat] Detected intent: ${newIntent}`);
    
    // Check if this is a new intent trigger (first message for this intent)
    const isNewIntentTrigger = newIntent !== 'general' && 
        (!context.intent || context.intent === 'general' || context.intent !== newIntent);
    
    // Check if user wants to switch topics mid-conversation
    if (context.intent && context.intent !== 'general' && newIntent !== 'general' && newIntent !== context.intent) {
        // User mentioned a different topic - switch to new intent
        console.log(`[Multilingual Chat] Intent switch detected: ${context.intent} -> ${newIntent}`);
        context.intent = newIntent;
        context.collectedFields = {}; // Reset collected fields for new intent
        context.lastQuestion = null;
    } else if (!context.intent || context.intent === 'general') {
        // No intent set yet, use detected intent
        context.intent = newIntent;
        context.lastQuestion = null; // Reset last question for fresh start
    }
    
    // Check for explicit cancel/reset commands (multilingual)
    const lowerMessage = message.toLowerCase();
    const cancelKeywords = ['cancel', 'start over', 'reset', 'nevermind', 'रद्द', 'band karo', 'rehne do', 'छोड़ दो', 'nahi chahiye'];
    if (cancelKeywords.some(keyword => lowerMessage.includes(keyword))) {
        console.log(`[Multilingual Chat] User cancelled current flow`);
        context.intent = null;
        context.collectedFields = {};
        context.lastQuestion = null;
        
        const cancelResponses = {
            hi: `🔄 कोई बात नहीं! मैंने वर्तमान अनुरोध रद्द कर दिया।\n\nऔर कैसे मदद कर सकता हूं?\n• 💰 लोन के लिए आवेदन\n• 🛡️ बीमा दावा\n• 🌤️ मौसम की जानकारी\n• 🌾 फसल सलाह`,
            en: `🔄 No problem! I've cancelled the current request.\n\nHow else can I help you?\n• 💰 Apply for loan\n• 🛡️ Insurance claim\n• 🌤️ Weather information\n• 🌾 Crop advice`,
            hinglish: `🔄 Koi baat nahi! Maine current request cancel kar di hai.\n\nAur kaise madad kar sakta hoon?\n• 💰 Loan ke liye apply\n• 🛡️ Insurance claim\n• 🌤️ Mausam ki jaankari\n• 🌾 Fasal salah`
        };
        
        const response = cancelResponses[lang] || cancelResponses.hinglish;
        context.history.push({ role: 'assistant', content: response });
        conversationStore.set(contextKey, context);
        return response;
    }
    
    // Extract fields from current message based on context
    const extractedFields = extractFields(message, context.intent);
    
    // Intent trigger phrases that should NOT be captured as field values
    const intentTriggerPhrases = [
        'loan', 'ऋण', 'कर्ज', 'insurance', 'bima', 'बीमा', 'weather', 'mausam', 'मौसम',
        'mujhe loan chahiye', 'loan chahiye', 'loan lena hai', 'karz chahiye',
        'mujhe insurance chahiye', 'bima karna hai', 'claim karna hai',
        'hello', 'hi', 'namaste', 'namaskar', 'help', 'madad'
    ];
    
    const isIntentTrigger = intentTriggerPhrases.some(phrase => 
        message.toLowerCase().includes(phrase.toLowerCase())
    );
    
    // If we asked a specific question, map the answer to that field
    // BUT only if this message is NOT an intent trigger phrase
    if (context.lastQuestion && !extractedFields[context.lastQuestion] && !isIntentTrigger) {
        const trimmedMessage = message.trim();
        // User might have just typed a simple answer
        if (context.lastQuestion === 'repaymentYears') {
            const num = parseInt(trimmedMessage);
            if (!isNaN(num) && num >= 1 && num <= 10) {
                extractedFields.repaymentYears = num;
            }
        } else if (context.lastQuestion === 'amount' || context.lastQuestion === 'claimAmount') {
            const num = parseInt(trimmedMessage.replace(/[₹,Rs\.rupees\s]/gi, ''));
            if (!isNaN(num) && num > 0) {
                extractedFields.amount = num;
                extractedFields.claimAmount = num;
            }
        } else if (context.lastQuestion === 'cropType' || context.lastQuestion === 'crop') {
            // Only accept as crop if it looks like a valid crop name (not a sentence)
            if (trimmedMessage.length > 1 && trimmedMessage.length < 30 && !trimmedMessage.includes(' ')) {
                extractedFields.cropType = trimmedMessage;
                extractedFields.crop = trimmedMessage;
            } else if (trimmedMessage.split(' ').length <= 3) {
                // Allow 2-3 word crop names like "green gram" or "black gram"
                extractedFields.cropType = trimmedMessage;
                extractedFields.crop = trimmedMessage;
            }
        } else if (context.lastQuestion === 'purpose') {
            if (trimmedMessage.length > 1 && trimmedMessage.length < 100) {
                extractedFields.purpose = trimmedMessage;
            }
        } else if (context.lastQuestion === 'provider') {
            if (trimmedMessage.length > 1 && trimmedMessage.length < 50) {
                extractedFields.provider = trimmedMessage;
            }
        } else if (context.lastQuestion === 'damageReason') {
            if (trimmedMessage.length > 1 && trimmedMessage.length < 100) {
                extractedFields.damageReason = trimmedMessage;
            }
        } else if (context.lastQuestion === 'location') {
            if (trimmedMessage.length > 1 && trimmedMessage.length < 100) {
                extractedFields.location = trimmedMessage;
            }
        }
    }
    
    context.collectedFields = { ...context.collectedFields, ...extractedFields };
    console.log(`[Multilingual Chat] After extraction: fields=${JSON.stringify(context.collectedFields)}`);
    
    let response = '';
    
    // Multilingual question templates for each field
    const loanQuestions = {
        amount: {
            hi: '💰 आपको कितने रुपये का लोन चाहिए?',
            en: '💰 How much loan amount do you need (in Rupees)?',
            hinglish: '💰 Aapko kitna loan chahiye (rupees mein)?'
        },
        cropType: {
            hi: '🌾 आप कौन सी फसल उगा रहे हैं?',
            en: '🌾 What crop are you growing?',
            hinglish: '🌾 Aap kaun si fasal uga rahe ho?'
        },
        purpose: {
            hi: '📋 लोन का उद्देश्य क्या है? (बीज, खाद, ट्रैक्टर, आदि)',
            en: '📋 What is the purpose of the loan? (seeds, fertilizer, tractor, etc.)',
            hinglish: '📋 Loan kis liye chahiye? (beej, khaad, tractor, etc.)'
        },
        repaymentYears: {
            hi: '📅 कितने साल में लोन चुकाएंगे? (1-10 साल)',
            en: '📅 In how many years will you repay? (1-10 years)',
            hinglish: '📅 Kitne saal mein loan chuka sakte ho? (1-10 saal)'
        }
    };
    
    const insuranceQuestions = {
        crop: {
            hi: '🌾 किस फसल का बीमा करवाना है?',
            en: '🌾 Which crop do you want to insure?',
            hinglish: '🌾 Kaunsi fasal ka insurance chahiye?'
        },
        provider: {
            hi: '🏢 कौन सी बीमा कंपनी से बीमा करवाना है?',
            en: '🏢 Which insurance company do you prefer?',
            hinglish: '🏢 Kaunsi insurance company se karwana hai?'
        },
        claimAmount: {
            hi: '💰 कितने रुपये का दावा करना है?',
            en: '💰 What is the claim amount (in Rupees)?',
            hinglish: '💰 Kitne rupees ka claim karna hai?'
        },
        damageReason: {
            hi: '🌧️ फसल का नुकसान कैसे हुआ? (बाढ़, सूखा, कीट, आदि)',
            en: '🌧️ What caused the crop damage? (flood, drought, pests, etc.)',
            hinglish: '🌧️ Fasal ka nuksan kaise hua? (baadh, sukha, keede, etc.)'
        }
    };
    
    // Handle by intent
    switch (context.intent) {
        case 'loan': {
            const config = INTENT_PATTERNS.loan;
            const missingFields = config.requiredFields.filter(f => !context.collectedFields[f]);
            
            if (missingFields.length > 0) {
                // Ask for next missing field
                const nextField = missingFields[0];
                context.lastQuestion = nextField;
                
                const loanIntro = {
                    hi: '🌾 मैं आपकी लोन आवेदन में मदद कर सकता हूं!\n\n',
                    en: '🌾 I can help you with your loan application!\n\n',
                    hinglish: '🌾 Main aapki loan application mein madad kar sakta hoon!\n\n'
                };
                response = loanIntro[lang] + (loanQuestions[nextField]?.[lang] || config.questions[nextField]);
            } else {
                // All fields collected - submit loan
                const result = await submitLoanApplication(userId, context.collectedFields);
                response = formatLoanResponse(result, lang);
                // Reset context after submission
                context.intent = null;
                context.collectedFields = {};
            }
            break;
        }
        
        case 'insurance': {
            const config = INTENT_PATTERNS.insurance;
            const missingRequired = config.requiredFields.filter(f => !context.collectedFields[f]);
            
            if (missingRequired.length > 0) {
                const nextField = missingRequired[0];
                context.lastQuestion = nextField;
                
                const insuranceIntro = {
                    hi: '🛡️ मैं आपकी बीमा दावा में मदद कर सकता हूं!\n\n',
                    en: '🛡️ I can help you with your insurance claim!\n\n',
                    hinglish: '🛡️ Main aapki insurance claim mein madad kar sakta hoon!\n\n'
                };
                response = insuranceIntro[lang] + (insuranceQuestions[nextField]?.[lang] || config.questions[nextField]);
            } else {
                // Submit insurance claim
                const result = await submitInsuranceClaim(userId, context.collectedFields);
                response = formatInsuranceResponse(result, lang);
                context.intent = null;
                context.collectedFields = {};
            }
            break;
        }
        
        case 'weather': {
            const weatherLocQuestion = {
                hi: '🌤️ मैं आपको मौसम की जानकारी दे सकता हूं!\n\nकिस जगह का मौसम जानना है?',
                en: '🌤️ I can help you with weather information!\n\nWhich location do you want weather for?',
                hinglish: '🌤️ Main aapko mausam ki jaankari de sakta hoon!\n\nKis jagah ka mausam jaanna hai?'
            };
            
            if (!context.collectedFields.location) {
                response = weatherLocQuestion[lang];
            } else {
                const result = await getWeatherData(context.collectedFields.location);
                if (result.success && result.data) {
                    const w = result.data.data || result.data;
                    const weatherTemplates = {
                        hi: {
                            title: `🌤️ **${context.collectedFields.location} का मौसम:**\n\n`,
                            temp: `🌡️ तापमान: ${w.temperature || 'N/A'}°C\n`,
                            humidity: `💧 नमी: ${w.humidity || 'N/A'}%\n`,
                            rain: `🌧️ बारिश: ${w.rainfall || 'N/A'} mm\n`,
                            wind: `💨 हवा: ${w.windSpeed || 'N/A'} km/h`
                        },
                        en: {
                            title: `🌤️ **Weather for ${context.collectedFields.location}:**\n\n`,
                            temp: `🌡️ Temperature: ${w.temperature || 'N/A'}°C\n`,
                            humidity: `💧 Humidity: ${w.humidity || 'N/A'}%\n`,
                            rain: `🌧️ Rainfall: ${w.rainfall || 'N/A'} mm\n`,
                            wind: `💨 Wind: ${w.windSpeed || 'N/A'} km/h`
                        },
                        hinglish: {
                            title: `🌤️ **${context.collectedFields.location} ka Mausam:**\n\n`,
                            temp: `🌡️ Taapman (Temp): ${w.temperature || 'N/A'}°C\n`,
                            humidity: `💧 Nami (Humidity): ${w.humidity || 'N/A'}%\n`,
                            rain: `🌧️ Baarish: ${w.rainfall || 'N/A'} mm\n`,
                            wind: `💨 Hawa: ${w.windSpeed || 'N/A'} km/h`
                        }
                    };
                    const wt = weatherTemplates[lang] || weatherTemplates.hinglish;
                    response = wt.title + wt.temp + wt.humidity + wt.rain + wt.wind;
                } else {
                    const weatherError = {
                        hi: `माफ कीजिए, ${context.collectedFields.location} का मौसम नहीं मिला। कृपया दोबारा कोशिश करें।`,
                        en: `Sorry, couldn't fetch weather for ${context.collectedFields.location}. Please try again.`,
                        hinglish: `Maaf kijiye, ${context.collectedFields.location} ka mausam nahi mil paya. Kripya dobara try karein.`
                    };
                    response = weatherError[lang];
                }
                context.intent = null;
                context.collectedFields = {};
            }
            break;
        }
        
        case 'greeting': {
            response = localizedResponses.greeting;
            context.intent = null;
            break;
        }
        
        case 'scheme': {
            const schemeResponses = {
                hi: `📋 **किसानों के लिए सरकारी योजनाएं:**\n\n` +
                    `1. **PM-KISAN** - ₹6,000/साल सीधे खाते में\n` +
                    `2. **PMFBY** - फसल बीमा सिर्फ 2% प्रीमियम पर\n` +
                    `3. **किसान क्रेडिट कार्ड** - कम ब्याज पर कृषि लोन\n` +
                    `4. **PM फसल बीमा योजना** - फसल नुकसान से सुरक्षा\n` +
                    `5. **Soil Health Card** - मुफ्त मिट्टी की जांच\n\n` +
                    `किसी योजना के बारे में और जानना है?`,
                en: `📋 **Government Schemes for Farmers:**\n\n` +
                    `1. **PM-KISAN** - ₹6,000/year directly to account\n` +
                    `2. **PMFBY** - Crop insurance at just 2% premium\n` +
                    `3. **Kisan Credit Card** - Low-interest agricultural loan\n` +
                    `4. **PM Fasal Bima Yojana** - Protection from crop damage\n` +
                    `5. **Soil Health Card** - Free soil testing\n\n` +
                    `Want to know more about any scheme?`,
                hinglish: `📋 **Kisaanon Ke Liye Sarkari Yojanaein:**\n\n` +
                    `1. **PM-KISAN** - ₹6,000/saal seedha account mein\n` +
                    `2. **PMFBY** - Fasal bima sirf 2% premium pe\n` +
                    `3. **Kisan Credit Card** - Kam byaaj pe agricultural loan\n` +
                    `4. **PM Fasal Bima Yojana** - Fasal nuksan se suraksha\n` +
                    `5. **Soil Health Card** - Muft mitti ki jaanch\n\n` +
                    `Kisi yojana ke baare mein aur jaanna hai?`
            };
            response = schemeResponses[lang] || schemeResponses.hinglish;
            context.intent = null;
            break;
        }
        
        default: {
            // Use Groq for general conversation with language awareness
            try {
                const langInstructions = {
                    hi: 'Respond entirely in Hindi (Devanagari script). Example: "हां बिल्कुल, मैं आपकी मदद कर सकता हूं!"',
                    en: 'Respond entirely in English. Example: "Yes, of course! I can help you with that."',
                    hinglish: 'Respond in HINGLISH (mix of Hindi and English using Roman script). Example: "Haan bilkul, main aapki madad kar sakta hoon!"'
                };
                
                const prompt = `You are KisaanSathi, a helpful AI assistant for Indian farmers. 
                
User message: "${message}"

IMPORTANT LANGUAGE INSTRUCTION: ${langInstructions[lang] || langInstructions.hinglish}

If the user seems to need help with loans, insurance, weather, or crop advice, guide them to ask about those topics. Keep response concise (2-3 sentences) and friendly.`;
                
                response = await getGroqAnalysis(prompt, 'llama-3.1-8b-instant');
            } catch (error) {
                console.error('[Multilingual Chat] Groq error:', error.message);
                response = localizedResponses.error;
            }
        }
    }
    
    // Save context
    context.history.push({ role: 'assistant', content: response });
    conversationStore.set(contextKey, context);
    
    // Cleanup old contexts (keep for 1 hour)
    setTimeout(() => conversationStore.delete(contextKey), 3600000);
    
    return response;
}

// Simple request queue to prevent rate limiting
// Limits concurrent requests to Groq API through Mastra
class RequestQueue {
    constructor(maxConcurrent = 2, requestsPerMinute = 20) {
        this.maxConcurrent = maxConcurrent;
        this.requestsPerMinute = requestsPerMinute;
        this.activeRequests = 0;
        this.queue = [];
        this.requestTimestamps = [];
        this.lastRateLimit = null;
    }

    async execute(fn, retries = 5) {
        // Check if we're in rate limit recovery
        if (this.lastRateLimit && Date.now() - this.lastRateLimit < 60000) {
            const waitTime = 60000 - (Date.now() - this.lastRateLimit);
            console.log(`[Queue] Rate limit recovery, waiting ${Math.round(waitTime)}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.lastRateLimit = null;
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject, retries, attempt: 0 });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
            return;
        }

        // Rate limiting check
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
        
        if (this.requestTimestamps.length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestRequest) + 100;
            console.log(`[Queue] Rate limit threshold reached, waiting ${Math.round(waitTime)}ms...`);
            
            setTimeout(() => this.processQueue(), waitTime);
            return;
        }

        const { fn, resolve, reject, retries, attempt } = this.queue.shift();
        this.activeRequests++;
        this.requestTimestamps.push(now);

        try {
            const result = await fn();
            this.activeRequests--;
            resolve(result);
        } catch (error) {
            this.activeRequests--;
            
            const isRateLimit = error.response?.status === 429 || 
                error.message?.includes('rate limit') ||
                error.message?.includes('Rate limit') ||
                error.response?.data?.error?.includes('rate');
            
            const isRetryable = isRateLimit || 
                error.response?.status === 503 || 
                error.response?.status === 504 ||
                error.code === 'ECONNABORTED' ||
                error.message?.includes('timeout');

            if (isRetryable && attempt < retries) {
                // Exponential backoff
                const backoffTime = Math.min(2000 * Math.pow(2, attempt), 32000) + Math.random() * 1000;
                console.log(`[Queue] Retrying request (${attempt + 1}/${retries}) after ${Math.round(backoffTime)}ms due to: ${isRateLimit ? 'rate limit' : 'timeout/error'}`);
                
                if (isRateLimit) {
                    this.lastRateLimit = Date.now();
                }

                setTimeout(() => {
                    this.queue.unshift({ fn, resolve, reject, retries, attempt: attempt + 1 });
                    this.processQueue();
                }, backoffTime);
            } else {
                reject(error);
            }
        }

        // Continue processing queue
        setImmediate(() => this.processQueue());
    }
}

// Global request queue instance
const requestQueue = new RequestQueue(2, 20); // 2 concurrent, 20 per minute max

/**
 * Handle chat interactions - Multilingual primary with optional Mastra agent
 * @route POST /api/mastra/chat
 * 
 * Supports: Hindi (Devanagari), English, Hinglish (Roman Hindi)
 * Primary: Direct Groq-based multilingual chat
 * Secondary: Mastra agent for complex workflows (optional via useMastra flag)
 */
const chatWithAgent = async (req, res) => {
    // Extract variables outside try block so they're accessible in catch
    const { message, userId, threadId, lang, useMastra = false } = req.body;
    let conversationThreadId = threadId || `chat-${userId}-${Date.now()}`;
    
    try {
        // Validate required fields
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID (Firebase UID) is required'
            });
        }

        // Detect language from message or use provided preference
        const detectedLang = detectLanguage(message);
        const preferredLang = lang || detectedLang;
        
        console.log(`[Chat] User: ${userId}, Lang: ${preferredLang}, Message: ${message.substring(0, 50)}...`);

        // PRIMARY: Use multilingual chat (fast, reliable, language-aware)
        if (!useMastra) {
            console.log(`[Chat] Using multilingual chat (primary mode)`);
            const response = await multilingualChat(message, userId, conversationThreadId, preferredLang);
            
            return res.json({
                success: true,
                response: response,
                threadId: conversationThreadId,
                language: preferredLang,
                timestamp: new Date().toISOString()
            });
        }

        // SECONDARY: Use Mastra agent for complex workflows (when explicitly requested)
        console.log(`[Chat] Using Mastra agent (advanced mode)`);
        
        // Validate that threadId matches userId to prevent thread mismatch errors
        if (threadId) {
            const threadUserId = threadId.split('-')[1];
            if (threadUserId !== userId) {
                console.log(`[Mastra Chat] Thread mismatch detected. Creating new thread.`);
                conversationThreadId = `farmer-${userId}-${Date.now()}`;
            }
        }

        // Use request queue to prevent rate limiting
        const mastraResponse = await requestQueue.execute(async () => {
            return await axios.post(`${MASTRA_SERVER_URL}/api/agents/farmerAssistantAgent/generate`, {
                messages: [
                    {
                        role: 'system',
                        content: `Current user's Firebase UID is: ${userId}. Use this as the userId when calling tools that require it. Respond in ${preferredLang === 'hi' ? 'Hindi (Devanagari)' : preferredLang === 'en' ? 'English' : 'Hinglish (Roman Hindi)'}.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                threadId: conversationThreadId,
                resourceId: userId
            }, {
                timeout: 90000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }, 5);

        // Extract the text response
        let agentResponse = mastraResponse.data?.text || mastraResponse.data?.message || mastraResponse.data?.response || 'I apologize, but I could not process your request at this time.';

        // Clean up response - remove any tool call syntax that leaked through
        agentResponse = agentResponse.replace(/<function=[^>]+>.*?<function>/gs, '');
        agentResponse = agentResponse.replace(/<function[^>]*>/g, '');
        agentResponse = agentResponse.replace(/{"farmerName":[^}]+}/g, '');
        agentResponse = agentResponse.replace(/\b(loanWorkflowTool|dbTool|weatherTool|plantDiseaseTool|insuranceGuideTool|cropAdvisoryTool|govtSchemeTool|loanEligibilityTool)\s*\{[^}]*\}/g, '');
        agentResponse = agentResponse.replace(/\{["\']?(userId|message|success|cropType)["\']?\s*:/g, '');
        agentResponse = agentResponse.replace(/\n{3,}/g, '\n\n');
        agentResponse = agentResponse.trim();
        
        if (!agentResponse) {
            agentResponse = 'Processing your request...';
        }

        console.log(`[Mastra Chat] Response generated for user ${userId}`);

        return res.json({
            success: true,
            response: agentResponse,
            threadId: conversationThreadId,
            language: preferredLang,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Chat Controller] Error:', error.message);
        if (error.response) {
            console.error('[Chat Controller] Response status:', error.response.status);
        }
        
        // Fallback to multilingual chat if Mastra fails
        console.log(`[Chat Controller] Falling back to multilingual chat for user ${userId}`);
        try {
            const detectedLang = detectLanguage(message);
            const preferredLang = lang || detectedLang;
            const fallbackResponse = await multilingualChat(message, userId, conversationThreadId, preferredLang);
            
            return res.json({
                success: true,
                response: fallbackResponse,
                threadId: conversationThreadId,
                language: preferredLang,
                timestamp: new Date().toISOString(),
                fallbackMode: true
            });
        } catch (fallbackError) {
            console.error('[Chat Controller] Fallback also failed:', fallbackError.message);
            
            // Return localized error
            const detectedLang = detectLanguage(message);
            const localizedResponses = getLocalizedResponses(detectedLang);
            
            return res.status(500).json({
                success: false,
                message: localizedResponses.error,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
};

/**
 * Execute a specific Mastra workflow via HTTP
 * @route POST /api/mastra/workflow
 */
const executeWorkflow = async (req, res) => {
    try {
        const { workflowName, input, userId } = req.body;

        // Validate required fields
        if (!workflowName || !input || !userId) {
            return res.status(400).json({
                success: false,
                message: 'workflowName, input, and userId are required'
            });
        }

        console.log(`[Mastra Workflow] Executing ${workflowName} for user ${userId}`);

        // Use request queue to prevent rate limiting
        const result = await requestQueue.execute(async () => {
            const response = await axios.post(`${MASTRA_SERVER_URL}/api/workflows/${workflowName}/execute`, {
                triggerData: {
                    ...input,
                    userId,
                    timestamp: new Date().toISOString()
                }
            }, {
                timeout: 120000, // 120 second timeout for workflows with tool calls
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        }, 5); // 5 retries for workflows

        console.log(`[Mastra Workflow] ${workflowName} completed for user ${userId}`);

        return res.json({
            success: true,
            result,
            workflowName,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Mastra Workflow] Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Mastra service is not available. Please ensure the Mastra server is running on port 4111.',
                error: 'Service Unavailable'
            });
        }

        // Check if rate limit error
        const isRateLimit = error.response?.status === 429 || 
            error.message?.includes('rate limit') ||
            error.message?.includes('Rate limit');

        if (isRateLimit) {
            return res.status(429).json({
                success: false,
                message: 'AI service rate limit exceeded. This usually means Groq API quota has been reached. Please try again in a few minutes.',
                error: 'Rate Limited',
                suggestion: 'Consider upgrading your Groq API plan at https://console.groq.com/billing/overview'
            });
        }

        // Check if timeout
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return res.status(504).json({
                success: false,
                message: 'Workflow execution timed out. The operation took too long to complete.',
                error: 'Gateway Timeout',
                suggestion: 'Try splitting your request or restarting the Mastra server'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to execute workflow',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get available workflows via HTTP
 * @route GET /api/mastra/workflows
 */
const getWorkflows = async (req, res) => {
    try {
        const response = await axios.get(`${MASTRA_SERVER_URL}/api/workflows`, {
            timeout: 5000
        });

        return res.json({
            success: true,
            workflows: response.data
        });
    } catch (error) {
        console.error('[Mastra Workflows] Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Mastra service is not available. Please ensure the Mastra server is running on port 4111.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve workflows'
        });
    }
};

module.exports = {
    chatWithAgent,
    executeWorkflow,
    getWorkflows
};

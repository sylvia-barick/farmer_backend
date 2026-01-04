
const farmSummaryPrompt = ({ data }) => {
    const { user, weather, satellite } = data;
    const farmerName = user?.name?.split(' ')[0] || 'Kisaan';
    const crops = user?.crops?.length ? user.crops : ['General crops'];
    const cropList = crops.join(', ');
    const primaryCrop = crops[0] || 'crops';
    const landSize = user?.totalLand || user?.landSize || 'your';
    const location = user?.location || user?.village || user?.district || '';

    // Extract weather data with proper parsing
    let todayTemp = "25";
    let todayCondition = "Clear";
    let tomorrowTemp = "25";
    let tomorrowCondition = "Clear";
    let weekRainyDays = 0;
    let weekSunnyDays = 0;

    if (weather && Array.isArray(weather) && weather.length > 0) {
        const today = weather[0];
        const tomorrow = weather[1];
        
        todayTemp = today?.temp?.replace('°C', '') || "25";
        todayCondition = today?.condition || "Clear";
        tomorrowTemp = tomorrow?.temp?.replace('°C', '') || todayTemp;
        tomorrowCondition = tomorrow?.condition || todayCondition;
        
        weekRainyDays = weather.filter(d => d?.condition === "Rainy").length;
        weekSunnyDays = weather.filter(d => d?.condition === "Sunny").length;
    }

    // Calculate weather-based risks
    const isHot = parseInt(todayTemp) > 35;
    const isCold = parseInt(todayTemp) < 15;
    const isRainy = todayCondition === "Rainy";
    const isCloudy = todayCondition === "Cloudy";
    const isSunny = todayCondition === "Sunny";

    // Extract satellite data with validation
    let ndviPercent = 0;
    let healthStatus = "Unknown";
    let healthEmoji = "📡";
    let isHealthy = true;
    let isStressed = false;
    let isCritical = false;
    let satelliteDate = "recently";
    let coverage = 85;

    if (satellite) {
        ndviPercent = satellite.ndviPercentage || Math.round((satellite.ndvi || 0) * 100);
        const health = satellite.healthStatus || {};
        healthStatus = health.status || "Moderate";
        healthEmoji = health.emoji || "📡";
        
        isHealthy = ndviPercent >= 60;
        isStressed = ndviPercent >= 30 && ndviPercent < 60;
        isCritical = ndviPercent < 30;
        
        if (satellite.satelliteInfo?.lastPass) {
            satelliteDate = new Date(satellite.satelliteInfo.lastPass).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            });
        }
        coverage = satellite.coverage || 85;
    }

    // Determine current farming season (India)
    const month = new Date().getMonth();
    let season, seasonHindi, seasonActivity;
    
    if (month >= 5 && month <= 9) {
        season = "Kharif";
        seasonHindi = "खरीफ";
        seasonActivity = "monsoon sowing and growth phase";
    } else if (month >= 10 || month <= 1) {
        season = "Rabi";
        seasonHindi = "रबी";
        seasonActivity = "winter crop cultivation";
    } else {
        season = "Zaid";
        seasonHindi = "जायद";
        seasonActivity = "summer short-duration crops";
    }

    // Get crop-specific advice based on common Indian crops
    const getCropAdvice = (crop, weather, health) => {
        const cropLower = crop.toLowerCase();
        if (cropLower.includes('wheat') || cropLower.includes('गेहूं')) {
            if (isRainy) return "Wheat mein waterlogging check karein, drainage ensure karein";
            if (isHot) return "Wheat ko subah jaldi paani dein, dopahar mein avoid karein";
            return "Wheat ki growth monitor karein, yellowing ke signs dekhein";
        }
        if (cropLower.includes('rice') || cropLower.includes('dhan') || cropLower.includes('धान')) {
            if (isSunny && isHot) return "Paddy fields mein water level 5cm maintain karein";
            if (isRainy) return "Excess water drainage important, pest watch rakhein";
            return "Rice growth healthy hai, normal practices continue karein";
        }
        if (cropLower.includes('cotton') || cropLower.includes('kapas')) {
            if (isRainy) return "Cotton mein fungal disease risk - preventive spray consider karein";
            if (isCritical) return "Cotton stressed - urgent irrigation needed";
            return "Cotton bolls development monitor karein";
        }
        if (cropLower.includes('soybean') || cropLower.includes('soya')) {
            if (isRainy) return "Soybean mein root rot risk - drainage check karein";
            return "Soybean pod formation stage - pest monitoring important";
        }
        if (cropLower.includes('potato') || cropLower.includes('aloo')) {
            if (isRainy) return "Potato mein late blight risk high - fungicide spray recommended";
            return "Potato tuber development phase - even moisture maintain karein";
        }
        if (cropLower.includes('sugarcane') || cropLower.includes('ganna')) {
            if (isHot) return "Sugarcane ko regular irrigation dein, mulching helpful";
            return "Sugarcane growth check, yellowing leaves remove karein";
        }
        // Default advice
        if (isRainy) return `${crop} mein waterlogging avoid karein, drainage ensure karein`;
        if (isHot) return `${crop} ko evening mein paani dein, mulching se moisture retain karein`;
        return `${crop} ki regular monitoring karein, healthy growth maintain karein`;
    };

    const cropAdvice = getCropAdvice(primaryCrop, todayCondition, healthStatus);

    const currentDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return `You are an expert Indian agricultural advisor creating a daily farm briefing.

## INPUT DATA (Use these EXACT values):

FARMER: ${farmerName}
CROPS: ${cropList}
LAND: ${landSize} acres
DATE: ${currentDate}
SEASON: ${season} (${seasonHindi}) - ${seasonActivity}

WEATHER TODAY: ${todayTemp}°C, ${todayCondition}
WEATHER TOMORROW: ${tomorrowTemp}°C, ${tomorrowCondition}
WEEK FORECAST: ${weekRainyDays} rainy days, ${weekSunnyDays} sunny days expected

SATELLITE ANALYSIS:
- NDVI: ${ndviPercent}% ${isHealthy ? '(HEALTHY - above 60%)' : isStressed ? '(STRESSED - needs attention)' : '(CRITICAL - immediate action)'}
- Status: ${healthEmoji} ${healthStatus}
- Last scan: ${satelliteDate}
- Coverage: ${coverage}%

COMPUTED ADVICE: ${cropAdvice}

---

## OUTPUT FORMAT (Follow EXACTLY):

Generate a structured daily insight using this EXACT format with headers:

🌾 **Good morning, ${farmerName}!**
[1 warm greeting line mentioning the date and season]

📡 **Satellite Report:**
[2 lines explaining:
- NDVI ${ndviPercent}% means: ${isHealthy ? 'your crops are healthy with good chlorophyll' : isStressed ? 'some stress detected, plants need care' : 'critical stress, immediate irrigation/treatment needed'}
- What this means for ${primaryCrop} specifically]

🌤️ **Today's Weather Impact:**
[2 lines about:
- ${todayTemp}°C ${todayCondition} - what this means for farming
- Specific risk or benefit for ${primaryCrop}]

✅ **Your Tasks Today:**
• Morning: [specific task based on weather and crop]
• ${isRainy ? 'Avoid: field work during rain, check drainage' : isHot ? 'Afternoon: avoid irrigation, rest in shade' : 'Midday: regular field inspection'}
• Evening: [irrigation or monitoring task]
${isCritical ? '• URGENT: ' + cropAdvice : ''}

💡 **Pro Tip:**
[1 practical tip - either cost saving, market advice, or govt scheme mention relevant to ${season} season]

📅 **Tomorrow:**
[1 line preview: ${tomorrowTemp}°C ${tomorrowCondition} - what to prepare]

---

## RULES:
1. Use Hinglish naturally (mix Hindi words: fasal, sinchai, khad, mausam, khet)
2. Include EXACT numbers: ${todayTemp}°C, ${ndviPercent}% NDVI
3. Be crop-specific to: ${cropList}
4. Keep total response under 200 words
5. Use the emoji headers exactly as shown
6. Sound like a helpful farming expert, not formal
7. If NDVI < 40%, be urgent but encouraging
8. Mention satellite data as "upgraha" or "satellite imagery"

OUTPUT THE INSIGHT NOW:`;
};


module.exports = farmSummaryPrompt;

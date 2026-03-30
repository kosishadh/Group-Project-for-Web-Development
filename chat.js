export default async function chat(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if(req.method==="OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { message } = req.body;
    if(!message) return res.status(400).json({error:"Missing Message"});

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY)
        return res.status(500).json({error:"GEMINI_API_KEY not configured in Vercel environment variables"});

    const tools=[
        {
        functionDeclarations: [
            {
                name:"get_weather",
                description:"Get the current weather for a given location",
                parameters: {
                    type:"OBJECT",
                    properties:{
                        city:{
                            type:"STRING",
                            description:"The city to get the weather for"
                        },
                    },
                    required:["city"]
                },
            },
            {
                name:"get_aqi",
                description:"Get the current Air Quality Index (AQI) for a given location",
                parameters: {
                    type:"OBJECT",
                    properties:{
                        city:{
                            type:"STRING",
                            description:"The city to get the AQI for"
                        },
                    },
                    required:["city"]                  
                    },
                 },
             ],
        },
    ];

    const systemInstruction = {
        parts:[
            {
                text:`You are a helpful weather and air quality assistant embedded on a website. When users ask about weather or air quality for any location, always use your tools to fetch real-time data - never guess or make up numbers. After getting the data, give a clear, freindly conversational summary. For AQI, always explain what the number means for people's health in plain language. For weather, mention how it feels and any important conditions like rain or strong wind. Keep response concise but complete. Use °C for temperature. `
            },
        ],
    };
    
    async function geocodeCity(city) {
        const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
        const r=await fetch(url);
        const data=await r.json();
        if (!data.results || data.results.length===0) 
            throw new Error(`Could not find location for "${city}". Please try a different city name.`);
        const {latitude, longitude, name, country}= data.results[0];
        return {latitude, longitude, name, country};
    }

    async function getWeather({city}) {
    const {latitude, longitude, name, country} = await geocodeCity(city);

    const url=`https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum` +
      `&timezone=auto&forecast_days=4`;

    const r=await fetch(url);
    const data=await r.json();

    const weatherDescriptions = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Moderate drizzle",
      55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall",
      80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
    };

    const current = data.current;
    const daily = data.daily;

    const forecast = daily.time.slice(1,4).map((date,i)=>({
        date,
        condition: weatherDescriptions[daily.weathercode[i+1]] || "Unknown",
        max_c: Math.round(daily.temperature_2m_max[i+1]),
        min_c: Math.round(daily.temperature_2m_min[i+1]),
        precipitation_mm: daily.precipitation_sum[i+1],
    }));

    return{
        location: `${name}, ${country}`,
        current: {
            temperature_c: Math.round(current.temperature_2m),
            feels_like_c: Math.round(current.apparent_temperature),
            condition: weatherDescriptions[current.weathercode] || "Unknown",
            wind_kmh: Math.round(current.windspeed_10m),
            humidity_percent: current.relative_humidity_2m,
            precipitation_mm:current.precipitation,
    },
    forecast_3days: forecast,
    };
    }

    async function get_aqi({city}) {
        const {latitufe, longitude, name, country} = await geocodeCity(city);
        
        const url= `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide,european_aqi,us_aqi`;

        const r=await fetch(url);
        const data=await r.json(); 
        const current=data.current;

        function aqiCategory(aqi) {
            if (aqi<=50) return {label:"Good", advice:"Aor quality is satisfactory. Enjoy outdoor ativities!"};
            if (aqi<=100) return {label:"Moderate", advice:"Air quality is acceptable. Sensitive individuals should consider limiting outdoor exertion."};
            if (aqi<=150) return {label:"Unhealthy for Sensitive Groups", advice:"Sensitive groups may experience health effects. Consider reducing outdoor activities."};
            if (aqi<=200) return {label:"Unhealthy", advice:"Everyone may begin to experience health effects. Limit outdoor activities."};
            if (aqi<=300) return {label:"Very Unhealthy", advice:"Health alert: everyone may experience more serious health effects. Avoid outdoor activities."};
            return {label:"Hazardous", advice:"Health warning of emergency conditions. Everyone should avoid outdoor activities."};
        }

        const usAqi=Math.round(current.us_aqi);
        const euAqi=Math.round(current.european_aqi);
        const cat =aqiCategory(usAqi);

        return {
            location: `${name}, ${country}`,
            us_aqi: usAqi,
            european_aqi: euAqi,
            health_advice: cat.advice,
            pollutants:{
                pm2_5_ug_m3: Math.rounf(current.pm2_5*10)/10,
                pm10_ug_m3: Math.round(current.pm10*10)/10,
                nitrogen_dioxide_ug_m3: Math.round(current.nitrogen_dioxide*10)/10,
                ozone_ug_m3: Math.round(current.ozone*10)/10,
                carbon_monoxide_mg_m3: Math.round(current.carbon_monoxide*10)/10,
            },
        };
    }

    async function executeTool(name, args){
        if (name==="get_weather") return await getWeather(args);
        if (name==="get_aqi") return await get_aqi(args);
        return {error:"Unknown tool"+name};
    }

    function buildGeminiContents(messages) {
        return messages.map((m) => ({
            role: m.role === "assistant" ? "model" : m.role,
            parts: typeof m.content === "string"
            ? [{ text: m.content }]
            : m.content,
        }));
    }


    const GEMINI_URL=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    let geminiContents= buildGeminiContents(messages);
    
    for (leti=0; i<10; i++){
        const response= await fetch(GEMINI_URL, {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
                content: {parts: geminiContents},
                systemInstruction,
                tools,
                generationConfig:{
                    maxOutputTokens:1024,
                    temperature:0.7,
                },
            }),
        });
    }

    const  data = await response.json();

    if (!response.ok){
        console.error("Gemini error:", JSON.stringify(data));
        return res.status(500).json({error:data.error?.message || "Gemini API error"});
    }

    const candidate = data.candidates?.[0];
    if (!candidate) return res.status(500).json({error:"No response from Gemini"});

    const parts = candidate.content?.parts;
    const finishReason = candidate.finishReason;

    if (functionCall.length===0 || finishReason === "STOP"){
        const text = parts.filter((p)=> p.text).map((p)=>p.text).join("").trim();
        return res.status(200).json({reply: text || "I could not generate a response. Please try again."})
    }

    geminiContents.push({role:"model",parts});

    const toolResultsParts =[];
    for (const part of functionCalls){
        const {name, args}= part.functionCalls;
        let result;
        try {
            result = await executeTool(name, args);
        } catch (err){
            result= {error: err.message};
        }
    }

    geminiContents.push({role:"user",parts:toolResultsParts});

    return res.status(500).json({error:"Agent loop exceeded maximum iterations."});

}
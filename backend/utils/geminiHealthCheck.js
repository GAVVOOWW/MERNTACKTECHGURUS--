import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with your API key
const genAI = new GoogleGenerativeAI("AIzaSyABLvKd3pCrx_dQ2CWxWSereILXFKfRfgA");

/**
 * Comprehensive health check for Gemini API
 * Tests API connectivity, authentication, and basic functionality
 */
export async function checkGeminiHealth() {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 GEMINI API HEALTH CHECK STARTED");
    console.log("=".repeat(60));
    
    const startTime = Date.now();
    
    // Step 1: Check API Key
    console.log("\n📋 STEP 1: API KEY VALIDATION");
    console.log("─".repeat(30));
    
    const apiKey = "AIzaSyABLvKd3pCrx_dQ2CWxWSereILXFKfRfgA";
    
    if (!apiKey) {
        console.log("❌ API Key: NOT FOUND");
        console.log("🚨 Error: GEMINI_API_KEY environment variable is not set");
        return { status: 'FAILED', error: 'API key not configured' };
    }
    
    console.log("✅ API Key: FOUND");
    console.log("🔑 Key Length:", apiKey.length);
    console.log("🔑 Key Preview:", apiKey.substring(0, 20) + "..." + apiKey.substring(apiKey.length - 5));
    
    // Step 2: Model Initialization
    console.log("\n📋 STEP 2: MODEL INITIALIZATION");
    console.log("─".repeat(30));
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("✅ Model: INITIALIZED SUCCESSFULLY");
        console.log("🤖 Model Name: gemini-1.5-flash");
    } catch (error) {
        console.log("❌ Model: INITIALIZATION FAILED");
        console.log("🚨 Error:", error.message);
        return { status: 'FAILED', error: 'Model initialization failed', details: error.message };
    }
    
    // Step 3: Basic Connectivity Test
    console.log("\n📋 STEP 3: BASIC CONNECTIVITY TEST");
    console.log("─".repeat(30));
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const testPrompt = "Say 'Hello, I am working!' and nothing else.";
        
        console.log("🚀 Sending basic test request...");
        console.log("📝 Test Prompt:", testPrompt);
        
        const connectivityStart = Date.now();
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        const text = response.text();
        const connectivityEnd = Date.now();
        
        console.log("✅ Connectivity: SUCCESS");
        console.log("⏱️ Response Time:", (connectivityEnd - connectivityStart) + "ms");
        console.log("📄 Response:", text.trim());
        
    } catch (error) {
        console.log("❌ Connectivity: FAILED");
        console.log("🚨 Error Type:", error.name);
        console.log("🚨 Error Message:", error.message);
        
        if (error.status) {
            console.log("🌐 HTTP Status:", error.status);
        }
        if (error.code) {
            console.log("🔢 Error Code:", error.code);
        }
        
        return { 
            status: 'FAILED', 
            error: 'Connectivity test failed', 
            details: error.message,
            errorType: error.name 
        };
    }
    
    // Step 4: JSON Generation Test
    console.log("\n📋 STEP 4: JSON GENERATION TEST");
    console.log("─".repeat(30));
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const jsonPrompt = `Generate a simple JSON object with these fields: name, color, price. 
        Make it about a red chair costing 5000. 
        Respond ONLY with valid JSON, no other text.`;
        
        console.log("🚀 Testing JSON generation capability...");
        console.log("📝 JSON Test Prompt:", jsonPrompt);
        
        const jsonStart = Date.now();
        const result = await model.generateContent(jsonPrompt);
        const response = await result.response;
        const text = response.text();
        const jsonEnd = Date.now();
        
        console.log("📄 Raw JSON Response:", text);
        
        // Try to parse the JSON
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedJson = JSON.parse(cleanedJson);
        
        console.log("✅ JSON Generation: SUCCESS");
        console.log("⏱️ JSON Response Time:", (jsonEnd - jsonStart) + "ms");
        console.log("📊 Parsed JSON:", JSON.stringify(parsedJson, null, 2));
        
    } catch (error) {
        console.log("❌ JSON Generation: FAILED");
        console.log("🚨 Error:", error.message);
        
        if (error instanceof SyntaxError) {
            console.log("🔧 JSON Parse Error: Gemini returned invalid JSON");
        }
        
        return { 
            status: 'PARTIAL', 
            error: 'JSON generation test failed', 
            details: error.message 
        };
    }
    
    // Step 5: Furniture Query Test (Real-world test)
    console.log("\n📋 STEP 5: FURNITURE QUERY TEST");
    console.log("─".repeat(30));
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const furniturePrompt = `Convert this furniture query to JSON: "cheap wooden dining table under 10000"
        Use this format: {"semanticQuery": "item description", "filters": {"maxPrice": number}}
        Respond only with valid JSON.`;
        
        console.log("🚀 Testing furniture-specific parsing...");
        console.log("📝 Furniture Test Query: 'cheap wooden dining table under 10000'");
        
        const furnitureStart = Date.now();
        const result = await model.generateContent(furniturePrompt);
        const response = await result.response;
        const text = response.text();
        const furnitureEnd = Date.now();
        
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanedJson);
        
        console.log("✅ Furniture Query: SUCCESS");
        console.log("⏱️ Furniture Response Time:", (furnitureEnd - furnitureStart) + "ms");
        console.log("🛋️ Parsed Furniture Query:", JSON.stringify(parsedResult, null, 2));
        
        // Validate the furniture response structure
        if (parsedResult.semanticQuery && parsedResult.filters) {
            console.log("✅ Structure Validation: PASSED");
            console.log("🔍 Semantic Query:", parsedResult.semanticQuery);
            console.log("🎛️ Filters Found:", Object.keys(parsedResult.filters).length);
        } else {
            console.log("⚠️ Structure Validation: INCOMPLETE");
        }
        
    } catch (error) {
        console.log("❌ Furniture Query: FAILED");
        console.log("🚨 Error:", error.message);
        return { 
            status: 'PARTIAL', 
            error: 'Furniture query test failed', 
            details: error.message 
        };
    }
    
    // Final Results
    const totalTime = Date.now() - startTime;
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 GEMINI HEALTH CHECK COMPLETED");
    console.log("=".repeat(60));
    console.log("✅ Overall Status: ALL SYSTEMS OPERATIONAL");
    console.log("⏱️ Total Test Time:", totalTime + "ms");
    console.log("🔋 API Status: HEALTHY");
    console.log("🤖 Model Status: RESPONSIVE");
    console.log("📊 JSON Generation: WORKING");
    console.log("🛋️ Furniture Parsing: FUNCTIONAL");
    console.log("=".repeat(60));
    
    return {
        status: 'SUCCESS',
        message: 'Gemini API is fully operational',
        totalTime: totalTime + 'ms',
        tests: {
            apiKey: 'PASSED',
            modelInit: 'PASSED',
            connectivity: 'PASSED',
            jsonGeneration: 'PASSED',
            furnitureQuery: 'PASSED'
        }
    };
}

/**
 * Quick health check endpoint for your server
 */
export async function quickGeminiCheck() {
    console.log("🔍 Quick Gemini Check...");
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Respond with 'OK' if you're working");
        const response = await result.response;
        const text = response.text();
        
        console.log("✅ Gemini Status: ONLINE");
        console.log("📄 Response:", text.trim());
        return true;
        
    } catch (error) {
        console.log("❌ Gemini Status: OFFLINE");
        console.log("🚨 Error:", error.message);
        return false;
    }
}
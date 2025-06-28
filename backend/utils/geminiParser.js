import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with your API key from the .env file
const genAI = new GoogleGenerativeAI("AIzaSyD92NOj8lhNkPLIl58Aa2seqKd25CafQ3A");

/**
 * Uses Gemini to parse a raw user query into a structured command.
 * @param {string} userInput The raw text from the user.
 * @returns {Promise<object>} A structured object for searching.
 */
export async function parseQueryWithGemini(userInput) {
    console.log("=== INTELLIGENT FURNITURE ASSISTANT STARTED ===");
    console.log("📝 Customer Input:", userInput);
    console.log("🔤 Input Type:", typeof userInput);
    console.log("📏 Input Length:", userInput?.length || 0);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        You are an intelligent furniture shopping assistant for "Wawa Furniture," a Filipino e-commerce store. Your job is to understand what customers REALLY need based on their context, lifestyle, and furniture relationships. Think like a knowledgeable salesperson who understands furniture pairing, room design, and customer intent.

        ### Your Core Understanding:
        
        **Furniture Relationships & Pairing Logic:**
        - Office table → needs office chairs, desk lamps, file cabinets
        - Dining table → needs dining chairs, buffet/sideboard
        - Coffee table → needs sofas, armchairs, side tables
        - Bed → needs bedside tables, wardrobes, dressers
        - Sofa → needs coffee tables, side tables, TV stands
        - Study desk → needs office chairs, bookshelves, desk organizers

        **Context Understanding:**
        - "pair for my table" = chairs (office/dining based on context)
        - "complete my living room" = missing furniture pieces for living room
        - "match my bedroom" = complementary bedroom furniture
        - "goes with my sofa" = coffee tables, side tables, cushions
        - "storage for my room" = wardrobes, cabinets, shelves
        - "comfortable seating" = chairs, sofas, armchairs

        **Lifestyle & Space Understanding:**
        - Small space = compact, multi-functional furniture
        - Family home = durable, kid-friendly options
        - Office space = professional, ergonomic furniture
        - Modern home = contemporary, minimalist designs
        - Traditional home = classic, wooden furniture

        ### Output JSON Schema:
        Respond with ONLY this JSON structure. Include ONLY the fields that are relevant to the query:
        \`\`\`json
        {
          "semanticQuery": "what the customer actually needs (inferred from context)",
          "customerIntent": "brief explanation of what you understood",
          "recommendationType": "pairing|completion|replacement|upgrade",
          "targetRoom": "living room|bedroom|office|dining room|kitchen|bathroom",
          "limit": number,
          "sortBy": "price|sales|createdAt",
          "sortOrder": "asc|desc", 
          "filters": {
            "maxPrice": number,
            "minPrice": number,
            "maxLength": number,
            "maxWidth": number, 
            "maxHeight": number,
            "materials": ["material1", "material2"],
            "styles": ["style1", "style2"],
            "is_bestseller": boolean,
            "is_customizable": boolean,
            "isPackage": boolean
          }
        }
        \`\`\`

        ### Smart Examples:

        **Input:** "looking for a pair for my newly bought office table"
        **Output:**
        \`\`\`json
        {
          "semanticQuery": "office chairs",
          "customerIntent": "Customer needs chairs to pair with their new office table",
          "recommendationType": "pairing",
          "targetRoom": "office"
        }
        \`\`\`

        **Input:** "something to complete my modern living room setup"
        **Output:**
        \`\`\`json
        {
          "semanticQuery": "modern living room furniture coffee tables side tables TV stands",
          "customerIntent": "Customer wants to complete their modern living room with additional furniture pieces",
          "recommendationType": "completion", 
          "targetRoom": "living room",
          "filters": {
            "styles": ["modern"]
          }
        }
        \`\`\`

        **Input:** "cheap storage for small bedroom"
        **Output:**
        \`\`\`json
        {
          "semanticQuery": "compact wardrobes small cabinets bedroom storage",
          "customerIntent": "Customer needs affordable storage solutions for a small bedroom",
          "recommendationType": "replacement",
          "targetRoom": "bedroom",
          "filters": {
            "maxPrice": 15000
          }
        }
        \`\`\`

        **Input:** "show me 3 bestseller dining chairs under 25000"
        **Output:**
        \`\`\`json
        {
          "semanticQuery": "dining chairs",
          "customerIntent": "Customer wants popular dining chairs within budget",
          "recommendationType": "replacement",
          "targetRoom": "dining room",
          "limit": 3,
          "filters": {
            "is_bestseller": true,
            "maxPrice": 25000
          }
        }
        \`\`\`

        ### Important Rules:
        1. **Infer the REAL need** - don't just parse words literally
        2. **Understand furniture relationships** - what naturally goes together
        3. **Consider Filipino context** - space constraints, budget consciousness
        4. **Think about room completion** - what's missing to make a room functional
        5. **Price context**: "cheap/mura" = under 15000, "affordable" = under 25000, "premium/mahal" = over 50000
        6. **Size context**: "small space" = compact furniture, "family size" = larger furniture

        ### Your Mission:
        Understand the customer like a helpful furniture expert would. What do they REALLY need to solve their furniture problem or complete their space?

        **Customer Query:** "${userInput}"
    `;

    console.log("🚀 Sending request to Intelligent Furniture Assistant...");
    console.log("📋 Prompt length:", prompt.length);

    try {
        const startTime = Date.now();
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const endTime = Date.now();
        console.log("⏱️ Assistant response time:", (endTime - startTime) + "ms");
        
        console.log("=== RAW ASSISTANT RESPONSE ===");
        console.log("📄 Raw Response Text:");
        console.log(text);
        console.log("📏 Response Length:", text.length);
        
        // Clean the response
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        console.log("=== CLEANED JSON STRING ===");
        console.log("🧹 Cleaned JSON String:");
        console.log(jsonString);
        console.log("📏 Cleaned Length:", jsonString.length);
        
        // Parse the JSON
        const parsedResult = JSON.parse(jsonString);
        
        console.log("=== ASSISTANT UNDERSTANDING ===");
        console.log("✅ Successfully parsed JSON:");
        console.log(JSON.stringify(parsedResult, null, 2));
        
        // Enhanced analysis for assistant understanding
        console.log("=== INTELLIGENT ANALYSIS ===");
        console.log("🔍 What Customer Really Needs:", parsedResult.semanticQuery);
        console.log("🧠 Assistant's Understanding:", parsedResult.customerIntent || "Basic query processing");
        console.log("🎯 Recommendation Type:", parsedResult.recommendationType || "general search");
        console.log("🏠 Target Room:", parsedResult.targetRoom || "not specified");
        console.log("📊 Limit:", parsedResult.limit || "default (12)");
        console.log("🔄 Sort By:", parsedResult.sortBy || "relevance");
        console.log("📈 Sort Order:", parsedResult.sortOrder || "default");
        console.log("🎛️ Filters:", parsedResult.filters ? Object.keys(parsedResult.filters).length + " filters applied" : "no specific filters");
        
        if (parsedResult.filters && Object.keys(parsedResult.filters).length > 0) {
            console.log("📋 Filter Details:");
            Object.entries(parsedResult.filters).forEach(([key, value]) => {
                console.log(`   • ${key}: ${JSON.stringify(value)}`);
            });
        }
        
        console.log("=== INTELLIGENT FURNITURE ASSISTANT COMPLETED SUCCESSFULLY ===");
        return parsedResult;
        
    } catch (error) {
        console.log("=== ASSISTANT ERROR ===");
        console.error("❌ Error type:", error.name);
        console.error("❌ Error message:", error.message);
        console.error("❌ Full error:", error);
        
        if (error instanceof SyntaxError) {
            console.error("🔧 JSON Parse Error - Invalid JSON returned by Assistant");
            console.error("📄 Attempted to parse:", error.message);
        } else if (error.code) {
            console.error("🌐 API Error Code:", error.code);
        }
        
        console.log("=== FALLBACK RESPONSE ===");
        const fallbackResult = { 
            semanticQuery: userInput, 
            customerIntent: "Unable to fully understand request, using literal search",
            recommendationType: "general",
            filters: {}, 
            limit: 12 
        };
        
        console.log("🔄 Using fallback result:");
        console.log(JSON.stringify(fallbackResult, null, 2));
        console.log("=== INTELLIGENT ASSISTANT COMPLETED WITH FALLBACK ===");
        
        return fallbackResult;
    }
}
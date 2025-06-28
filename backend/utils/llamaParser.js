import axios from 'axios';

// --- WARNING: Hardcoding a secret token is a major security risk. ---
// This should only be done for temporary local testing.
// The recommended practice is to use process.env.HUGGINGFACE_TOKEN
const HUGGINGFACE_API_KEY = "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"; // <-- PASTE YOUR TOKEN HERE

const API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";
const headers = { "Authorization": `Bearer ${HUGGINGFACE_API_KEY}` };

/**
 * Uses Llama 3 via the Hugging Face API to parse a raw user query with deep understanding.
 * @param {string} userInput The raw text from the user.
 * @returns {Promise<object>} A structured object for searching.
 */
export async function parseQueryWithLlama(userInput) {
    // This is the full, detailed system prompt that instructs the AI on its exact role and rules.
    const systemPrompt = `You are an intelligent furniture shopping assistant for "Wawa Furniture," a Filipino e-commerce store. Your job is to understand what customers REALLY need based on their context, lifestyle, and furniture relationships. Think like a knowledgeable salesperson who understands furniture pairing, room design, and customer intent.

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
  "limit": "number",
  "sortBy": "price|sales|createdAt",
  "sortOrder": "asc|desc", 
  "filters": {
    "maxPrice": "number",
    "minPrice": "number",
    "maxLength": "number",
    "maxWidth": "number", 
    "maxHeight": "number",
    "materials": ["material1", "material2"],
    "styles": ["style1", "style2"],
    "is_bestseller": "boolean",
    "is_customizable": "boolean",
    "isPackage": "boolean"
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

### Important Rules:
1. **Infer the REAL need** - don't just parse words literally.
2. **Understand furniture relationships** - what naturally goes together.
3. **Consider Filipino context** - space constraints, budget consciousness.
4. **Price context**: "cheap/mura" = under 15000, "affordable" = under 25000, "premium/mahal" = over 50000.

### Your Mission:
Understand the customer like a helpful furniture expert. What do they REALLY need? Respond ONLY with the valid JSON object.
`;

    // This formats the complete prompt with Llama 3's required special tokens.
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userInput}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n`;

    try {
        console.log("🚀 Sending request to Llama 3 Intelligent Assistant...");
        const startTime = Date.now();

        const response = await axios.post(API_URL, {
            inputs: prompt,
            parameters: {
                max_new_tokens: 512,      // Increased token limit for potentially larger JSON
                temperature: 0.2,         // Still low to keep it deterministic but allowing a bit of flex
                return_full_text: false
            }
        }, { headers });
        
        const endTime = Date.now();
        console.log(`⏱️ Llama 3 response time: ${(endTime - startTime)}ms`);
        
        const jsonString = response.data[0].generated_text.trim();
        
        // Robustly find and extract the JSON object
        const firstBracket = jsonString.indexOf('{');
        const lastBracket = jsonString.lastIndexOf('}');
        if (firstBracket === -1 || lastBracket === -1) {
            throw new Error("No valid JSON object found in the Llama 3 response.");
        }
        const cleanJsonString = jsonString.substring(firstBracket, lastBracket + 1);
        const parsedResult = JSON.parse(cleanJsonString);

        console.log("--- LLAMA 3 ASSISTANT UNDERSTANDING (Parsed JSON) ---");
        console.log(JSON.stringify(parsedResult, null, 2));
        
        console.log("=== INTELLIGENT LLAMA 3 ASSISTANT COMPLETED SUCCESSFULLY ===");
        return parsedResult;

    } catch (error) {
        console.log("=== LLAMA 3 ASSISTANT ERROR ===");
        console.error("❌ Error details:", error.response ? error.response.data : error.message);
        
        console.log("--- FALLBACK RESPONSE ---");
        const fallbackResult = { 
            semanticQuery: userInput, 
            customerIntent: "Unable to fully understand request, using literal search",
            recommendationType: "general",
            filters: {}, 
            limit: 12 
        };
        
        console.log("🔄 Using fallback result:", fallbackResult);
        return fallbackResult;
    }
}

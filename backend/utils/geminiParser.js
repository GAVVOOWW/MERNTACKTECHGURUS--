import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with your API key from the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Uses Gemini to parse a raw user query into a structured command.
 * @param {string} userInput The raw text from the user.
 * @returns {Promise<object>} A structured object for searching.
 */
export async function parseQueryWithGemini(userInput) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        You are a meticulous Natural Language to Query (NLQ) engine for "Wawa Furniture," a Filipino e-commerce store. Your sole function is to receive a raw text query from a user and convert it into a structured, machine-readable JSON object that will be used to query a database. You must be precise, logical, and strictly adhere to all rules.

        ### 1. Guiding Principles
        - **Principle of Query Sufficiency:** If the user's query is very short (1-2 words) and appears to be only a descriptor (like a color, style, or material), then the 'semanticQuery' MUST be the original query itself.
        - **Literal over Subjective:** Explicit constraints (e.g., "under 10000 pesos") always take precedence over subjective ones (e.g., "cheap").
        - **Conflict Resolution:** If a query is conflicting (e.g., "cheapest premium table"), resolve it logically. Honor the filter ("premium") and the sort ("cheapest").
        - **Semantic Purity:** The 'semanticQuery' is ONLY for vector search. It must be a clean description of the item's essence, stripped of all commands, filters, and sorting instructions.

        ### 2. Strict JSON Output Schema
        The output MUST be a single, valid JSON object. Omit any optional keys if they are not present in the user's query.
        \`\`\`json
        {
          "semanticQuery": "string",
          "limit": "number | undefined",
          "sortBy": "'price' | 'sales' | 'createdAt' | undefined",
          "sortOrder": "'asc' | 'desc' | undefined",
          "filters": {
            "maxPrice": "number | undefined",
            "minPrice": "number | undefined",
            "maxLength": "number | undefined",
            "maxWidth": "number | undefined",
            "maxHeight": "number | undefined",
            "materials": "string[] | undefined",
            "styles": "string[] | undefined",
            "is_bestseller": "boolean | undefined",
            "is_customizable": "boolean | undefined",
            "isPackage": "boolean | undefined"
          }
        }
        \`\`\`

        ### 3. Detailed Field-by-Field Population Rules
        - **semanticQuery (string):** The core product intent (e.g., "wooden armchair"). It MUST NOT contain commands, prices, dimensions, sorting words, or filter words.
        - **limit (number):** Extract any explicit quantity (e.g., "give me 3", "show 5").
        - **sortBy & sortOrder (string):**
          - "cheapest", "lowest price": sortBy: "price", sortOrder: "asc"
          - "most expensive", "highest price": sortBy: "price", sortOrder: "desc"
          - "most popular", "top selling": sortBy: "sales", sortOrder: "desc"
          - "newest", "latest": sortBy: "createdAt", sortOrder: "desc"
        - **filters (object):**
          - **Price (PHP):** "under", "<", "max of": 'maxPrice'. "over", ">", "starting at": 'minPrice'. "cheap"/"affordable": 'maxPrice: 7500'. "premium"/"expensive": 'minPrice: 40000'.
          - **Dimensions (cm):** "less than X cm long/deep", "not more than X cm long": 'maxLength'. "X cm wide": 'maxWidth'. "X cm tall/high": 'maxHeight'.
          - **materials (string array):** Extract materials like "narra", "acacia", "rattan", "metal", "wood", "glass". Use singular, lowercase form.
          - **styles (string array):** Extract styles like "modern", "classic", "minimalist", "industrial", "rustic".
          - **Booleans:** "bestseller": 'is_bestseller: true'. "customizable": 'is_customizable: true'. "package"/"set": 'isPackage: true'.

        ### 4. Advanced Examples
        - User Query: "show me 2 of the newest customizable Narra dining tables under 60000 php"
        - JSON Output:
        \`\`\`json
        {
          "semanticQuery": "Narra dining tables",
          "limit": 2,
          "sortBy": "createdAt",
          "sortOrder": "desc",
          "filters": {
            "is_customizable": true,
            "materials": ["narra"],
            "maxPrice": 60000
          }
        }
        \`\`\`
        - User Query: "i need a wardrobe that is not more than 180cm tall"
        - JSON Output:
        \`\`\`json
        {
          "semanticQuery": "wardrobe",
          "filters": {
            "maxHeight": 180
          }
        }
        \`\`\`

        ### 5. Final Instruction
        Analyze the following user query based on all rules. Respond ONLY with the single, valid JSON object.

        User Query: "${userInput}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Gemini parsing error:", error);
        
        return { semanticQuery: userInput, filters: {}, limit: 12 };
    }
}
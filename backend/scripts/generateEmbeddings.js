import { pipeline } from '@xenova/transformers';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Make sure the paths to your models and DB config are correct
import Item from '../models/item.model.js';
import Category from '../models/category.model.js';
import FurnitureType from '../models/furnitureType.model.js';
import { connectDB } from '../config/db.js';

dotenv.config({ path: './.env' });

/**
 * THIS IS THE UPDATED FUNCTION.
 * It creates a rich, descriptive text block from your new ItemSchema.
 */
const generateSearchableText = (item) => {
    console.log("--- Inside generateSearchableText ---");
    console.log("Processing item:", item.name);

    // Get names from populated fields
    const categoryNames = item.category.map(cat => cat.name).join(', ');
    console.log("Category names:", categoryNames);

    const furnitureTypeName = item.furnituretype ? item.furnituretype.name : '';
    console.log("Furniture type name:", furnitureTypeName);

    // ** NEW **: Extract material names from the customization options
    const materialNames = item.customization_options.materials.map(mat => mat.name).join(', ');
    console.log("Material names:", materialNames);

    let textBlock = `
        Name: ${item.name}.
        Type: ${furnitureTypeName}.
        Description: ${item.description}.
        Categories: ${categoryNames}.
    `;

    // ** NEW **: Add material info if available
    if (materialNames) {
        textBlock += ` Available materials include: ${materialNames}.`;
        console.log("Added material info to text block.");
    }

    // Add boolean flags for more context
    if (item.is_bestseller) {
        textBlock += ' This is a bestselling item.';
        console.log("Added bestseller flag to text block.");
    }
    if (item.isPackage) {
        textBlock += ' This is a package deal.';
        console.log("Added package deal flag to text block.");
    }
    if (item.is_customizable) {
        textBlock += ' This item is customizable.';
        console.log("Added customizable flag to text block.");
    }

    // Clean up whitespace and return
    const cleanedTextBlock = textBlock.replace(/\s+/g, ' ').trim();
    console.log("Final generated text block:", cleanedTextBlock);
    console.log("--- Exiting generateSearchableText ---");
    return cleanedTextBlock;
};

const generateEmbeddings = async () => {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected.");

    console.log("Loading the sentence-embeddings model (Xenova/bge-large-en-v1.5)...");
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5');
    console.log("Model loaded successfully.");

    console.log("Fetching all items from the database...");
    // We need to populate all the referenced fields to get their names
    const items = await Item.find({})
        .populate('category', 'name')
        .populate('furnituretype', 'name');

    console.log(`Found ${items.length} items to process.`);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n--- Processing item ${i + 1}/${items.length} ---`);
        console.log("Item ID:", item._id);

        if (item.embedding && item.embedding.length > 0) {
            console.log(`(${i + 1}/${items.length}) Skipping '${item.name}' (already has an embedding).`);
            continue;
        }

        const textToEmbed = generateSearchableText(item);
        console.log(`(${i + 1}/${items.length}) Generating embedding for '${item.name}'...`);
        // console.log(`   -> Text: "${textToEmbed}"`); // Uncomment for debugging

        const output = await extractor(textToEmbed, {
            pooling: 'mean',
            normalize: true,
        });
        console.log("   -> Embedding generation output received.");

        const embedding = Array.from(output.data);
        console.log(`   -> Embedding created with length: ${embedding.length}`);

        console.log(`   -> Saving embedding to database for item '${item.name}'...`);
        await Item.findByIdAndUpdate(item._id, { $set: { embedding: embedding } });
        console.log(`   -> Successfully generated and saved embedding.`);
    }

    console.log("\nEmbedding generation complete for all items!");
    console.log("Disconnecting from database...");
    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
};

generateEmbeddings().catch(err => {
    console.error("A critical error occurred:", err);
    process.exit(1);
});
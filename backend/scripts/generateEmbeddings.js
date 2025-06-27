import { pipeline } from '@xenova/transformers';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Make sure the paths to your models and DB config are correct
import Item from '../models/item.model.js';
import Category from '../models/category.model.js';
import FurnitureType from '../models/furnitureType.model.js';
import { connectDB } from '../config/db.js';

dotenv.config({ path: './.env' });

const generateSearchableText = (item) => {
    const categoryNames = item.category.map(cat => cat.name).join(', ');
    const furnitureTypeName = item.furnituretype ? item.furnituretype.name : '';
    const materialNames = (item.customization_options?.materials || []).map(mat => mat.name).join(', ');

    let textBlock = `Name: ${item.name}. Type: ${furnitureTypeName}. Description: ${item.description}. Categories: ${categoryNames}.`;
    if (materialNames) {
        textBlock += ` Available materials include: ${materialNames}.`;
    }
    if (item.is_bestseller) textBlock += ' This is a bestselling item.';
    if (item.isPackage) textBlock += ' This is a package deal.';
    if (item.is_customizable) textBlock += ' This item is customizable.';

    return textBlock.replace(/\s+/g, ' ').trim();
};

const generateEmbeddings = async () => {
    console.log("Connecting to the database...");
    await connectDB();
    console.log("Database connected.");

    console.log("Loading the SMALL model (Xenova/bge-small-en-v1.5)...");
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
    console.log("Model loaded successfully.");

    console.log("Fetching all items from the database...");
    const items = await Item.find({})
        .populate('category', 'name')
        .populate('furnituretype', 'name');
    
    console.log(`Found ${items.length} items to process. Forcing re-generation...`);

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // --- THIS IS THE FIX ---
        // The safety check that was skipping items has been REMOVED.
        // The script will now process every single item, regardless of
        // whether it already has an embedding.
        
        const textToEmbed = generateSearchableText(item);
        console.log(`(${i + 1}/${items.length}) Generating new (384-dim) embedding for '${item.name}'...`);

        const output = await extractor(textToEmbed, {
            pooling: 'mean',
            normalize: true,
        });
        
        const embedding = Array.from(output.data);

        // Overwrite the old embedding with the new one
        await Item.findByIdAndUpdate(item._id, { $set: { embedding: embedding } });
    }

    console.log("✅ Embedding re-generation complete for all items!");
    await mongoose.disconnect();
    process.exit(0);
};

generateEmbeddings().catch(err => {
    console.error("❌ A critical error occurred:", err);
    process.exit(1);
});
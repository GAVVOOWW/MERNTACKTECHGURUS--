import mongoose from "mongoose";

const FurnitureTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true });

const FurnitureType = mongoose.model("FurnitureType", FurnitureTypeSchema);

export default FurnitureType; 
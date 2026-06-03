"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const PricingConfig_1 = require("../models/PricingConfig");
const DEFAULT_CONFIG = {
    goldRatios: [
        { key: '10K', standard: 0.417, applied: 0.47, label: 'Vàng 10K' },
        { key: '14K', standard: 0.583, applied: 0.64, label: 'Vàng 14K' },
        { key: '18K', standard: 0.750, applied: 0.80, label: 'Vàng 18K' },
        { key: '610', standard: 0.610, applied: 0.66, label: 'Vàng 610' },
        { key: '24K', standard: 0.9999, applied: 1.05, label: 'Vàng 24K' },
    ],
    profitMargins: [
        { maxCost: 10_000_000, divisor: 0.65, margin: '35%' },
        { maxCost: 50_000_000, divisor: 0.70, margin: '30%' },
        { maxCost: 999_999_999_999, divisor: 0.75, margin: '25%' },
    ],
    silverMultiplier: 3,
    goldPrice24K: 9_000_000,
};
const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Jewelry-Pricing-Tool';
    try {
        await mongoose_1.default.connect(uri);
        console.log('✅ Connected to MongoDB:', uri);
        // Seed default PricingConfig if none exist
        const count = await PricingConfig_1.PricingConfig.countDocuments();
        if (count === 0) {
            await PricingConfig_1.PricingConfig.create(DEFAULT_CONFIG);
            console.log('  ✅ Default PricingConfig seeded');
        }
        else {
            const config = await PricingConfig_1.PricingConfig.findOne();
            if (config && config.goldPrice24K === undefined) {
                config.goldPrice24K = 9_000_000;
                await config.save();
                console.log('  ✅ Updated PricingConfig with default goldPrice24K');
            }
        }
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;

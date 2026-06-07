"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Quote_1 = require("./models/Quote");
async function run() {
    await mongoose_1.default.connect('mongodb://localhost:27017/Jewelry-Pricing-Tool');
    console.log('Connected to DB');
    const q43 = await Quote_1.Quote.findOne({ quoteCode: 'QT-2026-0043' }).lean();
    console.log('QT-2026-0043:', JSON.stringify(q43, null, 2));
    await mongoose_1.default.disconnect();
}
run().catch(console.error);

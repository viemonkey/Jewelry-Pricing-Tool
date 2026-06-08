"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quote = exports.MaterialType = exports.ProductType = exports.QuoteStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["PENDING"] = "PENDING";
    QuoteStatus["NEED_MORE_INFO"] = "NEED_MORE_INFO";
    QuoteStatus["QUOTING"] = "QUOTING";
    QuoteStatus["QUOTED"] = "QUOTED";
    QuoteStatus["SENT_TO_CUSTOMER"] = "SENT_TO_CUSTOMER";
    QuoteStatus["CONFIRMED"] = "CONFIRMED";
    QuoteStatus["CANCELLED"] = "CANCELLED";
})(QuoteStatus || (exports.QuoteStatus = QuoteStatus = {}));
var ProductType;
(function (ProductType) {
    ProductType["RING"] = "RING";
    ProductType["NECKLACE"] = "NECKLACE";
    ProductType["BRACELET"] = "BRACELET";
    ProductType["ANKLET"] = "ANKLET";
})(ProductType || (exports.ProductType = ProductType = {}));
var MaterialType;
(function (MaterialType) {
    MaterialType["GOLD_24K"] = "GOLD_24K";
    MaterialType["GOLD_18K"] = "GOLD_18K";
    MaterialType["GOLD_14K"] = "GOLD_14K";
    MaterialType["GOLD_10K"] = "GOLD_10K";
    MaterialType["GOLD_610"] = "GOLD_610";
    MaterialType["SILVER"] = "SILVER";
})(MaterialType || (exports.MaterialType = MaterialType = {}));
const QuoteOptionSchema = new mongoose_1.Schema({
    materialType: { type: String, enum: Object.values(MaterialType), required: true },
    weightChi: { type: Number },
    weightGram: { type: Number },
    laborCost: { type: Number, default: 0 },
    goldPrice24K: { type: Number, default: null },
    materialCost: { type: Number },
    stoneCost: { type: Number },
    costBeforeVAT: { type: Number },
    costWithVAT: { type: Number },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    isCancelled: { type: Boolean, default: false },
    isConfirmed: { type: Boolean, default: false },
    budget: { type: String, default: '' },
}, { _id: false });
const QuoteSchema = new mongoose_1.Schema({
    quoteCode: { type: String },
    productName: { type: String, required: true },
    productDescription: { type: String },
    productType: { type: String, enum: Object.values(ProductType), default: null },
    dimensions: { type: String },
    stoneRequirements: { type: String },
    quantity: { type: Number, default: 1 },
    deadline: { type: String },
    materialType: { type: String, required: true, enum: Object.values(MaterialType) },
    weightChi: { type: Number },
    weightGram: { type: Number },
    laborCost: { type: Number, default: 0 },
    goldPrice24K: { type: Number, default: null },
    goldPriceEffectiveDate: { type: Date, default: null },
    materialCost: { type: Number },
    stoneCost: { type: Number },
    costBeforeVAT: { type: Number },
    costWithVAT: { type: Number },
    stones: { type: [Object], default: [] },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    confirmedPrice: { type: Number },
    notes: { type: String },
    rejectReason: { type: String },
    images: { type: [String], default: [] },
    status: { type: String, enum: Object.values(QuoteStatus), default: QuoteStatus.PENDING },
    requestedBy: { type: String, required: true },
    quotedBy: { type: String },
    options: { type: [QuoteOptionSchema], default: [] },
}, { timestamps: true });
QuoteSchema.index({ status: 1, createdAt: -1 });
QuoteSchema.index({ requestedBy: 1, status: 1 });
exports.Quote = mongoose_1.default.model('Quote', QuoteSchema);

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
exports.StonePrice = exports.StoneType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var StoneType;
(function (StoneType) {
    StoneType["LAB_DIAMOND"] = "LAB_DIAMOND";
    StoneType["NATURAL_DIAMOND"] = "NATURAL_DIAMOND";
    StoneType["COLORED_STONE"] = "COLORED_STONE";
    StoneType["CZ"] = "CZ";
    StoneType["MOISSANITE"] = "MOISSANITE";
})(StoneType || (exports.StoneType = StoneType = {}));
const StonePriceSchema = new mongoose_1.Schema({
    stoneType: { type: String, required: true, enum: Object.values(StoneType) },
    labelVi: { type: String, required: true },
    spec: {
        type: {
            size: { type: String },
            color: { type: String },
            clarity: { type: String },
            cut: { type: String },
        },
        default: {},
        _id: false,
    },
    pricePerUnit: { type: Number, required: true },
    unit: { type: String, default: 'viên' },
    effectiveDate: { type: Date, required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'stone_prices' });
StonePriceSchema.index({ stoneType: 1, effectiveDate: -1 });
exports.StonePrice = mongoose_1.default.model('StonePrice', StonePriceSchema);

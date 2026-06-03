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
exports.Production = exports.ProductionStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ProductionStatus;
(function (ProductionStatus) {
    ProductionStatus["PENDING_PRODUCTION"] = "PENDING_PRODUCTION";
    ProductionStatus["CASTING"] = "CASTING";
    ProductionStatus["SETTING_STONES"] = "SETTING_STONES";
    ProductionStatus["POLISHING"] = "POLISHING";
    ProductionStatus["QUALITY_CHECK"] = "QUALITY_CHECK";
    ProductionStatus["COMPLETED"] = "COMPLETED";
})(ProductionStatus || (exports.ProductionStatus = ProductionStatus = {}));
const ProductionSchema = new mongoose_1.Schema({
    orderCode: { type: String },
    quote: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Quote', required: true },
    deadline: { type: String, required: true },
    assignedTo: { type: String },
    progressStatus: {
        type: String,
        enum: Object.values(ProductionStatus),
        default: ProductionStatus.PENDING_PRODUCTION,
    },
    progressNotes: { type: String },
    completedImages: { type: [String], default: [] },
}, { timestamps: true });
exports.Production = mongoose_1.default.model('Production', ProductionSchema);

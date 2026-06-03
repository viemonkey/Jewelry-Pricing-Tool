"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigService = exports.PricingConfigService = void 0;
const PricingConfig_1 = require("../models/PricingConfig");
class PricingConfigService {
    async get() {
        return PricingConfig_1.PricingConfig.findOne().lean();
    }
    async update(data) {
        return PricingConfig_1.PricingConfig.findOneAndUpdate({}, data, { new: true, upsert: true }).lean();
    }
}
exports.PricingConfigService = PricingConfigService;
exports.pricingConfigService = new PricingConfigService();

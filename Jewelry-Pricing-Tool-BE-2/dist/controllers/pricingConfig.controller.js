"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigController = exports.PricingConfigController = void 0;
const pricingConfig_service_1 = require("../services/pricingConfig.service");
class PricingConfigController {
    async get(req, res, next) {
        try {
            const config = await pricingConfig_service_1.pricingConfigService.get();
            res.json(config);
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const config = await pricingConfig_service_1.pricingConfigService.update(req.body);
            res.json(config);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PricingConfigController = PricingConfigController;
exports.pricingConfigController = new PricingConfigController();

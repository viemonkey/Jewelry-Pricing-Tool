"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingConfigController = exports.PricingConfigController = void 0;
const pricingConfig_service_1 = require("../services/pricingConfig.service");
const auth_service_1 = require("../services/auth.service");
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
            console.log('[DEBUG] Cookies received:', req.headers.cookie);
            const user = await auth_service_1.authService.getCurrentUser(req);
            console.log('[DEBUG] Parsed user:', user);
            // Cho phép cập nhật ở local ngay cả khi cookie bị trình duyệt chặn (user = null)
            const userId = user ? user.id : undefined;
            const config = await pricingConfig_service_1.pricingConfigService.update(req.body, userId);
            res.json(config);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PricingConfigController = PricingConfigController;
exports.pricingConfigController = new PricingConfigController();

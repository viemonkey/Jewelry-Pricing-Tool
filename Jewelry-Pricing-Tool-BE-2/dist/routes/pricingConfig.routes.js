"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pricingConfig_controller_1 = require("../controllers/pricingConfig.controller");
const router = (0, express_1.Router)();
router.get('/', pricingConfig_controller_1.pricingConfigController.get);
router.put('/', pricingConfig_controller_1.pricingConfigController.update);
exports.default = router;

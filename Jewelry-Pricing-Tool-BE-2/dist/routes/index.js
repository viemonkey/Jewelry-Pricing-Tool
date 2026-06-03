"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotes_routes_1 = __importDefault(require("./quotes.routes"));
const production_routes_1 = __importDefault(require("./production.routes"));
const pricingConfig_routes_1 = __importDefault(require("./pricingConfig.routes"));
const notifications_routes_1 = __importDefault(require("./notifications.routes"));
const router = (0, express_1.Router)();
router.use('/quotes', quotes_routes_1.default);
router.use('/production', production_routes_1.default);
router.use('/pricing-config', pricingConfig_routes_1.default);
router.use('/notifications', notifications_routes_1.default);
exports.default = router;

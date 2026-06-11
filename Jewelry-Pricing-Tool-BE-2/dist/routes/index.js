"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotes_routes_1 = __importDefault(require("./quotes.routes"));
const pricingConfig_routes_1 = __importDefault(require("./pricingConfig.routes"));
const notifications_routes_1 = __importDefault(require("./notifications.routes"));
const auth_routes_1 = __importDefault(require("./auth.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/quotes', quotes_routes_1.default);
router.use('/pricing-config', pricingConfig_routes_1.default);
router.use('/notifications', notifications_routes_1.default);
exports.default = router;

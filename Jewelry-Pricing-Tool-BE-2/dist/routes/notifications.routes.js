"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("../controllers/notifications.controller");
const router = (0, express_1.Router)();
router.get('/stream', notifications_controller_1.notificationsController.stream);
exports.default = router;

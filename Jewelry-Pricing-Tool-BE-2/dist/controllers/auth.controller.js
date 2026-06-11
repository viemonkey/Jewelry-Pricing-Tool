"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
const sessionToken_1 = require("../utils/sessionToken");
class AuthController {
    register = async (req, res, next) => {
        try {
            const user = await auth_service_1.authService.register(req.body);
            res.status(201).json({ user });
        }
        catch (err) {
            next(err);
        }
    };
    login = async (req, res, next) => {
        try {
            const result = await auth_service_1.authService.login(req.body, req);
            (0, sessionToken_1.setSessionCookie)(res, result.token, result.expiresAt);
            res.json({ user: result.user });
        }
        catch (err) {
            next(err);
        }
    };
    me = async (req, res, next) => {
        try {
            const user = await auth_service_1.authService.getCurrentUser(req);
            if (!user)
                return res.status(401).json({ message: 'Chưa đăng nhập.' });
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    };
    logout = async (req, res, next) => {
        try {
            await auth_service_1.authService.logout(req);
            (0, sessionToken_1.clearSessionCookie)(res);
            res.json({ ok: true });
        }
        catch (err) {
            next(err);
        }
    };
}
exports.authController = new AuthController();

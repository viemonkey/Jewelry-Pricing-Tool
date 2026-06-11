"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const User_1 = require("../models/User");
const UserSession_1 = require("../models/UserSession");
const password_1 = require("../utils/password");
const sessionToken_1 = require("../utils/sessionToken");
const SESSION_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
function createHttpError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}
function normalizeUsername(value) {
    return value.trim().toLowerCase();
}
function toPublicUser(user) {
    return {
        id: String(user._id),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
    };
}
class AuthService {
    async register(input) {
        const fullName = input.fullName?.trim();
        const username = normalizeUsername(input.username || '');
        const password = input.password || '';
        if (!fullName)
            throw createHttpError(400, 'Vui lòng nhập họ tên.');
        if (!username || username.length < 3)
            throw createHttpError(400, 'Tên đăng nhập cần ít nhất 3 ký tự.');
        if (password.length < 6)
            throw createHttpError(400, 'Mật khẩu cần ít nhất 6 ký tự.');
        const existed = await User_1.User.findOne({
            $or: [
                { username },
                ...(input.email ? [{ email: normalizeUsername(input.email) }] : []),
            ],
        });
        if (existed)
            throw createHttpError(409, 'Tên đăng nhập hoặc email đã tồn tại.');
        const user = await User_1.User.create({
            fullName,
            username,
            email: input.email ? normalizeUsername(input.email) : undefined,
            phone: input.phone?.trim() || undefined,
            passwordHash: await (0, password_1.hashPassword)(password),
            role: 'sale',
            status: 'active',
        });
        return toPublicUser(user);
    }
    async login(input, req) {
        const usernameOrEmail = normalizeUsername(input.usernameOrEmail || '');
        const password = input.password || '';
        if (!usernameOrEmail || !password)
            throw createHttpError(400, 'Vui lòng nhập tài khoản và mật khẩu.');
        const user = await User_1.User.findOne({
            $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        });
        if (!user)
            throw createHttpError(401, 'Tài khoản hoặc mật khẩu không đúng.');
        if (user.status !== 'active')
            throw createHttpError(403, 'Tài khoản chưa được kích hoạt hoặc đã bị khóa.');
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            throw createHttpError(423, 'Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau.');
        }
        const ok = await (0, password_1.verifyPassword)(password, user.passwordHash);
        if (!ok) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
            }
            await user.save();
            throw createHttpError(401, 'Tài khoản hoặc mật khẩu không đúng.');
        }
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        await user.save();
        const token = (0, sessionToken_1.createSessionToken)();
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
        await UserSession_1.UserSession.create({
            userId: user._id,
            tokenHash: (0, sessionToken_1.hashSessionToken)(token),
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            expiresAt,
            lastUsedAt: new Date(),
        });
        return { user: toPublicUser(user), token, expiresAt };
    }
    async getCurrentUser(req) {
        const token = (0, sessionToken_1.getCookie)(req, sessionToken_1.SESSION_COOKIE_NAME);
        if (!token)
            return null;
        const session = await UserSession_1.UserSession.findOne({
            tokenHash: (0, sessionToken_1.hashSessionToken)(token),
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });
        if (!session)
            return null;
        const user = await User_1.User.findById(session.userId);
        if (!user || user.status !== 'active')
            return null;
        session.lastUsedAt = new Date();
        await session.save();
        return toPublicUser(user);
    }
    async logout(req) {
        const token = (0, sessionToken_1.getCookie)(req, sessionToken_1.SESSION_COOKIE_NAME);
        if (!token)
            return;
        await UserSession_1.UserSession.updateOne({ tokenHash: (0, sessionToken_1.hashSessionToken)(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
    }
}
exports.authService = new AuthService();

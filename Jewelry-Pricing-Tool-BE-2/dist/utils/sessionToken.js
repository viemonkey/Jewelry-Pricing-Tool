"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIE_NAME = void 0;
exports.createSessionToken = createSessionToken;
exports.hashSessionToken = hashSessionToken;
exports.getCookie = getCookie;
exports.setSessionCookie = setSessionCookie;
exports.clearSessionCookie = clearSessionCookie;
const crypto_1 = require("crypto");
exports.SESSION_COOKIE_NAME = 'jq_session';
function createSessionToken() {
    return (0, crypto_1.randomBytes)(48).toString('base64url');
}
function hashSessionToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function getCookie(req, name) {
    const raw = req.headers.cookie;
    if (!raw)
        return null;
    const parts = raw.split(';').map((part) => part.trim());
    for (const part of parts) {
        const eqIndex = part.indexOf('=');
        if (eqIndex === -1)
            continue;
        const key = part.slice(0, eqIndex);
        const value = part.slice(eqIndex + 1);
        if (key === name)
            return decodeURIComponent(value);
    }
    return null;
}
function setSessionCookie(res, token, expiresAt) {
    const secure = process.env.COOKIE_SECURE === 'true';
    const sameSite = process.env.COOKIE_SAME_SITE || 'Lax';
    const parts = [
        `${exports.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        `SameSite=${sameSite}`,
        `Expires=${expiresAt.toUTCString()}`,
    ];
    if (secure)
        parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${exports.SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${process.env.COOKIE_SAME_SITE || 'Lax'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

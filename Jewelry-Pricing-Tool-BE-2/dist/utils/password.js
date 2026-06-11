"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = require("crypto");
const util_1 = require("util");
const scrypt = (0, util_1.promisify)(crypto_1.scrypt);
const KEY_LENGTH = 64;
async function hashPassword(password) {
    const salt = (0, crypto_1.randomBytes)(16).toString('hex');
    const key = (await scrypt(password, salt, KEY_LENGTH));
    return `scrypt:${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password, passwordHash) {
    const [algorithm, salt, storedKey] = passwordHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !storedKey)
        return false;
    const key = (await scrypt(password, salt, KEY_LENGTH));
    const stored = Buffer.from(storedKey, 'hex');
    if (key.length !== stored.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(key, stored);
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProduction = exports.uploadQuotes = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
// Ensure upload directories exist
const quotesUploadDir = (0, path_1.join)(process.cwd(), 'uploads', 'quotes');
const productionUploadDir = (0, path_1.join)(process.cwd(), 'uploads', 'production');
fs_1.default.mkdirSync(quotesUploadDir, { recursive: true });
fs_1.default.mkdirSync(productionUploadDir, { recursive: true });
const quotesStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, quotesUploadDir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
    },
});
const productionStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, productionUploadDir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}${(0, path_1.extname)(file.originalname)}`);
    },
});
exports.uploadQuotes = (0, multer_1.default)({ storage: quotesStorage }).array('images', 5);
exports.uploadProduction = (0, multer_1.default)({ storage: productionStorage }).array('completedImages', 8);

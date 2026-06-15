"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = require("path");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
// CORS configuration
const allowedOrigins = [
    process.env.FE_URL,
    'http://localhost:3001',
    'http://localhost:3000'
].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const cleanOrigin = origin.trim().replace(/\/$/, '');
        if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.includes('vercel.app')) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
}));
// Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files statically
app.use('/uploads', express_1.default.static((0, path_1.join)(process.cwd(), 'uploads')));
// Hello World endpoint
app.get('/', (req, res) => {
    res.send('Hello World!');
});
// Centralized Router
app.use('/', routes_1.default);
// Global Error Handler Middleware
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    if (statusCode === 500) {
        console.error('[Error Handler]', err);
    }
    res.status(statusCode).json({
        statusCode,
        message,
        error: err.name || 'Error',
    });
});
exports.default = app;

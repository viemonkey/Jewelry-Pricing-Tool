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
app.use((0, cors_1.default)({
    origin: process.env.FE_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

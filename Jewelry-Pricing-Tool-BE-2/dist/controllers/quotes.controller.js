"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesController = exports.QuotesController = void 0;
const quotes_service_1 = require("../services/quotes.service");
class QuotesController {
    async findAll(req, res, next) {
        try {
            const status = req.query.status;
            const quotes = await quotes_service_1.quotesService.findAll(status);
            res.json(quotes);
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await quotes_service_1.quotesService.getStats();
            res.json(stats);
        }
        catch (error) {
            next(error);
        }
    }
    async findOne(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.findOne(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const files = req.files;
            const imageUrls = (files || []).map((f) => `/uploads/quotes/${f.filename}`);
            const quote = await quotes_service_1.quotesService.create(req.body, imageUrls);
            res.status(201).json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async updatePrice(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.updatePrice(req.params.id, req.body);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async startQuoting(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.startQuoting(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async rejectQuote(req, res, next) {
        try {
            const { reason } = req.body;
            const quote = await quotes_service_1.quotesService.rejectQuote(req.params.id, reason);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async updateInfo(req, res, next) {
        try {
            const files = req.files;
            const newImageUrls = (files || []).map((f) => `/uploads/quotes/${f.filename}`);
            const body = { ...req.body };
            let keepImages = [];
            if (body.keepImages) {
                try {
                    keepImages = JSON.parse(body.keepImages);
                }
                catch {
                    keepImages = [];
                }
            }
            delete body.keepImages;
            const images = [...keepImages, ...newImageUrls];
            const updatedQuote = await quotes_service_1.quotesService.updateInfo(req.params.id, {
                ...body,
                ...(images.length > 0 ? { images } : {}),
            });
            res.json(updatedQuote);
        }
        catch (error) {
            next(error);
        }
    }
    async resubmit(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.resubmit(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async completeQuoting(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.completeQuoting(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async sentToCustomer(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.sentToCustomer(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async confirm(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.confirm(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
    async cancel(req, res, next) {
        try {
            const quote = await quotes_service_1.quotesService.cancel(req.params.id);
            res.json(quote);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.QuotesController = QuotesController;
exports.quotesController = new QuotesController();

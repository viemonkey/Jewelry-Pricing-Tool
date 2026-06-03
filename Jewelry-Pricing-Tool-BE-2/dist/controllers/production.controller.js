"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionController = exports.ProductionController = void 0;
const production_service_1 = require("../services/production.service");
class ProductionController {
    async findAll(req, res, next) {
        try {
            const status = req.query.status;
            const orders = await production_service_1.productionService.findAll(status);
            res.json(orders);
        }
        catch (error) {
            next(error);
        }
    }
    async findOne(req, res, next) {
        try {
            const order = await production_service_1.productionService.findOne(req.params.id);
            res.json(order);
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const { quoteId, deadline, assignedTo } = req.body;
            const order = await production_service_1.productionService.create(quoteId, deadline, assignedTo);
            res.status(201).json(order);
        }
        catch (error) {
            next(error);
        }
    }
    async updateProgress(req, res, next) {
        try {
            const { progressStatus, progressNotes, assignedTo, deadline } = req.body;
            const order = await production_service_1.productionService.updateProgress(req.params.id, progressStatus, progressNotes, assignedTo, deadline);
            res.json(order);
        }
        catch (error) {
            next(error);
        }
    }
    async complete(req, res, next) {
        try {
            const files = req.files;
            const imageUrls = (files || []).map((f) => `/uploads/production/${f.filename}`);
            const order = await production_service_1.productionService.complete(req.params.id, imageUrls);
            res.json(order);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProductionController = ProductionController;
exports.productionController = new ProductionController();

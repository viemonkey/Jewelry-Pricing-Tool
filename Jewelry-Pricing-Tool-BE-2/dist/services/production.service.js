"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionService = exports.ProductionService = void 0;
const Production_1 = require("../models/Production");
const quotes_service_1 = require("./quotes.service");
class ProductionService {
    async findAll(status) {
        const filter = status ? { progressStatus: status } : {};
        return Production_1.Production.find(filter).populate('quote').sort({ createdAt: -1 }).lean();
    }
    async findOne(id) {
        const order = await Production_1.Production.findById(id).populate('quote').lean();
        if (!order) {
            const err = new Error(`Production order ${id} không tồn tại`);
            err.statusCode = 404;
            throw err;
        }
        return order;
    }
    async create(quoteId, deadline, assignedTo) {
        await quotes_service_1.quotesService.markInProduction(quoteId);
        const year = new Date().getFullYear();
        const count = await Production_1.Production.countDocuments();
        const orderCode = `PO-${year}-${String(count + 1).padStart(4, '0')}`;
        const order = new Production_1.Production({
            orderCode,
            quote: quoteId,
            deadline,
            assignedTo,
            progressStatus: Production_1.ProductionStatus.PENDING_PRODUCTION,
        });
        await order.save();
        return Production_1.Production.findById(order._id).populate('quote').lean();
    }
    async updateProgress(id, progressStatus, progressNotes, assignedTo, deadline) {
        const update = { progressStatus };
        if (progressNotes !== undefined)
            update.progressNotes = progressNotes;
        if (assignedTo)
            update.assignedTo = assignedTo;
        if (deadline)
            update.deadline = deadline;
        const order = await Production_1.Production.findByIdAndUpdate(id, update, { new: true })
            .populate('quote')
            .lean();
        if (!order) {
            const err = new Error('Production order not found');
            err.statusCode = 404;
            throw err;
        }
        return order;
    }
    async complete(id, imageUrls) {
        const order = await Production_1.Production.findByIdAndUpdate(id, { progressStatus: Production_1.ProductionStatus.COMPLETED, completedImages: imageUrls }, { new: true })
            .populate('quote')
            .lean();
        if (!order) {
            const err = new Error('Production order not found');
            err.statusCode = 404;
            throw err;
        }
        return order;
    }
}
exports.ProductionService = ProductionService;
exports.productionService = new ProductionService();

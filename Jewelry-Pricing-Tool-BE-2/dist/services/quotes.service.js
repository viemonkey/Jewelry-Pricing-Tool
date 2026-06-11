"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesService = exports.QuotesService = void 0;
const Quote_1 = require("../models/Quote");
const notifications_service_1 = require("./notifications.service");
class QuotesService {
    async findAll(status) {
        const filter = status ? { status } : {};
        return Quote_1.Quote.find(filter).sort({ createdAt: -1 }).lean();
    }
    async findOne(id) {
        const quote = await Quote_1.Quote.findById(id).lean();
        if (!quote) {
            const err = new Error(`Quote ${id} không tồn tại`);
            err.statusCode = 404;
            throw err;
        }
        return quote;
    }
    async create(dto, imageUrls) {
        const year = new Date().getFullYear();
        const count = await Quote_1.Quote.countDocuments();
        const quoteCode = `QT-${year}-${String(count + 1).padStart(4, '0')}`;
        let options = [];
        if (dto.options) {
            try {
                options = typeof dto.options === 'string' ? JSON.parse(dto.options) : dto.options;
            }
            catch (err) { }
        }
        const quote = new Quote_1.Quote({
            ...dto,
            options,
            quoteCode,
            images: imageUrls,
            status: Quote_1.QuoteStatus.PENDING,
        });
        return quote.save();
    }
    async updatePrice(id, dto) {
        const updateData = { ...dto };
        // Backwards compatibility: populate top-level fields from the first option
        if (dto.options && Array.isArray(dto.options) && dto.options.length > 0) {
            const firstOpt = dto.options[0];
            updateData.materialType = firstOpt.materialType;
            updateData.weightChi = firstOpt.weightChi;
            updateData.weightGram = firstOpt.weightGram;
            updateData.laborCost = firstOpt.laborCost;
            updateData.goldPrice24K = firstOpt.goldPrice24K;
            updateData.platinumPrice = firstOpt.platinumPrice;
            updateData.materialCost = firstOpt.materialCost;
            updateData.stoneCost = firstOpt.stoneCost;
            updateData.costBeforeVAT = firstOpt.costBeforeVAT;
            updateData.costWithVAT = firstOpt.costWithVAT;
            updateData.costPrice = firstOpt.costPrice;
            updateData.sellingPrice = firstOpt.sellingPrice;
        }
        const quote = await Quote_1.Quote.findByIdAndUpdate(id, { ...updateData, status: Quote_1.QuoteStatus.QUOTING }, { new: true }).lean();
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        return quote;
    }
    async startQuoting(id) {
        return this.updateStatus(id, Quote_1.QuoteStatus.QUOTING);
    }
    async rejectQuote(id, reason) {
        const quote = await Quote_1.Quote.findByIdAndUpdate(id, { status: Quote_1.QuoteStatus.NEED_MORE_INFO, rejectReason: reason }, { new: true }).lean();
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        notifications_service_1.notificationsService.notifyQuoteRejected(quote.quoteCode || '', quote.productName, String(quote._id), reason);
        return quote;
    }
    async updateInfo(id, data) {
        const quote = await Quote_1.Quote.findByIdAndUpdate(id, { ...data }, { new: true }).lean();
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        return quote;
    }
    async resubmit(id) {
        const quote = await Quote_1.Quote.findByIdAndUpdate(id, { status: Quote_1.QuoteStatus.PENDING, rejectReason: '' }, { new: true }).lean();
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        notifications_service_1.notificationsService.emit({
            type: 'QUOTE_REJECTED',
            targetRole: 'order',
            title: '🔄 Sale đã bổ sung thông tin',
            message: `"${quote.productName}" (${quote.quoteCode}) đã được Sale cập nhật, sẵn sàng báo giá`,
            quoteId: String(quote._id),
            quoteCode: quote.quoteCode,
            productName: quote.productName,
        });
        return quote;
    }
    async completeQuoting(id) {
        const quote = await this.updateStatus(id, Quote_1.QuoteStatus.QUOTED);
        notifications_service_1.notificationsService.notifyQuoteCompleted(quote.quoteCode || '', quote.productName, String(quote._id), quote.sellingPrice ?? 0);
        return quote;
    }
    async sentToCustomer(id) {
        const quote = await this.updateStatus(id, Quote_1.QuoteStatus.SENT_TO_CUSTOMER);
        notifications_service_1.notificationsService.emit({
            type: 'QUOTE_COMPLETED',
            targetRole: 'order',
            title: '📤 Sale đã gửi giá cho khách',
            message: `"${quote.productName}" (${quote.quoteCode}) đã được gửi báo giá cho khách hàng`,
            quoteId: String(quote._id),
            quoteCode: quote.quoteCode,
            productName: quote.productName,
        });
        return quote;
    }
    async confirm(id, selectedOption) {
        const quote = await Quote_1.Quote.findById(id);
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        quote.confirmedPrice = selectedOption ? selectedOption.sellingPrice : (quote.sellingPrice || 0);
        if (selectedOption) {
            quote.materialType = selectedOption.materialType;
            quote.weightChi = selectedOption.weightChi;
            quote.weightGram = selectedOption.weightGram;
            quote.laborCost = selectedOption.laborCost;
            quote.goldPrice24K = selectedOption.goldPrice24K;
            quote.platinumPrice = selectedOption.platinumPrice;
            quote.materialCost = selectedOption.materialCost;
            quote.stoneCost = selectedOption.stoneCost;
            quote.costBeforeVAT = selectedOption.costBeforeVAT;
            quote.costWithVAT = selectedOption.costWithVAT;
            quote.costPrice = selectedOption.costPrice;
            quote.sellingPrice = selectedOption.sellingPrice;
            if (quote.options && quote.options.length > 0) {
                const option = quote.options.find(o => o.materialType === selectedOption.materialType);
                if (option) {
                    option.isConfirmed = true;
                }
                ;
                quote.markModified('options');
                const allResolved = quote.options.every(o => o.isConfirmed || o.isCancelled);
                const hasConfirmed = quote.options.some(o => o.isConfirmed);
                if (allResolved && hasConfirmed) {
                    quote.status = Quote_1.QuoteStatus.CONFIRMED;
                }
                else {
                    quote.status = Quote_1.QuoteStatus.SENT_TO_CUSTOMER;
                }
            }
            else {
                quote.status = Quote_1.QuoteStatus.CONFIRMED;
            }
        }
        else {
            quote.status = Quote_1.QuoteStatus.CONFIRMED;
        }
        const saved = await quote.save();
        const result = saved.toObject();
        notifications_service_1.notificationsService.notifyQuoteConfirmed(result.quoteCode || '', result.productName, String(result._id));
        return result;
    }
    async cancel(id, materialType) {
        const quote = await Quote_1.Quote.findById(id);
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        if (materialType && quote.options && quote.options.length > 0) {
            const option = quote.options.find(o => o.materialType === materialType);
            if (option) {
                option.isCancelled = true;
            }
            ;
            quote.markModified('options');
            const allCancelled = quote.options.every(o => o.isCancelled);
            if (allCancelled) {
                quote.status = Quote_1.QuoteStatus.CANCELLED;
            }
            else {
                quote.status = Quote_1.QuoteStatus.SENT_TO_CUSTOMER;
            }
        }
        else {
            quote.status = Quote_1.QuoteStatus.CANCELLED;
            if (quote.options && quote.options.length > 0) {
                quote.options.forEach(o => {
                    o.isCancelled = true;
                });
            }
        }
        const saved = await quote.save();
        const result = saved.toObject();
        if (result.status === Quote_1.QuoteStatus.CANCELLED) {
            notifications_service_1.notificationsService.notifyQuoteCancelled(result.quoteCode || '', result.productName, String(result._id));
        }
        return result;
    }
    async updateStatus(id, status) {
        const quote = await Quote_1.Quote.findByIdAndUpdate(id, { status }, { new: true }).lean();
        if (!quote) {
            const err = new Error('Quote not found');
            err.statusCode = 404;
            throw err;
        }
        return quote;
    }
    async getStats() {
        const [total, pending, quoted, pricedTotal, confirmed, revenueResult] = await Promise.all([
            Quote_1.Quote.countDocuments(),
            Quote_1.Quote.countDocuments({ status: Quote_1.QuoteStatus.PENDING }),
            Quote_1.Quote.countDocuments({ status: Quote_1.QuoteStatus.QUOTED }),
            Quote_1.Quote.countDocuments({
                $or: [
                    { quotedBy: { $exists: true, $ne: '' } },
                    { sellingPrice: { $gt: 0 } },
                    { options: { $elemMatch: { sellingPrice: { $gt: 0 } } } },
                ],
            }),
            Quote_1.Quote.countDocuments({ status: Quote_1.QuoteStatus.CONFIRMED }),
            Quote_1.Quote.aggregate([
                { $match: { status: Quote_1.QuoteStatus.CONFIRMED } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ['$confirmedPrice', '$sellingPrice'] },
                                    '$quantity',
                                ],
                            },
                        },
                    },
                },
            ]),
        ]);
        const confirmedRevenue = revenueResult[0]?.totalRevenue || 0;
        return { total, pending, quoted, pricedTotal, confirmed, confirmedRevenue };
    }
}
exports.QuotesService = QuotesService;
exports.quotesService = new QuotesService();

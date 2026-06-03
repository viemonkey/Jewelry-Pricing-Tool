"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsService = exports.NotificationsService = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
class NotificationsService {
    static instance;
    eventBus = new rxjs_1.Subject();
    constructor() { }
    static getInstance() {
        if (!NotificationsService.instance) {
            NotificationsService.instance = new NotificationsService();
        }
        return NotificationsService.instance;
    }
    getEvents(role) {
        console.log(`[NotificationsService] SSE client listening — role: ${role}`);
        return this.eventBus.asObservable().pipe((0, operators_1.filter)((event) => event.targetRole === role || event.targetRole === 'all'));
    }
    emit(event) {
        const fullEvent = {
            ...event,
            timestamp: new Date().toISOString(),
        };
        console.log(`[NotificationsService] Emitting [${event.type}] → role:${event.targetRole} | ${event.title}`);
        this.eventBus.next(fullEvent);
    }
    notifyQuoteCompleted(quoteCode, productName, quoteId, sellingPrice) {
        this.emit({
            type: 'QUOTE_COMPLETED',
            targetRole: 'sale',
            title: '✅ Báo giá hoàn thành',
            message: `"${productName}" (${quoteCode}) đã được báo giá xong — giá bán: ${sellingPrice.toLocaleString('vi-VN')}đ`,
            quoteId,
            quoteCode,
            productName,
        });
    }
    notifyQuoteConfirmed(quoteCode, productName, quoteId) {
        this.emit({
            type: 'QUOTE_CONFIRMED',
            targetRole: 'order',
            title: '🎉 Khách đặt hàng!',
            message: `Sale đã xác nhận đặt hàng "${productName}" (${quoteCode})`,
            quoteId,
            quoteCode,
            productName,
        });
    }
    notifyQuoteCancelled(quoteCode, productName, quoteId) {
        this.emit({
            type: 'QUOTE_CANCELLED',
            targetRole: 'order',
            title: '❌ Báo giá bị huỷ',
            message: `Sale đã huỷ yêu cầu "${productName}" (${quoteCode})`,
            quoteId,
            quoteCode,
            productName,
        });
    }
    notifyQuoteRejected(quoteCode, productName, quoteId, reason) {
        this.emit({
            type: 'QUOTE_REJECTED',
            targetRole: 'sale',
            title: '↩️ Yêu cầu cần bổ sung',
            message: `"${productName}" (${quoteCode}) được trả lại: ${reason}`,
            quoteId,
            quoteCode,
            productName,
        });
    }
}
exports.NotificationsService = NotificationsService;
exports.notificationsService = NotificationsService.getInstance();

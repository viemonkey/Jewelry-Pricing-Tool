"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = exports.NotificationsController = void 0;
const notifications_service_1 = require("../services/notifications.service");
class NotificationsController {
    stream(req, res, next) {
        const roleQuery = req.query.role;
        const role = (['sale', 'order', 'admin', 'all'].includes(roleQuery || '')
            ? roleQuery
            : 'all');
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        res.write(': ping\n\n');
        const subscription = notifications_service_1.notificationsService.getEvents(role).subscribe({
            next: (event) => {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            },
            error: (err) => {
                console.error('[NotificationsController] SSE Subscription error:', err);
                res.end();
            },
            complete: () => {
                res.end();
            },
        });
        const keepAliveInterval = setInterval(() => {
            res.write(': ping\n\n');
        }, 30000);
        req.on('close', () => {
            clearInterval(keepAliveInterval);
            subscription.unsubscribe();
            console.log(`[NotificationsController] SSE client disconnected — role: ${role}`);
        });
    }
}
exports.NotificationsController = NotificationsController;
exports.notificationsController = new NotificationsController();

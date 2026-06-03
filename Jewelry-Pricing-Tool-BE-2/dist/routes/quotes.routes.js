"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quotes_controller_1 = require("../controllers/quotes.controller");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
router.get('/', quotes_controller_1.quotesController.findAll);
router.get('/stats', quotes_controller_1.quotesController.getStats);
router.get('/:id', quotes_controller_1.quotesController.findOne);
// POST with multer
router.post('/', upload_middleware_1.uploadQuotes, quotes_controller_1.quotesController.create);
router.patch('/:id/price', quotes_controller_1.quotesController.updatePrice);
router.patch('/:id/start-quoting', quotes_controller_1.quotesController.startQuoting);
router.patch('/:id/reject', quotes_controller_1.quotesController.rejectQuote);
// PATCH info with multer
router.patch('/:id/info', upload_middleware_1.uploadQuotes, quotes_controller_1.quotesController.updateInfo);
router.patch('/:id/resubmit', quotes_controller_1.quotesController.resubmit);
router.patch('/:id/complete-quoting', quotes_controller_1.quotesController.completeQuoting);
router.patch('/:id/sent-to-customer', quotes_controller_1.quotesController.sentToCustomer);
router.patch('/:id/confirm', quotes_controller_1.quotesController.confirm);
router.patch('/:id/cancel', quotes_controller_1.quotesController.cancel);
exports.default = router;

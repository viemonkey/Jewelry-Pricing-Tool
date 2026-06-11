import { Subject, Observable } from 'rxjs'
import { filter } from 'rxjs/operators'

export type NotificationEventType =
  | 'QUOTE_COMPLETED'
  | 'QUOTE_CONFIRMED'
  | 'QUOTE_CANCELLED'
  | 'QUOTE_REJECTED'

export type TargetRole = 'sale' | 'order' | 'all'

export interface NotificationEvent {
  type: NotificationEventType
  targetRole: TargetRole
  title: string
  message: string
  quoteId?: string
  quoteCode?: string
  productName?: string
  timestamp: string
}

export class NotificationsService {
  private static instance: NotificationsService
  private readonly eventBus = new Subject<NotificationEvent>()

  private constructor() {}

  public static getInstance(): NotificationsService {
    if (!NotificationsService.instance) {
      NotificationsService.instance = new NotificationsService()
    }
    return NotificationsService.instance
  }

  getEvents(role: TargetRole): Observable<NotificationEvent> {
    console.log(`[NotificationsService] SSE client listening — role: ${role}`)
    return this.eventBus.asObservable().pipe(
      filter((event) => event.targetRole === role || event.targetRole === 'all')
    )
  }

  emit(event: Omit<NotificationEvent, 'timestamp'>) {
    const fullEvent: NotificationEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    console.log(`[NotificationsService] Emitting [${event.type}] → role:${event.targetRole} | ${event.title}`)
    this.eventBus.next(fullEvent)
  }

  notifyQuoteCompleted(quoteCode: string, productName: string, quoteId: string, sellingPrice: number) {
    this.emit({
      type: 'QUOTE_COMPLETED',
      targetRole: 'sale',
      title: '✅ Báo giá hoàn thành',
      message: `"${productName}" (${quoteCode}) đã được báo giá xong — giá bán: ${sellingPrice.toLocaleString('vi-VN')}đ`,
      quoteId,
      quoteCode,
      productName,
    })
  }

  notifyQuoteConfirmed(quoteCode: string, productName: string, quoteId: string) {
    this.emit({
      type: 'QUOTE_CONFIRMED',
      targetRole: 'order',
      title: '🎉 Khách đặt hàng!',
      message: `Sale đã xác nhận đặt hàng "${productName}" (${quoteCode})`,
      quoteId,
      quoteCode,
      productName,
    })
  }

  notifyQuoteCancelled(quoteCode: string, productName: string, quoteId: string) {
    this.emit({
      type: 'QUOTE_CANCELLED',
      targetRole: 'order',
      title: '❌ Báo giá bị huỷ',
      message: `Sale đã huỷ yêu cầu "${productName}" (${quoteCode})`,
      quoteId,
      quoteCode,
      productName,
    })
  }

  notifyQuoteRejected(quoteCode: string, productName: string, quoteId: string, reason: string) {
    this.emit({
      type: 'QUOTE_REJECTED',
      targetRole: 'sale',
      title: '↩️ Yêu cầu cần bổ sung',
      message: `"${productName}" (${quoteCode}) được trả lại: ${reason}`,
      quoteId,
      quoteCode,
      productName,
    })
  }
}

export const notificationsService = NotificationsService.getInstance()

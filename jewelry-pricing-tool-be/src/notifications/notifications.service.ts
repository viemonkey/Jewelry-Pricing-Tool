import { Injectable, Logger } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'

export type NotificationEventType =
  | 'QUOTE_COMPLETED'   // NV order hoàn thành báo giá → thông báo Sale
  | 'QUOTE_CONFIRMED'   // Sale xác nhận đặt hàng → thông báo NV order
  | 'QUOTE_CANCELLED'   // Sale huỷ → thông báo NV order
  | 'QUOTE_REJECTED'    // NV order trả lại → thông báo Sale

export type TargetRole = 'sale' | 'order' | 'admin' | 'all'

export interface NotificationEvent {
  type: NotificationEventType
  targetRole: TargetRole   // role nào nhận thông báo này
  title: string
  message: string
  quoteId?: string
  quoteCode?: string
  productName?: string
  timestamp: string
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  // Subject trung tâm — tất cả events đi qua đây
  private readonly eventBus = new Subject<NotificationEvent>()

  /**
   * Frontend gọi GET /notifications/stream?role=sale
   * Trả về Observable chỉ emit events dành cho role đó (hoặc 'all')
   */
  getStream(role: TargetRole): Observable<MessageEvent> {
    this.logger.log(`SSE client connected — role: ${role}`)

    return this.eventBus.asObservable().pipe(
      filter((event) => event.targetRole === role || event.targetRole === 'all'),
      map((event) => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify(event),
        })
        return messageEvent
      }),
    )
  }

  /** Emit event đến tất cả SSE clients phù hợp role */
  emit(event: Omit<NotificationEvent, 'timestamp'>) {
    const fullEvent: NotificationEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    this.logger.log(`Emitting [${event.type}] → role:${event.targetRole} | ${event.title}`)
    this.eventBus.next(fullEvent)
  }

  // ── Các helper method cho từng loại sự kiện ──────────────

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

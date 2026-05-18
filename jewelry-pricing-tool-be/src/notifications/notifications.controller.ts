import { Controller, Get, Query, Res, Sse } from '@nestjs/common'
import { Observable } from 'rxjs'
import { NotificationsService, TargetRole } from './notifications.service'
import type { Response } from 'express'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * SSE endpoint — frontend kết nối 1 lần, nhận events liên tục
   * GET /notifications/stream?role=sale
   *
   * Browser EventSource tự reconnect nếu mất kết nối.
   * Header được set tự động bởi NestJS @Sse() decorator.
   */
  @Sse('stream')
  stream(
    @Query('role') role: string,
    @Res({ passthrough: true }) res: Response,
  ): Observable<MessageEvent> {
    // Cho phép SSE qua proxy/nginx nếu sau này deploy
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')

    const targetRole = (['sale', 'order', 'admin', 'all'].includes(role)
      ? role
      : 'all') as TargetRole

    return this.notificationsService.getStream(targetRole)
  }
}

import { Request, Response, NextFunction } from 'express'
import { notificationsService, TargetRole } from '../services/notifications.service'

export class NotificationsController {
  stream(req: Request, res: Response, next: NextFunction) {
    const roleQuery = req.query.role as string | undefined
    const role = (['sale', 'order', 'admin', 'all'].includes(roleQuery || '')
      ? roleQuery
      : 'all') as TargetRole

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    res.write(': ping\n\n')

    const subscription = notificationsService.getEvents(role).subscribe({
      next: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
      },
      error: (err) => {
        console.error('[NotificationsController] SSE Subscription error:', err)
        res.end()
      },
      complete: () => {
        res.end()
      },
    })

    const keepAliveInterval = setInterval(() => {
      res.write(': ping\n\n')
    }, 30000)

    req.on('close', () => {
      clearInterval(keepAliveInterval)
      subscription.unsubscribe()
      console.log(`[NotificationsController] SSE client disconnected — role: ${role}`)
    })
  }
}

export const notificationsController = new NotificationsController()

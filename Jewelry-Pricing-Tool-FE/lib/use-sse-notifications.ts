'use client'

import { useEffect, useRef } from 'react'
import type { UserRole } from './types'

export type SseEventType =
  | 'QUOTE_COMPLETED'
  | 'QUOTE_CONFIRMED'
  | 'QUOTE_CANCELLED'
  | 'QUOTE_REJECTED'

export interface SseNotificationEvent {
  type: SseEventType
  targetRole: string
  title: string
  message: string
  quoteId?: string
  quoteCode?: string
  productName?: string
  timestamp: string
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Hook kết nối SSE với backend, tự reconnect khi mất mạng.
 * Chỉ nhận events dành cho role hiện tại.
 *
 * @param role   - role của user đang đăng nhập
 * @param onEvent - callback khi nhận được event mới
 */
export function useSseNotifications(
  role: UserRole,
  onEvent: (event: SseNotificationEvent) => void,
) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent // luôn dùng callback mới nhất, không cần dependency

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 3000  // bắt đầu retry sau 3s
    let unmounted = false

    function connect() {
      if (unmounted) return

      es = new EventSource(`${BASE_URL}/notifications/stream?role=${role}`)

      es.onopen = () => {
        retryDelay = 3000 // reset delay khi kết nối thành công
      }

      es.onmessage = (event) => {
        try {
          const data: SseNotificationEvent = JSON.parse(event.data)
          onEventRef.current(data)
        } catch {
          // bỏ qua malformed event
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        if (!unmounted) {
          // Exponential backoff: 3s → 6s → 12s → max 30s
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30_000)
            connect()
          }, retryDelay)
        }
      }
    }

    connect()

    return () => {
      unmounted = true
      if (retryTimeout) clearTimeout(retryTimeout)
      es?.close()
    }
  }, [role]) // chỉ reconnect khi role thay đổi
}

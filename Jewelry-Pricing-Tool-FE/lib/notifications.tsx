'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

export type NotifType = 'success' | 'info' | 'warning' | 'error'

export interface Notification {
  id: string
  title: string
  message: string
  type: NotifType
  timestamp: Date
  read: boolean
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

// ── Toast card — góc dưới phải, kiểu Notion/Linear/Vercel ──

const TOAST_CONFIG: Record<NotifType, { accent: string; icon: React.ReactNode; iconBg: string }> = {
  success: {
    accent: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  info: {
    accent: 'border-l-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950',
    icon: <Info className="h-4 w-4 text-blue-500" />,
  },
  warning: {
    accent: 'border-l-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
  error: {
    accent: 'border-l-red-500',
    iconBg: 'bg-red-50 dark:bg-red-950',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
}

const PROGRESS_COLOR: Record<NotifType, string> = {
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
}

function Toast({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  const cfg = TOAST_CONFIG[notif.type]

  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative flex w-[340px] items-start gap-3 overflow-hidden rounded-xl border border-l-4 bg-white dark:bg-zinc-900 p-4 shadow-lg shadow-black/8 ${cfg.accent}`}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
        {cfg.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{notif.title}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{notif.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] ${PROGRESS_COLOR[notif.type]}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  )
}

function ToastContainer({ toasts, onClose }: { toasts: Notification[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast notif={t} onClose={() => onClose(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Notification[]>([])

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    }
    // Thêm vào bell list
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
    // Thêm vào toast popup (tự biến mất sau 4s)
    setToasts((prev) => [...prev, newNotif].slice(-5)) // max 5 toast cùng lúc
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Khi mở bell dropdown → đánh dấu đọc hết
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => setNotifications([]), [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onClose={dismissToast} />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Menu, X, User, Settings, LogOut, Bell, ChevronDown, CheckCheck, Trash2 } from 'lucide-react'
import { useNotifications } from '@/lib/notifications'
import type { NotifType } from '@/lib/notifications'

export type UserRole = 'sale' | 'order' | 'admin'

interface HeaderProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  sale: 'Sale',
  order: 'Nhân viên Order',
  admin: 'Admin',
}

const ROLE_COLORS: Record<UserRole, string> = {
  sale: 'bg-info text-info-foreground',
  order: 'bg-warning text-warning-foreground',
  admin: 'bg-primary text-primary-foreground',
}

const NOTIF_COLORS: Record<NotifType, string> = {
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  error:   'bg-destructive',
}

const NOTIF_ICONS: Record<NotifType, string> = {
  success: '✅',
  info:    'ℹ️',
  warning: '⚠️',
  error:   '❌',
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

const logoVariants = { hover: { scale: 1.05, rotate: [0, -5, 5, 0], transition: { duration: 0.5 } } }
const bellVariants = { ring: { rotate: [0, 15, -15, 10, -10, 5, -5, 0], transition: { duration: 0.6 } } }

export function Header({ currentRole, onRoleChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [bellHover, setBellHover] = useState(false)
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' as const }}
    >
      <div className="mx-auto max-w-[95%] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <motion.div className="flex items-center gap-3" whileHover="hover" variants={logoVariants}>
            <motion.div
              className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary overflow-hidden"
              whileHover={{ boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}
            >
              <motion.span
                className="text-lg font-bold text-primary-foreground"
                animate={{ textShadow: ['0 0 0px #fff', '0 0 10px #fff', '0 0 0px #fff'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >JQ</motion.span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full"
                animate={{ x: ['100%', '-100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">Jewelry Quote</h1>
              <p className="text-xs text-muted-foreground">Hệ thống báo giá trang sức</p>
            </div>
          </motion.div>

          {/* Right side */}
          <div className="flex items-center gap-3">

            {/* ── NOTIFICATION BELL DROPDOWN ── */}
            <DropdownMenu onOpenChange={(open) => { if (open) markAllRead() }}>
              <DropdownMenuTrigger asChild>
                <motion.div onHoverStart={() => setBellHover(true)} onHoverEnd={() => setBellHover(false)}>
                  <Button variant="ghost" size="icon" className="relative">
                    <motion.div animate={bellHover ? 'ring' : undefined} variants={bellVariants}>
                      <Bell className="h-5 w-5" />
                    </motion.div>
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          key="badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div>
                    <p className="font-semibold text-sm">Thông báo</p>
                    {unreadCount > 0 && (
                      <p className="text-xs text-muted-foreground">{unreadCount} chưa đọc</p>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2" onClick={markAllRead}>
                        <CheckCheck className="h-3 w-3" /> Đọc tất cả
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2 text-destructive hover:text-destructive" onClick={clearAll}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* List */}
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Chưa có thông báo nào</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      <AnimatePresence initial={false}>
                        {notifications.map((notif, i) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={cn(
                              'flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-default',
                              !notif.read && 'bg-primary/5'
                            )}
                          >
                            {/* Icon dot */}
                            <div className={cn('mt-1 h-2 w-2 flex-shrink-0 rounded-full', NOTIF_COLORS[notif.type])} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight">{notif.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{notif.message}</p>
                              <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(notif.timestamp)}</p>
                            </div>
                            {!notif.read && (
                              <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Role Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
                    <Badge variant="secondary" className={cn('text-xs', ROLE_COLORS[currentRole])}>
                      {ROLE_LABELS[currentRole]}
                    </Badge>
                    <motion.div animate={{ rotate: 0 }} whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {(['sale', 'order', 'admin'] as UserRole[]).map((role) => (
                  <DropdownMenuItem key={role} onClick={() => onRoleChange(role)} className="cursor-pointer">
                    <Badge variant="secondary" className={cn('mr-2', ROLE_COLORS[role])}>{ROLE_LABELS[role]}</Badge>
                    {role === 'sale' && 'Chỉ xem giá bán'}
                    {role === 'order' && 'Xem giá vốn và chi tiết'}
                    {role === 'admin' && 'Toàn quyền truy cập'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">Nguyễn Văn A</p>
                  <p className="text-xs text-muted-foreground">nguyen.a@jewelry.vn</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Cài đặt</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Đăng xuất</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <AnimatePresence mode="wait">
                  <motion.div key={mobileMenuOpen ? 'close' : 'menu'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav className="border-t border-border py-4 md:hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
              <div className="flex flex-col gap-2">
                {(['sale', 'order', 'admin'] as UserRole[]).map((role, i) => (
                  <motion.button key={role} onClick={() => { onRoleChange(role); setMobileMenuOpen(false) }}
                    className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm', currentRole === role ? 'bg-muted' : 'hover:bg-muted')}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }} whileTap={{ scale: 0.98 }}>
                    <Badge variant="secondary" className={cn('text-xs', ROLE_COLORS[role])}>{ROLE_LABELS[role]}</Badge>
                  </motion.button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}

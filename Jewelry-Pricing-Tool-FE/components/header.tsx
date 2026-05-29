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
import { User, Settings, LogOut, Bell, ChevronDown, CheckCheck, Trash2, Search } from 'lucide-react'
import { useNotifications } from '@/lib/notifications'
import type { NotifType } from '@/lib/notifications'
import { Input } from '@/components/ui/input'

export type UserRole = 'sale' | 'order'

interface HeaderProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  search?: string
  onSearchChange?: (val: string) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  sale: 'Luxury Sale Hub',
  order: 'Luxury Pricing & Mgmt',
}

const ROLE_COLORS: Record<UserRole, string> = {
  sale: 'bg-info text-info-foreground',
  order: 'bg-primary text-primary-foreground',
}

const NOTIF_COLORS: Record<NotifType, string> = {
  success: 'bg-emerald-500',
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  error:   'bg-destructive',
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

const bellVariants = { ring: { rotate: [0, 15, -15, 10, -10, 5, -5, 0], transition: { duration: 0.6 } } }

export function Header({ currentRole, onRoleChange, search = '', onSearchChange }: HeaderProps) {
  const [bellHover, setBellHover] = useState(false)
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()

  return (
    <motion.header
      className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 py-3"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="px-6 flex items-center justify-between gap-4">
        {/* Left: Workspace dropdown (acts as Role Switcher) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div 
              whileHover={{ scale: 1.01 }} 
              whileTap={{ scale: 0.99 }}
              className="cursor-pointer flex flex-col items-start select-none group shrink-0"
            >
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">WORKSPACE</span>
              <div className="flex items-center gap-1 mt-1 text-slate-800 dark:text-foreground">
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {ROLE_LABELS[currentRole]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 mt-1">
            {(['sale', 'order'] as UserRole[]).map((role) => (
              <DropdownMenuItem 
                key={role} 
                onClick={() => onRoleChange(role)} 
                className="cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-xs text-foreground">{ROLE_LABELS[role]}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {role === 'sale' ? 'Chỉ xem giá bán' : 'Báo giá & Quản trị hệ thống'}
                  </p>
                </div>
                {currentRole === role && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Middle: Rounded Pill Search input */}
        <div className="flex-1 max-w-sm md:max-w-md relative hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Tìm mã hoặc sản phẩm..."
            className="w-full h-10 rounded-full border-none bg-muted/50 hover:bg-muted/70 focus:bg-white pl-10 pr-4 text-xs font-medium transition-all shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Notification bell */}
          <DropdownMenu onOpenChange={(open) => { if (open) markAllRead() }}>
            <DropdownMenuTrigger asChild>
              <motion.div onHoverStart={() => setBellHover(true)} onHoverEnd={() => setBellHover(false)}>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-muted/40 hover:bg-muted/70">
                  <motion.div animate={bellHover ? 'ring' : undefined} variants={bellVariants}>
                    <Bell className="h-4.5 w-4.5 text-slate-600 dark:text-foreground" />
                  </motion.div>
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
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
                          <div className={cn('mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full', NOTIF_COLORS[notif.type])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-tight text-foreground">{notif.title}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{notif.message}</p>
                            <p className="mt-1 text-[9px] text-muted-foreground/60">{timeAgo(notif.timestamp)}</p>
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

          {/* Profile User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/40 hover:bg-muted/70 p-0 overflow-hidden border">
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                    <User className="h-4.5 w-4.5" />
                  </div>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">Nguyễn Văn Sale</p>
                <p className="text-xs text-muted-foreground">sale.vietnam@jewelry.vn</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Cài đặt</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Đăng xuất</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </motion.header>
  )
}

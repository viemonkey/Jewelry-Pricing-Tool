'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Menu, X, User, Settings, LogOut, Bell, ChevronDown, Sparkles } from 'lucide-react'

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

const logoVariants = {
  hover: {
    scale: 1.05,
    rotate: [0, -5, 5, 0],
    transition: { duration: 0.5 },
  },
}

const bellVariants = {
  ring: {
    rotate: [0, 15, -15, 10, -10, 5, -5, 0],
    transition: { duration: 0.6 },
  },
}

export function Header({ currentRole, onRoleChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [bellHover, setBellHover] = useState(false)

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' as const }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover="hover"
            variants={logoVariants}
          >
            <motion.div
              className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary overflow-hidden"
              whileHover={{ boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}
            >
              <motion.span
                className="text-lg font-bold text-primary-foreground"
                animate={{
                  textShadow: ['0 0 0px #fff', '0 0 10px #fff', '0 0 0px #fff'],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                JQ
              </motion.span>
              {/* Shimmer effect */}
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

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {['Bảng điều khiển', 'Báo giá', 'Tính giá', ...(currentRole !== 'sale' ? ['Cài đặt'] : [])].map(
              (item, index) => (
                <motion.a
                  key={item}
                  href="#"
                  className={cn(
                    'text-sm font-medium transition-colors relative',
                    index === 0 ? 'text-foreground' : 'text-muted-foreground hover:text-primary'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item}
                  {index === 0 && (
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary"
                      layoutId="activeNav"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.a>
              )
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <motion.div
              onHoverStart={() => setBellHover(true)}
              onHoverEnd={() => setBellHover(false)}
            >
              <Button variant="ghost" size="icon" className="relative">
                <motion.div animate={bellHover ? 'ring' : undefined} variants={bellVariants}>
                  <Bell className="h-5 w-5" />
                </motion.div>
                <motion.span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </Button>
            </motion.div>

            {/* Role Switcher (for demo) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', ROLE_COLORS[currentRole])}
                    >
                      {ROLE_LABELS[currentRole]}
                    </Badge>
                    <motion.div
                      animate={{ rotate: 0 }}
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {(['sale', 'order', 'admin'] as UserRole[]).map((role) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => onRoleChange(role)}
                    className="cursor-pointer"
                  >
                    <Badge variant="secondary" className={cn('mr-2', ROLE_COLORS[role])}>
                      {ROLE_LABELS[role]}
                    </Badge>
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
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mobileMenuOpen ? 'close' : 'menu'}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              className="border-t border-border py-4 md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col gap-2">
                {['Bảng điều khiển', 'Báo giá', 'Tính giá', ...(currentRole !== 'sale' ? ['Cài đặt'] : [])].map(
                  (item, index) => (
                    <motion.a
                      key={item}
                      href="#"
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-medium',
                        index === 0 ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {item}
                    </motion.a>
                  )
                )}
                <motion.div
                  className="mt-2 border-t border-border pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="px-3 py-1 text-xs text-muted-foreground">Chuyển quyền:</p>
                  {(['sale', 'order', 'admin'] as UserRole[]).map((role, index) => (
                    <motion.button
                      key={role}
                      onClick={() => {
                        onRoleChange(role)
                        setMobileMenuOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                        currentRole === role ? 'bg-muted' : 'hover:bg-muted'
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Badge variant="secondary" className={cn('text-xs', ROLE_COLORS[role])}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Clock, CheckCircle, ShoppingCart, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { statsApi, type QuoteStats } from '@/lib/api'

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration * 1000

    const updateValue = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / (endTime - startTime), 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(easeProgress * value))
      if (progress < 1) requestAnimationFrame(updateValue)
    }

    requestAnimationFrame(updateValue)
  }, [value, duration])

  return <span>{displayValue}</span>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function StatsCards() {
  const [stats, setStats] = useState<QuoteStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.get()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-muted" />
                <div className="h-4 w-12 rounded bg-muted" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-8 w-16 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
        Không thể tải thống kê. Vui lòng kiểm tra kết nối backend.
      </div>
    )
  }

  const STATS = [
    {
      title: 'Tổng yêu cầu',
      value: stats.total,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'hover:border-primary/50',
    },
    {
      title: 'Chờ xử lý',
      value: stats.pending,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'hover:border-warning/50',
    },
    {
      title: 'Đã báo giá',
      value: stats.quoted,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'hover:border-success/50',
    },
    {
      title: 'Đã đặt hàng',
      value: stats.confirmed,
      icon: ShoppingCart,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'hover:border-info/50',
    },
  ]

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon
        return (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card
              className={cn(
                'group cursor-pointer transition-all duration-300',
                'hover:shadow-lg hover:-translate-y-1',
                stat.borderColor
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <motion.div
                    className={cn('rounded-lg p-2', stat.bgColor)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </motion.div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">
                    <AnimatedNumber value={stat.value} duration={1.5} />
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
                <motion.div
                  className={cn('mt-3 h-1 rounded-full', stat.bgColor)}
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

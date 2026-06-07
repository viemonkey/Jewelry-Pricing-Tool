'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Clock, CheckCircle, ShoppingCart, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { statsApi, type QuoteStats } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'

function AnimatedNumber({
  value,
  duration = 1,
  formatter = (v: number) => String(v),
}: {
  value: number
  duration?: number
  formatter?: (v: number) => string
}) {
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

  return <span>{formatter(displayValue)}</span>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
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
      borderColor: 'group-hover:border-primary/45',
      glowColor: 'rgba(212, 175, 55, 0.18)',
      trend: '+12% tháng này',
      trendColor: 'text-primary bg-primary/10',
    },
    {
      title: 'Chờ xử lý',
      value: stats.pending,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'group-hover:border-warning/45',
      glowColor: 'rgba(230, 150, 20, 0.18)',
      trend: 'Cần xử lý gấp',
      trendColor: 'text-warning bg-warning/10',
    },
    {
      title: 'Đã báo giá',
      value: stats.quoted,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'group-hover:border-success/45',
      glowColor: 'rgba(34, 197, 94, 0.18)',
      trend: 'Tỉ lệ chốt 85%',
      trendColor: 'text-success bg-success/10',
    },
    {
      title: 'Đã đặt hàng',
      value: stats.confirmed,
      icon: ShoppingCart,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'group-hover:border-info/45',
      glowColor: 'rgba(14, 165, 233, 0.18)',
      trend: 'Đơn hoàn thành',
      trendColor: 'text-info bg-info/10',
    },
    {
      title: 'Doanh thu',
      value: stats.confirmedRevenue,
      icon: TrendingUp,
      color: 'text-gold-dark',
      bgColor: 'bg-gold/15',
      borderColor: 'group-hover:border-gold/45',
      glowColor: 'rgba(212, 175, 55, 0.22)',
      trend: 'Đã hoàn thành',
      trendColor: 'text-gold-dark bg-gold/15',
      isCurrency: true,
    },
  ]

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon
        const isFeatured = (stat as any).isFeatured
        return (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card
              className={cn(
                'group cursor-pointer transition-all-smooth relative overflow-hidden shadow-md rounded-2xl border',
                isFeatured
                  ? 'bg-gold-gradient text-white border-primary/40 shadow-xl shadow-primary/10 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 shimmer-gold'
                  : 'border-border/60 bg-card/85 backdrop-blur-md hover:-translate-y-1.5 hover:border-foreground/20 hover:shadow-xl hover:shadow-foreground/5'
              )}
            >
              <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                {/* Dynamic colored ambient glow */}
                <div
                  className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-10 transition-all duration-500 group-hover:scale-125 group-hover:opacity-20 pointer-events-none"
                  style={{ backgroundColor: isFeatured ? 'rgba(255, 255, 255, 0.3)' : stat.glowColor }}
                />

                {/* Top Row: Title & Icon Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isFeatured ? "text-white/80" : "text-muted-foreground/80"
                  )}>
                    {stat.title}
                  </span>
                  <div className={cn(
                    "rounded-xl p-2 transition-all duration-300 shadow-sm shrink-0",
                    isFeatured ? "bg-white/15 text-white" : `${stat.bgColor} ${stat.color} group-hover:scale-110`
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                {/* Middle Row: Animated Main Value */}
                <div className="mt-3">
                  <h3 className={cn(
                    "text-2xl sm:text-3xl font-serif font-bold tracking-tight",
                    isFeatured ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]" : "text-foreground bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text"
                  )}>
                    <AnimatedNumber
                      value={stat.value}
                      duration={1.5}
                      formatter={stat.isCurrency ? formatCurrency : undefined}
                    />
                  </h3>
                </div>

                {/* Bottom Row: Trend Badge & Subtext */}
                <div className={cn(
                  "mt-4 flex items-center justify-between gap-2 pt-2 border-t",
                  isFeatured ? "border-white/10" : "border-border/40"
                )}>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                    isFeatured ? "bg-white/15 text-white" : stat.trendColor
                  )}>
                    {stat.trend}
                  </span>
                  <span className={cn(
                    "text-[9px] font-medium tracking-wide",
                    isFeatured ? "text-white/60" : "text-muted-foreground/60"
                  )}>
                    Hệ thống
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

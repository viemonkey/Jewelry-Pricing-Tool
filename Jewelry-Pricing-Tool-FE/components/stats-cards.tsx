'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Gem,
  Layers,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { quotesApi, statsApi, type QuoteStats } from '@/lib/api'
import type { Quote, QuoteStatus } from '@/lib/types'
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

function formatMaterialType(type: string) {
  const map: Record<string, string> = {
    GOLD_24K: 'Vàng 24K',
    GOLD_18K: 'Vàng 18K',
    GOLD_14K: 'Vàng 14K',
    GOLD_610: 'Vàng 610',
    GOLD_10K: 'Vàng 10K',
    SILVER: 'Bạc 925',
    PLATINUM: 'Bạch kim',
  }
  return map[type] || type.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('vi-VN')
}

function hasPricedData(q: Quote) {
  return Boolean(q.quotedBy || (q.sellingPrice ?? 0) > 0 || q.options?.some((opt) => (opt.sellingPrice ?? 0) > 0))
}

function getQuoteValue(q: Quote) {
  const confirmedOptionsTotal = q.options
    ?.filter((opt) => opt.isConfirmed)
    .reduce((sum, opt) => sum + (Number(opt.sellingPrice) || 0), 0) ?? 0
  const optionPrice = q.options?.find((opt) => (opt.sellingPrice ?? 0) > 0)?.sellingPrice
  return confirmedOptionsTotal || Number(q.confirmedPrice) || q.sellingPrice || optionPrice || 0
}

const MATERIAL_COLORS = ['#D4AF37', '#B4904C', '#64748B', '#0F766E', '#E11D48', '#7C3AED', '#F59E0B']

const STATUS_LABELS: Record<QuoteStatus, { label: string; className: string }> = {
  PENDING: { label: 'Chờ báo giá', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  NEED_MORE_INFO: { label: 'Cần bổ sung', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  QUOTING: { label: 'Đang xử lý', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  QUOTED: { label: 'Đã báo giá', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  SENT_TO_CUSTOMER: { label: 'Đã gửi khách', className: 'border-teal-200 bg-teal-50 text-teal-700' },
  CONFIRMED: { label: 'Đã đặt hàng', className: 'border-[#D4AF37]/30 bg-[#FBF6E9] text-[#9B7630]' },
  CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-50 text-slate-500' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
}

export function StatsCards() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    quotesApi.list()
      .then((q) => {
        setQuotes(q)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setMounted(true)
      })
  }, [])

  const computedStats = useMemo(() => {
    const total = quotes.length
    const pending = quotes.filter((q) => q.status === 'PENDING').length
    const needMoreInfo = quotes.filter((q) => q.status === 'NEED_MORE_INFO').length
    const quoting = quotes.filter((q) => q.status === 'QUOTING').length
    const quoted = quotes.filter((q) => q.status === 'QUOTED' || q.status === 'SENT_TO_CUSTOMER').length
    const pricedTotal = quotes.filter(hasPricedData).length

    const confirmedCount = quotes.flatMap((q) => {
      if (q.options && q.options.length > 0) {
        return q.options.filter((opt) => opt.isConfirmed) as any[]
      } else if (q.status === 'CONFIRMED') {
        return [q] as any[]
      }
      return [] as any[]
    }).length

    const cancelledCount = quotes.flatMap((q) => {
      if (q.options && q.options.length > 0) {
        return q.options.filter((opt) => opt.isCancelled) as any[]
      } else if (q.status === 'CANCELLED') {
        return [q] as any[]
      }
      return [] as any[]
    }).length

    const confirmedRevenue = quotes.reduce((sum, q) => {
      const quantity = Number(q.quantity) || 1
      if (q.options && q.options.length > 0) {
        const confirmedOptionsTotal = q.options
          .filter((opt) => opt.isConfirmed)
          .reduce((s, opt) => s + (Number(opt.sellingPrice) || 0), 0)
        return sum + confirmedOptionsTotal * quantity
      } else if (q.status === 'CONFIRMED') {
        return sum + getQuoteValue(q) * quantity
      }
      return sum
    }, 0)

    const resolvedCount = confirmedCount + cancelledCount
    const conversionRate = resolvedCount > 0 ? Math.round((confirmedCount / resolvedCount) * 100) : 0

    return {
      total,
      pending,
      needMoreInfo,
      quoting,
      quoted,
      pricedTotal,
      confirmed: confirmedCount,
      confirmedRevenue,
      conversionRate,
    }
  }, [quotes])

  const conversionRate = computedStats.conversionRate

  const avgQuoteValue = useMemo(() => {
    const pricedQuotes = quotes.filter(hasPricedData)
    if (!pricedQuotes.length) return 0
    return Math.round(pricedQuotes.reduce((sum, q) => sum + getQuoteValue(q), 0) / pricedQuotes.length)
  }, [quotes])

  const trendChartData = useMemo(() => {
    const datesMap: Record<string, { date: string; count: number; priced: number }> = {}

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      datesMap[key] = {
        date: d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
        count: 0,
        priced: 0,
      }
    }

    quotes.forEach((q) => {
      if (!q.createdAt) return
      const key = q.createdAt.split('T')[0]
      if (!datesMap[key]) return
      datesMap[key].count += 1
      if (hasPricedData(q)) datesMap[key].priced += 1
    })

    return Object.values(datesMap)
  }, [quotes])

  const materialChartData = useMemo(() => {
    const counts: Record<string, number> = {}

    quotes.forEach((q) => {
      if (q.options?.length) {
        q.options.forEach((option) => {
          counts[option.materialType] = (counts[option.materialType] || 0) + 1
        })
        return
      }
      counts[q.materialType] = (counts[q.materialType] || 0) + 1
    })

    return Object.entries(counts).map(([type, value]) => ({
      name: formatMaterialType(type),
      value,
    }))
  }, [quotes])

  const priorityQuotes = useMemo(() => {
    const priorityScore = (q: Quote) => {
      const createdAt = new Date(q.createdAt).getTime()
      const ageDays = Number.isFinite(createdAt) ? Math.max(0, (Date.now() - createdAt) / 86_400_000) : 0
      const statusScore: Record<string, number> = {
        PENDING: 90,
        QUOTING: 78,
        NEED_MORE_INFO: 68,
        QUOTED: 58,
        SENT_TO_CUSTOMER: 42,
        CONFIRMED: 10,
        CANCELLED: 0,
      }
      return (statusScore[q.status] ?? 20) + Math.min(ageDays * 6, 28) + Math.min(getQuoteValue(q) / 5_000_000, 10)
    }

    return [...quotes]
      .filter((q) => q.status !== 'CONFIRMED' && q.status !== 'CANCELLED')
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, 5)
  }, [quotes])

  // Tính toán các insight không trùng lặp

  const trendingMaterial = useMemo(() => {
    if (!materialChartData.length) return null
    return [...materialChartData].sort((a, b) => b.value - a.value)[0]
  }, [materialChartData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse border-luxury shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="space-y-3">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="h-7 w-16 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statsItems = [
    {
      title: 'Tổng yêu cầu',
      value: computedStats.total,
      icon: FileText,
      tone: 'text-amber-700',
      badge: 'bg-amber-500/10',
      accent: 'border-amber-200/70',
      note: 'Toàn bộ pipeline',
    },
    {
      title: 'Chờ xử lý',
      value: computedStats.pending,
      icon: Clock,
      tone: 'text-orange-600',
      badge: 'bg-orange-500/10',
      accent: 'border-orange-200/70',
      note: 'Cần báo giá',
    },
    {
      title: 'Đang chờ gửi khách',
      value: computedStats.quoted,
      icon: CheckCircle2,
      tone: 'text-emerald-600',
      badge: 'bg-emerald-500/10',
      accent: 'border-emerald-200/70',
      note: 'Đã báo giá',
    },
    {
      title: 'Lượt admin báo giá',
      value: computedStats.pricedTotal,
      icon: Calculator,
      tone: 'text-sky-700',
      badge: 'bg-sky-500/10',
      accent: 'border-sky-200/70',
      note: 'Tổng đã tính giá',
    },
    {
      title: 'Đã đặt hàng',
      value: computedStats.confirmed,
      icon: ShoppingCart,
      tone: 'text-teal-700',
      badge: 'bg-teal-500/10',
      accent: 'border-teal-200/70',
      note: `${conversionRate}% tỉ lệ chốt`,
    },
    {
      title: 'Doanh thu',
      value: computedStats.confirmedRevenue,
      icon: TrendingUp,
      tone: 'text-[#B4904C]',
      badge: 'bg-[#D4AF37]/10',
      accent: 'border-[#D4AF37]/30',
      note: 'Đơn đã chốt',
      isCurrency: true,
    },
  ]

  return (
    <div className="space-y-6">
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(251,246,233,0.82))] shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(212,175,55,0.16),transparent_42%)]" />
            <CardContent className="relative z-10 p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9B7630] shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI operations cockpit
                  </div>
                  <h2 className="font-serif text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
                    Tổng quan vận hành báo giá
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Theo dõi hiệu suất báo giá, chất liệu được yêu cầu và các việc cần ưu tiên trong một màn hình quản trị gọn.
                  </p>
                </div>

                <div className="w-full max-w-md rounded-2xl border border-border/70 bg-white/80 p-3 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Hỏi AI: báo giá nào cần xử lý hôm nay?
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>

      <motion.section
        className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statsItems.map((stat) => {
          const Icon = stat.icon

          return (
            <motion.div key={stat.title} variants={itemVariants}>
              <Card
                className={cn(
                  'group relative overflow-hidden border-luxury bg-white shadow-sm transition-all-smooth hover:-translate-y-1 hover:shadow-md',
                  stat.accent,
                )}
              >
                <Icon className={cn('pointer-events-none absolute right-4 top-3 h-20 w-20 opacity-[0.08] transition-all duration-300 group-hover:scale-110', stat.tone)} />
                <CardContent className="relative z-10 flex min-h-[124px] items-center gap-4 p-5">
                  <span className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', stat.badge, stat.tone)}>
                    <Icon className="h-6 w-6" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {stat.title}
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground">
                      <AnimatedNumber
                        value={stat.value}
                        duration={1.35}
                        formatter={stat.isCurrency ? formatCurrency : undefined}
                      />
                    </h3>
                    <p className={cn('mt-2 text-[10px] font-bold uppercase tracking-wide', stat.tone)}>
                      {stat.note}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.section>

      {mounted && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-luxury bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Xu hướng báo giá 7 ngày
              </CardTitle>
              <CardDescription>Số yêu cầu mới và số lượt admin đã tính giá theo ngày</CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="adminRequestCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adminPricedCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="count" name="Yêu cầu mới" stroke="#D4AF37" strokeWidth={2} fill="url(#adminRequestCount)" />
                  <Area type="monotone" dataKey="priced" name="Đã báo giá" stroke="#0EA5E9" strokeWidth={2} fill="url(#adminPricedCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-luxury bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Cơ cấu chất liệu
              </CardTitle>
              <CardDescription>Số lượng chất liệu xuất hiện trong các yêu cầu báo giá</CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-4">
              {materialChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Chưa có dữ liệu chất liệu
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="relative h-full max-h-52 w-full flex-1">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="font-serif text-2xl font-bold text-foreground">{materialChartData.reduce((sum, item) => sum + item.value, 0)}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">chất liệu</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={materialChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={78}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {materialChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:w-48 sm:flex-col sm:justify-start">
                    {materialChartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: MATERIAL_COLORS[index % MATERIAL_COLORS.length] }}
                        />
                        <span className="font-medium text-foreground">{entry.name}:</span>
                        <span className="font-bold text-[#B4904C]">{entry.value} đơn</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <Card className="overflow-hidden border-luxury bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b bg-[#FBFAF7] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gem className="h-4 w-4 text-primary" />
              Hàng chờ ưu tiên
            </CardTitle>
            <CardDescription>Các báo giá nên được admin xử lý hoặc theo dõi trước</CardDescription>
          </div>
          <Badge variant="outline" className="border-[#D4AF37]/30 bg-white text-[#9B7630]">
            {priorityQuotes.length} mục cần xem
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {priorityQuotes.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Không có báo giá nào cần ưu tiên lúc này.
            </div>
          ) : (
            <div className="divide-y">
              {priorityQuotes.map((quote, index) => {
                const status = STATUS_LABELS[quote.status] ?? { label: quote.status, className: '' }
                const value = getQuoteValue(quote)

                return (
                  <motion.div
                    key={quote._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.28 }}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#FBF6E9]/45 md:grid-cols-[1.1fr_0.8fr_0.7fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#9B7630]">{quote.quoteCode}</span>
                        <Badge variant="outline" className={cn('h-6 rounded-full px-2 text-[10px] font-bold', status.className)}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{quote.productName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Sale: {quote.requestedBy}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">{formatMaterialType(quote.materialType)}</span>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Giá trị</p>
                      <p className="font-serif text-sm font-bold text-foreground">{value ? formatCurrency(value) : '-'}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className="text-xs font-medium text-muted-foreground">{formatDate(quote.createdAt)}</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted-foreground">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

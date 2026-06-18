'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Gem,
  Layers,
  ShoppingBag,
  TrendingUp,
  UserRound,
  XCircle,
  Crown,
  Medal,
  Award,
  ListTodo,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { quotesApi } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import type { Quote, QuoteStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const MATERIAL_COLORS = [
  'url(#goldGrad)',       // Vàng 24K
  'url(#platinumGrad)',   // Bạch kim
  'url(#gold14Grad)',     // Vàng 14K
  'url(#tealGrad)',       // Vàng 10K
  'url(#purpleGrad)',     // Vàng 18K
  'url(#roseGrad)',       // Vàng 610
  'url(#amberGrad)',      // Bạc 925
]

const MATERIAL_BORDER_COLORS = [
  '#E6C687',
  '#CBD5E1',
  '#C5A880',
  '#0EA5E9',
  '#A855F7',
  '#F43F5E',
  '#F59E0B',
]

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

function getQuoteValue(q: Quote) {
  const confirmedOptionsTotal = q.options
    ?.filter((opt) => opt.isConfirmed)
    .reduce((sum, opt) => sum + (Number(opt.sellingPrice) || 0), 0) ?? 0
  const confirmedPrice = Number(q.confirmedPrice) || 0
  const optionPrice = q.options?.find((opt) => opt.isConfirmed && (opt.sellingPrice ?? 0) > 0)?.sellingPrice
  const fallbackOption = q.options?.find((opt) => (opt.sellingPrice ?? 0) > 0)?.sellingPrice
  return confirmedOptionsTotal || confirmedPrice || q.sellingPrice || optionPrice || fallbackOption || 0
}

function getQuoteQuantity(q: Quote) {
  return Number(q.quantity) || 1
}

function isInSelectedMonth(iso: string | undefined, month: number, year: number) {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === year && date.getMonth() + 1 === month
}

function formatDate(iso: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('vi-VN')
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      bounce: 0.08,
      duration: 0.45,
    },
  },
}

export function BusinessAnalytics() {
  const now = new Date()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  // Tab điều khiển danh sách đơn thành công / đơn hủy
  const [activeListTab, setActiveListTab] = useState<'success' | 'cancelled'>('success')

  useEffect(() => {
    quotesApi.list()
      .then(setQuotes)
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }, [])

  const selectedMonth = Number(month)
  const selectedYear = Number(year)

  const analytics = useMemo(() => {
    // 1. Tất cả quotes được tạo trong tháng (được Sale hỏi giá)
    const requests = quotes.filter((q) => isInSelectedMonth(q.createdAt, selectedMonth, selectedYear))

    // 2. Tất cả quotes được cập nhật/hoàn thành trong tháng
    const resolved = quotes.filter((q) => isInSelectedMonth(q.updatedAt, selectedMonth, selectedYear))

    // 3. Đơn chốt thành công và đơn hủy trong tháng (tính theo phân loại/option)
    const confirmed = resolved.flatMap((q) => {
      if (q.options && q.options.length > 0) {
        return q.options
          .filter((opt) => opt.isConfirmed)
          .map((opt) => ({
            ...q,
            materialType: opt.materialType,
            sellingPrice: Number(opt.sellingPrice) || 0,
            options: [opt],
          }))
      } else if (q.status === 'CONFIRMED') {
        return [q]
      }
      return []
    })

    const cancelled = resolved.flatMap((q) => {
      if (q.options && q.options.length > 0) {
        return q.options
          .filter((opt) => opt.isCancelled)
          .map((opt) => ({
            ...q,
            materialType: opt.materialType,
            sellingPrice: Number(opt.sellingPrice) || 0,
            options: [opt],
          }))
      } else if (q.status === 'CANCELLED') {
        return [q]
      }
      return []
    })

    // 4. Số lần Admin ĐÃ BÁO GIÁ trong tháng
    const adminPricedList = resolved.filter(
      (q) => q.quotedBy || ['QUOTED', 'SENT_TO_CUSTOMER', 'CONFIRMED', 'CANCELLED'].includes(q.status)
    )
    const adminPricedCount = adminPricedList.length

    const resolvedCount = confirmed.length + cancelled.length
    const revenue = confirmed.reduce((sum, q) => sum + getQuoteValue(q) * getQuoteQuantity(q), 0)
    const conversionRate = resolvedCount > 0 ? Math.round((confirmed.length / resolvedCount) * 100) : 0

    // Thống kê chi tiết chất liệu đã chốt
    const materialCounts: Record<string, { count: number; revenue: number }> = {}
    confirmed.forEach((q) => {
      const confirmedOptions = q.options?.filter((opt) => opt.isConfirmed) ?? []
      const materials = confirmedOptions.length ? confirmedOptions : [{ materialType: q.materialType, sellingPrice: getQuoteValue(q) }]

      materials.forEach((item: any) => {
        const type = item.materialType
        materialCounts[type] = materialCounts[type] || { count: 0, revenue: 0 }
        materialCounts[type].count += 1
        materialCounts[type].revenue += (Number(item.sellingPrice) || getQuoteValue(q)) * getQuoteQuantity(q)
      })
    })

    // Thống kê danh sách Sale tạo yêu cầu (hỏi giá nhiều nhất)
    const salesMap: Record<string, { name: string; requests: number; confirmed: number; cancelled: number; revenue: number }> = {}
    requests.forEach((q) => {
      const name = q.requestedBy || 'Không rõ'
      salesMap[name] = salesMap[name] || { name, requests: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      salesMap[name].requests += 1
    })
    resolved.forEach((q) => {
      const name = q.requestedBy || 'Không rõ'
      salesMap[name] = salesMap[name] || { name, requests: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          if (opt.isConfirmed) {
            salesMap[name].confirmed += 1
            salesMap[name].revenue += (Number(opt.sellingPrice) || 0) * getQuoteQuantity(q)
          }
          if (opt.isCancelled) {
            salesMap[name].cancelled += 1
          }
        })
      } else {
        if (q.status === 'CONFIRMED') {
          salesMap[name].confirmed += 1
          salesMap[name].revenue += getQuoteValue(q) * getQuoteQuantity(q)
        }
        if (q.status === 'CANCELLED') {
          salesMap[name].cancelled += 1
        }
      }
    })

    const detailRows = resolved
      .filter((q) => {
        const hasResolvedOptions = q.options?.some((opt) => opt.isConfirmed || opt.isCancelled)
        return q.status === 'CONFIRMED' || q.status === 'CANCELLED' || hasResolvedOptions
      })
      .flatMap((q) => {
        let optionRows: any[] = []
        if (q.options && q.options.length > 0) {
          optionRows = q.options.filter((opt) => opt.isConfirmed || opt.isCancelled)
        }
        const rows = optionRows.length
          ? optionRows
          : [{ materialType: q.materialType, sellingPrice: getQuoteValue(q), isConfirmed: q.status === 'CONFIRMED', isCancelled: q.status === 'CANCELLED' }]

        return rows.map((item: any, index) => {
          const itemConfirmed = item.isConfirmed !== undefined ? item.isConfirmed : (item.isConfirmed || q.status === 'CONFIRMED')
          return {
            id: `${q._id}-${itemConfirmed ? 'CONFIRMED' : 'CANCELLED'}-${item.materialType ?? index}`,
            quoteCode: q.quoteCode,
            productName: q.productName,
            requestedBy: q.requestedBy,
            materialType: item.materialType ?? q.materialType,
            value: (Number(item.sellingPrice) || getQuoteValue(q)) * getQuoteQuantity(q),
            status: itemConfirmed ? 'CONFIRMED' : 'CANCELLED' as QuoteStatus,
            date: q.updatedAt,
            optionIndex: index + 1,
            optionCount: rows.length,
            notes: q.notes,
          }
        })
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const detailGroups = Object.values(
      detailRows.reduce((groups: Record<string, {
        quoteCode: string
        productName: string
        requestedBy: string
        date: string
        totalValue: number
        successCount: number
        cancelCount: number
        rows: typeof detailRows
      }>, row) => {
        groups[row.quoteCode] = groups[row.quoteCode] || {
          quoteCode: row.quoteCode,
          productName: row.productName,
          requestedBy: row.requestedBy,
          date: row.date,
          totalValue: 0,
          successCount: 0,
          cancelCount: 0,
          rows: [],
        }
        groups[row.quoteCode].totalValue += row.value
        groups[row.quoteCode].successCount += row.status === 'CONFIRMED' ? 1 : 0
        groups[row.quoteCode].cancelCount += row.status === 'CANCELLED' ? 1 : 0
        groups[row.quoteCode].rows.push(row)
        return groups
      }, {})
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      requests,
      confirmed,
      cancelled,
      adminPricedCount,
      revenue,
      conversionRate,
      materialData: Object.entries(materialCounts)
        .map(([type, data]) => ({ type, name: formatMaterialType(type), count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count),
      resultData: [
        { name: 'Thành công (Chốt)', value: confirmed.length, color: '#10B981' },
        { name: 'Huỷ bỏ', value: cancelled.length, color: '#EF4444' },
      ],
      topSales: Object.values(salesMap).sort((a, b) => b.requests - a.requests).slice(0, 5),
      detailRows,
      detailGroups,
    }
  }, [quotes, selectedMonth, selectedYear])

  const years = useMemo(() => {
    const quoteYears = quotes.flatMap((q) => [q.createdAt, q.updatedAt])
      .filter(Boolean)
      .map((iso) => new Date(iso).getFullYear())
      .filter((value) => Number.isFinite(value))
    return Array.from(new Set([now.getFullYear(), ...quoteYears])).sort((a, b) => b - a)
  }, [quotes, now])

  // Cấu hình 5 thẻ KPI sang trọng hiển thị chính xác các chỉ số yêu cầu
  const kpis = [
    {
      label: 'Doanh thu tháng',
      value: analytics.revenue,
      icon: TrendingUp,
      tone: 'text-[#D4AF37] dark:text-[#E6C687]',
      border: 'border-[#EBE6DA] dark:border-[#383126]/60 border-t-2 border-t-[#D4AF37]',
      glow: 'shadow-[0_0_15px_rgba(212,175,55,0.06)]',
      bg: 'bg-gradient-to-br from-[#D4AF37]/5 to-[#D4AF37]/10 dark:from-[#E6C687]/15 dark:to-transparent',
      formatter: formatCurrency,
      desc: 'Doanh số chốt thành công',
    },
    {
      label: 'Lượt Admin đã báo giá',
      value: analytics.adminPricedCount,
      icon: FileText,
      tone: 'text-[#9B7630] dark:text-[#C5A880]',
      border: 'border-[#EBE6DA] dark:border-[#383126]/60 border-t-2 border-t-[#9B7630]',
      glow: 'shadow-[0_0_15px_rgba(155,118,48,0.05)]',
      bg: 'bg-gradient-to-br from-amber-600/5 to-amber-600/10',
      desc: 'Tổng số lượt tính & hoàn thành báo giá',
    },
    {
      label: 'Đơn chốt thành công',
      value: analytics.confirmed.length,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-[#EBE6DA] dark:border-[#383126]/60 border-t-2 border-t-emerald-500',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.04)]',
      bg: 'bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-500/15 dark:to-transparent',
      desc: 'Khách hàng chốt đặt đơn',
    },
    {
      label: 'Đơn yêu cầu bị huỷ',
      value: analytics.cancelled.length,
      icon: XCircle,
      tone: 'text-rose-600 dark:text-rose-400',
      border: 'border-[#EBE6DA] dark:border-[#383126]/60 border-t-2 border-t-rose-500',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.04)]',
      bg: 'bg-gradient-to-br from-rose-500/5 to-rose-500/10 dark:from-rose-500/15 dark:to-transparent',
      desc: 'Khách hủy hoặc từ chối giá',
    },
    {
      label: 'Tỉ lệ chốt đơn',
      value: analytics.conversionRate,
      icon: BarChart3,
      tone: 'text-sky-600 dark:text-sky-400',
      border: 'border-[#EBE6DA] dark:border-[#383126]/60 border-t-2 border-t-sky-500',
      glow: 'shadow-[0_0_15px_rgba(14,165,233,0.04)]',
      bg: 'bg-gradient-to-br from-sky-500/5 to-sky-500/10 dark:from-sky-500/15 dark:to-transparent',
      suffix: '%',
      desc: 'Đơn chốt / Đơn đã giải quyết',
    },
  ]

  // Lọc riêng danh sách chốt thành công và danh sách hủy
  const successList = analytics.detailGroups.filter(g => g.successCount > 0)
  const cancelledList = analytics.detailGroups.filter(g => g.cancelCount > 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12 relative"
    >
      {/* Background Soft Glows */}
      <div className="absolute top-20 left-1/4 w-[350px] h-[350px] bg-amber-500/[0.02] dark:bg-amber-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[350px] h-[350px] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* SVG Gradients for premium Recharts rendering */}
      <svg className="absolute w-0 h-0 invisible">
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="platinumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="gold14Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#C084FC" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E11D48" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#FB7185" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.2} />
          </linearGradient>
        </defs>
      </svg>

      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#EFEBE4] dark:border-[#2A241C] pb-6"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#9B7630] dark:text-[#E6C687] shadow-sm backdrop-blur-sm">
            <Gem className="h-3.5 w-3.5" />
            Báo cáo phân tích cao cấp
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2c241a] dark:text-[#E5DDD3] sm:text-4xl">
            Báo cáo kinh doanh
          </h1>
          <p className="mt-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
            Thống kê kết quả kinh doanh định kỳ, cơ cấu doanh thu và bảng xếp hạng đội ngũ Sale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-10 w-[138px] bg-white/80 dark:bg-card/80 border-[#E2DCCE] dark:border-[#383126] backdrop-blur-md text-sm font-semibold rounded-xl hover:border-[#D4AF37]/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E2DCCE] dark:border-[#383126]">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 w-[116px] bg-white/80 dark:bg-card/80 border-[#E2DCCE] dark:border-[#383126] backdrop-blur-md text-sm font-semibold rounded-xl hover:border-[#D4AF37]/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E2DCCE] dark:border-[#383126]">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 gap-2 bg-white/80 dark:bg-card/80 border-[#E2DCCE] dark:border-[#383126] rounded-xl hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/45 text-sm font-semibold transition-all">
            <Download className="h-4 w-4 text-[#9B7630] dark:text-[#E6C687]" />
            Xuất báo cáo
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards Grid - 5 Columns */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative group"
            >
              <Card className={cn(
                'relative overflow-hidden bg-white dark:bg-[#12110F]/85 border-luxury transition-all duration-300 rounded-[20px] p-4.5 min-h-[132px] flex flex-col justify-between hover:border-[#D4AF37]/40 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(212,175,55,0.06)]',
                kpi.border,
                kpi.glow
              )}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
                <Icon className={cn('pointer-events-none absolute right-3 bottom-3 h-14 w-14 opacity-[0.04] group-hover:scale-110 transition-transform duration-500', kpi.tone)} />

                <div className="flex items-start gap-2.5">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner border border-[#EBE6DA] dark:border-[#383126]/20', kpi.bg, kpi.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#9E8E7A] dark:text-[#A99F8D] truncate">{kpi.label}</p>
                    <p className="text-[8px] font-medium text-muted-foreground line-clamp-1 leading-none mt-1">{kpi.desc}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <p className="font-serif text-xl font-extrabold text-[#2C241A] dark:text-[#EAE3D5] tracking-tight tabular-nums">
                    {kpi.formatter ? kpi.formatter(kpi.value) : `${kpi.value}${kpi.suffix ?? ''}`}
                  </p>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-amber-500/5 px-1.5 py-0.5 rounded border border-[#EBE6DA] dark:border-[#383126]">
                    Tháng {selectedMonth}
                  </span>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.section>

      {/* Main Charts Row */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]"
      >
        {/* Material Bar Chart Card (Chi tiết chất liệu đã chốt) */}
        <Card className="border-luxury bg-white dark:bg-[#12110F]/85 rounded-[24px] overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#9B7630] dark:text-[#E6C687]">
                <Layers className="h-4.5 w-4.5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-[#2c241a] dark:text-[#E5DDD3] font-serif">
                  Chất liệu khách đã chốt trong tháng
                </CardTitle>
                <CardDescription className="text-xs">Phân bổ số lượng đơn hàng chốt thành công và doanh thu theo loại vàng, bạc</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-3 sm:px-6 space-y-6">
            <div className="h-72">
              {analytics.materialData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <Layers className="h-8 w-8 opacity-20" />
                  Chưa có đơn hàng chốt thành công trong tháng này.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.materialData} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontWeight: 600 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--muted-foreground)', fontWeight: 600 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(212, 175, 55, 0.03)', radius: 6 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          const colorIdx = analytics.materialData.findIndex((x) => x.type === data.type)
                          const color = MATERIAL_BORDER_COLORS[colorIdx % MATERIAL_BORDER_COLORS.length]
                          return (
                            <div className="rounded-2xl border border-[#E2DCCE] dark:border-[#383126] bg-white/95 dark:bg-[#1C1A17]/95 p-3.5 shadow-xl backdrop-blur-md">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full animate-ping" style={{ backgroundColor: color }} />
                                <p className="text-xs font-bold text-[#2c241a] dark:text-[#E5DDD3]">{data.name}</p>
                              </div>
                              <div className="mt-2.5 space-y-1 border-t border-[#EBE6DA]/50 dark:border-[#383126]/30 pt-1.5">
                                <p className="text-[10px] text-muted-foreground">
                                  Số đơn chốt: <strong className="text-foreground font-bold">{data.count}</strong>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Tổng giá trị chốt: <strong className="text-[#9B7630] dark:text-[#E6C687] font-extrabold">{formatCurrency(data.revenue)}</strong>
                                </p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {analytics.materialData.map((entry, index) => (
                        <Cell key={entry.type} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bảng chi tiết kê khai từng chất liệu đã chốt */}
            {analytics.materialData.length > 0 && (
              <div className="border border-[#EBE6DA] dark:border-[#383126]/60 rounded-2xl overflow-hidden bg-white/30 dark:bg-transparent">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-[#EBE6DA] dark:border-[#383126]/60">
                      <th className="p-3 font-extrabold uppercase tracking-wider text-[#9E8E7A]">Chất liệu đã chốt</th>
                      <th className="p-3 font-extrabold uppercase tracking-wider text-[#9E8E7A] text-center w-28">Số đơn chốt</th>
                      <th className="p-3 font-extrabold uppercase tracking-wider text-[#9E8E7A] text-right w-44">Doanh thu chốt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE6DA]/50 dark:divide-[#383126]/30">
                    {analytics.materialData.map((row, idx) => (
                      <tr key={row.type} className="hover:bg-amber-500/[0.01] transition-colors">
                        <td className="p-3 font-bold flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MATERIAL_BORDER_COLORS[idx % MATERIAL_BORDER_COLORS.length] }} />
                          {row.name}
                        </td>
                        <td className="p-3 text-center font-semibold tabular-nums">{row.count} đơn</td>
                        <td className="p-3 text-right font-bold text-[#9B7630] dark:text-[#E6C687] tabular-nums">{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Rate Card */}
        <Card className="border-luxury bg-white dark:bg-[#12110F]/85 rounded-[24px] overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#9B7630] dark:text-[#E6C687]">
                <ShoppingBag className="h-4.5 w-4.5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-[#2c241a] dark:text-[#E5DDD3] font-serif">
                  Tỷ lệ chốt & Kết quả báo giá
                </CardTitle>
                <CardDescription className="text-xs">So sánh trực quan kết quả chốt đơn và hủy bỏ</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {analytics.confirmed.length + analytics.cancelled.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <ShoppingBag className="h-8 w-8 opacity-20" />
                Chưa có dữ liệu chốt hoặc hủy trong tháng này.
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-between gap-4">
                <div className="relative h-52 w-full flex items-center justify-center">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="font-serif text-4xl font-extrabold text-[#2C241A] dark:text-[#EAE3D5] tracking-tight">{analytics.conversionRate}%</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E8E7A] dark:text-[#A99F8D] mt-0.5">Tỉ lệ chốt</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.resultData}
                        innerRadius={68}
                        outerRadius={88}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {analytics.resultData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        contentStyle={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #E2DCCE',
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid w-full grid-cols-2 gap-3 pb-2">
                  {analytics.resultData.map((entry) => (
                    <div key={entry.name} className="relative rounded-2xl border border-[#EBE6DA]/85 dark:border-[#383126]/60 bg-white/60 dark:bg-[#151310]/55 p-3 text-center shadow-inner">
                      <span className="absolute top-3.5 left-3.5 h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E8E7A] dark:text-[#A99F8D]">{entry.name}</p>
                      <p className="mt-1.5 font-serif text-2xl font-bold text-[#2C241A] dark:text-[#EAE3D5] tabular-nums leading-none">{entry.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Leaderboard and Transaction Feed Section */}
      <motion.section
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]"
      >
        {/* Top Sales Leaderboard (Ai hỏi nhiều nhất / tạo yêu cầu nhiều nhất) */}
        <Card className="border-luxury bg-white dark:bg-[#12110F]/85 rounded-[24px] overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 text-[#9B7630] dark:text-[#E6C687]">
                <UserRound className="h-4.5 w-4.5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-[#2c241a] dark:text-[#E5DDD3] font-serif">
                  Nhân viên hỏi giá nhiều nhất
                </CardTitle>
                <CardDescription className="text-xs">Xếp hạng năng suất nhân viên Sale dựa trên tổng số yêu cầu báo giá đã gửi trong tháng</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-4 px-4 sm:px-6">
            {analytics.topSales.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <UserRound className="h-8 w-8 opacity-20" />
                Chưa có hoạt động tạo yêu cầu trong tháng.
              </div>
            ) : (
              analytics.topSales.map((sale, index) => {
                const isTop1 = index === 0
                const isTop2 = index === 1
                const isTop3 = index === 2

                return (
                  <motion.div
                    key={sale.name}
                    whileHover={{ scale: 1.018, x: 4, transition: { duration: 0.15 } }}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md',
                      isTop1
                        ? 'border-[#D4AF37]/45 bg-gradient-to-r from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent dark:from-[#D4AF37]/15 dark:to-transparent'
                        : isTop2
                          ? 'border-[#CBD5E1]/60 bg-gradient-to-r from-slate-100/60 to-transparent dark:from-slate-800/25 dark:to-transparent'
                          : isTop3
                            ? 'border-amber-600/25 bg-gradient-to-r from-amber-600/[0.04] to-transparent dark:from-amber-600/[0.08] dark:to-transparent'
                            : 'border-[#EBE6DA]/85 dark:border-[#383126]/60 bg-white/40 dark:bg-[#151310]/40'
                    )}
                  >
                    {isTop1 && (
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-xl pointer-events-none" />
                    )}

                    {/* Medal Badge */}
                    <span className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-serif font-bold text-sm relative z-10 shadow-sm border',
                      isTop1
                        ? 'bg-gradient-to-br from-[#FDE047] via-[#F59E0B] to-[#D4AF37] text-white border-[#FBBF24]/50'
                        : isTop2
                          ? 'bg-gradient-to-br from-slate-50 to-slate-200 text-slate-700 border-slate-300/60 dark:from-slate-700 dark:to-slate-800 dark:text-slate-100 dark:border-slate-600/50'
                          : isTop3
                            ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border-amber-200 dark:from-amber-950 dark:to-amber-900 dark:text-amber-200 dark:border-amber-800/40'
                            : 'bg-muted/40 text-muted-foreground border-transparent'
                    )}>
                      {isTop1 ? <Crown className="h-5 w-5 animate-bounce" style={{ animationDuration: '3s' }} /> : isTop2 ? <Medal className="h-5 w-5" /> : isTop3 ? <Award className="h-5 w-5" /> : index + 1}
                    </span>

                    <div className="min-w-0 flex-1 relative z-10">
                      <p className="truncate text-sm font-bold text-[#3C352E] dark:text-[#E8E2D7] tracking-tight">{sale.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> {sale.confirmed} chốt
                        </span>
                        <span className="text-muted-foreground/30 text-[9px] font-bold">•</span>
                        <span className="text-[10px] text-rose-500 font-extrabold flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" /> {sale.cancelled} huỷ
                        </span>
                      </div>
                    </div>

                    <div className="text-right relative z-10 border-l border-[#EBE6DA] dark:border-[#383126]/40 pl-4">
                      <p className="font-serif text-2xl font-extrabold text-[#2C241A] dark:text-[#EAE3D5] leading-none tabular-nums">{sale.requests}</p>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground mt-1.5">yêu cầu</p>
                    </div>
                  </motion.div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Detailed Success / Cancelled Transactions Tabbed Card */}
        <Card className="overflow-hidden border-luxury bg-white dark:bg-[#12110F]/85 rounded-[24px] hover:shadow-md transition-shadow">
          <CardHeader className="p-0 border-b border-[#EBE6DA]/85 dark:border-[#383126]/60 bg-[#FAFAF8]/70 dark:bg-[#12110F]/40">
            {/* Header Tabs */}
            <div className="flex border-b border-[#EBE6DA]/60 dark:border-[#383126]/30">
              <button
                onClick={() => setActiveListTab('success')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-4 text-xs font-extrabold uppercase tracking-widest transition-all border-b-2',
                  activeListTab === 'success'
                    ? 'border-[#D4AF37] text-[#9B7630] dark:text-[#E6C687] bg-white/40 dark:bg-card/25'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Đơn thành công ({successList.length})
              </button>
              <button
                onClick={() => setActiveListTab('cancelled')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-4 text-xs font-extrabold uppercase tracking-widest transition-all border-b-2',
                  activeListTab === 'cancelled'
                    ? 'border-[#D4AF37] text-[#9B7630] dark:text-[#E6C687] bg-white/40 dark:bg-card/25'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <XCircle className="h-4 w-4 text-rose-500" />
                Đơn đã hủy ({cancelledList.length})
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">Đang tải dữ liệu...</div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto divide-y divide-[#E6DFD0]/60 dark:divide-[#332A1C]/40 scrollbar-thin">
                {activeListTab === 'success' ? (
                  successList.length === 0 ? (
                    <div className="flex h-60 flex-col items-center justify-center text-sm text-[#9E8E7A] gap-1.5 p-4">
                      <CheckCircle2 className="h-8 w-8 opacity-20 text-emerald-500" />
                      Không có đơn thành công nào trong tháng này.
                    </div>
                  ) : (
                    successList.map((group) => (
                      <div key={group.quoteCode} className="transition-colors hover:bg-emerald-500/[0.005]">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-emerald-50/20 dark:bg-emerald-950/5 px-5 py-3 border-y border-[#ECE6D9] dark:border-[#383126]/30 first:border-t-0">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-extrabold text-[#6B5E4C] dark:text-[#C5A880] tracking-wider">{group.quoteCode}</span>
                              <span className="text-[10px] text-muted-foreground font-bold bg-white/95 dark:bg-card/95 px-2.5 py-0.5 rounded-full border border-[#ECE6D9] dark:border-[#383126]/40">
                                Sale: {group.requestedBy}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">{formatDate(group.date)}</span>
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate mt-1">{group.productName}</p>
                          </div>
                          <div className="text-right border-l border-[#EBE6DA] dark:border-[#383126]/40 pl-4">
                            <span className="mr-2 text-[9px] font-extrabold uppercase tracking-widest text-[#9E8E7A]">Tổng chốt</span>
                            <span className="font-serif text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatCurrency(group.totalValue)}
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-[#F0E8DA]/40 dark:divide-[#2D2820]/25 bg-white/20 dark:bg-transparent">
                          {group.rows.filter(r => r.status === 'CONFIRMED').map((row) => (
                            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3 hover:bg-emerald-500/[0.01] transition-colors">
                              <div>
                                <p className="text-xs font-bold text-[#3A352E] dark:text-[#E8E2D7]">
                                  {formatMaterialType(row.materialType)}
                                </p>
                                <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5">Phân loại #{row.optionIndex}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{formatDate(row.date)}</span>
                              <p className="text-right text-xs font-bold text-foreground tabular-nums">{formatCurrency(row.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  cancelledList.length === 0 ? (
                    <div className="flex h-60 flex-col items-center justify-center text-sm text-[#9E8E7A] gap-1.5 p-4">
                      <XCircle className="h-8 w-8 opacity-20 text-rose-500" />
                      Không có đơn hủy bỏ nào trong tháng này.
                    </div>
                  ) : (
                    cancelledList.map((group) => (
                      <div key={group.quoteCode} className="transition-colors hover:bg-rose-500/[0.005]">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-rose-50/20 dark:bg-rose-950/5 px-5 py-3 border-y border-[#ECE6D9] dark:border-[#383126]/30 first:border-t-0">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-extrabold text-rose-600 tracking-wider">{group.quoteCode}</span>
                              <span className="text-[10px] text-muted-foreground font-bold bg-white/95 dark:bg-card/95 px-2.5 py-0.5 rounded-full border border-[#ECE6D9] dark:border-[#383126]/40">
                                Sale: {group.requestedBy}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">{formatDate(group.date)}</span>
                            </div>
                            <p className="text-xs font-semibold text-foreground truncate mt-1">{group.productName}</p>
                          </div>
                          <div className="text-right border-l border-[#EBE6DA] dark:border-[#383126]/40 pl-4">
                            <span className="mr-2 text-[9px] font-extrabold uppercase tracking-widest text-[#9E8E7A]">Giá trị hủy</span>
                            <span className="font-serif text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                              {formatCurrency(group.totalValue)}
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-[#F0E8DA]/40 dark:divide-[#2D2820]/25 bg-white/20 dark:bg-transparent">
                          {group.rows.filter(r => r.status === 'CANCELLED').map((row) => (
                            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-3 hover:bg-rose-500/[0.01] transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[#3A352E] dark:text-[#E8E2D7]">
                                  {formatMaterialType(row.materialType)}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <p className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Phân loại #{row.optionIndex}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{formatDate(row.date)}</span>
                              <p className="text-right text-xs font-bold text-foreground tabular-nums">{formatCurrency(row.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { quotesApi, statsApi, type QuoteStats } from '@/lib/api'
import type { Quote, QuoteStatus } from '@/lib/types'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import {
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface SaleDashboardProps {
  currentUserName: string
  search?: string
  onCreateSuccess?: (q: Quote) => void
  onViewAll?: () => void
}

const STATUS_MAP: Record<QuoteStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'CHỜ BÁO GIÁ',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-50/80',
  },
  NEED_MORE_INFO: {
    label: 'CẦN BỔ SUNG',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-50/80 animate-pulse',
  },
  QUOTING: {
    label: 'ĐANG XỬ LÝ',
    badgeClass: 'border-purple-200 bg-purple-50 text-purple-600',
  },
  QUOTED: {
    label: 'ĐÃ BÁO GIÁ',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-50/80',
  },
  SENT_TO_CUSTOMER: {
    label: 'ĐÃ GỬI KH',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-600',
  },
  CONFIRMED: {
    label: 'ĐÃ DUYỆT',
    badgeClass: 'border-[#d4af37]/30 bg-[#fbf6e9] text-[#b4904c] hover:bg-[#fbf6e9]/80',
  },
  CANCELLED: {
    label: 'ĐÃ HUỶ',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-500',
  },
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
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

const MATERIAL_COLORS = ['#d4af37', '#b4904c', '#9ca3af', '#78350f', '#f59e0b', '#4b5563']

export function SaleDashboard({ currentUserName, search = '', onCreateSuccess, onViewAll }: SaleDashboardProps) {
  const [stats, setStats] = useState<QuoteStats | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const myQuotes = useMemo(() => {
    return quotes.filter((q) => q.requestedBy === currentUserName)
  }, [quotes, currentUserName])

  const { addNotification } = useNotifications()

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      statsApi.get().catch(() => null),
      quotesApi.list().catch(() => []),
    ]).then(([s, q]) => {
      setStats(s)
      setQuotes(q)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    setMounted(true)
  }, [])

  // ─── Calculations for Analytics & Charts ───

  // 1. Pipeline performance metrics
  const performanceMetrics = useMemo(() => {
    const confirmedQuotes = myQuotes.filter((q) => q.status === 'CONFIRMED')
    
    const totalSalesVal = confirmedQuotes.reduce((sum, q) => {
      const quantity = Number(q.quantity) || 1
      if (q.options && q.options.length > 0) {
        const confirmedOptionsTotal = q.options
          .filter((opt) => opt.isConfirmed)
          .reduce((s, opt) => s + (Number(opt.sellingPrice) || 0), 0)
        return sum + confirmedOptionsTotal * quantity
      }
      return sum + (q.confirmedPrice || q.sellingPrice || 0) * quantity
    }, 0)
    
    const urgentCount = myQuotes.filter((q) => q.status === 'NEED_MORE_INFO').length
    
    const completedCount = myQuotes.filter((q) => ['CONFIRMED', 'CANCELLED'].includes(q.status)).length
    const confirmedCount = confirmedQuotes.length
    const conversionRate = completedCount > 0 ? Math.round((confirmedCount / completedCount) * 100) : 0

    return {
      totalSalesVal,
      urgentCount,
      conversionRate
    }
  }, [myQuotes])

  // 2. Trend analysis chart data (Last 7 days)
  const trendChartData = useMemo(() => {
    const datesMap: Record<string, { date: string; count: number; value: number }> = {}
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })
      const key = d.toISOString().split('T')[0]
      datesMap[key] = { date: label, count: 0, value: 0 }
    }

    // Populate from quotes
    myQuotes.forEach((q) => {
      if (!q.createdAt) return
      const key = q.createdAt.split('T')[0]
      if (datesMap[key]) {
        datesMap[key].count += 1
        let val = q.sellingPrice || 0
        if (q.options && q.options.length > 0) {
          val = q.options.reduce((s, opt) => s + (Number(opt.sellingPrice) || 0), 0)
        }
        datesMap[key].value += val
      }
    })

    return Object.values(datesMap)
  }, [myQuotes])

  // 3. Materials breakdown pie chart data
  const materialChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    myQuotes.forEach((q) => {
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          counts[opt.materialType] = (counts[opt.materialType] || 0) + 1
        })
      } else {
        counts[q.materialType] = (counts[q.materialType] || 0) + 1
      }
    })

    return Object.entries(counts).map(([type, value]) => ({
      name: formatMaterialType(type),
      value,
    }))
  }, [myQuotes])

  // 4. Monthly confirmed materials breakdown
  const monthlyConfirmedMaterials = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const counts: Record<string, number> = {}

    myQuotes.forEach((q) => {
      if (q.status !== 'CONFIRMED') return
      
      const date = new Date(q.updatedAt)
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return
      
      const qty = Number(q.quantity) || 1
      if (q.options && q.options.length > 0) {
        let hasConfirmedOption = false
        q.options.forEach((opt) => {
          if (opt.isConfirmed) {
            counts[opt.materialType] = (counts[opt.materialType] || 0) + qty
            hasConfirmedOption = true
          }
        })
        if (!hasConfirmedOption) {
          counts[q.materialType] = (counts[q.materialType] || 0) + qty
        }
      } else {
        counts[q.materialType] = (counts[q.materialType] || 0) + qty
      }
    })

    return Object.entries(counts).map(([type, value]) => ({
      name: formatMaterialType(type),
      value,
    })).sort((a, b) => b.value - a.value)
  }, [myQuotes])


  return (
    <div className="space-y-6">
      
      {/* ── Title & Actions header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground tracking-wide flex items-center gap-2">
            Hệ thống báo giá trang sức
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Bảng điều khiển hoạt động kinh doanh dành cho bộ phận Sale
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {/* Nút Tạo yêu cầu báo giá */}
          <QuoteRequestModal
            requesterName={currentUserName}
            onSuccess={(q) => { fetchData(); onCreateSuccess?.(q) }}
          />
          {/* Nút reload */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="p-2.5 rounded-lg text-muted-foreground hover:text-[#b4904c] hover:bg-muted transition-all border border-border/60 shadow-sm bg-white"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </motion.button>
        </div>
      </div>

      {/* ── Performance Stats row ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Số lượng yêu cầu báo giá của bản thân */}
        <Card className="hover:shadow-md transition-all-smooth relative overflow-hidden border-luxury shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Layers className="w-20 h-20 text-[#b4904c]" />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yêu cầu của tôi</p>
              <h3 className="text-2xl font-serif font-bold text-foreground mt-0.5">
                {myQuotes.length} <span className="text-xs font-normal text-muted-foreground">đơn</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Doanh số đã chốt */}
        <Card className="hover:shadow-md transition-all-smooth relative overflow-hidden border-luxury shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="w-20 h-20 text-[#b4904c]" />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-[#b4904c] shrink-0">
              <TrendingUp className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Doanh số đã chốt</p>
              <h3 className="text-2xl font-serif font-bold text-foreground mt-0.5">
                {formatCurrency(performanceMetrics.totalSalesVal)}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Cần xử lý gấp */}
        <Card className="hover:shadow-md transition-all-smooth relative overflow-hidden border-luxury shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <AlertCircle className="w-20 h-20 text-rose-600" />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chờ bổ sung thông tin</p>
              <h3 className="text-2xl font-serif font-bold text-foreground mt-0.5 flex items-center gap-2">
                {performanceMetrics.urgentCount}
                {performanceMetrics.urgentCount > 0 && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-rose-700 bg-rose-50 border border-rose-200/50 animate-pulse">
                    Khẩn cấp
                  </span>
                )}
              </h3>
            </div>
          </CardContent>
        </Card>

        {/* Tỷ lệ chốt đơn */}
        <Card className="hover:shadow-md transition-all-smooth relative overflow-hidden border-luxury shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <CheckCircle2 className="w-20 h-20 text-emerald-600" />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tỷ lệ chốt thành công</p>
              <h3 className="text-2xl font-serif font-bold text-foreground mt-0.5">
                {performanceMetrics.conversionRate}%
              </h3>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Charts / Analytics Section ── */}
      {mounted && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Request Volume Trend */}
          <Card className="border-luxury shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif font-semibold text-foreground tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Xu hướng yêu cầu báo giá (7 ngày qua)
              </CardTitle>
              <CardDescription>Biểu thị số lượng yêu cầu gửi đi hàng ngày</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} allowDecimals={false} />
                  <ChartTooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    labelClassName="text-xs font-semibold text-zinc-900"
                  />
                  <Area type="monotone" dataKey="count" name="Yêu cầu" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Chart 2: Materials distribution */}
          <Card className="border-luxury shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif font-semibold text-foreground tracking-wide flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Cơ cấu chất liệu trang sức yêu cầu
              </CardTitle>
              <CardDescription>Số lượng yêu cầu phân bổ theo chất liệu</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-4 flex flex-col justify-between">
              {materialChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Chưa có dữ liệu chất liệu
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-full">
                  <div className="flex-1 w-full h-full max-h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={materialChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {materialChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Legends list */}
                  <div className="flex flex-wrap sm:flex-col gap-x-4 gap-y-1.5 justify-center sm:justify-start shrink-0 text-xs">
                    {materialChartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MATERIAL_COLORS[index % MATERIAL_COLORS.length] }} />
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{entry.name}:</span>
                        <span className="font-bold text-[#b4904c]">{entry.value} đơn</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Monthly Confirmed Materials */}
          <Card className="border-luxury shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-serif font-semibold text-foreground tracking-wide flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Chất liệu đã chốt tháng này
              </CardTitle>
              <CardDescription>Số lượng chất liệu khách của bạn đã chốt trong tháng</CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-4 flex flex-col justify-start overflow-y-auto">
              {monthlyConfirmedMaterials.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground animate-pulse">
                  Chưa có chất liệu nào được chốt trong tháng này
                </div>
              ) : (
                <div className="space-y-3 pr-1 w-full">
                  {monthlyConfirmedMaterials.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 hover:bg-muted/30 transition-all p-1 rounded">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-medium text-xs text-zinc-700 dark:text-zinc-300">{entry.name}</span>
                      </div>
                      <span className="font-bold text-xs text-[#b4904c] bg-[#fbf6e9] px-2.5 py-0.5 rounded-full border border-[#d4af37]/25">
                        {entry.value} món
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </section>
      )}


    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { quotesApi, statsApi, type QuoteStats } from '@/lib/api'
import type { Quote, QuoteStatus } from '@/lib/types'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import {
  LayoutDashboard,
  Hourglass,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Activity,
  Layers,
  Calendar,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  const [activeActionTab, setActiveActionTab] = useState<'urgent' | 'progress'>('urgent')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedQuoteForConfirm, setSelectedQuoteForConfirm] = useState<Quote | null>(null)
  const [selectedOptionsToConfirm, setSelectedOptionsToConfirm] = useState<any[]>([])
  const [confirmingQuote, setConfirmingQuote] = useState(false)

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
    const confirmedQuotes = quotes.filter((q) => q.status === 'CONFIRMED')
    
    const totalSalesVal = confirmedQuotes.reduce((sum, q) => {
      const quantity = Number((q as any).quantity) || 1
      if (q.options && q.options.length > 0) {
        const confirmedOptionsTotal = q.options
          .filter((opt) => opt.isConfirmed)
          .reduce((s, opt) => s + (Number(opt.sellingPrice) || 0), 0)
        return sum + confirmedOptionsTotal * quantity
      }
      return sum + ((q as any).confirmedPrice || q.sellingPrice || 0) * quantity
    }, 0)
    
    const urgentCount = quotes.filter((q) => q.status === 'NEED_MORE_INFO').length
    
    const completedCount = quotes.filter((q) => ['CONFIRMED', 'CANCELLED'].includes(q.status)).length
    const confirmedCount = confirmedQuotes.length
    const conversionRate = completedCount > 0 ? Math.round((confirmedCount / completedCount) * 100) : 0

    return {
      totalSalesVal,
      urgentCount,
      conversionRate
    }
  }, [quotes])

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
    quotes.forEach((q) => {
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
  }, [quotes])

  // 3. Materials breakdown pie chart data
  const materialChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    quotes.forEach((q) => {
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
  }, [quotes])

  // 4. Action Center lists (filtered by Search if user searches)
  const actionQuotes = useMemo(() => {
    const filteredQuotes = quotes.filter((q) => {
      return (
        search === '' ||
        q.productName.toLowerCase().includes(search.toLowerCase()) ||
        q.quoteCode.toLowerCase().includes(search.toLowerCase())
      )
    })

    const urgent = filteredQuotes.filter((q) =>
      ['NEED_MORE_INFO', 'QUOTED', 'SENT_TO_CUSTOMER'].includes(q.status)
    )

    const progress = filteredQuotes.filter((q) =>
      ['PENDING', 'QUOTING'].includes(q.status)
    )

    return {
      urgent,
      progress
    }
  }, [quotes, search])

  // ─── Actions Handlers ───
  const handleSentToCustomer = async (id: string, name: string) => {
    try {
      await quotesApi.sentToCustomer(id)
      addNotification({ type: 'success', title: '📤 Đã gửi giá cho khách', message: `"${name}" đang chờ khách phản hồi.` })
      fetchData()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể cập nhật trạng thái.' })
    }
  }

  const handleConfirm = async (id: string, name: string) => {
    const q = quotes.find((x) => x._id === id)
    if (!q) return

    const options = q.options || []
    if (options.length > 1) {
      setSelectedQuoteForConfirm(q)
      setSelectedOptionsToConfirm([options[0]])
      setConfirmModalOpen(true)
    } else {
      const singleOption = options.length === 1 ? options[0] : null
      const priceVal = singleOption?.sellingPrice || q.sellingPrice || 0
      const matLabel = singleOption ? ` (${formatMaterialType(singleOption.materialType)})` : ''
      if (confirm(`Bạn có chắc chắn muốn chốt báo giá cho "${name}"${matLabel} với giá ${formatCurrency(priceVal)} không?`)) {
        try {
          await quotesApi.confirm(id, singleOption || undefined)
          addNotification({ type: 'success', title: '🎉 Khách chốt đơn!', message: `"${name}"${matLabel} đã được đặt hàng thành công.` })
          fetchData()
        } catch {
          addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể xác nhận đơn.' })
        }
      }
    }
  }

  const doConfirmMultiOption = async () => {
    if (!selectedQuoteForConfirm || selectedOptionsToConfirm.length === 0) return
    setConfirmingQuote(true)
    const id = selectedQuoteForConfirm._id
    const name = selectedQuoteForConfirm.productName
    const opts = selectedOptionsToConfirm
    const matLabels = opts.map(o => formatMaterialType(o.materialType)).join(', ')
    try {
      await quotesApi.confirm(id, undefined, opts)
      addNotification({ type: 'success', title: '🎉 Khách chốt đơn!', message: `"${name}" (${matLabels}) đã được đặt hàng thành công.` })
      setConfirmModalOpen(false)
      setSelectedQuoteForConfirm(null)
      setSelectedOptionsToConfirm([])
      fetchData()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể xác nhận đơn.' })
    } finally {
      setConfirmingQuote(false)
    }
  }

  const handleCancel = async (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn huỷ báo giá "${name}"?`)) {
      try {
        await quotesApi.cancel(id)
        addNotification({ type: 'warning', title: 'Báo giá đã huỷ', message: `Yêu cầu "${name}" đã bị huỷ.` })
        fetchData()
      } catch {
        addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể huỷ báo giá.' })
      }
    }
  }

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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
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
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
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
              <CardDescription>Số lượng yêu cầu phân bổ theo phân loại chất liệu</CardDescription>
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
        </section>
      )}

      {/* ── Action Center Section ── */}
      <section>
        <Card className="border-luxury shadow-sm overflow-hidden">
          
          {/* Card Header with tabs */}
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b bg-card">
            <div>
              <h2 className="text-lg font-serif font-semibold text-foreground tracking-wide flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Trung tâm tác vụ yêu cầu
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Xử lý nhanh các yêu cầu theo trạng thái công việc</p>
            </div>

            {/* Tab switchers */}
            <div className="flex bg-[#e2e8f0]/40 p-0.5 rounded-lg border border-border/40 text-xs font-semibold">
              <button
                onClick={() => setActiveActionTab('urgent')}
                className={cn(
                  'px-4 py-1.5 rounded-md transition-all duration-200 tracking-wider text-[10px] font-bold flex items-center gap-1.5',
                  activeActionTab === 'urgent'
                    ? 'bg-[#6e5812] text-white shadow-sm'
                    : 'text-[#64748b] hover:text-[#b4904c] hover:bg-white/40'
                )}
              >
                CẦN XỬ LÝ NGAY
                {actionQuotes.urgent.length > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[8px] font-extrabold rounded-full bg-rose-500 text-white leading-none">
                    {actionQuotes.urgent.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveActionTab('progress')}
                className={cn(
                  'px-4 py-1.5 rounded-md transition-all duration-200 tracking-wider text-[10px] font-bold',
                  activeActionTab === 'progress'
                    ? 'bg-[#6e5812] text-white shadow-sm'
                    : 'text-[#64748b] hover:text-[#b4904c] hover:bg-white/40'
                )}
              >
                ĐANG CHỜ BÁO GIÁ
              </button>
            </div>
          </div>

          {/* List display */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF6E9] border-b border-[#EDE8DE]">
                  {['Mã yêu cầu', 'Sản phẩm', 'Chất liệu', 'Ngày tạo', 'Giá bán', 'Trạng thái', 'Thao tác'].map((h) => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B5E4C] h-10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100/60">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${60 + (j * 15) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (activeActionTab === 'urgent' ? actionQuotes.urgent : actionQuotes.progress).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-xs text-muted-foreground font-medium bg-muted/5">
                      <div className="max-w-sm mx-auto space-y-2">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-60" />
                        <p className="font-semibold text-zinc-700">Tuyệt vời! Không có yêu cầu nào cần xử lý</p>
                        <p className="text-[11px] text-muted-foreground">Tất cả các báo giá của bạn đã được cập nhật ổn định.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (activeActionTab === 'urgent' ? actionQuotes.urgent : actionQuotes.progress).map((q, i) => {
                    const st = STATUS_MAP[q.status] ?? { label: q.status, badgeClass: 'border-slate-200 bg-slate-50 text-slate-500' }
                    return (
                      <motion.tr
                        key={q._id}
                        onClick={() => onCreateSuccess?.(q)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                        whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.02)' }}
                        className="border-b border-border/40 hover:bg-muted/10 transition-all duration-200 group cursor-pointer"
                      >
                        <td className="px-5 py-3.5 text-xs font-bold text-[#b4904c] tracking-wider font-mono align-top">{q.quoteCode}</td>
                        <td className="px-5 py-3.5 align-top">
                          <span className="text-xs font-semibold text-foreground group-hover:text-[#b4904c] transition-colors">
                            {q.productName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#526071] font-medium align-top">
                          <div className="space-y-1">
                            {q.options && q.options.length > 0 ? (
                              q.options.map((opt) => (
                                <div key={opt.materialType} className="h-5 flex items-center">
                                  {formatMaterialType(opt.materialType)}
                                </div>
                              ))
                            ) : (
                              <div className="h-5 flex items-center">{formatMaterialType(q.materialType)}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground align-top pt-[17px]">{formatDate(q.createdAt)}</td>
                        <td className="px-5 py-3.5 text-xs font-bold text-[#b4904c] tracking-wide align-top">
                          <div className="space-y-1">
                            {q.options && q.options.length > 0 ? (
                              q.options.map((opt, idx) => (
                                <div key={idx} className="h-5 flex items-center justify-start tabular-nums">
                                  {opt.sellingPrice ? formatCurrency(opt.sellingPrice) : '—'}
                                </div>
                              ))
                            ) : (
                              <div className="h-5 flex items-center">
                                {q.sellingPrice ? formatCurrency(q.sellingPrice) : 'Chờ tính giá'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 align-top pt-[14px]">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border', st.badgeClass)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right align-top pt-[11px]">
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* NEED_MORE_INFO: Bổ sung */}
                            {q.status === 'NEED_MORE_INFO' && (
                              <button
                                onClick={() => onCreateSuccess?.(q)}
                                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm"
                              >
                                Bổ sung
                              </button>
                            )}

                            {/* QUOTED: Xem giá + Gửi khách */}
                            {q.status === 'QUOTED' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => onCreateSuccess?.(q)}
                                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#64748b] bg-white border border-[#e2e8f0] hover:bg-[#e2e8f0]/30 rounded-md transition-colors shadow-sm h-7"
                                >
                                  XEM GIÁ
                                </button>
                                <button
                                  onClick={() => handleSentToCustomer(q._id, q.productName)}
                                  className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-[#4a5568] hover:bg-[#3d4656] rounded-md transition-colors shadow-sm h-7"
                                >
                                  GỬI KHÁCH
                                </button>
                              </div>
                            )}

                            {/* SENT_TO_CUSTOMER: Khách chốt + Huỷ */}
                            {q.status === 'SENT_TO_CUSTOMER' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleConfirm(q._id, q.productName)}
                                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
                                >
                                  Khách chốt
                                </button>
                                <button
                                  onClick={() => handleCancel(q._id, q.productName)}
                                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-sm"
                                >
                                  Huỷ
                                </button>
                              </div>
                            )}

                            {/* Other statuses: Xem */}
                            {!['NEED_MORE_INFO', 'QUOTED', 'SENT_TO_CUSTOMER'].includes(q.status) && (
                              <button
                                onClick={() => onCreateSuccess?.(q)}
                                className="p-1 rounded-md text-muted-foreground hover:text-[#b4904c] hover:bg-muted transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Card footer redirecting to quotes tab */}
          {onViewAll && (
            <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-center">
              <Button
                variant="ghost"
                onClick={onViewAll}
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5"
              >
                Xem toàn bộ lịch sử yêu cầu báo giá
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </section>
      {/* Modal xác nhận chốt đơn cho nhiều phân loại */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[480px] border-[#D4AF37]/35 bg-white shadow-lg rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-serif text-xl font-bold text-[#8C6D1F]">
              Xác nhận khách chốt đơn
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yêu cầu <span className="font-mono font-bold text-foreground">{selectedQuoteForConfirm?.quoteCode}</span> có nhiều tùy chọn chất liệu. Vui lòng chọn đúng chất liệu khách đã chốt:
            </DialogDescription>
          </DialogHeader>

          {selectedQuoteForConfirm && (
            <div className="py-4 space-y-3">
              {(selectedQuoteForConfirm.options || []).map((opt) => {
                const isSelected = selectedOptionsToConfirm.some(o => o.materialType === opt.materialType)
                return (
                  <div
                    key={opt.materialType}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedOptionsToConfirm(selectedOptionsToConfirm.filter(o => o.materialType !== opt.materialType))
                      } else {
                        setSelectedOptionsToConfirm([...selectedOptionsToConfirm, opt])
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                      isSelected
                        ? "border-[#B4904C] bg-[#FBF6E9]/60 shadow-sm"
                        : "border-border/60 hover:border-[#B4904C]/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isSelected
                          ? "border-[#B4904C] bg-[#B4904C] text-white"
                          : "border-muted-foreground/40 bg-white"
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className={cn("font-bold text-sm", isSelected ? "text-[#8C6D1F]" : "text-[#3A352E]")}>
                          {formatMaterialType(opt.materialType)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {opt.weightChi ? `${opt.weightChi} chi` : opt.weightGram ? `${opt.weightGram} gram` : '—'}
                        </p>
                      </div>
                    </div>
                    <p className="font-extrabold text-sm text-[#A97800]">
                      {opt.sellingPrice ? formatCurrency(opt.sellingPrice) : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <DialogFooter className="flex flex-row gap-2 justify-end sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmModalOpen(false)
                setSelectedQuoteForConfirm(null)
                setSelectedOptionsToConfirm([])
              }}
              className="flex-1 sm:flex-none h-9 text-xs font-semibold rounded-lg border-border/60"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={doConfirmMultiOption}
              disabled={confirmingQuote || selectedOptionsToConfirm.length === 0}
              className="flex-1 sm:flex-none h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 shadow-sm"
            >
              {confirmingQuote ? 'Đang xử lý...' : 'Xác nhận chốt đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

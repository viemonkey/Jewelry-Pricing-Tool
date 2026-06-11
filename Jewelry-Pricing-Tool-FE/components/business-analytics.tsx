'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { quotesApi } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import type { Quote } from '@/lib/types'
import { cn } from '@/lib/utils'

const MATERIAL_COLORS = ['#D4AF37', '#B4904C', '#64748B', '#0F766E', '#7C3AED', '#E11D48', '#F59E0B']

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
  const anyQuote = q as any
  const confirmedPrice = Number(anyQuote.confirmedPrice) || 0
  const optionPrice = q.options?.find((opt) => opt.isConfirmed && (opt.sellingPrice ?? 0) > 0)?.sellingPrice
  const fallbackOption = q.options?.find((opt) => (opt.sellingPrice ?? 0) > 0)?.sellingPrice
  return confirmedPrice || q.sellingPrice || optionPrice || fallbackOption || 0
}

function getQuoteQuantity(q: Quote) {
  return Number((q as any).quantity) || 1
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

export function BusinessAnalytics() {
  const now = new Date()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  useEffect(() => {
    quotesApi.list()
      .then(setQuotes)
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }, [])

  const selectedMonth = Number(month)
  const selectedYear = Number(year)

  const analytics = useMemo(() => {
    const requests = quotes.filter((q) => isInSelectedMonth(q.createdAt, selectedMonth, selectedYear))
    const resolved = quotes.filter((q) => isInSelectedMonth(q.updatedAt, selectedMonth, selectedYear))
    const confirmed = resolved.filter((q) => q.status === 'CONFIRMED')
    const cancelled = resolved.filter((q) => q.status === 'CANCELLED')
    const resolvedCount = confirmed.length + cancelled.length
    const revenue = confirmed.reduce((sum, q) => sum + getQuoteValue(q) * getQuoteQuantity(q), 0)
    const conversionRate = resolvedCount > 0 ? Math.round((confirmed.length / resolvedCount) * 100) : 0

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

    const salesMap: Record<string, { name: string; requests: number; confirmed: number; cancelled: number; revenue: number }> = {}
    requests.forEach((q) => {
      const name = q.requestedBy || 'Không rõ'
      salesMap[name] = salesMap[name] || { name, requests: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      salesMap[name].requests += 1
    })
    resolved.forEach((q) => {
      const name = q.requestedBy || 'Không rõ'
      salesMap[name] = salesMap[name] || { name, requests: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      if (q.status === 'CONFIRMED') {
        salesMap[name].confirmed += 1
        salesMap[name].revenue += getQuoteValue(q) * getQuoteQuantity(q)
      }
      if (q.status === 'CANCELLED') salesMap[name].cancelled += 1
    })

    return {
      requests,
      confirmed,
      cancelled,
      revenue,
      conversionRate,
      materialData: Object.entries(materialCounts)
        .map(([type, data]) => ({ type, name: formatMaterialType(type), count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count),
      resultData: [
        { name: 'Thành công', value: confirmed.length, color: '#059669' },
        { name: 'Hủy', value: cancelled.length, color: '#E11D48' },
      ],
      topSales: Object.values(salesMap).sort((a, b) => b.requests - a.requests).slice(0, 5),
      detailRows: resolved
        .filter((q) => q.status === 'CONFIRMED' || q.status === 'CANCELLED')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 12),
    }
  }, [quotes, selectedMonth, selectedYear])

  const years = useMemo(() => {
    const quoteYears = quotes.flatMap((q) => [q.createdAt, q.updatedAt])
      .filter(Boolean)
      .map((iso) => new Date(iso).getFullYear())
      .filter((value) => Number.isFinite(value))
    return Array.from(new Set([now.getFullYear(), ...quoteYears])).sort((a, b) => b - a)
  }, [quotes, now])

  const kpis = [
    {
      label: 'Doanh thu tháng',
      value: analytics.revenue,
      icon: TrendingUp,
      tone: 'text-[#B4904C]',
      bg: 'bg-[#D4AF37]/10',
      formatter: formatCurrency,
    },
    {
      label: 'Đơn chốt',
      value: analytics.confirmed.length,
      icon: CheckCircle2,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Đơn hủy',
      value: analytics.cancelled.length,
      icon: XCircle,
      tone: 'text-rose-700',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Tỉ lệ chốt',
      value: analytics.conversionRate,
      icon: BarChart3,
      tone: 'text-sky-700',
      bg: 'bg-sky-500/10',
      suffix: '%',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9B7630] shadow-sm">
            <Gem className="h-3.5 w-3.5" />
            Monthly business analytics
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-wide text-foreground sm:text-3xl">
            Phân tích kinh doanh
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Báo cáo hiệu suất theo tháng: chất liệu khách chốt, đơn hủy, đơn thành công và top Sale.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-10 w-[138px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 w-[116px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 gap-2 bg-white">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="relative overflow-hidden border-luxury bg-white shadow-sm">
                <Icon className={cn('pointer-events-none absolute right-4 top-4 h-20 w-20 opacity-[0.08]', kpi.tone)} />
                <CardContent className="flex min-h-[122px] items-center gap-4 p-5">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', kpi.bg, kpi.tone)}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-foreground">
                      {kpi.formatter ? kpi.formatter(kpi.value) : `${kpi.value}${kpi.suffix ?? ''}`}
                    </p>
                    <p className={cn('mt-2 text-[10px] font-bold uppercase tracking-wide', kpi.tone)}>
                      Tháng {selectedMonth}/{selectedYear}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-luxury bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-primary" />
              Chất liệu khách đã chốt
            </CardTitle>
            <CardDescription>Số đơn thành công phân bổ theo chất liệu trong tháng</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {analytics.materialData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có đơn chốt trong tháng này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.materialData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E1D6" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    formatter={(value, name) => [value, name === 'count' ? 'Số đơn' : name]}
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" name="Số đơn" radius={[8, 8, 0, 0]}>
                    {analytics.materialData.map((entry, index) => (
                      <Cell key={entry.type} fill={MATERIAL_COLORS[index % MATERIAL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-luxury bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Kết quả báo giá
            </CardTitle>
            <CardDescription>Tỉ lệ thành công và hủy trong tháng</CardDescription>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {analytics.confirmed.length + analytics.cancelled.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có báo giá chốt hoặc hủy trong tháng này.
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-between gap-4">
                <div className="relative h-52 w-full">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="font-serif text-3xl font-bold text-foreground">{analytics.conversionRate}%</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">tỉ lệ chốt</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.resultData} innerRadius={64} outerRadius={86} paddingAngle={4} dataKey="value">
                        {analytics.resultData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid w-full grid-cols-2 gap-3">
                  {analytics.resultData.map((entry) => (
                    <div key={entry.name} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{entry.name}</p>
                      <p className="mt-1 font-serif text-xl font-bold text-foreground">{entry.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-luxury bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-primary" />
              Top Sale tạo yêu cầu
            </CardTitle>
            <CardDescription>Sale có số yêu cầu báo giá nhiều nhất trong tháng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {analytics.topSales.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Chưa có yêu cầu trong tháng này.
              </div>
            ) : (
              analytics.topSales.map((sale, index) => (
                <div key={sale.name} className="flex items-center gap-3 rounded-xl border border-border/60 bg-[#FBFAF7] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/10 font-serif font-bold text-[#9B7630]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{sale.name}</p>
                    <p className="text-xs text-muted-foreground">{sale.confirmed} chốt · {sale.cancelled} hủy</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-bold text-foreground">{sale.requests}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">yêu cầu</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-luxury bg-white shadow-sm">
          <CardHeader className="border-b bg-[#FBFAF7] pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Chi tiết báo cáo tháng
            </CardTitle>
            <CardDescription>Các báo giá đã chốt hoặc hủy trong tháng được chọn</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Đang tải dữ liệu...</div>
            ) : analytics.detailRows.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu chi tiết.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8F9FA]">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Mã</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Sale</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Chất liệu</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Giá trị</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Trạng thái</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.detailRows.map((quote) => (
                    <TableRow key={quote._id}>
                      <TableCell className="font-mono text-xs font-semibold">{quote.quoteCode}</TableCell>
                      <TableCell className="text-sm">{quote.requestedBy}</TableCell>
                      <TableCell className="text-sm">{formatMaterialType(quote.materialType)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(getQuoteValue(quote) * getQuoteQuantity(quote))}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded-full text-[10px] font-bold',
                            quote.status === 'CONFIRMED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700',
                          )}
                        >
                          {quote.status === 'CONFIRMED' ? 'Thành công' : 'Hủy'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(quote.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { quotesApi, statsApi, type QuoteStats } from '@/lib/api'
import type { Quote, QuoteStatus } from '@/lib/types'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { formatCurrency } from '@/lib/pricing'
import {
  LayoutDashboard,
  Hourglass,
  BadgeDollarSign,
  Eye,
  MoreVertical,
  Search,
  Bell,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'

// ─── types ──────────────────────────────────────────────────────────
interface SaleDashboardProps {
  currentUserName: string
  onCreateSuccess?: (q: Quote) => void
}

const STATUS_MAP: Record<QuoteStatus, { label: string; gold: boolean }> = {
  PENDING:          { label: 'CHỜ BÁO GIÁ',   gold: false },
  NEED_MORE_INFO:   { label: 'CẦN BỔ SUNG',    gold: false },
  QUOTING:          { label: 'ĐANG XỬ LÝ',     gold: false },
  QUOTED:           { label: 'ĐÃ BÁO GIÁ',     gold: true  },
  SENT_TO_CUSTOMER: { label: 'ĐÃ GỬI KH',      gold: true  },
  CONFIRMED:        { label: 'ĐÃ DUYỆT',       gold: true  },
  CANCELLED:        { label: 'ĐÃ HUỶ',         gold: false },
  IN_PRODUCTION:    { label: 'SẢN XUẤT',       gold: true  },
}

// weekly bar chart data (last 7 days static for display)
const WEEK_BARS = [
  { day: 'T2', h: 40 },
  { day: 'T3', h: 55 },
  { day: 'T4', h: 75 },
  { day: 'T5', h: 35 },
  { day: 'T6', h: 100 },
  { day: 'T7', h: 25 },
  { day: 'CN', h: 15 },
]

// ─── helpers ────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN')
}

// ─── sub-components ─────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-xl border border-white/10 bg-white/70 backdrop-blur-2xl shadow-[0_4px_24px_-1px_rgba(0,0,0,0.05)] ${className}`}
    >
      {/* Gold rim top-left */}
      <div className="pointer-events-none absolute inset-0 rounded-xl"
        style={{ background: 'linear-gradient(135deg, rgba(115,92,0,0.12) 0%, transparent 50%)', borderRadius: 'inherit' }} />
      {children}
    </div>
  )
}

function StatCard({
  icon, label, value, badge, children, delay = 0,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  badge?: React.ReactNode
  children?: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.025, transition: { duration: 0.25 } }}
    >
      <GlassCard className="p-6 cursor-default">
        <div className="flex items-start justify-between mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#735c00]/10 text-[#735c00]">
            {icon}
          </span>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#735c00] bg-[#735c00]/5 px-2 py-1 rounded">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4d4635]">{label}</p>
        <h3 className="text-4xl font-light tracking-tight text-[#1a1c1a] mt-1" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
          {value}
        </h3>
        {children}
      </GlassCard>
    </motion.div>
  )
}

// ─── main ───────────────────────────────────────────────────────────
export function SaleDashboard({ currentUserName, onCreateSuccess }: SaleDashboardProps) {
  const [stats, setStats] = useState<QuoteStats | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'approved' | 'new'>('all')
  const [page, setPage] = useState(1)
  const perPage = 6

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

  useEffect(() => { fetchData() }, [])

  // filter + search
  const filtered = quotes.filter(q => {
    const matchSearch =
      search === '' ||
      q.productName.toLowerCase().includes(search.toLowerCase()) ||
      q.quoteCode.toLowerCase().includes(search.toLowerCase())

    const matchFilter =
      filter === 'all' ? true :
      filter === 'approved' ? ['CONFIRMED', 'QUOTED', 'SENT_TO_CUSTOMER'].includes(q.status) :
      /* new */ q.status === 'PENDING'

    return matchSearch && matchFilter
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // category breakdown
  const confirmed = quotes.filter(q => q.status === 'CONFIRMED').length
  const pending = quotes.filter(q => q.status === 'PENDING').length
  const other = quotes.length - confirmed - pending

  return (
    <div className="min-h-screen bg-[#faf9f6] font-sans">
      {/* Inject Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse-gold {
          0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 0 0 rgba(115,92,0,.2)}
          50%{opacity:.7;transform:scale(1.1);box-shadow:0 0 10px 2px rgba(115,92,0,.1)}
        }
        .status-pulse-gold{animation:pulse-gold 3s infinite ease-in-out}
      `}</style>

      {/* ── header ──────────────────────────────────────────── */}
      <header className="flex justify-between items-end mb-8">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[32px] font-normal text-[#1a1c1a]"
            style={{ fontFamily: 'EB Garamond, Georgia, serif' }}
          >
            Bảng điều khiển báo giá
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-[#4d4635] mt-1"
          >
            Hôm nay: {today}
          </motion.p>
        </div>

        <div className="flex gap-3 items-center">
          {/* search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f7663]" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm báo giá..."
              className="bg-[#efeeeb] border border-black/5 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#735c00] w-60 transition-all"
            />
          </div>
          {/* bell */}
          <button className="bg-[#e9e8e5] p-2 rounded-lg text-[#4d4635] hover:text-[#735c00] transition-colors border border-black/[0.03]">
            <Bell className="w-5 h-5" />
          </button>
          {/* refresh */}
          <button
            onClick={fetchData}
            className="bg-[#e9e8e5] p-2 rounded-lg text-[#4d4635] hover:text-[#735c00] transition-colors border border-black/[0.03]"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── stat cards ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Báo giá hôm nay"
          value={stats?.total ?? '—'}
          badge="+12% vs tuần trước"
          delay={0.05}
        >
          <div className="mt-4 h-1 w-full bg-black/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#735c00] shadow-[0_0_10px_rgba(115,92,0,0.15)]"
              initial={{ width: 0 }}
              animate={{ width: '66%' }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
        </StatCard>

        <StatCard
          icon={<Hourglass className="w-5 h-5 text-[#4d4635]" />}
          label="Đang chờ duyệt"
          value={stats?.pending ?? '—'}
          badge="Cần xử lý"
          delay={0.15}
        >
          <div className="mt-4 flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[#735c00] status-pulse-gold inline-block" />
            <span className="w-2 h-2 rounded-full bg-black/10 inline-block" />
            <span className="w-2 h-2 rounded-full bg-black/10 inline-block" />
          </div>
        </StatCard>

        <StatCard
          icon={<BadgeDollarSign className="w-5 h-5" />}
          label="Đã xác nhận"
          value={stats?.confirmed ?? '—'}
          badge="Tháng này"
          delay={0.25}
        >
          <div className="mt-4 flex items-end gap-[3px] h-8 overflow-hidden">
            {[20, 40, 60, 100].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ backgroundColor: `rgba(115,92,0,${0.2 + i * 0.2})` }}
                initial={{ height: '0%' }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
              />
            ))}
          </div>
        </StatCard>
      </section>

      {/* ── quote table ─────────────────────────────────────── */}
      <section className="mb-12">
        <GlassCard className="overflow-hidden">
          {/* table header */}
          <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
            <h3 className="text-2xl font-normal text-[#1a1c1a]" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
              Danh sách yêu cầu báo giá
            </h3>
            <div className="flex items-center gap-2">
              {(['all', 'approved', 'new'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1) }}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                    filter === f
                      ? 'border-[#735c00]/50 bg-[#735c00]/10 text-[#735c00]'
                      : 'border-black/5 hover:bg-black/[0.02] text-[#1a1c1a]'
                  }`}
                >
                  {f === 'all' ? 'Tất cả' : f === 'approved' ? 'Đã duyệt' : 'Mới'}
                </button>
              ))}
              {/* create new */}
              <QuoteRequestModal
                requesterName={currentUserName}
                onSuccess={(q) => { fetchData(); onCreateSuccess?.(q) }}
              />
            </div>
          </div>

          {/* table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/[0.01]">
                  {['ID BÁO GIÁ','SẢN PHẨM','CHẤT LIỆU','NGƯỜI YÊU CẦU','GIÁ DỰ KIẾN','TRẠNG THÁI','THAO TÁC'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#4d4635] last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-black/5">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 rounded bg-black/5 animate-pulse" style={{ width: `${60 + (j * 15) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#7f7663]">
                      Không tìm thấy yêu cầu báo giá nào
                    </td>
                  </tr>
                ) : (
                  paginated.map((q, i) => {
                    const st = STATUS_MAP[q.status] ?? { label: q.status, gold: false }
                    return (
                      <motion.tr
                        key={q._id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35 }}
                        whileHover={{ x: 8 }}
                        className="border-b border-black/[0.05] hover:bg-black/[0.01] transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 text-xs font-bold text-[#1a1c1a] tracking-widest">{q.quoteCode}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-[#1a1c1a] group-hover:text-[#735c00] transition-colors">
                            {q.productName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#4d4635]">{q.materialType.replace(/_/g, ' ')}</td>
                        <td className="px-6 py-4 text-sm text-[#1a1c1a]">{q.requestedBy}</td>
                        <td className={`px-6 py-4 text-sm font-semibold ${st.gold ? 'text-[#735c00]' : 'text-[#1a1c1a]'}`}>
                          {q.sellingPrice ? formatCurrency(q.sellingPrice) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${st.gold ? 'bg-[#735c00] status-pulse-gold' : 'bg-[#4d4635]/40'}`} />
                            <span className={`text-[10px] font-bold ${st.gold ? 'text-[#735c00]' : 'text-[#4d4635]'}`}>
                              {st.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-[#7f7663] hover:text-[#735c00] transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-[#7f7663] hover:text-[#735c00] transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="px-6 py-4 border-t border-black/5 bg-black/[0.01] flex items-center justify-between">
            <span className="text-xs text-[#7f7663]">
              Hiển thị {Math.min(filtered.length, (page - 1) * perPage + paginated.length)} / {filtered.length} yêu cầu
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-black/5 hover:bg-black/[0.03] transition-colors text-[#4d4635] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold border transition-colors ${
                    p === page
                      ? 'border-[#735c00]/50 bg-[#735c00]/10 text-[#735c00]'
                      : 'border-black/5 hover:bg-black/[0.03] text-[#4d4635]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded border border-black/5 hover:bg-black/[0.03] transition-colors text-[#4d4635] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ── insights bento ──────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* weekly chart */}
        <motion.div
          className="md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <GlassCard className="p-6 h-full">
            <h4 className="font-semibold mb-6 text-[#1a1c1a]">Xu hướng báo giá 7 ngày qua</h4>
            <div className="h-48 flex items-end justify-between gap-4 px-4 overflow-hidden">
              {WEEK_BARS.map(({ day, h }, i) => {
                const isToday = i === 4
                return (
                  <div key={day} className="w-full flex flex-col items-center gap-2">
                    <motion.div
                      className={`w-full rounded-t-lg cursor-pointer transition-colors group relative ${
                        isToday
                          ? 'bg-[#735c00] shadow-[0_0_20px_rgba(115,92,0,0.15)] hover:brightness-110'
                          : 'bg-black/[0.04] hover:bg-[#735c00]/15'
                      }`}
                      initial={{ height: '0%' }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                      whileHover={{ scale: 1.05 }}
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-[#735c00]' : 'text-[#7f7663]'}`}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <GlassCard className="p-6 h-full flex flex-col justify-between">
            <div>
              <h4 className="font-semibold mb-1 text-[#1a1c1a]">Loại yêu cầu</h4>
              <p className="text-xs text-[#7f7663]">Phân bổ theo trạng thái</p>
            </div>

            <div className="space-y-4 mt-6">
              {[
                {
                  label: 'Đã xác nhận',
                  count: confirmed,
                  pct: quotes.length ? Math.round((confirmed / quotes.length) * 100) : 0,
                  gold: true,
                },
                {
                  label: 'Đang chờ',
                  count: pending,
                  pct: quotes.length ? Math.round((pending / quotes.length) * 100) : 0,
                  gold: false,
                },
                {
                  label: 'Khác',
                  count: other,
                  pct: quotes.length ? Math.round((other / quotes.length) * 100) : 0,
                  gold: false,
                },
              ].map(({ label, pct, gold }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#1a1c1a]">{label}</span>
                    <span className={`text-xs font-bold ${gold ? 'text-[#735c00]' : 'text-[#1a1c1a]'}`}>{pct}%</span>
                  </div>
                  <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${gold ? 'bg-[#735c00]' : 'bg-[#1a1c1a]/25'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-black/5 flex items-center gap-2 text-xs text-[#7f7663]">
              <TrendingUp className="w-4 h-4 text-[#735c00]" />
              <span>Tổng <strong className="text-[#1a1c1a]">{quotes.length}</strong> yêu cầu</span>
            </div>
          </GlassCard>
        </motion.div>
      </section>
    </div>
  )
}

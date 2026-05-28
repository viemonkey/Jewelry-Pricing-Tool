'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { quotesApi, statsApi, type QuoteStats } from '@/lib/api'
import type { Quote, QuoteStatus } from '@/lib/types'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import {
  LayoutDashboard,
  Hourglass,
  BadgeDollarSign,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

// ─── types ──────────────────────────────────────────────────────────
interface SaleDashboardProps {
  currentUserName: string
  onCreateSuccess?: (q: Quote) => void
}

const STATUS_MAP: Record<QuoteStatus, { label: string; dotClass: string; badgeClass: string; isGlow?: boolean }> = {
  PENDING: {
    label: 'CHỜ BÁO GIÁ',
    dotClass: 'bg-black/40',
    badgeClass: 'bg-[#F1C40F] text-black border-transparent shadow-sm whitespace-nowrap font-semibold',
  },
  NEED_MORE_INFO: {
    label: 'CẦN BỔ SUNG',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#E74C3C] text-white border-transparent shadow-sm whitespace-nowrap font-semibold animate-pulse',
    isGlow: true,
  },
  QUOTING: {
    label: 'ĐANG XỬ LÝ',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#9B59B6] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
  },
  QUOTED: {
    label: 'ĐÃ BÁO GIÁ',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#2ECC71] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
  },
  SENT_TO_CUSTOMER: {
    label: 'ĐÃ GỬI KH',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#1ABC9C] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
  },
  CONFIRMED: {
    label: 'ĐÃ DUYỆT',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#E67E22] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
    isGlow: true,
  },
  CANCELLED: {
    label: 'ĐÃ HUỶ',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#95A5A6] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
  },
  IN_PRODUCTION: {
    label: 'SẢN XUẤT',
    dotClass: 'bg-white/80',
    badgeClass: 'bg-[#34495E] text-white border-transparent shadow-sm whitespace-nowrap font-semibold',
    isGlow: true,
  },
}

// ─── helpers ────────────────────────────────────────────────────────
function formatMaterialType(type: string) {
  const map: Record<string, string> = {
    GOLD_24K: 'Vàng 24K',
    GOLD_18K: 'Vàng 18K',
    GOLD_14K: 'Vàng 14K',
    GOLD_610: 'Vàng 610',
    GOLD_10K: 'Vàng 10K',
    SILVER: 'Bạc 925',
  }
  return map[type] || type.replace(/_/g, ' ')
}

// ─── sub-components ─────────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_4px_16px_0_rgba(0,0,0,0.02)] transition-all duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl"
        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, transparent 60%)', borderRadius: 'inherit' }} />
      {children}
    </div>
  )
}

function MiniStat({
  icon, label, value, badge, theme = 'gold',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  badge?: React.ReactNode
  theme?: 'gold' | 'ruby' | 'emerald'
}) {
  const themeStyles = {
    gold: {
      iconBg: 'bg-amber-500/10 text-amber-600',
      badgeClass: 'text-amber-700 bg-amber-500/10 border border-amber-500/20',
      hoverGlow: 'hover:shadow-[0_10px_20px_-8px_rgba(245,158,11,0.12)] hover:border-amber-500/25 hover:bg-white/80',
    },
    ruby: {
      iconBg: 'bg-rose-500/10 text-rose-600',
      badgeClass: 'text-rose-700 bg-rose-500/10 border border-rose-500/20',
      hoverGlow: 'hover:shadow-[0_10px_20px_-8px_rgba(244,63,94,0.12)] hover:border-rose-500/25 hover:bg-white/80',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      badgeClass: 'text-emerald-700 bg-emerald-500/10 border border-emerald-500/20',
      hoverGlow: 'hover:shadow-[0_10px_20px_-8px_rgba(16,185,129,0.12)] hover:border-emerald-500/25 hover:bg-white/80',
    },
  }[theme]

  return (
    <GlassCard className={`p-4 cursor-default transition-all duration-300 flex items-center justify-between gap-4 ${themeStyles.hoverGlow}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${themeStyles.iconBg}`}>
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <h3 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
            {value}
          </h3>
        </div>
      </div>
      {badge && (
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${themeStyles.badgeClass}`}>
          {badge}
        </span>
      )}
    </GlassCard>
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
  const perPage = 8

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

  // ─── action handlers ────────────────────────────────────────────────
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
    try {
      await quotesApi.confirm(id)
      addNotification({ type: 'success', title: '🎉 Khách chốt đơn!', message: `"${name}" đã được đặt hàng thành công.` })
      fetchData()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể xác nhận đơn.' })
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
    <div className="bg-[#faf9f6] font-sans relative overflow-hidden pb-4">
      {/* Inject Google Fonts & Custom CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap');
        @keyframes blob-drift-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, 40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.98); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, -30px) scale(0.95); }
          66% { transform: translate(30px, -40px) scale(1.05); }
        }
        .animate-blob-drift-1 { animation: blob-drift-1 25s infinite ease-in-out; }
        .animate-blob-drift-2 { animation: blob-drift-2 30s infinite ease-in-out; }
      `}</style>

      {/* Dynamic Background Aura Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[45%] h-[45%] rounded-full bg-amber-200/15 blur-[120px] animate-blob-drift-1" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-[140px] animate-blob-drift-2" />
      </div>

      <div className="relative z-10 max-w-[95%] mx-auto px-4 py-4 sm:px-6 lg:px-8">
        
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2
              className="text-2xl font-normal text-slate-800 tracking-tight flex items-center gap-1.5"
              style={{ fontFamily: 'EB Garamond, Georgia, serif' }}
            >
              Lịch sử yêu cầu báo giá
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-400">Hôm nay: {today}</p>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            {/* search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm mã hoặc sản phẩm..."
                className="bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white/90 w-full sm:w-48 transition-all shadow-sm"
              />
            </div>
            {/* filter pills */}
            <div className="flex items-center gap-1">
              {(['all', 'approved', 'new'] as const).map(f => {
                const isActive = filter === f
                return (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setPage(1) }}
                    className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all duration-300 ${
                      isActive
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-200/60 bg-white/40 hover:bg-white/80 text-slate-600'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'approved' ? 'Đã duyệt' : 'Mới'}
                  </button>
                )
              })}
            </div>
            {/* refresh button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchData}
              className="bg-white/40 p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-white hover:border-amber-500/50 transition-all border border-slate-200/60 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
            {/* create new button */}
            <QuoteRequestModal
              requesterName={currentUserName}
              onSuccess={(q) => { fetchData(); onCreateSuccess?.(q) }}
            />
          </div>
        </header>

        {/* ── Mini Stats row ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <MiniStat
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Báo giá hôm nay"
            value={stats?.total ?? '—'}
            badge="+12%"
            theme="gold"
          />
          <MiniStat
            icon={<Hourglass className="w-4 h-4" />}
            label="Đang chờ duyệt"
            value={stats?.pending ?? '—'}
            badge="Cần xử lý"
            theme="ruby"
          />
          <MiniStat
            icon={<BadgeDollarSign className="w-4 h-4" />}
            label="Đã xác nhận"
            value={stats?.confirmed ?? '—'}
            badge="Tháng này"
            theme="emerald"
          />
        </section>

        {/* ── Table Area ── */}
        <section className="mb-4">
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FBF6E9] border-b border-[#EDE8DE]">
                    {['ID BÁO GIÁ','SẢN PHẨM','CHẤT LIỆU','NGƯỜI YÊU CẦU','GIÁ BÁN','TRẠNG THÁI','THAO TÁC'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B5E4C] last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-2.5">
                            <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: `${60 + (j * 15) % 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">
                        Không tìm thấy yêu cầu báo giá nào
                      </td>
                    </tr>
                  ) : (
                    paginated.map((q, i) => {
                      const st = STATUS_MAP[q.status] ?? { label: q.status, dotClass: 'bg-slate-400', badgeClass: 'bg-slate-100 text-slate-600', isGlow: false }
                      return (
                        <motion.tr
                          key={q._id}
                          onClick={() => onCreateSuccess?.(q)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02, duration: 0.2 }}
                          whileHover={{ backgroundColor: 'rgba(245, 158, 11, 0.015)' }}
                          className="border-b border-slate-100 hover:bg-slate-50/20 transition-all duration-200 group cursor-pointer"
                        >
                          <td className="px-4 py-2.5 text-xs font-bold text-slate-600 tracking-wider">{q.quoteCode}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-600 transition-colors">
                              {q.productName}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {formatMaterialType(q.materialType)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{q.requestedBy}</td>
                          <td className={`px-4 py-2.5 text-xs font-semibold ${st.isGlow ? 'text-amber-600' : 'text-slate-700'}`}>
                            {q.sellingPrice ? formatCurrency(q.sellingPrice) : (
                              <span className="text-slate-400 font-normal text-[11px]">Chờ tính giá</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${st.badgeClass}`}>
                              <span className={`relative flex h-1 w-1`}>
                                {st.isGlow && (
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${st.dotClass}`} />
                                )}
                                <span className={`relative inline-flex rounded-full h-1 w-1 ${st.dotClass}`} />
                              </span>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* NEED_MORE_INFO: Bổ sung */}
                              {q.status === 'NEED_MORE_INFO' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCreateSuccess?.(q)
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors"
                                >
                                  Bổ sung
                                </button>
                              )}

                              {/* QUOTED: Xem giá + Gửi khách */}
                              {q.status === 'QUOTED' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onCreateSuccess?.(q)
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
                                  >
                                    Xem giá
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSentToCustomer(q._id, q.productName)
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors"
                                  >
                                    Gửi khách
                                  </button>
                                </>
                              )}

                              {/* SENT_TO_CUSTOMER: Khách chốt + Huỷ */}
                              {q.status === 'SENT_TO_CUSTOMER' && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleConfirm(q._id, q.productName)
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                                  >
                                    Khách chốt
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCancel(q._id, q.productName)
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                                  >
                                    Huỷ
                                  </button>
                                </>
                              )}

                              {/* Other statuses: Xem */}
                              {!['NEED_MORE_INFO', 'QUOTED', 'SENT_TO_CUSTOMER'].includes(q.status) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onCreateSuccess?.(q)
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
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

            {/* pagination */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Hiển thị {Math.min(filtered.length, (page - 1) * perPage + paginated.length)} / {filtered.length} yêu cầu
              </span>
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-500 disabled:opacity-20 shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-all ${
                      p === page
                        ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                        : 'border-slate-200/60 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-500 disabled:opacity-20 shadow-sm"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  )
}

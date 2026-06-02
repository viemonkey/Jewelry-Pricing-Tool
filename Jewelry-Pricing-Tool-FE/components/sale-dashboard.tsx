'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── types ──────────────────────────────────────────────────────────
interface SaleDashboardProps {
  currentUserName: string
  search?: string
  onCreateSuccess?: (q: Quote) => void
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
  IN_PRODUCTION: {
    label: 'SẢN XUẤT',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-600',
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
  }
  return map[type] || type.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

// ─── sub-components ─────────────────────────────────────────────────
function MiniStat({
  icon, label, value, badge, theme = 'gold',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  badge?: string
  theme?: 'gold' | 'ruby' | 'emerald'
}) {
  const themeStyles = {
    gold: {
      iconBg: 'bg-amber-500/10 text-[#b4904c]',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200/50',
    },
    ruby: {
      iconBg: 'bg-rose-500/10 text-rose-600',
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200/50',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200/50',
    },
  }[theme]

  return (
    <Card className="hover:shadow-md transition-all-smooth relative overflow-hidden border-luxury shadow-sm">
      <CardContent className="p-5 flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-xl', themeStyles.iconBg)}>
            {icon}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <h3 className="text-3xl font-serif font-semibold text-foreground mt-0.5">
              {value}
            </h3>
          </div>
        </div>
        {badge && (
          <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', themeStyles.badgeClass)}>
            {badge}
          </span>
        )}
      </CardContent>
    </Card>
  )
}

// ─── main ───────────────────────────────────────────────────────────
export function SaleDashboard({ currentUserName, search = '', onCreateSuccess }: SaleDashboardProps) {
  const [stats, setStats] = useState<QuoteStats | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
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
    <div className="space-y-6">
      
      {/* ── Title & Create button ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground tracking-wide">
            Hệ thống báo giá trang sức
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
            Quản lý và tính toán giá sản phẩm vàng, bạc và đá quý
          </p>
        </div>

        {/* Nút Tạo yêu cầu báo giá */}
        <div className="shrink-0">
          <QuoteRequestModal
            requesterName={currentUserName}
            onSuccess={(q) => { fetchData(); onCreateSuccess?.(q) }}
          />
        </div>
      </div>

      {/* ── Mini Stats row ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MiniStat
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Báo giá hôm nay"
          value={stats?.total ?? '—'}
          badge="+12%"
          theme="gold"
        />
        <MiniStat
          icon={<Hourglass className="w-5 h-5" />}
          label="Đang chờ duyệt"
          value={stats?.pending ?? '—'}
          badge="CẦN XỬ LÝ"
          theme="ruby"
        />
        <MiniStat
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Đã xác nhận"
          value={stats?.confirmed ?? '—'}
          badge="THÁNG NÀY"
          theme="emerald"
        />
      </section>

      {/* ── Table Area ── */}
      <section>
        <Card className="border-luxury shadow-sm">
          {/* Card Header với Bộ lọc và Nút reload */}
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b">
            <CardContent className="p-0">
              <h2 className="text-lg font-serif font-semibold text-foreground tracking-wide flex items-center gap-1.5">
                Lịch sử yêu cầu báo giá
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fbf6e9] border border-[#d4af37]/30 px-2 py-0.5 text-[9px] font-bold text-[#b4904c]">
                  ✨ Mới
                </span>
              </h2>
            </CardContent>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* filter tabs */}
              <div className="flex bg-[#e2e8f0]/40 p-0.5 rounded-lg border border-border/40 text-xs font-semibold">
                {(['all', 'approved', 'new'] as const).map(f => {
                  const isActive = filter === f
                  const label = f === 'all' ? 'TẤT CẢ' : f === 'approved' ? 'ĐÃ DUYỆT' : 'MỚI'
                  return (
                    <button
                      key={f}
                      onClick={() => { setFilter(f); setPage(1) }}
                      className={cn(
                        'px-3.5 py-1.5 rounded-md transition-all duration-200 tracking-wider text-[10px] font-bold',
                        isActive
                          ? 'bg-[#6e5812] text-white shadow-sm'
                          : 'text-[#64748b] hover:text-[#b4904c] hover:bg-white/40'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* refresh button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchData}
                className="p-2 rounded-lg text-muted-foreground hover:text-[#b4904c] hover:bg-muted transition-all border border-border/60 shadow-sm bg-white"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </motion.button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF6E9] border-b border-[#EDE8DE]">
                  {['ID BÁO GIÁ','SẢN PHẨM','CHẤT LIỆU','NGƯỜI YÊU CẦU','NGÀY TẠO','GIÁ BÁN','TRẠNG THÁI','THAO TÁC'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B5E4C] h-10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100/60">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${60 + (j * 15) % 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-xs text-muted-foreground font-medium">
                      Không tìm thấy yêu cầu báo giá nào
                    </td>
                  </tr>
                ) : (
                  paginated.map((q, i) => {
                    const st = STATUS_MAP[q.status] ?? { label: q.status, badgeClass: 'border-slate-200 bg-slate-50 text-slate-500' }
                    return (
                      <motion.tr
                        key={q._id}
                        onClick={() => onCreateSuccess?.(q)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.025)' }}
                        className="border-b border-border/40 hover:bg-muted/10 transition-all duration-200 group cursor-pointer"
                      >
                        <td className="px-5 py-3 text-xs font-bold text-[#b4904c] tracking-wider font-mono">{q.quoteCode}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-semibold text-foreground group-hover:text-[#b4904c] transition-colors">
                            {q.productName}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#526071] font-medium">
                          {formatMaterialType(q.materialType)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{q.requestedBy}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(q.createdAt)}</td>
                        <td className="px-5 py-3 text-xs font-bold text-[#b4904c] tracking-wide">
                          {q.sellingPrice ? (
                            <span>{formatCurrency(q.sellingPrice)}</span>
                          ) : (
                            <span className="text-muted-foreground/60 font-normal italic text-[11px]">Chờ tính giá</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border', st.badgeClass)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
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

          {/* Pagination Container */}
          <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Hiển thị {Math.min(filtered.length, (page - 1) * perPage + paginated.length)} / {filtered.length} yêu cầu
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white hover:bg-muted transition-colors text-muted-foreground disabled:opacity-20 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold border transition-all',
                    p === page
                      ? 'border-[#6e5812] bg-[#6e5812] text-white shadow-sm'
                      : 'border-border/60 bg-white hover:bg-muted text-muted-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white hover:bg-muted transition-colors text-muted-foreground disabled:opacity-20 shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}

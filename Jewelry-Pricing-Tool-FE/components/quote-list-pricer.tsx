'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Calculator, CheckCircle, Eye, Loader2, RefreshCw,
  ThumbsUp, Ban, Gem, Hammer, Sparkles, TrendingUp, AlertCircle,
  Package, Zap, Send, ShoppingCart, ImageIcon, X,
} from 'lucide-react'
import { quotesApi } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import type { Quote, QuoteStatus, UserRole } from '@/lib/types'

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; dot: string }> = {
  PENDING:            { label: 'Chờ báo giá',        color: 'border-amber-400/60 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400', dot: 'bg-amber-400' },
  NEED_MORE_INFO:     { label: 'Cần bổ sung',         color: 'border-orange-400/60 text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400', dot: 'bg-orange-500' },
  QUOTING:            { label: 'Đang báo giá',        color: 'border-blue-400/60 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400', dot: 'bg-blue-400' },
  QUOTED:             { label: 'Đã báo giá',          color: 'border-emerald-400/60 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', dot: 'bg-emerald-400' },
  SENT_TO_CUSTOMER:   { label: 'Đã gửi khách',        color: 'border-violet-400/60 text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', dot: 'bg-violet-400' },
  CONFIRMED:          { label: 'Đặt hàng',            color: 'border-primary/40 text-primary bg-primary/5', dot: 'bg-primary' },
  CANCELLED:          { label: 'Đã huỷ',              color: 'border-red-400/60 text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400', dot: 'bg-red-400' },
  IN_PRODUCTION:      { label: 'Đang sản xuất',       color: 'border-purple-400/60 text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400', dot: 'bg-purple-400' },
}

interface PriceFormState {
  weightChi: string
  weightGram: string
  materialCost: string
  stoneCost: string
  laborCost: string
  processingCost: string
  finishingCost: string
  wasteCost: string
  costPrice: string
  sellingPrice: string
  quotedBy: string
}

const EMPTY_PRICE_FORM = (name: string): PriceFormState => ({
  weightChi: '', weightGram: '', materialCost: '', stoneCost: '',
  laborCost: '', processingCost: '', finishingCost: '', wasteCost: '',
  costPrice: '', sellingPrice: '', quotedBy: name,
})

interface QuoteListPricerProps {
  currentRole: UserRole
  currentUserName?: string
  newQuote?: Quote | null
}

// ─── Pricing Dialog Tabs component ─────────────────────────
function PricingDialogTabs({
  selected, priceForm, setPriceForm, updatePriceField,
  cost, sell, margin, profit, marginGood,
  saving, onClose, onSubmit, formatCurrency: fmt,
}: {
  selected: Quote
  priceForm: PriceFormState
  setPriceForm: React.Dispatch<React.SetStateAction<PriceFormState>>
  updatePriceField: (key: keyof PriceFormState) => (e: React.ChangeEvent<HTMLInputElement>) => void
  cost: number; sell: number; margin: number | null; profit: number | null; marginGood: boolean
  saving: boolean
  onClose: () => void
  onSubmit: () => void
  formatCurrency: (v: number | string) => string
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'pricing'>('info')

  return (
    <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(80vh - 110px)' }}>
      {/* Tab bar */}
      <div className="flex border-b bg-muted/20 shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'info'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Package className="h-4 w-4" />
          Thông tin yêu cầu
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'pricing'
              ? 'border-primary text-primary bg-background'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Calculator className="h-4 w-4" />
          Nhập chi phí
          {cost > 0 && (
            <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
              {fmt(cost)}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' ? (

          /* ── INFO TAB ── */
          <div className="px-6 py-5 space-y-4">

            {/* Meta grid — 2 columns, normal readable size */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Người yêu cầu', value: selected.requestedBy, icon: '👤' },
                { label: 'Chất liệu',     value: selected.materialType.replace(/_/g, ' '), icon: '⚙️' },
                { label: 'Số lượng',      value: `${(selected as any).quantity ?? 1} cái`, icon: '📦' },
                { label: 'Deadline',      value: (selected as any).deadline, icon: '📅' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                  <p className="font-semibold text-sm text-foreground">{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Full-width detail blocks */}
            {([
              { label: 'Kích thước / Trọng lượng', value: (selected as any).dimensions, icon: '📐' },
              { label: 'Yêu cầu đá / phụ kiện',   value: (selected as any).stoneRequirements, icon: '💎' },
              { label: 'Mô tả sản phẩm',           value: selected.productDescription, icon: '📝' },
            ] as { label: string; value: string; icon: string }[]).filter(x => x.value).map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                <p className="text-sm text-foreground leading-relaxed">{value}</p>
              </div>
            ))}

            {/* Notes */}
            {selected.notes && (
              <div className="rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60 px-4 py-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Ghi chú
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{selected.notes}</p>
              </div>
            )}

            {/* Images */}
            {selected.images?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">🖼 Hình ảnh sản phẩm</p>
                <div className="flex flex-wrap gap-2">
                  {selected.images.map((img, i) => (
                    <a key={i} href={`http://localhost:3001${img}`} target="_blank" rel="noreferrer"
                      className="block rounded-xl border overflow-hidden hover:opacity-80 hover:scale-105 transition-all duration-200 shadow-sm">
                      <img src={`http://localhost:3001${img}`} alt={`Ảnh ${i + 1}`} className="h-20 w-20 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* CTA to next tab */}
            <div className="pt-1">
              <button
                onClick={() => setActiveTab('pricing')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors py-3 text-sm font-medium text-primary"
              >
                <Calculator className="h-4 w-4" />
                Tiếp tục nhập chi phí →
              </button>
            </div>
          </div>

        ) : (

          /* ── PRICING TAB ── */
          <div className="px-6 py-5 space-y-4">

            {/* Section 1: Nguyên liệu */}
            <SectionDivider label="Nguyên liệu" icon={<Gem className="h-3 w-3" />} />
            <div className="grid grid-cols-2 gap-4">
              {selected.materialType !== 'SILVER' ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Số chi vàng</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0" value={priceForm.weightChi}
                      className="h-10 pr-12 text-sm tabular-nums"
                      onChange={(e) => setPriceForm((f) => ({ ...f, weightChi: e.target.value }))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">chi</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trọng lượng</Label>
                  <div className="relative">
                    <Input type="number" placeholder="0" value={priceForm.weightGram}
                      className="h-10 pr-14 text-sm tabular-nums"
                      onChange={(e) => setPriceForm((f) => ({ ...f, weightGram: e.target.value }))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">gram</span>
                  </div>
                </div>
              )}
              <CurrencyInput label="Giá nguyên vật liệu" value={priceForm.materialCost}
                onChange={updatePriceField('materialCost')} icon={<Gem className="h-3 w-3" />} />
            </div>

            {/* Section 2: Gia công & Đá */}
            <SectionDivider label="Gia công & Đá quý" icon={<Hammer className="h-3 w-3" />} />
            <div className="grid grid-cols-2 gap-4">
              <CurrencyInput label="Giá đá / phụ kiện"   value={priceForm.stoneCost}      onChange={updatePriceField('stoneCost')} />
              <CurrencyInput label="Tiền công sản xuất"   value={priceForm.laborCost}      onChange={updatePriceField('laborCost')} />
              <CurrencyInput label="Chi phí gia công"     value={priceForm.processingCost} onChange={updatePriceField('processingCost')} />
              <CurrencyInput label="Chi phí hoàn thiện"   value={priceForm.finishingCost}  onChange={updatePriceField('finishingCost')} />
            </div>

            {/* Section 3: Phát sinh */}
            <SectionDivider label="Chi phí phát sinh" icon={<Sparkles className="h-3 w-3" />} />
            <CurrencyInput label="Hao hụt / chi phí phát sinh" value={priceForm.wasteCost}
              onChange={updatePriceField('wasteCost')} icon={<Zap className="h-3 w-3" />} />

            {/* Tổng giá vốn */}
            <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-amber-50/60 dark:from-primary/10 dark:to-amber-950/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tổng giá vốn</p>
                  <p className="text-2xl font-bold text-primary tabular-nums">{fmt(cost)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
              </div>
              {/* Breakdown bars */}
              {cost > 0 && (
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: 'Nguyên vật liệu', value: parseFloat(priceForm.materialCost) || 0, color: 'bg-amber-400' },
                    { label: 'Đá quý',           value: parseFloat(priceForm.stoneCost) || 0,    color: 'bg-blue-400' },
                    { label: 'Gia công',          value: (parseFloat(priceForm.laborCost) || 0) + (parseFloat(priceForm.processingCost) || 0) + (parseFloat(priceForm.finishingCost) || 0), color: 'bg-emerald-400' },
                    { label: 'Phát sinh',         value: parseFloat(priceForm.wasteCost) || 0,    color: 'bg-red-300' },
                  ].filter(s => s.value > 0).map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">{s.label}</span>
                      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                          style={{ width: `${Math.min(100, (s.value / cost) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums w-8 text-right shrink-0">
                        {Math.round((s.value / cost) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Giá bán đề xuất */}
            <SectionDivider label="Giá bán" icon={<TrendingUp className="h-3 w-3" />} />
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Giá bán đề xuất
              </Label>
              <div className="relative">
                <Input type="number" placeholder="0" value={priceForm.sellingPrice}
                  className="h-12 pr-6 text-lg font-bold border-2 border-primary/30 bg-primary/5 focus-visible:ring-primary/30 text-primary tabular-nums"
                  onChange={(e) => setPriceForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-primary/50 pointer-events-none font-bold">đ</span>
              </div>

              {/* Margin card */}
              {margin !== null && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border-2 ${
                    marginGood
                      ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-700/60'
                      : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-bold ${
                        marginGood ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50'
                      }`}>
                        {marginGood ? '✓' : '!'}
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${
                          marginGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {marginGood ? 'Biên lợi nhuận tốt' : 'Biên lợi nhuận thấp'}
                        </p>
                        <p className={`text-base font-bold tabular-nums ${
                          marginGood ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'
                        }`}>
                          {margin}% · Lãi {fmt(profit!)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${marginGood ? 'bg-emerald-400' : 'bg-orange-400'}`}
                          style={{ width: `${Math.min(100, margin)}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Mục tiêu ≥ 20%</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer — always visible */}
      <div className="border-t px-6 py-3.5 flex items-center justify-between gap-3 shrink-0 bg-muted/10">
        <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
          Đóng
        </Button>
        <Button
          onClick={onSubmit}
          disabled={saving}
          className="gap-2 min-w-[175px] bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 shadow-md shadow-primary/20"
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
            : <><CheckCircle className="h-4 w-4" /> Hoàn thành báo giá</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Small helpers ──────────────────────────────────────────
function CurrencyInput({
  label, value, onChange, highlighted = false, icon,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  highlighted?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </Label>
      <div className={`relative transition-all ${highlighted ? 'ring-2 ring-primary/20 rounded-lg' : ''}`}>
        <Input
          type="number"
          placeholder="0"
          value={value}
          onChange={onChange}
          className={`h-10 pr-7 text-sm tabular-nums transition-all
            ${highlighted
              ? 'border-primary/40 bg-primary/5 font-semibold focus-visible:ring-primary/30 text-primary'
              : 'border-border/80 bg-background focus-visible:ring-primary/20'
            }`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 pointer-events-none font-medium">đ</span>
      </div>
    </div>
  )
}

function SectionDivider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
        {icon && <span className="text-muted-foreground/70 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
    </div>
  )
}

export function QuoteListPricer({ currentRole, currentUserName = 'NV Báo giá', newQuote }: QuoteListPricerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL')
  const [selected, setSelected] = useState<Quote | null>(null)
  const [dialogMode, setDialogMode] = useState<'review' | 'pricing' | 'view'>('view')
  const [priceForm, setPriceForm] = useState<PriceFormState>(EMPTY_PRICE_FORM(currentUserName))
  const [saving, setSaving] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<{ id: string; name: string } | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({ dimensions: '', stoneRequirements: '', productDescription: '', notes: '' })
  const [editImages, setEditImages] = useState<{ file: File; url: string }[]>([])
  const [keepImages, setKeepImages] = useState<string[]>([])
  const editFileRef = useRef<HTMLInputElement>(null)

  const canViewCost = currentRole === 'order' || currentRole === 'admin'
  const isPricer = canViewCost
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (newQuote) {
      setQuotes((prev) => {
        if (prev.some((q) => q._id === newQuote._id)) return prev
        return [newQuote, ...prev]
      })
    }
  }, [newQuote])

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const data = await quotesApi.list(filterStatus === 'ALL' ? undefined : filterStatus)
      setQuotes(data)
    } catch {
      setQuotes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuotes() }, [filterStatus])

  const openDetail = (q: Quote, mode?: 'review' | 'pricing' | 'view') => {
    setSelected(q)
    setShowRejectForm(false)
    setRejectReason('')
    setShowEditForm(false)
    setEditForm({ dimensions: '', stoneRequirements: '', productDescription: '', notes: '' })
    setEditImages([])
    setKeepImages([])
    setDialogMode(mode ?? (
      q.status === 'PENDING' ? 'review' :
      q.status === 'QUOTING' ? 'pricing' :
      q.status === 'NEED_MORE_INFO' ? 'view' :
      'view'
    ))
    setPriceForm({
      ...EMPTY_PRICE_FORM(currentUserName),
      weightChi: q.weightChi?.toString() || '',
      weightGram: q.weightGram?.toString() || '',
      laborCost: q.laborCost?.toString() || '',
      costPrice: q.costPrice?.toString() || '',
      sellingPrice: q.sellingPrice?.toString() || '',
    })
  }

  const handleStartQuoting = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await quotesApi.startQuoting(selected._id)
      addNotification({ type: 'info', title: 'Đã tiếp nhận yêu cầu', message: `Bắt đầu báo giá cho "${selected.productName}".` })
      setDialogMode('pricing')
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thất bại', message: 'Không thể tiếp nhận yêu cầu.' })
    } finally { setSaving(false) }
  }

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return
    setSaving(true)
    try {
      await quotesApi.rejectQuote(selected._id, rejectReason)
      addNotification({ type: 'warning', title: 'Đã trả lại Sale', message: `"${selected.productName}" cần bổ sung thông tin.` })
      setSelected(null)
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thất bại', message: 'Không thể trả lại yêu cầu.' })
    } finally { setSaving(false) }
  }

  const handleCompleteQuoting = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await quotesApi.updatePrice(selected._id, {
        weightChi: priceForm.weightChi ? parseFloat(priceForm.weightChi) : undefined,
        weightGram: priceForm.weightGram ? parseFloat(priceForm.weightGram) : undefined,
        laborCost: parseFloat(priceForm.laborCost) || 0,
        stones: [],
        costPrice: parseFloat(priceForm.costPrice) || 0,
        sellingPrice: parseFloat(priceForm.sellingPrice) || 0,
        quotedBy: priceForm.quotedBy,
      })
      await quotesApi.completeQuoting(selected._id)
      addNotification({
        type: 'success',
        title: 'Hoàn thành báo giá',
        message: `Đã báo giá xong cho "${selected.productName}" — giá bán: ${formatCurrency(parseFloat(priceForm.sellingPrice) || 0)}.`,
      })
      setSelected(null)
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Cập nhật thất bại', message: 'Không thể hoàn thành báo giá. Vui lòng thử lại.' })
    } finally { setSaving(false) }
  }

  const handleConfirm = async (id: string) => {
    const q = quotes.find((x) => x._id === id)
    try {
      await quotesApi.confirm(id)
      addNotification({ type: 'success', title: '🎉 Khách chốt đơn!', message: `"${q?.productName || 'Sản phẩm'}" đã được đặt hàng thành công.` })
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể xác nhận đơn.' })
    }
  }

  const handleSentToCustomer = async (id: string) => {
    const q = quotes.find((x) => x._id === id)
    try {
      await quotesApi.sentToCustomer(id)
      addNotification({ type: 'info', title: '📤 Đã gửi giá cho khách', message: `"${q?.productName}" đang chờ khách phản hồi.` })
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể cập nhật trạng thái.' })
    }
  }

  const handleResubmit = async (id: string) => {
    const q = quotes.find((x) => x._id === id)
    try {
      await quotesApi.resubmit(id)
      addNotification({ type: 'success', title: '✅ Đã gửi lại yêu cầu', message: `"${q?.productName}" đã được gửi lại cho NV báo giá.` })
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể gửi lại yêu cầu.' })
    }
  }

  const handleResubmitWithEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await quotesApi.updateInfo(selected._id, {
        dimensions: editForm.dimensions || (selected as any).dimensions,
        stoneRequirements: editForm.stoneRequirements || (selected as any).stoneRequirements,
        productDescription: editForm.productDescription || selected.productDescription,
        notes: editForm.notes || selected.notes,
        keepImages: keepImages,
        newImages: editImages.map(i => i.file),
      })
      await quotesApi.resubmit(selected._id)
      addNotification({ type: 'success', title: '✅ Đã gửi lại yêu cầu', message: `"${selected.productName}" đã được cập nhật và gửi lại.` })
      // Cleanup preview URLs
      editImages.forEach(i => URL.revokeObjectURL(i.url))
      setSelected(null)
      setShowEditForm(false)
      setEditImages([])
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thất bại', message: 'Không thể gửi lại yêu cầu.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (id: string) => {
    const q = quotes.find((x) => x._id === id)
    setConfirmCancel({ id, name: q?.productName || 'Sản phẩm' })
  }

  const doCancel = async () => {
    if (!confirmCancel) return
    const { id, name } = confirmCancel
    setConfirmCancel(null)
    try {
      await quotesApi.cancel(id)
      addNotification({ type: 'warning', title: 'Báo giá đã huỷ', message: `Yêu cầu "${name}" đã bị huỷ.` })
      fetchQuotes()
    } catch {
      addNotification({ type: 'error', title: 'Thao tác thất bại', message: 'Không thể huỷ báo giá.' })
    }
  }

  const updatePriceField = (key: keyof PriceFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceForm((f) => {
      const updated = { ...f, [key]: e.target.value }
      const n = (v: string) => parseFloat(v) || 0
      const total = n(updated.materialCost) + n(updated.stoneCost) + n(updated.laborCost)
        + n(updated.processingCost) + n(updated.finishingCost) + n(updated.wasteCost)
      if (total > 0) updated.costPrice = String(total)
      return updated
    })
  }

  const filtered = filterStatus === 'ALL' ? quotes : quotes.filter((q) => q.status === filterStatus)

  // Derived values for margin display
  const cost = parseFloat(priceForm.costPrice) || 0
  const sell = parseFloat(priceForm.sellingPrice) || 0
  const margin = sell > 0 && cost > 0 ? Math.round(((sell - cost) / sell) * 100) : null
  const profit = sell > 0 && cost > 0 ? sell - cost : null
  const marginGood = margin !== null && margin >= 20

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Danh sách yêu cầu báo giá</CardTitle>
          <CardDescription>
            {isPricer ? 'Xử lý và hoàn thành báo giá cho các yêu cầu từ Sale' : 'Theo dõi trạng thái và xác nhận báo giá'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-1">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as QuoteStatus | 'ALL')}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ALL">Tất cả</TabsTrigger>
            <TabsTrigger value="PENDING">Chờ báo giá</TabsTrigger>
            <TabsTrigger value="NEED_MORE_INFO">Cần bổ sung</TabsTrigger>
            <TabsTrigger value="QUOTING">Đang báo giá</TabsTrigger>
            <TabsTrigger value="QUOTED">Đã báo giá</TabsTrigger>
            <TabsTrigger value="SENT_TO_CUSTOMER">Đã gửi khách</TabsTrigger>
            <TabsTrigger value="CONFIRMED">Đặt hàng</TabsTrigger>
            <TabsTrigger value="CANCELLED">Đã huỷ</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Mã</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Chất liệu</TableHead>
                <TableHead>Người yêu cầu</TableHead>
                {canViewCost && <TableHead className="text-right">Giá vốn</TableHead>}
                <TableHead className="text-right">Giá bán</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((q, i) => {
                  const sc = STATUS_CONFIG[q.status] ?? { label: q.status, color: 'border-gray-400/60 text-gray-600 bg-gray-50', dot: 'bg-gray-400' }
                  return (
                    <motion.tr key={q._id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} transition={{ delay: i * 0.05 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-mono text-xs">{q.quoteCode}</TableCell>
                      <TableCell className="font-medium">{q.productName}</TableCell>
                      <TableCell><Badge variant="outline">{q.materialType.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{q.requestedBy}</TableCell>
                      {canViewCost && (
                        <TableCell className="text-right font-medium">
                          {q.costPrice ? formatCurrency(q.costPrice) : '—'}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-bold text-primary">
                        {q.sellingPrice ? formatCurrency(q.sellingPrice) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${sc.color} gap-1.5 pl-2`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* NV order: PENDING → Kiểm tra hoặc Tính giá */}
                          {isPricer && q.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openDetail(q, 'review')} className="gap-1 h-7 text-xs">
                                <Eye className="h-3 w-3" /> Kiểm tra
                              </Button>
                              <Button size="sm" onClick={() => openDetail(q, 'pricing')} className="gap-1 h-7 text-xs">
                                <Calculator className="h-3 w-3" /> Tính giá
                              </Button>
                            </>
                          )}
                          {/* NV order: QUOTING → Tiếp tục tính giá */}
                          {isPricer && q.status === 'QUOTING' && (
                            <Button size="sm" onClick={() => openDetail(q, 'pricing')} className="gap-1 h-7 text-xs">
                              <Calculator className="h-3 w-3" /> Tính giá
                            </Button>
                          )}
                          {/* Sale: PENDING / QUOTING → Xem trạng thái */}
                          {!isPricer && (q.status === 'PENDING' || q.status === 'QUOTING') && (
                            <Button size="sm" variant="ghost" onClick={() => openDetail(q, 'view')} className="gap-1 h-7 text-xs">
                              <Eye className="h-3 w-3" /> Xem
                            </Button>
                          )}
                          {/* Sale: NEED_MORE_INFO → Xem lý do + Gửi lại */}
                          {!isPricer && q.status === 'NEED_MORE_INFO' && (
                            <Button size="sm" onClick={() => openDetail(q, 'view')} className="gap-1 h-7 text-xs bg-orange-500 hover:bg-orange-600">
                              <AlertCircle className="h-3 w-3" /> Bổ sung
                            </Button>
                          )}
                          {/* Sale: QUOTED → Xem báo giá + Gửi cho khách */}
                          {!isPricer && q.status === 'QUOTED' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openDetail(q, 'view')} className="gap-1 h-7 text-xs">
                                <Eye className="h-3 w-3" /> Xem giá
                              </Button>
                              <Button size="sm" onClick={() => handleSentToCustomer(q._id)} className="gap-1 h-7 text-xs bg-violet-600 hover:bg-violet-700">
                                <Send className="h-3 w-3" /> Gửi khách
                              </Button>
                            </>
                          )}
                          {/* Sale: SENT_TO_CUSTOMER → Khách chốt hoặc Huỷ */}
                          {!isPricer && q.status === 'SENT_TO_CUSTOMER' && (
                            <>
                              <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => handleConfirm(q._id)}>
                                <ShoppingCart className="h-3 w-3" /> Khách chốt
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => handleCancel(q._id)}>
                                <Ban className="h-3 w-3" /> Huỷ
                              </Button>
                            </>
                          )}
                          {/* Xem chi tiết cho các trạng thái còn lại */}
                          {(q.status === 'CONFIRMED' || q.status === 'CANCELLED' || q.status === 'IN_PRODUCTION') && (
                            <Button size="sm" variant="ghost" onClick={() => openDetail(q, 'view')} className="gap-1 h-7 text-xs">
                              <Eye className="h-3 w-3" /> Xem
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Không có yêu cầu nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>


      {/* ── Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className={`${dialogMode === 'pricing' ? 'max-w-5xl w-[96vw]' : 'max-w-lg'} p-0 gap-0 overflow-hidden`}>

          {/* ── Decorative header stripe ── */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-primary to-amber-600" />

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b bg-gradient-to-b from-muted/30 to-transparent">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs bg-muted/80 px-2 py-0.5 rounded-md text-muted-foreground border border-border/60">
                  {selected?.quoteCode}
                </span>
                {selected && (
                  <Badge variant="outline" className={`${STATUS_CONFIG[selected.status]?.color} gap-1.5 pl-2`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selected.status]?.dot}`} />
                    {STATUS_CONFIG[selected.status]?.label}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-bold">{selected?.productName ?? 'Chi tiết báo giá'}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {dialogMode === 'review' ? '🔍 Kiểm tra thông tin yêu cầu từ Sale'
                  : dialogMode === 'pricing' ? '💰 Xem thông tin yêu cầu và nhập chi phí để tính giá vốn'
                  : '📋 Chi tiết báo giá'}
              </DialogDescription>
            </div>
          </div>

          {selected && (
            dialogMode === 'pricing' ? (

              /* ════════════════════════════════════════
                 PRICING MODE — true side-by-side, wide dialog
              ════════════════════════════════════════ */
              <div className="flex overflow-hidden" style={{ height: '78vh' }}>

                {/* ══ LEFT: Thông tin yêu cầu ══ */}
                <div className="flex flex-col w-[42%] shrink-0 border-r overflow-hidden bg-muted/10">
                  <div className="px-5 py-3 border-b bg-muted/30 shrink-0 flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Thông tin yêu cầu</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {/* Meta 2x2 */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: 'Người yêu cầu', value: selected.requestedBy, icon: '👤' },
                        { label: 'Chất liệu',     value: selected.materialType.replace(/_/g, ' '), icon: '⚙️' },
                        { label: 'Số lượng',      value: `${(selected as any).quantity ?? 1} cái`, icon: '📦' },
                        { label: 'Deadline',      value: (selected as any).deadline, icon: '📅' },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className="rounded-xl bg-background border border-border/60 px-3 py-2.5">
                          <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                          <p className="font-semibold text-sm">{value || '—'}</p>
                        </div>
                      ))}
                    </div>

                    {/* Full-width detail blocks */}
                    {([
                      { label: 'Kích thước / Trọng lượng', value: (selected as any).dimensions, icon: '📐' },
                      { label: 'Yêu cầu đá / phụ kiện',   value: (selected as any).stoneRequirements, icon: '💎' },
                      { label: 'Mô tả sản phẩm',           value: selected.productDescription, icon: '📝' },
                    ] as { label: string; value: string; icon: string }[]).filter(x => x.value).map(({ label, value, icon }) => (
                      <div key={label} className="rounded-xl bg-background border border-border/60 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                        <p className="text-sm leading-relaxed">{value}</p>
                      </div>
                    ))}

                    {/* Notes */}
                    {selected.notes && (
                      <div className="rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60 px-3 py-2.5">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" /> Ghi chú
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{selected.notes}</p>
                      </div>
                    )}

                    {/* Images */}
                    {selected.images?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">🖼 Hình ảnh sản phẩm</p>
                        <div className="flex flex-wrap gap-2">
                          {selected.images.map((img, i) => (
                            <a key={i} href={`http://localhost:3001${img}`} target="_blank" rel="noreferrer"
                              className="block rounded-xl border overflow-hidden hover:opacity-80 hover:scale-105 transition-all duration-200 shadow-sm">
                              <img src={`http://localhost:3001${img}`} alt={`Ảnh ${i + 1}`} className="h-20 w-20 object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ══ RIGHT: Nhập chi phí ══ */}
                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                  <div className="px-5 py-3 border-b bg-muted/20 shrink-0 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Nhập chi phí</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* Section 1: Nguyên liệu */}
                    <SectionDivider label="Nguyên liệu" icon={<Gem className="h-3 w-3" />} />
                    <div className="grid grid-cols-2 gap-3">
                      {selected.materialType !== 'SILVER' ? (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Số chi vàng</Label>
                          <div className="relative">
                            <Input type="number" placeholder="0" value={priceForm.weightChi}
                              className="h-10 pr-12 text-sm tabular-nums"
                              onChange={(e) => setPriceForm((f) => ({ ...f, weightChi: e.target.value }))} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">chi</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trọng lượng</Label>
                          <div className="relative">
                            <Input type="number" placeholder="0" value={priceForm.weightGram}
                              className="h-10 pr-14 text-sm tabular-nums"
                              onChange={(e) => setPriceForm((f) => ({ ...f, weightGram: e.target.value }))} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">gram</span>
                          </div>
                        </div>
                      )}
                      <CurrencyInput label="Giá nguyên vật liệu" value={priceForm.materialCost}
                        onChange={updatePriceField('materialCost')} />
                    </div>

                    {/* Section 2: Gia công & Đá */}
                    <SectionDivider label="Gia công & Đá quý" icon={<Hammer className="h-3 w-3" />} />
                    <div className="grid grid-cols-2 gap-3">
                      <CurrencyInput label="Giá đá / phụ kiện"   value={priceForm.stoneCost}      onChange={updatePriceField('stoneCost')} />
                      <CurrencyInput label="Tiền công sản xuất"   value={priceForm.laborCost}      onChange={updatePriceField('laborCost')} />
                      <CurrencyInput label="Chi phí gia công"     value={priceForm.processingCost} onChange={updatePriceField('processingCost')} />
                      <CurrencyInput label="Chi phí hoàn thiện"   value={priceForm.finishingCost}  onChange={updatePriceField('finishingCost')} />
                    </div>

                    {/* Section 3: Phát sinh */}
                    <SectionDivider label="Chi phí phát sinh" icon={<Sparkles className="h-3 w-3" />} />
                    <CurrencyInput label="Hao hụt / chi phí phát sinh" value={priceForm.wasteCost}
                      onChange={updatePriceField('wasteCost')} />

                    {/* Tổng giá vốn */}
                    <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-amber-50/60 dark:from-primary/10 dark:to-amber-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tổng giá vốn</p>
                          <p className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(cost)}</p>
                        </div>
                        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Calculator className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      {cost > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {[
                            { label: 'Nguyên vật liệu', value: parseFloat(priceForm.materialCost) || 0, color: 'bg-amber-400' },
                            { label: 'Đá quý',           value: parseFloat(priceForm.stoneCost) || 0,    color: 'bg-blue-400' },
                            { label: 'Gia công',          value: (parseFloat(priceForm.laborCost) || 0) + (parseFloat(priceForm.processingCost) || 0) + (parseFloat(priceForm.finishingCost) || 0), color: 'bg-emerald-400' },
                            { label: 'Phát sinh',         value: parseFloat(priceForm.wasteCost) || 0,    color: 'bg-red-300' },
                          ].filter(s => s.value > 0).map(s => (
                            <div key={s.label} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-28 shrink-0">{s.label}</span>
                              <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                                  style={{ width: `${Math.min(100, (s.value / cost) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground tabular-nums w-8 text-right shrink-0">
                                {Math.round((s.value / cost) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Giá bán */}
                    <SectionDivider label="Giá bán đề xuất" icon={<TrendingUp className="h-3 w-3" />} />
                    <div className="space-y-3">
                      <div className="relative">
                        <Input type="number" placeholder="0" value={priceForm.sellingPrice}
                          className="h-12 pr-7 text-lg font-bold border-2 border-primary/30 bg-primary/5 focus-visible:ring-primary/30 text-primary tabular-nums"
                          onChange={(e) => setPriceForm((f) => ({ ...f, sellingPrice: e.target.value }))} />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-primary/50 pointer-events-none font-bold">đ</span>
                      </div>

                      {margin !== null && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl p-3.5 border-2 flex items-center justify-between gap-4 ${
                            marginGood
                              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-700/60'
                              : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                              marginGood ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/50'
                            }`}>
                              {marginGood ? '✓' : '!'}
                            </div>
                            <div>
                              <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${
                                marginGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {marginGood ? 'Biên lợi nhuận tốt' : 'Biên lợi nhuận thấp'}
                              </p>
                              <p className={`text-base font-bold tabular-nums ${
                                marginGood ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'
                              }`}>
                                {margin}% · Lãi {formatCurrency(profit!)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="w-16 h-2 bg-muted/50 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${marginGood ? 'bg-emerald-400' : 'bg-orange-400'}`}
                                style={{ width: `${Math.min(100, margin)}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Mục tiêu ≥ 20%</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 bg-muted/10">
                    <Button variant="ghost" onClick={() => setSelected(null)} className="text-muted-foreground">
                      Đóng
                    </Button>
                    <Button onClick={handleCompleteQuoting} disabled={saving}
                      className="gap-2 min-w-[175px] bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 shadow-md shadow-primary/20">
                      {saving
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
                        : <><CheckCircle className="h-4 w-4" /> Hoàn thành báo giá</>}
                    </Button>
                  </div>
                </div>
              </div>

            ) : (

              /* ── REVIEW / VIEW MODE ── */
              showEditForm && selected.status === 'NEED_MORE_INFO' ? (

                /* ══ EDIT FORM — thay thế toàn bộ nội dung ══ */
                <div className="flex flex-col" style={{ maxHeight: 'calc(80vh - 110px)' }}>
                  {/* Header form */}
                  <div className="px-6 py-4 border-b bg-orange-50 dark:bg-orange-950/20 shrink-0">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Cập nhật thông tin bổ sung</span>
                    </div>
                    <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
                      Lý do trả lại: <span className="font-medium">{selected.rejectReason}</span>
                    </p>
                  </div>

                  {/* Form fields */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Kích thước / Trọng lượng</Label>
                      <Input
                        value={editForm.dimensions}
                        onChange={(e) => setEditForm(f => ({ ...f, dimensions: e.target.value }))}
                        placeholder="VD: Size 12, khoảng 3 chỉ, dài 45cm..."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Yêu cầu đá / phụ kiện</Label>
                      <Input
                        value={editForm.stoneRequirements}
                        onChange={(e) => setEditForm(f => ({ ...f, stoneRequirements: e.target.value }))}
                        placeholder="VD: 1 viên kim cương 0.3ct, đá CZ trắng..."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Mô tả sản phẩm</Label>
                      <Textarea
                        value={editForm.productDescription}
                        onChange={(e) => setEditForm(f => ({ ...f, productDescription: e.target.value }))}
                        placeholder="Mô tả chi tiết kiểu dáng, yêu cầu đặc biệt..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ghi chú thêm cho NV báo giá</Label>
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Thông tin bổ sung, yêu cầu đặc biệt khác..."
                        rows={2}
                      />
                    </div>

                    {/* Ảnh sản phẩm */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hình ảnh sản phẩm</Label>

                      {/* Ảnh cũ — có thể xoá từng cái */}
                      {keepImages.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Ảnh hiện tại (bỏ tích để xoá)</p>
                          <div className="flex flex-wrap gap-2">
                            {keepImages.map((img, i) => (
                              <div key={img} className="relative h-16 w-16 rounded-lg border overflow-hidden group">
                                <img src={`http://localhost:3001${img}`} alt="" className="h-full w-full object-cover" />
                                <button
                                  onClick={() => setKeepImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <X className="h-4 w-4 text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ảnh mới thêm */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Thêm ảnh mới (tối đa {5 - keepImages.length} ảnh)</p>
                        <div className="flex flex-wrap gap-2">
                          {editImages.map((img, i) => (
                            <div key={img.url} className="relative h-16 w-16 rounded-lg border overflow-hidden group">
                              <img src={img.url} alt="" className="h-full w-full object-cover" />
                              <button
                                onClick={() => {
                                  URL.revokeObjectURL(img.url)
                                  setEditImages(prev => prev.filter((_, idx) => idx !== i))
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          ))}
                          {keepImages.length + editImages.length < 5 && (
                            <button
                              onClick={() => editFileRef.current?.click()}
                              className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                            >
                              <ImageIcon className="h-5 w-5" />
                              <span className="mt-0.5 text-xs">Thêm</span>
                            </button>
                          )}
                        </div>
                        <input
                          ref={editFileRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            const remaining = 5 - keepImages.length - editImages.length
                            const newImgs = files.slice(0, remaining).map(f => ({ file: f, url: URL.createObjectURL(f) }))
                            setEditImages(prev => [...prev, ...newImgs])
                            e.target.value = ''
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t px-6 py-4 flex gap-3 shrink-0 bg-muted/10">
                    <Button variant="outline" className="flex-1" onClick={() => setShowEditForm(false)}>
                      ← Quay lại
                    </Button>
                    <Button
                      className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600 shadow-md"
                      disabled={saving}
                      onClick={handleResubmitWithEdit}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Xác nhận gửi lại
                    </Button>
                  </div>
                </div>

              ) : (
              <div className="px-6 py-4 space-y-4">

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Người yêu cầu', value: selected.requestedBy },
                    { label: 'Chất liệu', value: selected.materialType.replace(/_/g, ' ') },
                    { label: 'Số lượng', value: (selected as any).quantity },
                    { label: 'Deadline', value: (selected as any).deadline },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <p className="font-semibold mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                  {[
                    { label: 'Kích thước / Trọng lượng dự kiến', value: (selected as any).dimensions },
                    { label: 'Yêu cầu đá / phụ kiện', value: (selected as any).stoneRequirements },
                    { label: 'Mô tả sản phẩm', value: selected.productDescription },
                  ].map(({ label, value }) => (
                    <div key={label} className="col-span-2 rounded-lg bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <p className="font-medium mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>

                {selected.notes && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
                    <span className="text-xs font-medium text-amber-600">📝 Ghi chú cho NV báo giá</span>
                    <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-sm">{selected.notes}</p>
                  </div>
                )}

                {/* Banner lý do trả lại — chỉ hiện khi NEED_MORE_INFO */}
                {selected.status === 'NEED_MORE_INFO' && selected.rejectReason && (
                  <div className="rounded-xl border-2 border-orange-400/60 bg-orange-50 dark:bg-orange-950/20 px-4 py-3">
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> Lý do NV báo giá trả lại
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed font-medium">{selected.rejectReason}</p>
                    {!isPricer && (
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-2">
                        👆 Vui lòng cập nhật thông tin bên dưới rồi bấm <strong>Gửi lại</strong>
                      </p>
                    )}
                  </div>
                )}

                {selected.images?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Hình ảnh sản phẩm</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.images.map((img, i) => (
                        <a key={i} href={`http://localhost:3001${img}`} target="_blank" rel="noreferrer">
                          <img src={`http://localhost:3001${img}`} alt={`Ảnh ${i + 1}`}
                            className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition-opacity cursor-pointer" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selected.status !== 'PENDING' && selected.status !== 'QUOTING' && selected.sellingPrice > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                    {canViewCost && (
                      <div>
                        <span className="text-xs text-muted-foreground">Giá vốn</span>
                        <p className="font-semibold">{formatCurrency(selected.costPrice)}</p>
                      </div>
                    )}
                    <div className={canViewCost ? 'text-right' : ''}>
                      <span className="text-xs text-muted-foreground">Giá bán</span>
                      <p className="text-xl font-bold text-primary">{formatCurrency(selected.sellingPrice)}</p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-3">
                  {isPricer && dialogMode === 'review' && (
                    !showRejectForm ? (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Đóng</Button>
                        <Button variant="outline" className="flex-1 gap-1 border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setShowRejectForm(true)}>
                          <Ban className="h-4 w-4" /> Trả lại Sale bổ sung
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Lý do trả lại cho Sale</Label>
                        <Textarea placeholder="VD: Thiếu ảnh sản phẩm, chưa rõ kích thước..."
                          rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => setShowRejectForm(false)}>Huỷ</Button>
                          <Button variant="destructive" className="flex-1 gap-1"
                            onClick={handleReject} disabled={!rejectReason.trim() || saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            Xác nhận trả lại
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Cần bổ sung: nút mở form edit */}
                  {!isPricer && selected.status === 'NEED_MORE_INFO' && !showEditForm && (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Đóng</Button>
                      <Button
                        className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          setEditForm({
                            dimensions: (selected as any).dimensions || '',
                            stoneRequirements: (selected as any).stoneRequirements || '',
                            productDescription: selected.productDescription || '',
                            notes: selected.notes || '',
                          })
                          setKeepImages(selected.images || [])
                          setEditImages([])
                          setShowEditForm(true)
                        }}
                      >
                        ✏️ Chỉnh sửa & Gửi lại
                      </Button>
                    </div>
                  )}

                  {!isPricer && selected.status === 'QUOTED' && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 px-4 py-3">
                        <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold mb-1">💡 Bước tiếp theo</p>
                        <p className="text-sm text-violet-800 dark:text-violet-300">Xem lại giá bán bên trên, tư vấn với khách, rồi bấm <strong>Gửi giá cho khách</strong> để chuyển sang trạng thái chờ phản hồi.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Đóng</Button>
                        <Button
                          className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true)
                            await handleSentToCustomer(selected._id)
                            setSaving(false)
                            setSelected(null)
                          }}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Gửi giá cho khách
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Bước 6: Khách chốt đơn */}
                  {!isPricer && selected.status === 'SENT_TO_CUSTOMER' && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">⏳ Đang chờ khách phản hồi</p>
                        <p className="text-sm text-amber-800 dark:text-amber-300">Khi khách đồng ý đặt hàng, bấm <strong>Khách chốt đơn</strong>. Nếu khách từ chối, bấm <strong>Khách từ chối</strong>.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1 gap-2"
                          onClick={() => { handleCancel(selected._id); setSelected(null) }}>
                          <Ban className="h-4 w-4" /> Khách từ chối
                        </Button>
                        <Button className="flex-1 gap-2"
                          onClick={() => { handleConfirm(selected._id); setSelected(null) }}>
                          <ShoppingCart className="h-4 w-4" /> Khách chốt đơn
                        </Button>
                      </div>
                    </div>
                  )}

                  {dialogMode === 'view' && selected.status !== 'QUOTED' && selected.status !== 'SENT_TO_CUSTOMER' && selected.status !== 'NEED_MORE_INFO' && (
                    <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>Đóng</Button>
                  )}
                </div>
              </div>
              ) /* end !showEditForm ternary */
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận huỷ */}
      <Dialog open={!!confirmCancel} onOpenChange={(o) => !o && setConfirmCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận huỷ báo giá</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn huỷ yêu cầu <span className="font-medium text-foreground">"{confirmCancel?.name}"</span> không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>Không, giữ lại</Button>
            <Button variant="destructive" onClick={doCancel}>Xác nhận huỷ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Package, Zap, Send, ShoppingCart, ImageIcon, X, Layers, FileText,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { quotesApi, pricingConfigApi } from '@/lib/api'
import type { PricingConfig } from '@/lib/api'
import { formatCurrency, calculateGoldProductPrice, calculateSilverProductPrice, getProfitDivisor } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import type { Quote, QuoteStatus, UserRole } from '@/lib/types'

// ── Multi-material types & helpers ─────────────────────────────────────────

export interface GoldRow {
  id: string
  materialType: string
  label: string
  weightChi: string
  goldPrice24K: string
  materialCost: string
  weightUnit?: 'chi' | 'gram'
}

const MATERIAL_LABEL_MAP: Record<string, string> = {
  GOLD_24K: 'Vàng 24K',
  GOLD_18K: 'Vàng 18K',
  GOLD_14K: 'Vàng 14K',
  GOLD_610: 'Vàng 610',
  GOLD_10K: 'Vàng 10K',
  SILVER:   'Bạc 925',
}

function labelToType(label: string): string | null {
  const map: Record<string, string> = {
    'Vàng 24K': 'GOLD_24K', 'Vàng 18K': 'GOLD_18K', 'Vàng 14K': 'GOLD_14K',
    'Vàng 610': 'GOLD_610', 'Vàng 10K': 'GOLD_10K', 'Bạc 925': 'SILVER',
  }
  return map[label] ?? null
}

function makeGoldRow(type: string, weight = ''): GoldRow {
  return {
    id: `${type}-${Date.now()}-${Math.random()}`,
    materialType: type,
    label: MATERIAL_LABEL_MAP[type] ?? type.replace(/_/g, ' '),
    weightChi: weight,
    goldPrice24K: '',
    materialCost: '',
    weightUnit: type === 'SILVER' ? 'gram' : 'chi',
  }
}

/**
 * Parse danh sách chất liệu từ Quote (Sale đã nhập qua multi-row modal).
 * Sale lưu vào:
 *   dimensions: "Vàng 18K: 2 chỉ, Vàng 10K: 1.5 chỉ"
 *   notes: "Chất liệu: Vàng 18K – 2 chỉ; Vàng 10K – 1.5 chỉ\n..."
 *   materialType: loại đầu tiên
 */
export function parseMaterialsFromQuote(quote: {
  materialType: string
  dimensions?: string
  notes?: string
}): GoldRow[] {
  // 1. Thử parse từ dimensions
  if (quote.dimensions) {
    const rows: GoldRow[] = []
    for (const part of quote.dimensions.split(/[|,;]/).map(s => s.trim())) {
      const m = part.match(/^(Vàng \d+K|Vàng 610|Bạc 925):\s*([\d.]+)\s*(chỉ|chi|g|gram|gr)?/i)
      if (m) {
        const t = labelToType(m[1])
        if (t) {
          const row = makeGoldRow(t, m[2])
          const unitStr = (m[3] || '').toLowerCase()
          if (unitStr === 'g' || unitStr === 'gram' || unitStr === 'gr') {
            row.weightUnit = 'gram'
          } else {
            row.weightUnit = 'chi'
          }
          rows.push(row)
        }
      }
    }
    if (rows.length > 0) return rows
  }

  // 2. Thử parse từ notes
  if (quote.notes) {
    const line = quote.notes.split('\n').find(l => l.startsWith('Chất liệu:'))
    if (line) {
      const rows: GoldRow[] = []
      const content = line.replace('Chất liệu:', '').trim()
      for (const part of content.split(/[;|]/).map(s => s.trim())) {
        const m = part.match(/^(Vàng \d+K|Vàng 610|Bạc 925)(?:\s*[–-]\s*([\d.]+)\s*(chỉ|chi|g|gram|gr)?)?/i)
        if (m) {
          const t = labelToType(m[1])
          if (t) {
            const row = makeGoldRow(t, m[2] ?? '')
            const unitStr = (m[3] || '').toLowerCase()
            if (unitStr === 'g' || unitStr === 'gram' || unitStr === 'gr') {
              row.weightUnit = 'gram'
            } else {
              row.weightUnit = 'chi'
            }
            rows.push(row)
          }
        }
      }
      if (rows.length > 0) return rows
    }
  }

  // 3. Fallback: 1 dòng từ materialType
  return [makeGoldRow(quote.materialType)]
}


const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; dot: string }> = {
  PENDING:            { label: 'Chờ báo giá',        color: 'bg-[#F1C40F] text-black border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-black/40' },
  NEED_MORE_INFO:     { label: 'Cần bổ sung',         color: 'bg-[#E74C3C] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
  QUOTING:            { label: 'Đang báo giá',        color: 'bg-[#9B59B6] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
  QUOTED:             { label: 'Đã báo giá',          color: 'bg-[#2ECC71] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
  SENT_TO_CUSTOMER:   { label: 'Đã gửi khách',        color: 'bg-[#1ABC9C] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
  CONFIRMED:          { label: 'Đặt hàng',            color: 'bg-[#E67E22] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
  CANCELLED:          { label: 'Đã huỷ',              color: 'bg-[#95A5A6] text-white border-transparent shadow-sm whitespace-nowrap font-semibold', dot: 'bg-white/80' },
}


export interface StoneEntry {
  id: string
  type: 'lab_diamond' | 'natural_diamond' | 'moissanite' | 'cz' | 'colored_stone'
  quantity: number
  sizeOrCarat: string
  unitPrice: string
  priceMethod: 'per_piece' | 'per_carat'
}

interface PriceFormState {
  // Nguyên liệu vàng
  weightChi: string
  goldPrice24K: string     // giá vàng 24K/chỉ — nhập tay
  materialCost: string     // tự tính từ weight × ratio × goldPrice24K
  // Bạc
  weightGram: string
  // Đá / phụ kiện
  stoneCost: string       // tổng tiền đá (tự tính từ bảng hoặc nhập tay)
  // Tiền công chế tác (theo docs: tiền công chế tác)
  laborCost: string
  // Tổng hợp
  costBeforeVAT: string
  costWithVAT: string
  costPrice: string        // = costWithVAT (để tương thích)
  sellingPrice: string     // tự tính, có thể override
  quotedBy: string
}

const EMPTY_PRICE_FORM = (name: string): PriceFormState => ({
  weightChi: '', goldPrice24K: '', materialCost: '',
  weightGram: '',
  stoneCost: '',
  laborCost: '',
  costBeforeVAT: '', costWithVAT: '', costPrice: '', sellingPrice: '', quotedBy: name,
})

interface QuoteListPricerProps {
  currentRole: UserRole
  currentUserName?: string
  newQuote?: Quote | null
  action?: React.ReactNode
}

interface PricingSummaryProps {
  priceForm: PriceFormState
  stoneEntries: StoneEntry[]
  pricingConfig: { goldRatios: any[]; profitMargins: any[]; silverMultiplier: number; goldPrice24K?: number } | null
  setPriceForm: React.Dispatch<React.SetStateAction<PriceFormState>>
  fmt: (v: number | string) => string
  margin: number | null
  profit: number | null
  marginGood: boolean
}

function PricingSummary({
  priceForm,
  stoneEntries,
  pricingConfig,
  setPriceForm,
  fmt,
  margin,
  profit,
  marginGood,
}: PricingSummaryProps) {
  const n = (v: string) => parseFloat(v) || 0
  const cost = n(priceForm.costWithVAT) || n(priceForm.costPrice) || 0

  return (
    <div className="space-y-4">
      {/* Tổng giá vốn */}
      <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-amber-50/60 dark:from-primary/10 dark:to-amber-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-1">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Giá vốn chưa VAT</p>
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {priceForm.costBeforeVAT ? fmt(parseFloat(priceForm.costBeforeVAT)) : '0 đ'}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">+10% →</span>
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Giá vốn có VAT</p>
                <p className="text-xl font-bold text-primary tabular-nums">{fmt(cost)}</p>
              </div>
            </div>
          </div>
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
        </div>
        {cost > 0 && (
          <div className="mt-3 space-y-1.5">
            {[
              { label: 'Nguyên vật liệu', value: parseFloat(priceForm.materialCost) || 0, color: 'bg-amber-400' },
              { label: 'Đá quý',           value: parseFloat(priceForm.stoneCost) || 0,    color: 'bg-blue-400' },
              { label: 'Tiền công',         value: parseFloat(priceForm.laborCost) || 0, color: 'bg-emerald-400' },
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
      <div className="space-y-3">
        {/* Thông tin biên lợi nhuận tự động */}
        {cost > 0 && pricingConfig?.profitMargins && (() => {
          const { divisor, margin: tier } = getProfitDivisor(cost, pricingConfig.profitMargins)
          return (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              📊 Áp dụng biên <strong>{tier}</strong> (÷{divisor}) → Giá bán tự tính bên dưới
            </div>
          )
        })()}
        <div className="relative">
          <Input type="text" inputMode="numeric" placeholder="0"
            value={formatInputNumber(priceForm.sellingPrice)}
            className="h-12 pr-7 text-lg font-bold border-2 border-primary/30 bg-primary/5 focus-visible:ring-primary/30 text-primary tabular-nums"
            onChange={(e) => setPriceForm((f) => ({ ...f, sellingPrice: parseInputNumber(e.target.value) }))} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-primary/50 pointer-events-none font-bold">đ</span>
        </div>

        {margin !== null && (
          <div
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
                  {margin}% · Lãi {fmt(profit!)}
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
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pricing Dialog Tabs component ─────────────────────────
function PricingDialogTabs({
  selected, priceForm, setPriceForm,
  stoneEntries, setStoneEntries,
  pricingConfig,
  cost, sell, margin, profit, marginGood,
  saving, onClose, onSubmit, formatCurrency: fmt,
}: {
  selected: Quote
  priceForm: PriceFormState
  setPriceForm: React.Dispatch<React.SetStateAction<PriceFormState>>
  stoneEntries: StoneEntry[]
  setStoneEntries: React.Dispatch<React.SetStateAction<StoneEntry[]>>
  pricingConfig: { goldRatios: any[]; profitMargins: any[]; silverMultiplier: number; goldPrice24K?: number } | null
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
                { label: 'Số lượng',      value: `${(selected as any).quantity ?? 1} cái`, icon: '📦' },
                { label: 'Deadline',      value: (selected as any).deadline, icon: '📅' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                  <p className="font-semibold text-sm text-foreground">{value || '—'}</p>
                </div>
              ))}
              {/* Chất liệu — full width, multi-row badges */}
              {(() => {
                const parsed = parseMaterialsFromQuote({
                  materialType: selected.materialType,
                  dimensions: (selected as any).dimensions,
                  notes: selected.notes,
                })
                return (
                  <div className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 col-span-2">
                    <p className="text-xs text-muted-foreground mb-1.5">⚙️ Chất liệu</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.map((row, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300/60 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-0.5">
                          <Layers className="h-3 w-3" />
                          {row.label}
                          {row.weightChi && <span className="opacity-60 font-normal">· {row.weightChi} chỉ</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
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
                    <a key={i} href={`http://localhost:3000${img}`} target="_blank" rel="noreferrer"
                      className="block rounded-xl border overflow-hidden hover:opacity-80 hover:scale-105 transition-all duration-200 shadow-sm">
                      <img src={`http://localhost:3000${img}`} alt={`Ảnh ${i + 1}`} className="h-20 w-20 object-cover" />
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
          <div className="px-6 py-5 space-y-5">

            {selected.materialType === 'SILVER' ? (
              /* ── BẠC: nhập giá vốn → tự ra giá bán ×3 ── */
              <div className="space-y-4">
                <SectionDivider label="Sản phẩm bạc" icon={<Gem className="h-3 w-3" />} />
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                  💡 Sản phẩm bạc: <strong>Giá bán = Giá vốn × {pricingConfig?.silverMultiplier ?? 3}</strong>
                </div>
                <CurrencyInput label="Giá vốn bạc" value={priceForm.materialCost}
                  onChange={(e) => {
                    const v = e.target.value
                    const cost = parseFloat(v) || 0
                    const sell = cost * (pricingConfig?.silverMultiplier ?? 3)
                    setPriceForm(f => ({ ...f, materialCost: v, costBeforeVAT: v, costWithVAT: v, costPrice: v, sellingPrice: String(sell) }))
                  }} icon={<Gem className="h-3 w-3" />} />
                {parseFloat(priceForm.sellingPrice) > 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <p className="text-xs text-emerald-600 font-semibold mb-1">Giá bán đề xuất</p>
                    <p className="text-2xl font-bold text-emerald-700">{fmt(priceForm.sellingPrice)}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── VÀNG: Step 1 — Tính giá vàng theo tuổi ── */}
                <SectionDivider label="Bước 1 — Tính giá vàng theo tuổi" icon={<Gem className="h-3 w-3" />} />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trọng lượng (chỉ)</Label>
                    <div className="relative">
                      <Input type="number" placeholder="0" value={priceForm.weightChi}
                        className="h-10 pr-10 text-sm tabular-nums"
                        onChange={(e) => {
                          const w = parseFloat(e.target.value) || 0
                          const g24k = parseFloat(priceForm.goldPrice24K) || 0
                          const karat = selected.materialType // e.g. 'GOLD_18K' → '18K'
                          const key = karat.replace('GOLD_', '').replace('GOLD', '24K')
                          const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)?.applied ?? 0
                          const matCost = Math.round(ratio * g24k * w)
                          setPriceForm(f => ({ ...f, weightChi: e.target.value, materialCost: matCost > 0 ? String(matCost) : f.materialCost }))
                        }} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">chỉ</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giá vàng 24K (đ/chỉ)</Label>
                    <div className="relative">
                      <Input type="number" placeholder="9,000,000" value={priceForm.goldPrice24K}
                        className="h-10 pr-6 text-sm tabular-nums"
                        onChange={(e) => {
                          const g24k = parseFloat(e.target.value) || 0
                          const w = parseFloat(priceForm.weightChi) || 0
                          const karat = selected.materialType
                          const key = karat.replace('GOLD_', '').replace('GOLD', '24K')
                          const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)?.applied ?? 0
                          const matCost = Math.round(ratio * g24k * w)
                          setPriceForm(f => ({ ...f, goldPrice24K: e.target.value, materialCost: matCost > 0 ? String(matCost) : f.materialCost }))
                        }} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">đ</span>
                    </div>
                  </div>
                </div>
                {/* Hiển thị tỉ lệ áp dụng */}
                {(() => {
                  const key = selected.materialType.replace('GOLD_', '').replace('GOLD', '24K')
                  const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)
                  return ratio ? (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      Tỉ lệ {ratio.label}: chuẩn {Math.round(ratio.standard * 100)}% + 5% hao hụt = <strong>áp dụng {Math.round(ratio.applied * 100)}%</strong>
                      {parseFloat(priceForm.weightChi) > 0 && parseFloat(priceForm.goldPrice24K) > 0 && (
                        <span className="ml-2">→ Giá vàng: <strong>{fmt(priceForm.materialCost)}</strong></span>
                      )}
                    </div>
                  ) : null
                })()}
                <CurrencyInput label="Giá vàng theo tuổi (tự tính hoặc nhập tay)" value={priceForm.materialCost}
                  onChange={(e) => setPriceForm(f => ({ ...f, materialCost: e.target.value }))}
                  icon={<Gem className="h-3 w-3" />} />

                {/* ── Step 2 — Bảng đá chi tiết ── */}
                <SectionDivider label="Bước 2 — Bảng tính đá / phụ kiện" icon={<Sparkles className="h-3 w-3" />} />
                <StoneTable entries={stoneEntries} onChange={setStoneEntries} fmt={fmt} />

                {/* ── Step 3 — Tiền công chế tác (theo docs) ── */}
                <SectionDivider label="Bước 3 — Tiền công chế tác" icon={<Hammer className="h-3 w-3" />} />
                <CurrencyInput label="Tiền công chế tác" value={priceForm.laborCost} onChange={(e) => setPriceForm(f => ({ ...f, laborCost: e.target.value }))} icon={<Hammer className="h-3 w-3" />} />

                {/* ── Step 4 — Tổng hợp giá ── */}
                <SectionDivider label="Bước 4 — Tổng hợp & Giá bán" icon={<TrendingUp className="h-3 w-3" />} />
                <PricingSummary
                  priceForm={priceForm}
                  stoneEntries={stoneEntries}
                  pricingConfig={pricingConfig}
                  setPriceForm={setPriceForm}
                  fmt={fmt}
                  margin={margin}
                  profit={profit}
                  marginGood={marginGood}
                />
              </>
            )}
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

// ─── Helper: format số có dấu chấm VD: 7.200.000 ───────────
function formatInputNumber(raw: string | undefined | null): string {
  if (raw === undefined || raw === null || raw === '') return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('vi-VN')
}
function parseInputNumber(formatted: string): string {
  return formatted.replace(/\./g, '').replace(/,/g, '')
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
  // value là số thuần (VD: "7200000"), hiển thị có dấu chấm (VD: "7.200.000")
  const displayed = formatInputNumber(value ?? '')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInputNumber(e.target.value)
    // Tạo synthetic event với value là số thuần để các handler bên ngoài nhận đúng
    const syntheticEvent = {
      ...e,
      target: { ...e.target, value: raw },
    } as React.ChangeEvent<HTMLInputElement>
    onChange(syntheticEvent)
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon && <span className="opacity-60">{icon}</span>}
        {label}
      </Label>
      <div className={`relative transition-all ${highlighted ? 'ring-2 ring-primary/20 rounded-lg' : ''}`}>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={displayed}
          onChange={handleChange}
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

// ── StoneTable ──────────────────────────────────────────────────────────────

const STONE_TYPE_LABELS: Record<string, string> = {
  lab_diamond: 'Kim cương lab',
  natural_diamond: 'Kim cương thiên nhiên',
  moissanite: 'Đá Moissanite',
  cz: 'Đá CZ',
  colored_stone: 'Đá màu / phụ kiện',
}

function makeStoneEntry(type: StoneEntry['type'] = 'lab_diamond'): StoneEntry {
  return {
    id: `stone-${Date.now()}-${Math.random()}`,
    type,
    quantity: 1,
    sizeOrCarat: '',
    unitPrice: '',
    priceMethod: 'per_piece',
  }
}

function StoneTable({
  entries,
  onChange,
  fmt,
}: {
  entries: StoneEntry[]
  onChange: React.Dispatch<React.SetStateAction<StoneEntry[]>>
  fmt: (v: number | string) => string
}) {
  const update = (id: string, patch: Partial<StoneEntry>) => {
    onChange((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const remove = (id: string) => {
    onChange((prev) => prev.filter((e) => e.id !== id))
  }

  const add = () => {
    onChange((prev) => [...prev, makeStoneEntry()])
  }

  const rowTotal = (e: StoneEntry) => {
    const price = parseFloat(e.unitPrice) || 0
    const qty = e.quantity || 0
    if (e.priceMethod === 'per_piece') return qty * price
    const carat = parseFloat(e.sizeOrCarat) || 0
    return qty * carat * price
  }

  const grandTotal = entries.reduce((s, e) => s + rowTotal(e), 0)

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => {
        const total = rowTotal(entry)
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: idx * 0.04 }}
            className="rounded-xl border border-border/60 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2"
          >
            {/* Row header */}
            <div className="flex items-center justify-between gap-2">
              <select
                value={entry.type}
                onChange={(e) => update(entry.id, { type: e.target.value as StoneEntry['type'] })}
                className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="lab_diamond">Kim cương lab</option>
                <option value="natural_diamond">Kim cương thiên nhiên</option>
                <option value="moissanite">Đá Moissanite</option>
                <option value="cz">Đá CZ</option>
                <option value="colored_stone">Đá màu / phụ kiện</option>
              </select>
              {total > 0 && (
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                  {fmt(total)}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(entry.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2">
              {/* Số lượng */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Số lượng</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="1"
                  value={entry.quantity}
                  onChange={(e) => update(entry.id, { quantity: parseInt(e.target.value) || 1 })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* Kích thước / carat */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {entry.priceMethod === 'per_carat' ? 'Trọng lượng (carat)' : 'Kích thước / mô tả'}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={entry.priceMethod === 'per_carat' ? '0.5' : '3mm'}
                  value={entry.sizeOrCarat}
                  onChange={(e) => update(entry.id, { sizeOrCarat: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* Đơn giá */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Đơn giá (đ/{entry.priceMethod === 'per_carat' ? 'carat' : 'viên'})
                </span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={entry.unitPrice ? Number(entry.unitPrice).toLocaleString('vi-VN') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '')
                      update(entry.id, { unitPrice: raw })
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 pr-5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">đ</span>
                </div>
              </div>

              {/* Cách tính */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Cách tính giá</span>
                <select
                  value={entry.priceMethod}
                  onChange={(e) => update(entry.id, { priceMethod: e.target.value as StoneEntry['priceMethod'] })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="per_piece">Theo viên</option>
                  <option value="per_carat">Theo carat</option>
                </select>
              </div>
            </div>

            {/* Formula display */}
            {total > 0 && (
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 border border-blue-200/70 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">
                {entry.priceMethod === 'per_piece' ? (
                  <>{entry.quantity} viên × {Number(entry.unitPrice).toLocaleString('vi-VN')}đ = <strong>{fmt(total)}</strong></>
                ) : (
                  <>{entry.quantity} viên × {entry.sizeOrCarat} ct × {Number(entry.unitPrice).toLocaleString('vi-VN')}đ/ct = <strong>{fmt(total)}</strong></>
                )}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Add button */}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border-2 border-dashed border-blue-300/60 dark:border-blue-700/60 py-2.5 text-xs font-medium text-blue-500 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors flex items-center justify-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Thêm dòng đá / phụ kiện
      </button>

      {/* Grand total */}
      {entries.length > 1 && grandTotal > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-xl border-2 border-blue-300/60 bg-blue-50 dark:bg-blue-950/20 px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
            <Gem className="h-3.5 w-3.5" />
            Tổng tiền đá ({entries.length} loại)
          </span>
          <span className="text-base font-bold text-blue-700 dark:text-blue-300 tabular-nums">
            {fmt(grandTotal)}
          </span>
        </motion.div>
      )}
    </div>
  )
}

// ── MultiMaterialPricingRows ────────────────────────────────────────────────

interface MultiMaterialPricingRowsProps {
  rows: GoldRow[]
  onChange: (rows: GoldRow[]) => void
  pricingConfig: { goldRatios: any[]; profitMargins: any[]; silverMultiplier: number; goldPrice24K?: number } | null
  fmt: (v: number | string) => string
  onTotalChange: (total: number) => void
}

function MultiMaterialPricingRows({
  rows, onChange, pricingConfig, fmt, onTotalChange,
}: MultiMaterialPricingRowsProps) {
  const computeCost = (type: string, price24k: string, weight: string, unit?: string): number => {
    const g = parseFloat(price24k) || 0
    let w = parseFloat(weight) || 0
    if (!g || !w) return 0
    // Nếu đơn vị là gram, đổi sang chỉ trước khi tính (1 chỉ = 3.75g)
    if (unit === 'gram') w = w / 3.75
    const key   = type.replace('GOLD_', '')
    const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)?.applied ?? 0
    return Math.round(ratio * g * w)
  }

  const update = (id: string, patch: Partial<GoldRow> & { weightUnit?: string }) => {
    const next = rows.map(r => {
      if (r.id !== id) return r
      const u = { ...r, ...patch }
      const cost = computeCost(u.materialType, u.goldPrice24K, u.weightChi, (u as any).weightUnit)
      u.materialCost = String(cost)
      return u
    })
    onChange(next)
    onTotalChange(next.reduce((s, r) => s + (parseFloat(r.materialCost) || 0), 0))
  }

  const handleSharedPriceChange = (newPrice: string) => {
    const next = rows.map(r => {
      const u = { ...r, goldPrice24K: newPrice }
      const cost = computeCost(u.materialType, u.goldPrice24K, u.weightChi, (u as any).weightUnit)
      u.materialCost = String(cost)
      return u
    })
    onChange(next)
    onTotalChange(next.reduce((s, r) => s + (parseFloat(r.materialCost) || 0), 0))
  }

  const toggleUnit = (row: GoldRow) => {
    const isGram = (row as any).weightUnit === 'gram'
    if (isGram) {
      // gram → chỉ (1 chỉ = 3.75g)
      const grams = parseFloat(row.weightChi) || 0
      const chi = grams > 0 ? String(Math.round((grams / 3.75) * 1000) / 1000) : ''
      update(row.id, { weightChi: chi, weightUnit: 'chi' } as any)
    } else {
      // chỉ → gram
      const chi = parseFloat(row.weightChi) || 0
      const grams = chi > 0 ? String(Math.round(chi * 3.75 * 1000) / 1000) : ''
      update(row.id, { weightChi: grams, weightUnit: 'gram' } as any)
    }
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.materialCost) || 0), 0)
  const sharedGoldPrice = rows[0]?.goldPrice24K || ''

  return (
    <div className="space-y-4">
      {/* Ô nhập chung giá vàng 24K */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold text-primary uppercase tracking-wide">
              Giá vàng 24K gốc hôm nay (đ/chỉ)
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Áp dụng làm giá vàng cơ sở quy đổi cho tất cả các loại vàng bên dưới.
            </p>
          </div>
          <div className="relative w-full sm:w-48 shrink-0">
            <input
              type="text"
              inputMode="numeric"
              placeholder="9.000.000"
              value={sharedGoldPrice ? Number(sharedGoldPrice).toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\./g, '').replace(/,/g, '')
                handleSharedPriceChange(raw)
              }}
              className="w-full h-10 rounded-md border border-primary/30 bg-background px-3 pr-6 text-sm font-semibold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 pointer-events-none font-medium">đ</span>
          </div>
        </div>
      </div>

      {/* Bảng chất liệu */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chất liệu / Công thức</th>
                <th className="p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right w-44">Trọng lượng</th>
                <th className="p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right w-36">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row, idx) => {
                const key = row.materialType.replace('GOLD_', '')
                const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)
                const hasData = !!(parseFloat(row.goldPrice24K) && parseFloat(row.weightChi))
                const unit = (row as any).weightUnit === 'gram' ? 'gram' : 'chi'

                // Tính giá trị quy đổi mỗi chỉ
                const appliedRatio = ratio?.applied ?? 0
                const goldPrice = parseFloat(row.goldPrice24K) || 0
                const ratePerChi = Math.round(appliedRatio * goldPrice)

                return (
                  <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                    {/* Chất liệu & Quy đổi */}
                    <td className="p-3 align-middle space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 text-amber-800 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5">
                          <Layers className="h-2.5 w-2.5" />
                          {row.label}
                          {ratio && <span className="opacity-70 font-normal"> · {Math.round(ratio.applied * 100)}%</span>}
                        </span>
                      </div>
                      {goldPrice > 0 && ratio && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {Number(row.goldPrice24K).toLocaleString('vi-VN')} × {Math.round(appliedRatio * 100)}% = {ratePerChi.toLocaleString('vi-VN')} đ/chỉ
                        </p>
                      )}
                    </td>

                    {/* Trọng lượng */}
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-1 justify-end">
                        <div className="relative w-28">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={row.weightChi}
                            onChange={(e) => update(row.id, { weightChi: e.target.value.replace(/[^0-9.]/g, '') })}
                            className="w-full h-9 rounded-md border border-input bg-background px-2.5 pr-8 text-xs text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none font-medium">
                            {unit === 'gram' ? 'g' : 'chỉ'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleUnit(row)}
                          className="h-8 w-8 rounded-md hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
                          title={unit === 'gram' ? 'Đổi sang chỉ' : 'Đổi sang gram'}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                      {unit === 'gram' && parseFloat(row.weightChi) > 0 && (
                        <p className="text-[9px] text-muted-foreground text-right mt-0.5">
                          ≈ {Math.round((parseFloat(row.weightChi) / 3.75) * 1000) / 1000} chỉ
                        </p>
                      )}
                    </td>

                    {/* Thành tiền */}
                    <td className="p-3 align-middle text-right font-semibold text-xs text-primary tabular-nums">
                      {hasData ? fmt(row.materialCost) : '0 đ'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tổng cộng nhiều loại */}
      {rows.length > 1 && total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5"
        >
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            Tổng cộng vàng ({rows.length} loại)
          </span>
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 tabular-nums">
            {fmt(total)}
          </span>
        </motion.div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function QuoteListPricer({ currentRole, currentUserName = 'NV Báo giá', newQuote, action }: QuoteListPricerProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const perPage = 8
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

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [stoneEntries, setStoneEntriesRaw] = useState<StoneEntry[]>([])
  const [goldRows, setGoldRows] = useState<GoldRow[]>([])
  const [stoneInputMethod, setStoneInputMethod] = useState<'direct' | 'table'>('direct')

  const fmt = (v: number | string) => {
    const num = typeof v === 'string' ? parseFloat(v) || 0 : v
    return formatCurrency(num)
  }

  const calculateQuotePrices = (
    currentForm: PriceFormState,
    materialType: string,
    currentStones: StoneEntry[],
    activeStoneMethod: 'direct' | 'table'
  ): PriceFormState => {
    const updated = { ...currentForm }
    const n = (v: string) => parseFloat(v) || 0

    if (materialType === 'SILVER') {
      const cost = n(updated.materialCost)
      updated.laborCost = '0'
      updated.stoneCost = '0'
      updated.costBeforeVAT = String(cost)
      updated.costWithVAT = String(cost)
      updated.costPrice = String(cost)
      
      const multiplier = pricingConfig?.silverMultiplier ?? 3
      updated.sellingPrice = String(Math.round((cost * multiplier) / 1000) * 1000)
    } else {
      // 1. Tiền nguyên liệu vàng (lấy từ materialCost hiện tại)
      const goldCost = n(updated.materialCost)

      // 2. Tính tiền đá
      let stoneCostVal = 0
      if (activeStoneMethod === 'table') {
        stoneCostVal = currentStones.reduce((sum, e) => {
          const price = parseFloat(e.unitPrice) || 0
          if (e.priceMethod === 'per_piece') return sum + e.quantity * price
          const carat = parseFloat(e.sizeOrCarat) || 0
          return sum + e.quantity * carat * price
        }, 0)
        updated.stoneCost = String(Math.round(stoneCostVal))
      } else {
        stoneCostVal = n(updated.stoneCost)
      }

      // 3. Tiền công chế tác
      const laborCostVal = n(updated.laborCost)

      // 4. Tính toán giá vốn và VAT
      const totalBeforeVAT = goldCost + stoneCostVal + laborCostVal
      const vat = totalBeforeVAT * 0.1
      const withVAT = totalBeforeVAT + vat

      updated.costBeforeVAT = String(Math.round(totalBeforeVAT))
      updated.costWithVAT = String(Math.round(withVAT))
      updated.costPrice = String(Math.round(withVAT))

      // 5. Tính giá bán dựa trên Profit Margins
      if (pricingConfig?.profitMargins) {
        const { divisor } = getProfitDivisor(withVAT, pricingConfig.profitMargins)
        updated.sellingPrice = totalBeforeVAT > 0 ? String(Math.round(withVAT / divisor / 1000) * 1000) : '0'
      }
    }

    return updated
  }

  const handleSilverCostChange = (val: string) => {
    setPriceForm((f) => {
      const updated = { ...f, materialCost: val }
      return calculateQuotePrices(updated, selected?.materialType || '', stoneEntries, stoneInputMethod)
    })
  }

  const handleSilverSellingPriceChange = (val: string) => {
    setPriceForm((f) => {
      const updated = { ...f, sellingPrice: val }
      if (selected?.materialType === 'SILVER') {
        const multiplier = pricingConfig?.silverMultiplier ?? 3
        const sellVal = parseFloat(val) || 0
        const costVal = sellVal / multiplier
        
        updated.materialCost = String(Math.round(costVal))
        updated.costBeforeVAT = String(Math.round(costVal))
        updated.costWithVAT = String(Math.round(costVal))
        updated.costPrice = String(Math.round(costVal))
        updated.laborCost = '0'
        updated.stoneCost = '0'
      }
      return updated
    })
  }

  const handleStoneMethodChange = (method: 'direct' | 'table') => {
    setStoneInputMethod(method)
    setPriceForm((f) => {
      return calculateQuotePrices(f, selected?.materialType || '', stoneEntries, method)
    })
  }

  // Khi stoneEntries thay đổi → tự tính tổng và cập nhật stoneCost + tái tính giá bán
  const setStoneEntries: React.Dispatch<React.SetStateAction<StoneEntry[]>> = (action) => {
    setStoneEntriesRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action
      setPriceForm((f) => {
        return calculateQuotePrices(f, selected?.materialType || '', next, stoneInputMethod)
      })
      return next
    })
  }


  useEffect(() => {
    pricingConfigApi.get().then(setPricingConfig).catch(() => {})
  }, [])

  const canViewCost = currentRole === 'order'
  const isPricer = canViewCost
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (newQuote) {
      setQuotes((prev) => {
        if (prev.some((q) => q._id === newQuote._id)) return prev
        return [newQuote, ...prev]
      })
      openDetail(newQuote)
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

    // Init multi-material rows từ dữ liệu Sale đã nhập
    const parsedRows = parseMaterialsFromQuote({
      materialType: q.materialType,
      dimensions: (q as any).dimensions,
      notes: q.notes,
    })

    // Pre-fill giá vàng: ưu tiên giá đã lưu trong quote, fallback về giá hệ thống hôm nay
    const savedGoldPrice = (q as any).goldPrice24K?.toString() || ''
    const systemGoldPrice = pricingConfig?.goldPrice24K?.toString() || ''
    const goldPriceToLoad = savedGoldPrice || systemGoldPrice

    // Tự động điền giá vàng hệ thống và tính lại giá trị cho từng dòng vàng
    const mappedRows = parsedRows.map(row => {
      const finalPrice = row.goldPrice24K || goldPriceToLoad
      const g = parseFloat(finalPrice) || 0
      let w = parseFloat(row.weightChi) || 0
      let cost = 0
      if (g && w) {
        let weightInChi = w
        if ((row as any).weightUnit === 'gram') weightInChi = w / 3.75
        const key = row.materialType.replace('GOLD_', '')
        const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)?.applied ?? 0
        cost = Math.round(ratio * g * weightInChi)
      }
      return {
        ...row,
        goldPrice24K: finalPrice,
        materialCost: String(cost)
      }
    })
    setGoldRows(mappedRows)

    const computedTotalMaterialCost = mappedRows.reduce((sum, r) => sum + (parseFloat(r.materialCost) || 0), 0)
    const initialMaterialCost = (q as any).materialCost?.toString() || (computedTotalMaterialCost > 0 ? String(computedTotalMaterialCost) : '')

    let initialWeightGram = q.weightGram?.toString() || ''
    let initialWeightChi = q.weightChi?.toString() || ''

    // Nếu chưa có cân lượng trong DB (quote mới), tự động điền từ parsedRows
    if (parsedRows.length > 0) {
      const firstRow = parsedRows[0]
      const parsedWeight = parseFloat(firstRow.weightChi) || 0
      if (parsedWeight > 0) {
        if (q.materialType === 'SILVER') {
          if (!initialWeightGram) {
            if (firstRow.weightUnit === 'chi') {
              initialWeightGram = String(parsedWeight * 3.75)
            } else {
              initialWeightGram = String(parsedWeight)
            }
          }
        } else {
          if (!initialWeightChi) {
            if (firstRow.weightUnit === 'gram') {
              initialWeightChi = String(parsedWeight / 3.75)
            } else {
              initialWeightChi = String(parsedWeight)
            }
          }
        }
      }
    }

    const savedSellingPrice = q.sellingPrice?.toString() || ''
    const initialFormState = {
      ...EMPTY_PRICE_FORM(currentUserName),
      weightChi: initialWeightChi,
      weightGram: initialWeightGram,
      goldPrice24K: goldPriceToLoad,
      materialCost: initialMaterialCost,
      stoneCost: (q as any).stoneCost?.toString() || '',
      laborCost: q.laborCost?.toString() || '',
      costBeforeVAT: (q as any).costBeforeVAT?.toString() || '',
      costWithVAT: (q as any).costWithVAT?.toString() || '',
      costPrice: q.costPrice?.toString() || '',
      sellingPrice: savedSellingPrice,
    }

    const savedStones = (q as any).stones || []
    setStoneEntriesRaw(savedStones)
    const activeMethod = savedStones.length > 0 ? 'table' : 'direct'
    setStoneInputMethod(activeMethod)

    // Tự động tính toán lại toàn bộ form nếu chưa từng được báo giá (mới mở lần đầu)
    if (!q.sellingPrice || q.sellingPrice === 0) {
      const recalculatedForm = calculateQuotePrices(initialFormState, q.materialType, savedStones, activeMethod)
      setPriceForm(recalculatedForm)
    } else {
      setPriceForm(initialFormState)
    }
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
      const optionsPayload = goldRows.map(row => {
        const goldCost = parseFloat(row.materialCost) || 0
        const stoneCostVal = parseFloat(priceForm.stoneCost) || 0
        const laborCostVal = parseFloat(priceForm.laborCost) || 0
        const costBeforeVAT = goldCost + stoneCostVal + laborCostVal
        
        const isSilver = selected.materialType === 'SILVER'
        const costWithVAT = isSilver ? costBeforeVAT : (costBeforeVAT * 1.1)
        
        let autoSellingPrice = 0
        if (isSilver) {
          const multiplier = pricingConfig?.silverMultiplier ?? 3
          autoSellingPrice = goldCost * multiplier + laborCostVal + stoneCostVal
        } else if (pricingConfig?.profitMargins) {
          const { divisor } = getProfitDivisor(costWithVAT, pricingConfig.profitMargins)
          autoSellingPrice = costBeforeVAT > 0 ? Math.round(costWithVAT / divisor / 1000) * 1000 : 0
        }

        const finalSellingPrice = parseFloat((row as any).sellingPrice || '') || autoSellingPrice

        return {
          materialType: row.materialType as any,
          weightChi: row.weightUnit === 'gram' ? undefined : (parseFloat(row.weightChi) || 0),
          weightGram: row.weightUnit === 'gram' ? (parseFloat(row.weightChi) || 0) : undefined,
          laborCost: laborCostVal,
          goldPrice24K: parseFloat(row.goldPrice24K) || 0,
          materialCost: goldCost,
          stoneCost: stoneCostVal,
          costBeforeVAT: Math.round(costBeforeVAT),
          costWithVAT: Math.round(costWithVAT),
          costPrice: Math.round(costWithVAT),
          sellingPrice: Math.round(finalSellingPrice),
        }
      })

      const primaryOption = optionsPayload[0]

      await quotesApi.updatePrice(selected._id, {
        weightChi: primaryOption?.weightChi,
        weightGram: primaryOption?.weightGram,
        goldPrice24K: primaryOption?.goldPrice24K,
        laborCost: primaryOption?.laborCost || 0,
        materialCost: primaryOption?.materialCost || 0,
        stoneCost: primaryOption?.stoneCost || 0,
        costBeforeVAT: primaryOption?.costBeforeVAT || 0,
        stones: stoneInputMethod === 'table' ? stoneEntries.map(e => {
          const unitPriceVal = parseFloat(e.unitPrice) || 0
          const sizeVal = parseFloat(e.sizeOrCarat) || 0
          const totalVal = e.priceMethod === 'per_piece' ? e.quantity * unitPriceVal : e.quantity * sizeVal * unitPriceVal
          return {
            name: `${STONE_TYPE_LABELS[e.type] || e.type}${e.sizeOrCarat ? ` (${e.sizeOrCarat})` : ''}`,
            quantity: e.quantity,
            pricePerUnit: unitPriceVal,
            totalPrice: Math.round(totalVal),
          }
        }) : [],
        costPrice: primaryOption?.costPrice || 0,
        sellingPrice: primaryOption?.sellingPrice || 0,
        quotedBy: priceForm.quotedBy,
        options: optionsPayload,
      })
      await quotesApi.completeQuoting(selected._id)
      addNotification({
        type: 'success',
        title: 'Hoàn thành báo giá',
        message: `Đã báo giá xong cho "${selected.productName}" — giá bán chính: ${formatCurrency(primaryOption?.sellingPrice || 0)}.`,
      })
      setSelected(null)
      fetchQuotes()
    } catch (err) {
      console.error(err)
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
      // Upload ảnh mới nếu có
      let newImageUrls: string[] = []
      if (editImages.length > 0) {
        const { uploadApi } = await import('@/lib/api')
        newImageUrls = await uploadApi.uploadImages(editImages.map(i => i.file))
      }
      // Gộp ảnh giữ lại + ảnh mới upload
      const finalImages = [...keepImages, ...newImageUrls]

      await quotesApi.updateInfo(selected._id, {
        dimensions: editForm.dimensions || (selected as any).dimensions,
        stoneRequirements: editForm.stoneRequirements || (selected as any).stoneRequirements,
        productDescription: editForm.productDescription || selected.productDescription,
        notes: editForm.notes || selected.notes,
        ...(finalImages.length > 0 ? { images: finalImages } : {}),
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
    const rawVal = e.target.value
    setPriceForm((f) => {
      const nextForm = { ...f, [key]: rawVal }
      return calculateQuotePrices(nextForm, selected?.materialType || '', stoneEntries, stoneInputMethod)
    })
  }
  const filtered = filterStatus === 'ALL' ? quotes : quotes.filter((q) => q.status === filterStatus)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  // Derived values for margin display
  // costWithVAT là giá vốn thực (sau VAT 10%) — dùng để hiển thị và tính margin
  const cost = parseFloat(priceForm.costWithVAT) || parseFloat(priceForm.costPrice) || 0
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
        <div className="flex items-center gap-2">
          {action}
          <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-1.5 h-9 rounded-lg">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={filterStatus} onValueChange={(v) => { setFilterStatus(v as QuoteStatus | 'ALL'); setPage(1) }} className="pt-2">
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
              <TableRow className="bg-[#F8F9FA] border-b border-slate-200">
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Mã</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Sản phẩm</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Chất liệu</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Người yêu cầu</TableHead>
                {canViewCost && <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider text-right h-11">Giá vốn</TableHead>}
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider text-right h-11">Giá bán</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Ngày tạo</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Trạng thái</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider text-right h-11">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {paginated.map((q, i) => {
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
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(q.createdAt)}
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
                           {(q.status === 'CONFIRMED' || q.status === 'CANCELLED') && (
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
                   <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                     Không có yêu cầu nào
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
           </Table>
         </div>

        {/* Phân trang (Pagination) */}
        {totalPages > 1 && (
          <div className="pt-4 flex items-center justify-between border-t border-border/60">
            <span className="text-xs text-[#9E8E7A] font-medium">
              Hiển thị {Math.min(filtered.length, (page - 1) * perPage + paginated.length)} / {filtered.length} yêu cầu
            </span>
            <div className="flex gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 p-0 rounded-lg border-[#E6DFD0] hover:bg-[#FBF6E9] hover:text-[#C9981A] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 p-0 rounded-lg text-xs font-bold transition-all ${
                    p === page
                      ? 'bg-[#C9981A] hover:bg-[#735A19] text-white shadow-sm border-transparent'
                      : 'border-[#E6DFD0] hover:bg-[#FBF6E9] hover:text-[#C9981A] text-[#6B5E4C]'
                  }`}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 p-0 rounded-lg border-[#E6DFD0] hover:bg-[#FBF6E9] hover:text-[#C9981A] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>


      {/* ── Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          className={`${dialogMode === 'pricing' ? 'max-w-5xl w-[96vw]' : 'max-w-4xl w-[92vw]'} p-0 gap-0 overflow-hidden border-[#E6DFD0] rounded-[20px] shadow-2xl`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >

          {/* Header */}
          <div style={{
            padding: '20px 28px',
            background: 'linear-gradient(120deg, #FBF6E9 0%, #FFFDF7 55%, white 100%)',
            borderBottom: '1px solid #EDE8DE',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative' as const,
          }}>
            {/* Icon */}
            <div style={{
              width: '42px', height: '42px', borderRadius: '13px', flexShrink: 0,
              background: 'linear-gradient(135deg, #E8C44A, #C9981A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(201, 152, 26, 0.25)',
            }}>
              <FileText style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[10px] bg-white border border-[#E6DFD0] px-2 py-0.5 rounded text-[#6B5E4C] font-semibold">
                  {selected?.quoteCode}
                </span>
                {selected && (
                  <Badge variant="outline" className={`${STATUS_CONFIG[selected.status]?.color} gap-1.5 pl-2 py-0 h-5 font-bold text-[10px]`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selected.status]?.dot}`} />
                    {STATUS_CONFIG[selected.status]?.label}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-semibold text-[#1A1814] tracking-tight" style={{ fontFamily: 'Lora, serif', margin: 0 }}>
                {selected?.productName ?? 'Chi tiết báo giá'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#9E8E7A] mt-0.5">
                {dialogMode === 'review' ? 'Kiểm tra thông tin yêu cầu từ Sale'
                  : dialogMode === 'pricing' ? 'Xem thông tin yêu cầu và nhập chi phí để tính giá vốn'
                  : 'Chi tiết báo giá'}
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
                        { label: 'Số lượng',      value: `${(selected as any).quantity ?? 1} cái`, icon: '📦' },
                        { label: 'Deadline',      value: (selected as any).deadline, icon: '📅' },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className="rounded-xl bg-background border border-border/60 px-3 py-2.5">
                          <p className="text-xs text-muted-foreground mb-1">{icon} {label}</p>
                          <p className="font-semibold text-sm">{value || '—'}</p>
                        </div>
                      ))}
                      {/* Chất liệu — hiển thị đầy đủ multi-row */}
                      {(() => {
                        const parsed = parseMaterialsFromQuote({
                          materialType: selected.materialType,
                          dimensions: (selected as any).dimensions,
                          notes: selected.notes,
                        })
                        return (
                          <div className="rounded-xl bg-background border border-border/60 px-3 py-2.5 col-span-2">
                            <p className="text-xs text-muted-foreground mb-1.5">⚙️ Chất liệu</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parsed.map((row, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300/60 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-0.5">
                                  <Layers className="h-3 w-3" />
                                  {row.label}
                                  {row.weightChi && <span className="opacity-60 font-normal">· {row.weightChi} chỉ</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
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
                            <a key={i} href={`http://localhost:3000${img}`} target="_blank" rel="noreferrer"
                              className="block rounded-xl border overflow-hidden hover:opacity-80 hover:scale-105 transition-all duration-200 shadow-sm">
                              <img src={`http://localhost:3000${img}`} alt={`Ảnh ${i + 1}`} className="h-20 w-20 object-cover" />
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

                    {selected.materialType === 'SILVER' ? (
                      /* ── BẠC: Luồng tối giản & đặc biệt ── */
                      <div className="space-y-4">
                        <SectionDivider label="Sản phẩm bạc" icon={<Gem className="h-3 w-3" />} />
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                          💡 Sản phẩm bạc: <strong>Giá bán = Giá vốn × {pricingConfig?.silverMultiplier ?? 3}</strong>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trọng lượng (gram)</Label>
                            <div className="relative">
                              <Input type="number" placeholder="0" value={priceForm.weightGram}
                                className="h-10 pr-14 text-sm tabular-nums"
                                onChange={(e) => setPriceForm((f) => ({ ...f, weightGram: e.target.value }))} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">gram</span>
                            </div>
                          </div>
                          <CurrencyInput
                            label="Giá vốn bạc (đầu vào)"
                            value={priceForm.materialCost}
                            onChange={(e) => handleSilverCostChange(e.target.value)}
                            icon={<Gem className="h-3 w-3" />}
                          />
                        </div>

                        {/* Tổng giá vốn hiển thị đơn giản */}
                        <div className="rounded-xl border border-border bg-muted/30 p-4 flex justify-between items-center text-sm">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng giá vốn bạc</p>
                            <p className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(parseFloat(priceForm.materialCost) || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái thuế</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Không tính VAT</p>
                          </div>
                        </div>

                        {/* Giá bán đề xuất */}
                        <SectionDivider label="Giá bán đề xuất" icon={<TrendingUp className="h-3 w-3" />} />
                        <div className="space-y-3">
                          <div className="relative">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={formatInputNumber(priceForm.sellingPrice)}
                              className="h-12 pr-7 text-lg font-bold border-2 border-primary/30 bg-primary/5 focus-visible:ring-primary/30 text-primary tabular-nums"
                              onChange={(e) => handleSilverSellingPriceChange(parseInputNumber(e.target.value))}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base text-primary/50 pointer-events-none font-bold">đ</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            * Thay đổi giá vốn sẽ tự động tính lại giá bán và ngược lại.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ── VÀNG: Luồng đầy đủ ── */
                      <>
                        {/* Section 1: Nguyên liệu — multi-material */}
                        <SectionDivider label="Nguyên liệu" icon={<Gem className="h-3 w-3" />} />
                        <MultiMaterialPricingRows
                          rows={goldRows}
                          onChange={setGoldRows}
                          pricingConfig={pricingConfig}
                          fmt={fmt}
                          onTotalChange={(total) => {
                            setPriceForm((f) => {
                              const nextForm = { ...f, materialCost: String(total) }
                              return calculateQuotePrices(nextForm, selected?.materialType || '', stoneEntries, stoneInputMethod)
                            })
                          }}
                        />

                        {/* Section 2: Bảng tính đá / phụ kiện */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tiền đá / phụ kiện</span>
                          <div className="flex rounded-md bg-muted p-0.5 text-[10px] font-medium">
                            <button
                              type="button"
                              onClick={() => handleStoneMethodChange('direct')}
                              className={`px-2.5 py-1 rounded transition-all ${
                                stoneInputMethod === 'direct'
                                  ? 'bg-background text-foreground shadow-sm font-semibold'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Nhập tổng tiền
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStoneMethodChange('table')}
                              className={`px-2.5 py-1 rounded transition-all ${
                                stoneInputMethod === 'table'
                                  ? 'bg-background text-foreground shadow-sm font-semibold'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Tính từ bảng đá
                            </button>
                          </div>
                        </div>

                        {stoneInputMethod === 'direct' ? (
                          <CurrencyInput
                            label="Tổng tiền đá / phụ kiện"
                            value={priceForm.stoneCost}
                            onChange={updatePriceField('stoneCost')}
                            icon={<Sparkles className="h-3.5 w-3.5" />}
                          />
                        ) : (
                          <>
                            <StoneTable entries={stoneEntries} onChange={setStoneEntries} fmt={fmt} />
                            {parseFloat(priceForm.stoneCost) > 0 && (
                              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex justify-between">
                                <span>Tổng tiền đá / phụ kiện</span>
                                <strong>{fmt(priceForm.stoneCost)}</strong>
                              </div>
                            )}
                          </>
                        )}

                        {/* Section 3: Tiền công chế tác */}
                        <SectionDivider label="Tiền công chế tác" icon={<Hammer className="h-3 w-3" />} />
                        <CurrencyInput label="Tiền công chế tác" value={priceForm.laborCost} onChange={updatePriceField('laborCost')} icon={<Hammer className="h-3 w-3" />} />

                        {/* Tổng giá vốn */}
                        <div className="rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/5 to-amber-50/60 dark:from-primary/10 dark:to-amber-950/20 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-1">
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Giá vốn chưa VAT</p>
                                  <p className="text-base font-semibold text-foreground tabular-nums">
                                    {priceForm.costBeforeVAT ? formatCurrency(parseFloat(priceForm.costBeforeVAT)) : '0 đ'}
                                  </p>
                                </div>
                                <span className="text-muted-foreground text-xs">+10% →</span>
                                <div>
                                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Giá vốn có VAT</p>
                                  <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(cost)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                              <Calculator className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          {cost > 0 && (
                            <div className="mt-3 space-y-1.5">
                              {[
                                { label: 'Nguyên vật liệu', value: parseFloat(priceForm.materialCost) || 0, color: 'bg-amber-400' },
                                { label: 'Đá quý',           value: parseFloat(priceForm.stoneCost) || 0,    color: 'bg-blue-400' },
                                { label: 'Tiền công',         value: parseFloat(priceForm.laborCost) || 0, color: 'bg-emerald-400' },
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
                          {/* Thông tin biên lợi nhuận tự động */}
                          {cost > 0 && pricingConfig?.profitMargins && (() => {
                            const { divisor, margin: tier } = getProfitDivisor(cost, pricingConfig.profitMargins)
                            return (
                              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                📊 Áp dụng biên <strong>{tier}</strong> (÷{divisor}) → Giá bán tự tính bên dưới
                              </div>
                            )
                          })()}
                          <div className="relative">
                            <Input type="text" inputMode="numeric" placeholder="0"
                              value={formatInputNumber(priceForm.sellingPrice)}
                              className="h-12 pr-7 text-lg font-bold border-2 border-primary/30 bg-primary/5 focus-visible:ring-primary/30 text-primary tabular-nums"
                              onChange={(e) => setPriceForm((f) => ({ ...f, sellingPrice: parseInputNumber(e.target.value) }))} />
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
                      </>
                    )}

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
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-1">
                        <Label className="text-xs font-semibold text-[#6B5E4C] uppercase tracking-wider">Kích thước / Trọng lượng</Label>
                        <Input
                          value={editForm.dimensions}
                          onChange={(e) => setEditForm(f => ({ ...f, dimensions: e.target.value }))}
                          placeholder="VD: Size 12, khoảng 3 chỉ, dài 45cm..."
                          className="h-10 border-[#E6DFD0] focus-visible:ring-[#C9981A]/30 focus-visible:border-[#C9981A] rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label className="text-xs font-semibold text-[#6B5E4C] uppercase tracking-wider">Yêu cầu đá / phụ kiện</Label>
                        <Input
                          value={editForm.stoneRequirements}
                          onChange={(e) => setEditForm(f => ({ ...f, stoneRequirements: e.target.value }))}
                          placeholder="VD: 1 viên kim cương 0.3ct, đá CZ trắng..."
                          className="h-10 border-[#E6DFD0] focus-visible:ring-[#C9981A]/30 focus-visible:border-[#C9981A] rounded-xl"
                        />
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label className="text-xs font-semibold text-[#6B5E4C] uppercase tracking-wider">Mô tả sản phẩm</Label>
                        <Textarea
                          value={editForm.productDescription}
                          onChange={(e) => setEditForm(f => ({ ...f, productDescription: e.target.value }))}
                          placeholder="Mô tả chi tiết kiểu dáng, yêu cầu đặc biệt..."
                          rows={3}
                          className="border-[#E6DFD0] focus-visible:ring-[#C9981A]/30 focus-visible:border-[#C9981A] rounded-xl resize-none"
                        />
                      </div>
                      <div className="space-y-2 col-span-1">
                        <Label className="text-xs font-semibold text-[#6B5E4C] uppercase tracking-wider">Ghi chú thêm cho NV báo giá</Label>
                        <Textarea
                          value={editForm.notes}
                          onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Thông tin bổ sung, yêu cầu đặc biệt khác..."
                          rows={3}
                          className="border-[#E6DFD0] focus-visible:ring-[#C9981A]/30 focus-visible:border-[#C9981A] rounded-xl resize-none"
                        />
                      </div>
                    </div>

                    {/* Ảnh sản phẩm */}
                    <div className="space-y-3 pt-3 border-t border-[#EDE8DE]">
                      <Label className="text-xs font-semibold text-[#6B5E4C] uppercase tracking-wider">Hình ảnh sản phẩm</Label>

                      {/* Ảnh cũ — có thể xoá từng cái */}
                      {keepImages.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Ảnh hiện tại (bấm vào ảnh để xoá)</p>
                          <div className="flex flex-wrap gap-2">
                            {keepImages.map((img, i) => (
                              <div key={img} className="relative h-16 w-16 rounded-xl border border-[#EDE8DE] overflow-hidden group p-0.5 bg-white">
                                <img src={`http://localhost:3000${img}`} alt="" className="h-full w-full object-cover rounded-lg" />
                                <button
                                  type="button"
                                  onClick={() => setKeepImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
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
                            <div key={img.url} className="relative h-16 w-16 rounded-xl border border-[#EDE8DE] overflow-hidden group p-0.5 bg-white">
                              <img src={img.url} alt="" className="h-full w-full object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(img.url)
                                  setEditImages(prev => prev.filter((_, idx) => idx !== i))
                                }}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          ))}
                          {keepImages.length + editImages.length < 5 && (
                            <button
                              type="button"
                              onClick={() => editFileRef.current?.click()}
                              className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C9981A]/40 text-[#A07810] hover:border-[#C9981A] hover:bg-[#FBF6E9] hover:text-[#C9981A] transition-all"
                            >
                              <ImageIcon className="h-5 w-5" />
                              <span className="mt-0.5 text-[10px] font-medium">Thêm</span>
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
              <div className="flex flex-col overflow-hidden bg-background animate-in fade-in zoom-in-95 duration-200" style={{ height: '78vh' }}>
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* LEFT COLUMN: Yêu cầu & Thông số sản phẩm */}
                  <div className="flex flex-col w-[52%] shrink-0 border-r border-[#EDE8DE] overflow-hidden bg-[#FCFAF6]">
                    {/* Sub-header */}
                    <div className="px-5 py-3 border-b border-[#EDE8DE] bg-[#FBF6E9] shrink-0 flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#C9981A]" />
                      <span className="text-xs font-bold text-[#6B5E4C] uppercase tracking-wider font-lora">Yêu cầu & Thông số</span>
                    </div>

                    {/* Left content scrollable */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                      
                      {/* Lý do trả lại từ NV báo giá (nếu có) */}
                      {selected.status === 'NEED_MORE_INFO' && selected.rejectReason && (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 shadow-sm">
                          <p className="text-xs font-bold text-orange-700 mb-1 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" /> Lý do NV báo giá trả lại
                          </p>
                          <p className="text-sm text-orange-950 leading-relaxed font-medium">{selected.rejectReason}</p>
                          {!isPricer && (
                            <p className="text-[11px] text-orange-700/80 mt-2 font-medium">
                              💡 Vui lòng bấm nút <strong>Chỉnh sửa & Gửi lại</strong> ở góc dưới bên phải để cập nhật thông tin.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Metadata grid (3 columns) */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { label: 'Người yêu cầu', value: selected.requestedBy, icon: '👤' },
                          { label: 'Số lượng', value: `${(selected as any).quantity || 1} cái`, icon: '📦' },
                          { label: 'Deadline', value: (selected as any).deadline, icon: '📅' },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="rounded-xl border border-[#EDE8DE] bg-white px-3 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md">
                            <span className="text-[9px] text-[#9E8E7A] font-bold tracking-wider uppercase block">{icon} {label}</span>
                            <p className="font-bold mt-1 text-xs text-[#3A352E] truncate">{value || '—'}</p>
                          </div>
                        ))}
                      </div>

                      {/* Chất liệu yêu cầu */}
                      {(() => {
                        const parsed = parseMaterialsFromQuote({
                          materialType: selected.materialType,
                          dimensions: (selected as any).dimensions,
                          notes: selected.notes,
                        })
                        return (
                          <div className="rounded-xl border border-[#EDE8DE] bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md">
                            <span className="text-[9px] text-[#9E8E7A] font-bold tracking-wider uppercase flex items-center gap-1.5 mb-2">⚙️ Chất liệu yêu cầu</span>
                            <div className="flex flex-wrap gap-1.5">
                              {parsed.map((row, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#FBF6E9] border border-[#E6DFD0] text-[#8C6D1F] text-xs font-semibold px-3 py-1">
                                  <Layers className="h-3 w-3" />
                                  {row.label}
                                  {row.weightChi && <span className="opacity-75 font-normal">· {row.weightChi} chỉ</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Thông số chi tiết */}
                      <div className="space-y-3">
                        {[
                          { label: 'Kích thước / Trọng lượng dự kiến', value: (selected as any).dimensions, icon: '📐' },
                          { label: 'Yêu cầu đá / Phụ kiện', value: (selected as any).stoneRequirements, icon: '💎' },
                          { label: 'Mô tả chi tiết sản phẩm', value: selected.productDescription, icon: '📝' },
                        ].filter(x => x.value).map(({ label, value, icon }) => (
                          <div key={label} className="rounded-xl border border-[#EDE8DE] bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md">
                            <span className="text-[9px] text-[#9E8E7A] font-bold tracking-wider uppercase flex items-center gap-1.5 mb-1.5">{icon} {label}</span>
                            <p className="text-xs text-[#3A352E] font-medium leading-relaxed whitespace-pre-wrap">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Ghi chú thêm cho NV báo giá */}
                      {selected.notes && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 shadow-sm">
                          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                            <AlertCircle className="h-3 w-3" /> Ghi chú cho NV báo giá
                          </p>
                          <p className="text-xs text-amber-900 leading-relaxed font-medium">{selected.notes}</p>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* RIGHT COLUMN: Giá bán, Chi phí & Hình ảnh */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Sub-header */}
                    <div className="px-5 py-3 border-b border-[#EDE8DE] bg-[#FBF6E9] shrink-0 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#C9981A]" />
                      <span className="text-xs font-bold text-[#6B5E4C] uppercase tracking-wider font-lora">Giá bán & Tiến trình</span>
                    </div>

                    {/* Right content scrollable */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FFFDF9]">

                      {/* Tiến trình trạng thái (Stepper) */}
                      {(() => {
                        const steps = [
                          { key: 'PENDING', label: 'Chờ duyệt' },
                          { key: 'QUOTING', label: 'Đang định giá' },
                          { key: 'QUOTED', label: 'Đã báo giá' },
                          { key: 'SENT_TO_CUSTOMER', label: 'Chờ phản hồi' },
                          { key: 'CONFIRMED', label: 'Chốt đơn' },
                        ]
                        const currentIndex = steps.findIndex(s => s.key === selected.status)
                        
                        if (selected.status === 'NEED_MORE_INFO') {
                          return (
                            <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                              <span className="text-xs font-bold text-orange-800">Trạng thái: Trả lại yêu cầu thông tin</span>
                            </div>
                          )
                        }
                        if (selected.status === 'CANCELLED') {
                          return (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-red-500" />
                              <span className="text-xs font-bold text-red-800">Trạng thái: Khách từ chối / Đã hủy</span>
                            </div>
                          )
                        }
                        
                        return (
                          <div className="rounded-xl border border-[#EDE8DE] bg-white p-4 shadow-sm">
                            <span className="text-[9px] text-[#9E8E7A] font-bold tracking-wider uppercase block mb-3">Tiến trình yêu cầu</span>
                            <div className="flex items-center justify-between relative pt-1">
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-muted z-0" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#C9981A] transition-all duration-300 z-0"
                                style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }} />
                              
                              {steps.map((s, idx) => {
                                const isActive = idx <= currentIndex
                                const isCurrent = idx === currentIndex
                                return (
                                  <div key={s.key} className="flex flex-col items-center relative z-10">
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 border ${
                                      isCurrent ? 'bg-[#C9981A] text-white border-[#C9981A] scale-110 shadow-sm shadow-[#C9981A]/30'
                                        : isActive ? 'bg-[#FBF6E9] text-[#8C6D1F] border-[#C9981A]'
                                        : 'bg-white text-muted-foreground border-[#EDE8DE]'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    <span className={`text-[8px] mt-1 font-semibold ${
                                      isCurrent ? 'text-[#8C6D1F] font-bold'
                                        : isActive ? 'text-[#6B5E4C]'
                                        : 'text-muted-foreground'
                                    }`}>
                                      {s.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Khối giá bán nổi bật (nếu đã có báo giá) */}
                      {selected.status !== 'PENDING' && selected.status !== 'QUOTING' && selected.sellingPrice > 0 ? (
                        <div className="space-y-4">
                          
                          {selected.options && selected.options.length > 1 ? (
                            <div className="rounded-2xl border border-[#EDE8DE] bg-[#FFFDF9] p-4.5 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-[#EDE8DE]/80 pb-2.5">
                                <span className="text-[10px] text-[#9E8E7A] font-bold tracking-wider uppercase flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-[#C9981A]" /> Các phương án định giá ({selected.options.length})
                                </span>
                                <span className="bg-[#C9981A]/10 text-[#8C6D1F] border border-[#C9981A]/20 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase">
                                  Hoàn tất
                                </span>
                              </div>

                              <div className="divide-y divide-[#EDE8DE]/60">
                                {selected.options.map((opt, idx) => {
                                  const materialLabel = MATERIAL_LABEL_MAP[opt.materialType] || opt.materialType
                                  const weightText = opt.weightChi ? `${opt.weightChi} chỉ` : opt.weightGram ? `${opt.weightGram} g` : ''
                                  return (
                                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-full bg-[#FBF6E9] border border-[#E6DFD0] flex items-center justify-center text-[10px] font-extrabold text-[#8C6D1F] shrink-0">
                                          {idx + 1}
                                        </div>
                                        <div className="space-y-0.5">
                                          <p className="text-xs font-bold text-[#3A352E]">{materialLabel}</p>
                                          <p className="text-[10px] text-[#9E8E7A] font-medium">Trọng lượng: {weightText || '—'}</p>
                                        </div>
                                      </div>

                                      <div className="text-right space-y-0.5 shrink-0">
                                        <span className="text-[9px] text-[#9E8E7A] font-bold uppercase tracking-wider block">Giá bán đề xuất</span>
                                        <p className="text-base font-extrabold text-[#C9981A] font-lora tabular-nums">{formatCurrency(opt.sellingPrice || 0)}</p>
                                        {canViewCost && (
                                          <p className="text-[10px] text-[#9E8E7A] font-semibold tabular-nums">
                                            Vốn: <span className="text-[#6B5E4C]">{formatCurrency(opt.costPrice || 0)}</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="border-t border-[#EDE8DE]/80 pt-2.5 flex items-center justify-between text-[10px] text-[#9E8E7A]">
                                <span>Mã yêu cầu: <strong className="font-mono text-[#6B5E4C]">{selected.quoteCode}</strong></span>
                                <span>
                                  Trạng thái: <strong className="text-[#8C6D1F]">{STATUS_CONFIG[selected.status]?.label}</strong>
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Premium Price Card */
                            <div className="relative overflow-hidden bg-gradient-to-br from-[#D9A723] to-[#A67C15] rounded-[16px] p-5 text-white shadow-md">
                              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                              <div className="relative">
                                {canViewCost ? (
                                  <div className="flex items-end justify-between">
                                    <div>
                                      <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider mb-1">Giá bán đề xuất</p>
                                      <p className="text-3xl font-extrabold tracking-tight font-lora">{formatCurrency(selected.sellingPrice)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-white/80 mb-1 uppercase tracking-wider font-bold">Giá vốn (có VAT)</p>
                                      <p className="text-base font-bold text-white/90">{formatCurrency(selected.costPrice)}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider mb-1">Giá bán đề xuất</p>
                                    <p className="text-4xl font-extrabold tracking-tight font-lora">{formatCurrency(selected.sellingPrice)}</p>
                                  </div>
                                )}
                                <div className="mt-3.5 flex items-center justify-between border-t border-white/20 pt-2.5 text-xs text-white/85">
                                  <span>Mã yêu cầu: <strong className="font-mono">{selected.quoteCode}</strong></span>
                                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold text-[9px]">
                                    {STATUS_CONFIG[selected.status]?.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chi tiết chi phí cấu thành (chỉ cho NV Order/Admin và khi báo giá đã hoàn thành) */}
                          {canViewCost && (
                            <div className="rounded-xl border border-[#EDE8DE] bg-white p-4 space-y-3.5 shadow-sm">
                              <p className="text-xs font-bold text-[#8C6D1F] uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <Calculator className="h-4 w-4" /> Chi tiết cấu thành giá vốn
                              </p>
                              {selected.options && selected.options.length > 1 ? (
                                <Tabs defaultValue="opt-0" className="w-full">
                                  <TabsList className="grid w-full mb-3 bg-[#FBF6E9] p-1 h-9 rounded-lg" style={{ gridTemplateColumns: `repeat(${selected.options.length}, minmax(0, 1fr))` }}>
                                    {selected.options.map((opt, idx) => {
                                      const label = MATERIAL_LABEL_MAP[opt.materialType] || opt.materialType
                                      return (
                                        <TabsTrigger
                                          key={idx}
                                          value={`opt-${idx}`}
                                          className="text-xs py-1 px-2.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-[#8C6D1F] data-[state=active]:shadow-sm font-semibold transition-all text-[#6B5E4C]"
                                        >
                                          {label}
                                        </TabsTrigger>
                                      )
                                    })}
                                  </TabsList>
                                  {selected.options.map((opt, idx) => (
                                    <TabsContent key={idx} value={`opt-${idx}`} className="space-y-3 focus-visible:outline-none">
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                        <div className="space-y-0.5">
                                          <span className="text-[#9E8E7A] font-medium">Giá vàng 24K:</span>
                                          <p className="font-bold text-[#3A352E]">
                                            {opt.goldPrice24K ? `${formatCurrency(opt.goldPrice24K)} / chỉ` : '—'}
                                          </p>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[#9E8E7A] font-medium">Tiền công chế tác:</span>
                                          <p className="font-bold text-[#3A352E]">{formatCurrency(opt.laborCost || 0)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[#9E8E7A] font-medium">Tiền nguyên liệu:</span>
                                          <p className="font-bold text-[#3A352E]">{formatCurrency(opt.materialCost || 0)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[#9E8E7A] font-medium">Tiền đá / Phụ kiện:</span>
                                          <p className="font-bold text-[#3A352E]">{formatCurrency(opt.stoneCost || 0)}</p>
                                        </div>
                                        <div className="space-y-0.5 col-span-2 border-t border-[#EDE8DE]/60 pt-2.5 flex justify-between items-center">
                                          <span className="text-[#8C6D1F] font-bold">Tổng vốn (có VAT):</span>
                                          <p className="font-extrabold text-sm text-[#8C6D1F]">{formatCurrency(opt.costPrice || 0)}</p>
                                        </div>
                                      </div>
                                    </TabsContent>
                                  ))}
                                </Tabs>
                              ) : (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                  <div className="space-y-0.5">
                                    <span className="text-[#9E8E7A] font-medium">Giá vàng 24K:</span>
                                    <p className="font-bold text-[#3A352E]">
                                      {(selected as any).goldPrice24K ? `${formatCurrency((selected as any).goldPrice24K)} / chỉ` : '—'}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[#9E8E7A] font-medium">Tiền công chế tác:</span>
                                    <p className="font-bold text-[#3A352E]">{formatCurrency(selected.laborCost || 0)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[#9E8E7A] font-medium">Tiền nguyên liệu:</span>
                                    <p className="font-bold text-[#3A352E]">{formatCurrency((selected as any).materialCost || 0)}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[#9E8E7A] font-medium">Tiền đá / Phụ kiện:</span>
                                    <p className="font-bold text-[#3A352E]">{formatCurrency((selected as any).stoneCost || 0)}</p>
                                  </div>
                                </div>
                              )}

                              {/* Hiển thị chi tiết danh sách đá nếu có */}
                              {(selected as any).stones && (selected as any).stones.length > 0 && (
                                <div className="border-t border-[#EDE8DE] pt-3 mt-1 space-y-2">
                                  <span className="text-[9px] font-bold text-[#9E8E7A] uppercase tracking-wider block">Bảng tính đá chi tiết:</span>
                                  <div className="space-y-1.5">
                                    {(selected as any).stones.map((stone: any, idx: number) => (
                                      <div key={idx} className="flex justify-between text-xs bg-[#FDFBF7] px-2.5 py-2 rounded-lg border border-[#EDE8DE]">
                                        <span className="font-medium text-[#3A352E]">
                                          {STONE_TYPE_LABELS[stone.type] || stone.type} ({stone.quantity} viên {stone.sizeOrCarat ? `· ${stone.sizeOrCarat}` : ''})
                                        </span>
                                        <span className="font-bold text-[#8C6D1F]">
                                          {stone.priceMethod === 'per_carat'
                                            ? `${stone.quantity} viên × ${stone.sizeOrCarat} ct × ${formatCurrency(parseFloat(stone.unitPrice) || 0)}`
                                            : `${stone.quantity} viên × ${formatCurrency(parseFloat(stone.unitPrice) || 0)}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      ) : (
                        /* Đang định giá / Đang chờ */
                        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-center space-y-2">
                          <span className="inline-block p-2 bg-amber-100 text-amber-700 rounded-full animate-bounce">⏳</span>
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Đang chờ xử lý định giá</p>
                          <p className="text-xs text-amber-700/80 leading-relaxed">
                            Yêu cầu này đang được nhân viên định giá xử lý. Bảng giá chi tiết sẽ tự động xuất hiện tại đây sau khi hoàn tất.
                          </p>
                        </div>
                      )}

                      {/* Biểu mẫu trả lại yêu cầu (Rejection Form) của Pricer hiển thị trực tiếp ở đây */}
                      {isPricer && dialogMode === 'review' && showRejectForm && (
                        <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 space-y-3.5 shadow-sm">
                          <p className="text-xs font-bold text-red-700 flex items-center gap-1.5 uppercase tracking-wider">
                            <Ban className="h-4 w-4" /> Trả lại yêu cầu cho Sale
                          </p>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-red-800 uppercase tracking-wide">Lý do yêu cầu bổ sung thông tin</Label>
                            <Textarea 
                              placeholder="VD: Thiếu hình ảnh góc nghiêng, chưa rõ size đá chính, hạn chót quá gấp..."
                              rows={3} 
                              value={rejectReason} 
                              onChange={(e) => setRejectReason(e.target.value)} 
                              className="text-xs border-red-200 focus-visible:ring-red-500/20 focus-visible:border-red-500 rounded-xl resize-none p-3 bg-white text-red-950 font-medium" 
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-100 rounded-xl font-semibold text-xs h-9" onClick={() => setShowRejectForm(false)}>
                              Huỷ
                            </Button>
                            <Button variant="destructive" className="flex-1 gap-1.5 rounded-xl font-semibold text-xs shadow-sm h-9"
                              onClick={handleReject} disabled={!rejectReason.trim() || saving}>
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                              Xác nhận trả lại
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Gallery hình ảnh sản phẩm */}
                      {selected.images?.length > 0 && (
                        <div className="rounded-xl border border-[#EDE8DE] bg-white p-4 shadow-sm space-y-2.5">
                          <span className="text-[9px] text-[#9E8E7A] font-bold tracking-wider uppercase block">Hình ảnh sản phẩm ({selected.images.length})</span>
                          <div className="grid grid-cols-4 gap-2">
                            {selected.images.map((img, i) => (
                              <a key={i} href={`http://localhost:3000${img}`} target="_blank" rel="noreferrer"
                                className="relative block rounded-lg overflow-hidden border border-[#EDE8DE] hover:border-[#C9981A] hover:scale-[1.03] transition-all duration-200 shadow-sm group">
                                <img src={`http://localhost:3000${img}`} alt={`Ảnh ${i + 1}`}
                                  className="h-16 w-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tip quy trình của Sale */}
                      {!isPricer && selected.status === 'QUOTED' && (
                        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-1.5">
                          <p className="text-xs text-violet-700 font-bold flex items-center gap-1.5 uppercase tracking-wider">💡 Hướng dẫn tiếp theo</p>
                          <p className="text-[11px] text-violet-800 leading-relaxed">
                            Liên hệ trao đổi với khách hàng về mức giá bán đề xuất. Khi đã gửi giá và chờ phản hồi, vui lòng nhấn nút <strong>Gửi giá cho khách</strong> bên dưới.
                          </p>
                        </div>
                      )}

                      {!isPricer && selected.status === 'SENT_TO_CUSTOMER' && (
                        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-1.5">
                          <p className="text-xs text-amber-700 font-bold flex items-center gap-1.5 uppercase tracking-wider">⏳ Chờ khách phản hồi</p>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Báo giá đang được gửi tới khách hàng. Khi nhận được kết quả, hãy chọn <strong>Khách chốt đơn</strong> hoặc <strong>Khách từ chối</strong>.
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* UNIFIED STICKY FOOTER */}
                <div className="border-t border-[#EDE8DE] px-6 py-4 flex items-center justify-between gap-3 shrink-0 bg-[#FBF6E9]">
                  
                  {/* Nút đóng ở góc trái */}
                  <Button variant="outline" onClick={() => setSelected(null)} className="border-[#E6DFD0] hover:bg-[#F5EFE0] text-[#6B5E4C] font-semibold px-6 rounded-xl h-10 transition-colors">
                    Đóng
                  </Button>

                  {/* Nút hành động ở góc phải */}
                  <div className="flex gap-2">

                    {/* Trả lại của Pricer */}
                    {isPricer && dialogMode === 'review' && !showRejectForm && (
                      <Button variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 font-semibold px-4 rounded-xl h-10 transition-all"
                        onClick={() => setShowRejectForm(true)}>
                        <Ban className="h-4 w-4" /> Trả lại Sale bổ sung
                      </Button>
                    )}

                    {/* Sửa đổi gửi lại của Sale */}
                    {!isPricer && selected.status === 'NEED_MORE_INFO' && !showEditForm && (
                      <Button
                        className="gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 rounded-xl h-10 shadow-md shadow-orange-500/10 transition-all"
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
                    )}

                    {/* Gửi giá khách của Sale */}
                    {!isPricer && selected.status === 'QUOTED' && (
                      <Button
                        className="gap-2 bg-[#8C6D1F] hover:bg-[#735A19] text-white font-semibold px-5 rounded-xl h-10 shadow-md shadow-primary/10 transition-all"
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
                    )}

                    {/* Khách chốt/từ chối */}
                    {!isPricer && selected.status === 'SENT_TO_CUSTOMER' && (
                      <div className="flex gap-2">
                        <Button variant="destructive" className="gap-1.5 px-4 rounded-xl font-semibold h-10 shadow-sm transition-all"
                          onClick={() => { handleCancel(selected._id); setSelected(null) }}>
                          <Ban className="h-4 w-4" /> Khách từ chối
                        </Button>
                        <Button className="gap-1.5 bg-[#8C6D1F] hover:bg-[#735A19] text-white px-5 rounded-xl font-semibold h-10 shadow-md shadow-primary/10 transition-all"
                          onClick={() => { handleConfirm(selected._id); setSelected(null) }}>
                          <ShoppingCart className="h-4 w-4" /> Khách chốt đơn
                        </Button>
                      </div>
                    )}

                  </div>
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
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
  Package, Zap, Send, ShoppingCart, ImageIcon, X, Layers,
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
  PENDING:            { label: 'Chờ báo giá',        color: 'border-amber-400/60 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400', dot: 'bg-amber-400' },
  NEED_MORE_INFO:     { label: 'Cần bổ sung',         color: 'border-orange-400/60 text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400', dot: 'bg-orange-500' },
  QUOTING:            { label: 'Đang báo giá',        color: 'border-blue-400/60 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400', dot: 'bg-blue-400' },
  QUOTED:             { label: 'Đã báo giá',          color: 'border-emerald-400/60 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', dot: 'bg-emerald-400' },
  SENT_TO_CUSTOMER:   { label: 'Đã gửi khách',        color: 'border-violet-400/60 text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400', dot: 'bg-violet-400' },
  CONFIRMED:          { label: 'Đặt hàng',            color: 'border-primary/40 text-primary bg-primary/5', dot: 'bg-primary' },
  CANCELLED:          { label: 'Đã huỷ',              color: 'border-red-400/60 text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400', dot: 'bg-red-400' },
  IN_PRODUCTION:      { label: 'Đang sản xuất',       color: 'border-purple-400/60 text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400', dot: 'bg-purple-400' },
}

export interface StoneEntry {
  id: string
  type: 'lab_diamond' | 'natural_diamond' | 'colored_stone'
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

  const total = rows.reduce((s, r) => s + (parseFloat(r.materialCost) || 0), 0)

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const key   = row.materialType.replace('GOLD_', '')
        const ratio = pricingConfig?.goldRatios?.find((r: any) => r.key === key)
        const hasData = !!(parseFloat(row.goldPrice24K) && parseFloat(row.weightChi))
        return (
          <motion.div key={row.id}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: idx * 0.04 }}
            className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2"
          >
            {/* Header dòng */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300/60 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-0.5">
                <Layers className="h-3 w-3" />
                {row.label}
                {ratio && (
                  <span className="opacity-60 font-normal ml-0.5">· {Math.round(ratio.applied * 100)}%</span>
                )}
              </span>
              {hasData && (
                <span className="text-xs font-bold text-primary tabular-nums">{fmt(row.materialCost)}</span>
              )}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">Trọng lượng</span>
                  <button
                    type="button"
                    onClick={() => {
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
                    }}
                    className="text-[10px] text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
                  >
                    {(row as any).weightUnit === 'gram' ? 'Đổi sang chỉ' : 'Đổi sang gram'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text" inputMode="decimal" placeholder="0"
                    value={row.weightChi}
                    onChange={e => update(row.id, { weightChi: e.target.value.replace(/[^0-9.]/g, '') })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 pr-12 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none font-medium">
                    {(row as any).weightUnit === 'gram' ? 'gram' : 'chỉ'}
                  </span>
                </div>
                {(row as any).weightUnit === 'gram' && parseFloat(row.weightChi) > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {Math.round((parseFloat(row.weightChi) / 3.75) * 1000) / 1000} chỉ (dùng để tính giá)
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Giá vàng gốc 24K (đ/chỉ)</span>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric" placeholder="9.000.000"
                    value={row.goldPrice24K ? Number(row.goldPrice24K).toLocaleString('vi-VN') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\./g, '').replace(/,/g, '')
                      update(row.id, { goldPrice24K: raw })
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 pr-5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">đ</span>
                </div>
                {ratio && parseFloat(row.goldPrice24K) > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-1">
                    ≈ Quy đổi {row.label}: {Number(Math.round(ratio.applied * (parseFloat(row.goldPrice24K) || 0))).toLocaleString('vi-VN')} đ/chỉ
                  </p>
                )}
              </div>
            </div>

            {/* Công thức tính */}
            {hasData && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                {ratio ? (
                  <>{Number(row.goldPrice24K).toLocaleString('vi-VN')} × {Math.round(ratio.applied * 100)}% × {row.weightChi} chỉ = <strong>{fmt(row.materialCost)}</strong></>
                ) : (
                  <>Giá vàng {row.label}: <strong>{fmt(row.materialCost)}</strong></>
                )}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Tổng cộng nhiều loại */}
      {rows.length > 1 && total > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between rounded-xl border-2 border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Tổng giá vàng ({rows.length} loại)
          </span>
          <span className="text-base font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {fmt(total)}
          </span>
        </motion.div>
      )}
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

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [stoneEntries, setStoneEntriesRaw] = useState<StoneEntry[]>([])
  const [goldRows, setGoldRows] = useState<GoldRow[]>([])
  const [stoneInputMethod, setStoneInputMethod] = useState<'direct' | 'table'>('direct')

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
      await quotesApi.updatePrice(selected._id, {
        weightChi: priceForm.weightChi ? parseFloat(priceForm.weightChi) : undefined,
        weightGram: priceForm.weightGram ? parseFloat(priceForm.weightGram) : undefined,
        goldPrice24K: priceForm.goldPrice24K ? parseFloat(priceForm.goldPrice24K) : undefined,
        laborCost: parseFloat(priceForm.laborCost) || 0,
        materialCost: parseFloat(priceForm.materialCost) || 0,
        stoneCost: parseFloat(priceForm.stoneCost) || 0,
        costBeforeVAT: parseFloat(priceForm.costBeforeVAT) || 0,
        stones: stoneInputMethod === 'table' ? stoneEntries : [],
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
                          fmt={formatCurrency}
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
                            <StoneTable entries={stoneEntries} onChange={setStoneEntries} fmt={formatCurrency} />
                            {parseFloat(priceForm.stoneCost) > 0 && (
                              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex justify-between">
                                <span>Tổng tiền đá / phụ kiện</span>
                                <strong>{formatCurrency(priceForm.stoneCost)}</strong>
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
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 160px)' }}>

                {/* ── HERO: Giá bán nổi bật ── */}
                {selected.status !== 'PENDING' && selected.status !== 'QUOTING' && selected.sellingPrice > 0 && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary to-amber-600 px-6 py-5 text-white">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                    <div className="relative">
                      {canViewCost ? (
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Giá bán đề xuất</p>
                            <p className="text-3xl font-bold tracking-tight">{formatCurrency(selected.sellingPrice)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/70 mb-1">Giá vốn (có VAT)</p>
                            <p className="text-base font-semibold text-white/90">{formatCurrency(selected.costPrice)}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">Giá bán đề xuất</p>
                          <p className="text-4xl font-bold tracking-tight">{formatCurrency(selected.sellingPrice)}</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {(() => { const cfg = STATUS_CONFIG[selected.status]; return cfg ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-white/20 text-white`}>
                            <span className={`h-1.5 w-1.5 rounded-full bg-white`} />
                            {cfg.label}
                          </span>
                        ) : null })()}
                        <span className="text-xs text-white/60">{selected.quoteCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-6 py-4 space-y-4">

                {/* Banner lý do trả lại */}
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

                {/* Thông tin sản phẩm */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thông tin sản phẩm</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: 'Người yêu cầu', value: selected.requestedBy, icon: '👤' },
                      { label: 'Số lượng', value: `${(selected as any).quantity || 1} cái`, icon: '📦' },
                      { label: 'Deadline', value: (selected as any).deadline, icon: '📅' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</span>
                        <p className="font-semibold mt-0.5 text-sm">{value || '—'}</p>
                      </div>
                    ))}
                    {/* Chất liệu — multi-row */}
                    {(() => {
                      const parsed = parseMaterialsFromQuote({
                        materialType: selected.materialType,
                        dimensions: (selected as any).dimensions,
                        notes: selected.notes,
                      })
                      return (
                        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 col-span-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">⚙️ Chất liệu</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                  <div className="mt-2 space-y-2">
                    {[
                      { label: 'Kích thước / Trọng lượng dự kiến', value: (selected as any).dimensions, icon: '📐' },
                      { label: 'Yêu cầu đá / phụ kiện', value: (selected as any).stoneRequirements, icon: '💎' },
                      { label: 'Mô tả sản phẩm', value: selected.productDescription, icon: '📝' },
                    ].filter(x => x.value).map(({ label, value, icon }) => (
                      <div key={label} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</span>
                        <p className="font-medium mt-0.5 leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.notes && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3 w-3" /> Ghi chú cho NV báo giá
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{selected.notes}</p>
                  </div>
                )}

                {selected.images?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hình ảnh sản phẩm</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.images.map((img, i) => (
                        <a key={i} href={`http://localhost:3001${img}`} target="_blank" rel="noreferrer"
                          className="block rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/40 hover:scale-105 transition-all shadow-sm">
                          <img src={`http://localhost:3001${img}`} alt={`Ảnh ${i + 1}`}
                            className="h-24 w-24 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chi tiết chi phí cấu thành (chỉ cho NV Order/Admin và khi báo giá đã hoàn thành) */}
                {canViewCost && selected.status !== 'PENDING' && selected.status !== 'QUOTING' && (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                      <Calculator className="h-3.5 w-3.5" /> Chi tiết cấu thành giá vốn
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground font-medium">Giá vàng 24K:</span>
                        <p className="font-semibold text-foreground">
                          {selected.goldPrice24K ? `${formatCurrency(selected.goldPrice24K)} / chỉ` : '—'}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground font-medium">Tiền công chế tác:</span>
                        <p className="font-semibold text-foreground">{formatCurrency(selected.laborCost || 0)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground font-medium">Tiền nguyên liệu vàng/bạc:</span>
                        <p className="font-semibold text-foreground">{formatCurrency((selected as any).materialCost || 0)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-muted-foreground font-medium">Tiền đá / phụ kiện:</span>
                        <p className="font-semibold text-foreground">{formatCurrency((selected as any).stoneCost || 0)}</p>
                      </div>
                    </div>

                    {/* Hiển thị chi tiết danh sách đá nếu có */}
                    {(selected as any).stones && (selected as any).stones.length > 0 && (
                      <div className="border-t border-primary/10 pt-2 mt-2 space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Bảng tính đá chi tiết:</span>
                        <div className="space-y-1">
                          {(selected as any).stones.map((stone: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs text-muted-foreground bg-background/60 dark:bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/40">
                              <span className="font-medium text-foreground">
                                {STONE_TYPE_LABELS[stone.type] || stone.type} ({stone.quantity} viên {stone.sizeOrCarat ? `· ${stone.sizeOrCarat}` : ''})
                              </span>
                              <span className="font-semibold text-primary">
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
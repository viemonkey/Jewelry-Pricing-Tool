'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Plus, Upload, X, ImageIcon, Loader2, FileText, CalendarIcon, Minus, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quotesApi } from '@/lib/api'
import { useNotifications } from '@/lib/notifications'
import type { Quote } from '@/lib/types'

interface QuoteRequestModalProps {
  requesterName: string
  onSuccess?: (quote: Quote) => void
}

// ── Loại chất liệu ─────────────────────────────────────────
const MATERIAL_OPTIONS = [
  { value: 'GOLD_24K', label: 'Vàng 24K', isGold: true },
  { value: 'GOLD_18K', label: 'Vàng 18K', isGold: true },
  { value: 'GOLD_14K', label: 'Vàng 14K', isGold: true },
  { value: 'GOLD_610', label: 'Vàng 610',  isGold: true },
  { value: 'GOLD_10K', label: 'Vàng 10K', isGold: true },
  { value: 'SILVER',   label: 'Bạc 925',  isGold: false },
] as const

type MaterialValue = (typeof MATERIAL_OPTIONS)[number]['value']

// ── Một dòng chất liệu (nhiều dòng được phép) ──────────────
interface MaterialRow {
  id: string          // uuid-lite: Date.now() + Math.random()
  materialType: MaterialValue | ''
  weight: string      // trọng lượng (chỉ hoặc gram) – chuỗi để người dùng nhập tự do
  unit: 'chi' | 'gram'
}

function newRow(): MaterialRow {
  return {
    id: `${Date.now()}-${Math.random()}`,
    materialType: '',
    weight: '',
    unit: 'chi',
  }
}

interface FormErrors {
  productName?: string
  materials?: string
}

export function QuoteRequestModal({ requesterName, onSuccess }: QuoteRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { addNotification } = useNotifications()

  // ── State form ──────────────────────────────────────────
  const [form, setForm] = useState({
    productName: '',
    productDescription: '',
    stoneRequirements: '',
    quantity: 1,
    notes: '',
  })

  // Danh sách chất liệu – bắt đầu với 1 dòng rỗng
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([newRow()])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }))

  // ── Validation ─────────────────────────────────────────
  const errors: FormErrors = {}
  if (touched.productName && !form.productName.trim())
    errors.productName = 'Vui lòng nhập tên sản phẩm'
  if (touched.materials && materialRows.every((r) => !r.materialType))
    errors.materials = 'Vui lòng chọn ít nhất 1 chất liệu'

  const isValid = form.productName.trim() && materialRows.some((r) => r.materialType)

  // ── Quantity stepper ───────────────────────────────────
  const stepQty = (delta: number) =>
    setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity + delta) }))

  // ── Material row helpers ───────────────────────────────
  const updateRow = (id: string, patch: Partial<MaterialRow>) =>
    setMaterialRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const removeRow = (id: string) =>
    setMaterialRows((rows) => rows.filter((r) => r.id !== id))

  const addRow = () =>
    setMaterialRows((rows) => [...rows, newRow()])

  // Tìm các materialType đã được chọn để loại khỏi dropdown của row khác
  const selectedTypes = materialRows.map((r) => r.materialType).filter(Boolean)

  // ── Image handling ─────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5))
  }

  const removeImage = (idx: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    setTouched({ productName: true, materials: true })
    if (!isValid) return
    setLoading(true)

    // Tổng hợp thông tin chất liệu thành chuỗi ghi chú
    const filledRows = materialRows.filter((r) => r.materialType)
    const materialSummary = filledRows
      .map((r) => {
        const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
        const weightStr = r.weight ? ` – ${r.weight} ${r.unit}` : ''
        return `${opt?.label ?? r.materialType}${weightStr}`
      })
      .join('; ')

    // materialType chính là loại đầu tiên (bắt buộc có ít nhất 1)
    const primaryMaterial = filledRows[0].materialType as Quote['materialType']

    // dimensions: ghép tất cả trọng lượng có ghi chú
    const weightNotes = filledRows
      .filter((r) => r.weight)
      .map((r) => {
        const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
        return `${opt?.label}: ${r.weight} ${r.unit}`
      })
      .join(', ')

    try {
      const quote = await quotesApi.create({
        productName: form.productName,
        materialType: primaryMaterial,
        productDescription: form.productDescription,
        // Ghi đầy đủ tất cả chất liệu vào dimensions để Order/Admin biết
        dimensions: weightNotes || undefined,
        stoneRequirements: form.stoneRequirements,
        quantity: form.quantity,
        deadline: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : '',
        // Ghi thêm danh sách chất liệu vào notes
        notes: [
          filledRows.length > 1 ? `Chất liệu: ${materialSummary}` : '',
          form.notes,
        ]
          .filter(Boolean)
          .join('\n'),
        images: previews.map((p) => p.file),
        requestedBy: requesterName,
      })
      resetForm()
      setOpen(false)
      addNotification({
        type: 'success',
        title: 'Đã gửi yêu cầu báo giá!',
        message: `Mã yêu cầu: ${quote.quoteCode || ''}. NV báo giá sẽ xử lý sớm nhất.`,
      })
      onSuccess?.(quote)
    } catch (err) {
      console.error(err)
      addNotification({
        type: 'error',
        title: 'Tạo yêu cầu thất bại',
        message: 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ productName: '', productDescription: '', stoneRequirements: '', quantity: 1, notes: '' })
    setMaterialRows([newRow()])
    setDeadlineDate(undefined)
    setTouched({})
    previews.forEach((p) => URL.revokeObjectURL(p.url))
    setPreviews([])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { setOpen(o); if (!o) resetForm() } }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo yêu cầu báo giá
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Tạo yêu cầu báo giá mới
          </DialogTitle>
          <DialogDescription>
            Nhập đầy đủ thông tin để NV báo giá xử lý nhanh nhất.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Tên sản phẩm */}
          <div className="space-y-1.5">
            <Label htmlFor="productName">
              Tên sản phẩm <span className="text-destructive">*</span>
            </Label>
            <Input
              id="productName"
              placeholder="VD: Nhẫn kim cương, Dây chuyền vàng..."
              value={form.productName}
              onChange={set('productName')}
              onBlur={() => touch('productName')}
              aria-invalid={!!errors.productName}
              className={cn(errors.productName && 'border-destructive focus-visible:ring-destructive/30')}
            />
            {errors.productName && (
              <p className="text-xs text-destructive">{errors.productName}</p>
            )}
          </div>

          {/* ── CHẤT LIỆU (multi-row) ───────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Chất liệu <span className="text-destructive">*</span>
              </Label>
              {/* Nút thêm dòng — chỉ hiện khi chưa dùng hết loại */}
              {materialRows.length < MATERIAL_OPTIONS.length && (
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Thêm chất liệu
                </button>
              )}
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {materialRows.map((row, idx) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Header dòng (chỉ hiện từ dòng 2 trở đi) */}
                    {idx > 0 && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[11px] text-muted-foreground px-1">
                          Chất liệu {idx + 1}
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    )}

                    <div className="grid grid-cols-[1fr_90px_52px_auto] gap-2 items-end">
                      {/* Loại chất liệu */}
                      <div className="space-y-1">
                        {idx === 0 && (
                          <span className="text-[11px] text-muted-foreground">Loại</span>
                        )}
                        <Select
                          value={row.materialType}
                          onValueChange={(v) => {
                            updateRow(row.id, { materialType: v as MaterialValue })
                            touch('materials')
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              idx === 0 && errors.materials && !row.materialType &&
                              'border-destructive focus-visible:ring-destructive/30',
                            )}
                          >
                            <SelectValue placeholder="Chọn loại..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_OPTIONS.map((opt) => {
                              // Ẩn loại đã chọn ở dòng khác
                              const usedElsewhere =
                                selectedTypes.includes(opt.value) && row.materialType !== opt.value
                              if (usedElsewhere) return null
                              return (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Trọng lượng */}
                      <div className="space-y-1">
                        {idx === 0 && (
                          <span className="text-[11px] text-muted-foreground">Trọng lượng</span>
                        )}
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="VD: 2.5"
                          value={row.weight}
                          onChange={(e) =>
                            updateRow(row.id, { weight: e.target.value.replace(/[^0-9.]/g, '') })
                          }
                          className="text-right tabular-nums"
                        />
                      </div>

                      {/* Đơn vị */}
                      <div className="space-y-1">
                        {idx === 0 && (
                          <span className="text-[11px] text-muted-foreground">Đơn vị</span>
                        )}
                        <Select
                          value={row.unit}
                          onValueChange={(v) => updateRow(row.id, { unit: v as 'chi' | 'gram' })}
                        >
                          <SelectTrigger className="px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chi">Chỉ</SelectItem>
                            <SelectItem value="gram">Gram</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nút xoá dòng */}
                      <div className={cn('flex', idx === 0 ? 'mt-5' : 'mt-0')}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={materialRows.length === 1}
                          onClick={() => removeRow(row.id)}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive disabled:opacity-30"
                          title="Xoá dòng này"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {errors.materials && (
              <p className="text-xs text-destructive">{errors.materials}</p>
            )}

            {/* Preview badge tổng hợp khi có >1 dòng có dữ liệu */}
            {(() => {
              const filled = materialRows.filter((r) => r.materialType)
              if (filled.length <= 1) return null
              return (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {filled.map((r) => {
                    const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
                    return (
                      <Badge key={r.id} variant="secondary" className="text-xs gap-1">
                        {opt?.label}
                        {r.weight && <span className="opacity-70">· {r.weight} {r.unit}</span>}
                      </Badge>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Số lượng sản phẩm */}
          <div className="space-y-1.5">
            <Label>Số lượng</Label>
            <div className="flex items-center gap-1.5 max-w-[160px]">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => stepQty(-1)}
                disabled={form.quantity <= 1}
                className="shrink-0"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                type="text"
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, '')) || 1
                  setForm((f) => ({ ...f, quantity: Math.max(1, n) }))
                }}
                className="text-center tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => stepQty(1)}
                className="shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Yêu cầu đá */}
          <div className="space-y-1.5">
            <Label htmlFor="stoneRequirements">Yêu cầu đá / phụ kiện</Label>
            <Input
              id="stoneRequirements"
              placeholder="VD: 1 viên kim cương 0.3ct, đá CZ trắng..."
              value={form.stoneRequirements}
              onChange={set('stoneRequirements')}
            />
          </div>

          {/* Mô tả sản phẩm */}
          <div className="space-y-1.5">
            <Label htmlFor="productDescription">Mô tả sản phẩm</Label>
            <Textarea
              id="productDescription"
              placeholder="Mô tả chi tiết kiểu dáng, yêu cầu đặc biệt..."
              rows={2}
              value={form.productDescription}
              onChange={set('productDescription')}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label>Deadline khách yêu cầu</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadlineDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadlineDate
                    ? format(deadlineDate, 'dd/MM/yyyy', { locale: vi })
                    : 'Chọn ngày deadline...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadlineDate}
                  onSelect={(d) => {
                    setDeadlineDate(d)
                    setCalendarOpen(false)
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ảnh sản phẩm */}
          <div className="space-y-1.5">
            <Label>Hình ảnh sản phẩm (tối đa 5 ảnh)</Label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {previews.map((p, i) => (
                  <motion.div
                    key={p.url}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="relative h-16 w-16 overflow-hidden rounded-md border"
                  >
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {previews.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="mt-0.5 text-xs">Thêm</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Ghi chú thêm cho NV báo giá</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin thêm, yêu cầu đặc biệt khác..."
              rows={2}
              value={form.notes}
              onChange={set('notes')}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Người tạo:</span>
            <Badge variant="secondary">{requesterName}</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Đang gửi...</>
              : <><Upload className="h-4 w-4" />Gửi yêu cầu</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

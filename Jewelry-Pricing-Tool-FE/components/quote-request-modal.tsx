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
import { Plus, Upload, X, ImageIcon, Loader2, FileText, CalendarIcon, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quotesApi } from '@/lib/api'
import { useNotifications } from '@/lib/notifications'
import type { Quote } from '@/lib/types'

interface QuoteRequestModalProps {
  requesterName: string
  onSuccess?: (quote: Quote) => void
}

const MATERIAL_OPTIONS = [
  { value: 'GOLD_24K', label: 'Vàng 24K' },
  { value: 'GOLD_18K', label: 'Vàng 18K' },
  { value: 'GOLD_14K', label: 'Vàng 14K' },
  { value: 'GOLD_10K', label: 'Vàng 10K' },
  { value: 'GOLD_610', label: 'Vàng 610' },
  { value: 'SILVER',   label: 'Bạc 925' },
]

interface FormErrors {
  productName?: string
  materialType?: string
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

  const [form, setForm] = useState({
    productName: '',
    materialType: '' as Quote['materialType'] | '',
    productDescription: '',
    dimensions: '',
    stoneRequirements: '',
    quantity: 1,
    notes: '',
  })

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }))

  // ── Validation ───────────────────────────────────────────────────
  const errors: FormErrors = {}
  if (touched.productName && !form.productName.trim())
    errors.productName = 'Vui lòng nhập tên sản phẩm'
  if (touched.materialType && !form.materialType)
    errors.materialType = 'Vui lòng chọn chất liệu'

  const isValid = form.productName.trim() && form.materialType

  // ── Quantity stepper ─────────────────────────────────────────────
  const stepQty = (delta: number) =>
    setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity + delta) }))

  // ── Image handling ───────────────────────────────────────────────
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

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setTouched({ productName: true, materialType: true })
    if (!isValid) return
    setLoading(true)
    try {
      const quote = await quotesApi.create({
        productName: form.productName,
        materialType: form.materialType as Quote['materialType'],
        productDescription: form.productDescription,
        dimensions: form.dimensions,
        stoneRequirements: form.stoneRequirements,
        quantity: form.quantity,
        deadline: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : '',
        notes: form.notes,
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
    setForm({ productName: '', materialType: '', productDescription: '', dimensions: '', stoneRequirements: '', quantity: 1, notes: '' })
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

          {/* Chất liệu + Số lượng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chất liệu <span className="text-destructive">*</span></Label>
              <Select
                value={form.materialType}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, materialType: v as Quote['materialType'] }))
                  touch('materialType')
                }}
              >
                <SelectTrigger
                  aria-invalid={!!errors.materialType}
                  className={cn(errors.materialType && 'border-destructive focus-visible:ring-destructive/30')}
                >
                  <SelectValue placeholder="Chọn chất liệu..." />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.materialType && (
                <p className="text-xs text-destructive">{errors.materialType}</p>
              )}
            </div>

            {/* FIX: Stepper UI thay cho native number input */}
            <div className="space-y-1.5">
              <Label>Số lượng</Label>
              <div className="flex items-center gap-1.5">
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
          </div>

          {/* Kích thước / Trọng lượng */}
          <div className="space-y-1.5">
            <Label htmlFor="dimensions">Kích thước / Trọng lượng dự kiến</Label>
            <Input
              id="dimensions"
              placeholder="VD: Size 12, khoảng 3 chỉ, dài 45cm..."
              value={form.dimensions}
              onChange={set('dimensions')}
            />
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

          {/* FIX: Deadline — Calendar Popover thay native date input */}
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

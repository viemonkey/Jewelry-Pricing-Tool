'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Plus, Upload, X, ImageIcon, Loader2, FileText } from 'lucide-react'
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
  { value: 'SILVER', label: 'Bạc 925' },
]

export function QuoteRequestModal({ requesterName, onSuccess }: QuoteRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const { addNotification } = useNotifications()

  const [form, setForm] = useState({
    productName: '',
    materialType: '' as Quote['materialType'] | '',
    productDescription: '',
    dimensions: '',        // Kích thước / trọng lượng dự kiến
    stoneRequirements: '', // Yêu cầu đá / phụ kiện
    quantity: '1',         // Số lượng
    deadline: '',          // Deadline khách yêu cầu
    notes: '',
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

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

  const handleSubmit = async () => {
    if (!form.productName || !form.materialType) return
    setLoading(true)
    try {
      const quote = await quotesApi.create({
        productName: form.productName,
        materialType: form.materialType as Quote['materialType'],
        productDescription: form.productDescription,
        dimensions: form.dimensions,
        stoneRequirements: form.stoneRequirements,
        quantity: parseInt(form.quantity) || 1,
        deadline: form.deadline,
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
    setForm({ productName: '', materialType: '', productDescription: '', dimensions: '', stoneRequirements: '', quantity: '1', deadline: '', notes: '' })
    previews.forEach((p) => URL.revokeObjectURL(p.url))
    setPreviews([])
  }

  const isValid = form.productName.trim() && form.materialType

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) setOpen(o) }}>
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
            <Label htmlFor="productName">Tên sản phẩm <span className="text-destructive">*</span></Label>
            <Input id="productName" placeholder="VD: Nhẫn kim cương, Dây chuyền vàng..." value={form.productName} onChange={set('productName')} />
          </div>

          {/* Chất liệu + Số lượng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Chất liệu <span className="text-destructive">*</span></Label>
              <Select value={form.materialType} onValueChange={(v) => setForm((f) => ({ ...f, materialType: v as Quote['materialType'] }))}>
                <SelectTrigger><SelectValue placeholder="Chọn chất liệu..." /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Số lượng</Label>
              <Input id="quantity" type="number" min="1" placeholder="1" value={form.quantity} onChange={set('quantity')} />
            </div>
          </div>

          {/* Kích thước / Trọng lượng dự kiến */}
          <div className="space-y-1.5">
            <Label htmlFor="dimensions">Kích thước / Trọng lượng dự kiến</Label>
            <Input id="dimensions" placeholder="VD: Size 12, khoảng 3 chỉ, dài 45cm..." value={form.dimensions} onChange={set('dimensions')} />
          </div>

          {/* Yêu cầu đá / phụ kiện */}
          <div className="space-y-1.5">
            <Label htmlFor="stoneRequirements">Yêu cầu đá / phụ kiện</Label>
            <Input id="stoneRequirements" placeholder="VD: 1 viên kim cương 0.3ct, đá CZ trắng..." value={form.stoneRequirements} onChange={set('stoneRequirements')} />
          </div>

          {/* Mô tả sản phẩm */}
          <div className="space-y-1.5">
            <Label htmlFor="productDescription">Mô tả sản phẩm</Label>
            <Textarea id="productDescription" placeholder="Mô tả chi tiết kiểu dáng, yêu cầu đặc biệt..." rows={2} value={form.productDescription} onChange={set('productDescription')} />
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline khách yêu cầu</Label>
            <Input id="deadline" type="date" value={form.deadline} onChange={set('deadline')} min={new Date().toISOString().split('T')[0]} />
          </div>

          {/* Ảnh sản phẩm */}
          <div className="space-y-1.5">
            <Label>Hình ảnh sản phẩm (tối đa 5 ảnh)</Label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {previews.map((p, i) => (
                  <motion.div key={p.url} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    className="relative h-16 w-16 overflow-hidden rounded-md border">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removeImage(i)}
                      className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {previews.length < 5 && (
                <button onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  <ImageIcon className="h-5 w-5" />
                  <span className="mt-0.5 text-xs">Thêm</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Ghi chú thêm cho NV báo giá</Label>
            <Textarea id="notes" placeholder="Thông tin thêm, yêu cầu đặc biệt khác..." rows={2} value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Người tạo:</span>
            <Badge variant="secondary">{requesterName}</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading} className="gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Đang gửi...</> : <><Upload className="h-4 w-4" />Gửi yêu cầu</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

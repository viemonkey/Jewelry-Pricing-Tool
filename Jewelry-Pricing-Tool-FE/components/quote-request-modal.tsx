'use client'

/**
 * QuoteRequestModal — GĐ1, Hạng mục 1
 * Sale dùng để tạo yêu cầu báo giá mới
 * Có: nhập thông tin SP, chọn chất liệu, upload ảnh, ghi chú
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, X, ImageIcon, Loader2, FileText } from 'lucide-react'
import { quotesApi } from '@/lib/api'
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

  const [form, setForm] = useState({
    productName: '',
    materialType: '' as Quote['materialType'] | '',
    productDescription: '',
    notes: '',
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5)) // max 5 ảnh
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
        notes: form.notes,
        images: previews.map((p) => p.file),
        requestedBy: requesterName,
      })
      onSuccess?.(quote)
      setOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Tạo yêu cầu thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ productName: '', materialType: '', productDescription: '', notes: '' })
    previews.forEach((p) => URL.revokeObjectURL(p.url))
    setPreviews([])
  }

  const isValid = form.productName.trim() && form.materialType

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo yêu cầu báo giá
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
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
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
            />
          </div>

          {/* Chất liệu */}
          <div className="space-y-1.5">
            <Label>
              Chất liệu <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.materialType}
              onValueChange={(v) => setForm((f) => ({ ...f, materialType: v as Quote['materialType'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn chất liệu..." />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mô tả */}
          <div className="space-y-1.5">
            <Label htmlFor="productDescription">Mô tả sản phẩm</Label>
            <Textarea
              id="productDescription"
              placeholder="Kích thước, số lượng đá, yêu cầu đặc biệt..."
              rows={2}
              value={form.productDescription}
              onChange={(e) => setForm((f) => ({ ...f, productDescription: e.target.value }))}
            />
          </div>

          {/* Upload ảnh */}
          <div className="space-y-1.5">
            <Label>Ảnh sản phẩm (tối đa 5 ảnh)</Label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {previews.map((p, i) => (
                  <motion.div
                    key={p.url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
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
            <Label htmlFor="notes">Ghi chú cho NV báo giá</Label>
            <Textarea
              id="notes"
              placeholder="Thông tin thêm, thời hạn cần báo giá..."
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Người yêu cầu */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Người tạo:</span>
            <Badge variant="secondary">{requesterName}</Badge>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Gửi yêu cầu
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

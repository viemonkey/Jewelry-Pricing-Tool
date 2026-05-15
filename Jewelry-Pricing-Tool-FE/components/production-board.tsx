'use client'

/**
 * ProductionBoard — GĐ2, Hạng mục 6, 7, 8, 9
 * Dành cho xưởng (role=workshop) và Admin
 * 6. Danh sách chờ sản xuất
 * 7. Form phân công thợ + deadline
 * 8. Nút cập nhật tiến độ (dropdown trạng thái)
 * 9. Nút "Hoàn thành sản xuất" + upload ảnh thành phẩm
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  Hammer,
  Camera,
  CheckCircle,
  RefreshCw,
  User,
  CalendarDays,
  Upload,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react'
import { productionApi } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import type { ProductionOrder, ProductionStatus } from '@/lib/types'

// ─── Config ────────────────────────────────────────────────

const PRODUCTION_STEPS: { status: ProductionStatus; label: string; progress: number }[] = [
  { status: 'PENDING_PRODUCTION', label: 'Chờ sản xuất', progress: 0 },
  { status: 'CASTING',            label: 'Đang đúc',       progress: 25 },
  { status: 'SETTING_STONES',     label: 'Đang gắn đá',    progress: 50 },
  { status: 'POLISHING',          label: 'Đang đánh bóng', progress: 75 },
  { status: 'QUALITY_CHECK',      label: 'Kiểm tra CL',    progress: 90 },
  { status: 'COMPLETED',          label: 'Hoàn thành',     progress: 100 },
]

const STATUS_COLOR: Record<ProductionStatus, string> = {
  PENDING_PRODUCTION: 'border-warning text-warning',
  CASTING:            'bg-orange-100 text-orange-700',
  SETTING_STONES:     'bg-blue-100 text-blue-700',
  POLISHING:          'bg-purple-100 text-purple-700',
  QUALITY_CHECK:      'bg-yellow-100 text-yellow-700',
  COMPLETED:          'bg-success/20 text-success',
}

// ─── Demo data ─────────────────────────────────────────────
const DEMO_ORDERS: ProductionOrder[] = [
  {
    _id: 'po1', orderCode: 'PO-2025-001',
    quote: { _id: 'q3', quoteCode: 'QT-2025-003', productName: 'Vòng tay vàng 14K', materialType: 'GOLD_14K', laborCost: 300000, stones: [], costPrice: 8750000, sellingPrice: 13462000, status: 'CONFIRMED', requestedBy: 'Lê Văn C', images: [], createdAt: '', updatedAt: '' },
    deadline: '2025-05-20', assignedTo: 'Thợ Minh', progressStatus: 'CASTING',
    progressNotes: 'Đang đúc khuôn', completedImages: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    _id: 'po2', orderCode: 'PO-2025-002',
    quote: { _id: 'q4', quoteCode: 'QT-2025-004', productName: 'Bông tai kim cương Lab', materialType: 'GOLD_18K', laborCost: 800000, stones: [], costPrice: 25000000, sellingPrice: 35714000, status: 'CONFIRMED', requestedBy: 'Phạm Thị D', images: [], createdAt: '', updatedAt: '' },
    deadline: '2025-05-25', progressStatus: 'PENDING_PRODUCTION',
    progressNotes: '', completedImages: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

// ─── Component ─────────────────────────────────────────────

interface ProductionBoardProps {
  currentUserName?: string
}

export function ProductionBoard({ currentUserName = 'Thợ xưởng' }: ProductionBoardProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>(DEMO_ORDERS)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ProductionOrder | null>(null)
  const [progressStatus, setProgressStatus] = useState<ProductionStatus>('PENDING_PRODUCTION')
  const [progressNotes, setProgressNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [completedImages, setCompletedImages] = useState<{ file: File; url: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'progress' | 'complete' | 'view'>('view')
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await productionApi.list()
      setOrders(data)
    } catch {
      setOrders(DEMO_ORDERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const openOrder = (order: ProductionOrder, openMode: 'progress' | 'complete' | 'view' = 'view') => {
    setSelected(order)
    setProgressStatus(order.progressStatus)
    setProgressNotes(order.progressNotes || '')
    setAssignedTo(order.assignedTo || '')
    setDeadline(order.deadline || '')
    setCompletedImages([])
    setMode(order.progressStatus === 'COMPLETED' ? 'view' : openMode)
  }

  const handleUpdateProgress = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await productionApi.updateProgress(selected._id, { progressStatus, progressNotes })
      setSelected(null)
      fetchOrders()
    } catch {
      alert('Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await productionApi.complete(selected._id, completedImages.map((c) => c.file))
      setSelected(null)
      fetchOrders()
    } catch {
      alert('Hoàn thành thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setCompletedImages((prev) => [...prev, ...newPreviews].slice(0, 8))
  }

  const getProgressValue = (status: ProductionStatus) =>
    PRODUCTION_STEPS.find((s) => s.status === status)?.progress ?? 0

  const getQuote = (order: ProductionOrder) =>
    typeof order.quote === 'object' ? order.quote : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />
            Bảng theo dõi sản xuất
          </CardTitle>
          <CardDescription>Quản lý tiến độ sản xuất từng đơn hàng</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading} className="gap-1">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Mã đơn</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Phân công</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {orders.map((order, i) => {
                  const quote = getQuote(order)
                  const progress = getProgressValue(order.progressStatus)
                  const sc = STATUS_COLOR[order.progressStatus]
                  const statusLabel = PRODUCTION_STEPS.find((s) => s.status === order.progressStatus)?.label
                  return (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-mono text-xs">{order.orderCode}</TableCell>
                      <TableCell>
                        <p className="font-medium">{quote?.productName ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{quote?.requestedBy}</p>
                      </TableCell>
                      <TableCell>
                        {order.assignedTo
                          ? <div className="flex items-center gap-1 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" />{order.assignedTo}</div>
                          : <span className="text-muted-foreground text-xs">Chưa phân công</span>
                        }
                      </TableCell>
                      <TableCell>
                        {order.deadline
                          ? <div className="flex items-center gap-1 text-sm"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{order.deadline}</div>
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          <Progress value={progress} className="h-1.5" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sc}>{statusLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {order.progressStatus !== 'COMPLETED' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => openOrder(order, 'progress')}>
                                Cập nhật
                              </Button>
                              <Button size="sm" className="h-7 text-xs gap-1"
                                onClick={() => openOrder(order, 'complete')}>
                                <Camera className="h-3 w-3" /> Hoàn thành
                              </Button>
                            </>
                          )}
                          {order.progressStatus === 'COMPLETED' && (
                            <Badge variant="outline" className="text-success border-success">
                              <CheckCircle className="h-3 w-3 mr-1" /> Xong
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Không có đơn sản xuất
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'complete' ? '📸 Hoàn thành sản xuất' : '⚙️ Cập nhật tiến độ'}
            </DialogTitle>
            <DialogDescription>
              {selected?.orderCode} — {typeof selected?.quote === 'object' ? selected.quote.productName : ''}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 py-1">
              {/* Phân công thợ + deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phân công thợ</Label>
                  <Input placeholder="Tên thợ..." value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Deadline</Label>
                  <Input type="date" value={deadline}
                    onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>

              {/* Cập nhật trạng thái tiến độ */}
              {mode === 'progress' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trạng thái tiến độ</Label>
                    <Select value={progressStatus} onValueChange={(v) => setProgressStatus(v as ProductionStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_STEPS.filter((s) => s.status !== 'COMPLETED').map((step) => (
                          <SelectItem key={step.status} value={step.status}>
                            {step.label} ({step.progress}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Ghi chú</Label>
                    <Textarea placeholder="Tình trạng hiện tại..." rows={2}
                      value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Tiến độ</Label>
                    <Progress value={getProgressValue(progressStatus)} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{getProgressValue(progressStatus)}%</p>
                  </div>

                  <Button className="w-full gap-2" onClick={handleUpdateProgress} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : 'Lưu tiến độ'}
                  </Button>
                </div>
              )}

              {/* Hoàn thành + upload ảnh thành phẩm */}
              {mode === 'complete' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ảnh thành phẩm (tối đa 8 ảnh)</Label>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {completedImages.map((img, i) => (
                          <motion.div key={img.url} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }} className="relative h-16 w-16 overflow-hidden rounded-md border">
                            <img src={img.url} alt="" className="h-full w-full object-cover" />
                            <button onClick={() => setCompletedImages((p) => p.filter((_, idx) => idx !== i))}
                              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {completedImages.length < 8 && (
                        <button onClick={() => fileRef.current?.click()}
                          className="flex h-16 w-16 flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                          <ImageIcon className="h-5 w-5" />
                          <span className="mt-0.5 text-xs">Thêm</span>
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  </div>

                  <Button className="w-full gap-2" onClick={handleComplete} disabled={saving}>
                    {saving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                      : <><CheckCircle className="h-4 w-4" /> Hoàn thành sản xuất</>
                    }
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

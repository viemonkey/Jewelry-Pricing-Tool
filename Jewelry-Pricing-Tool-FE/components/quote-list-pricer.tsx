'use client'

/**
 * QuoteListPricer — GĐ1, Hạng mục 2, 3, 4, 5
 * Dành cho NV Báo giá (role=order) và Admin
 * - Hiển thị DS yêu cầu lọc theo trạng thái
 * - Mở Calculator gắn vào từng đơn cụ thể
 * - Nút "Hoàn thành báo giá" → cập nhật trạng thái
 * Dành cho Sale (role=sale)
 * - Xem giá bán (không thấy giá vốn)
 * - Nút "Khách chốt" / "Huỷ"
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calculator,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  ThumbsUp,
  Ban,
} from 'lucide-react'
import { quotesApi } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import type { Quote, QuoteStatus, UserRole } from '@/lib/types'

// ─── Demo/fallback data khi chưa có backend ────────────────
const DEMO_QUOTES: Quote[] = [
  {
    _id: '1', quoteCode: 'QT-2025-001', productName: 'Nhẫn kim cương 18K',
    materialType: 'GOLD_18K', laborCost: 500000, stones: [], costPrice: 15500000,
    sellingPrice: 22143000, status: 'PENDING', requestedBy: 'Nguyễn Văn A',
    images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    _id: '2', quoteCode: 'QT-2025-002', productName: 'Dây chuyền bạc 925',
    materialType: 'SILVER', laborCost: 100000, stones: [], costPrice: 1200000,
    sellingPrice: 3600000, status: 'QUOTED', requestedBy: 'Trần Thị B',
    images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    _id: '3', quoteCode: 'QT-2025-003', productName: 'Vòng tay vàng 14K',
    materialType: 'GOLD_14K', laborCost: 300000, stones: [], costPrice: 8750000,
    sellingPrice: 13462000, status: 'CONFIRMED', requestedBy: 'Lê Văn C',
    images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string }> = {
  PENDING:       { label: 'Chờ báo giá',    color: 'border-warning text-warning' },
  QUOTING:       { label: 'Đang báo giá',   color: 'bg-info/20 text-info' },
  QUOTED:        { label: 'Đã báo giá',     color: 'bg-success/20 text-success' },
  CONFIRMED:     { label: 'Khách chốt',     color: 'bg-primary/20 text-primary' },
  CANCELLED:     { label: 'Đã huỷ',         color: 'bg-destructive/20 text-destructive' },
  IN_PRODUCTION: { label: 'Đang sản xuất',  color: 'bg-purple-100 text-purple-700' },
}

interface PriceFormState {
  weightChi: string
  weightGram: string
  laborCost: string
  sellingPrice: string
  costPrice: string
  quotedBy: string
}

interface QuoteListPricerProps {
  currentRole: UserRole
  currentUserName?: string
}

export function QuoteListPricer({ currentRole, currentUserName = 'NV Báo giá' }: QuoteListPricerProps) {
  const [quotes, setQuotes] = useState<Quote[]>(DEMO_QUOTES)
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL')
  const [selected, setSelected] = useState<Quote | null>(null)
  const [priceForm, setPriceForm] = useState<PriceFormState>({
    weightChi: '', weightGram: '', laborCost: '', sellingPrice: '', costPrice: '', quotedBy: currentUserName,
  })
  const [saving, setSaving] = useState(false)

  const canViewCost = currentRole === 'order' || currentRole === 'admin'
  const isPricer = canViewCost

  // Fetch từ API (nếu backend đã sẵn)
  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const data = await quotesApi.list(filterStatus === 'ALL' ? undefined : filterStatus)
      setQuotes(data)
    } catch {
      // fallback to demo data
      setQuotes(DEMO_QUOTES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuotes() }, [filterStatus])

  const openDetail = (q: Quote) => {
    setSelected(q)
    setPriceForm({
      weightChi: q.weightChi?.toString() || '',
      weightGram: q.weightGram?.toString() || '',
      laborCost: q.laborCost?.toString() || '',
      sellingPrice: q.sellingPrice?.toString() || '',
      costPrice: q.costPrice?.toString() || '',
      quotedBy: currentUserName,
    })
  }

  // NV báo giá: Hoàn thành báo giá
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
      setSelected(null)
      fetchQuotes()
    } catch {
      alert('Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  // Sale: Khách chốt
  const handleConfirm = async (id: string) => {
    try {
      await quotesApi.confirm(id)
      fetchQuotes()
    } catch { alert('Thao tác thất bại') }
  }

  // Sale: Huỷ
  const handleCancel = async (id: string) => {
    if (!confirm('Xác nhận huỷ báo giá này?')) return
    try {
      await quotesApi.cancel(id)
      fetchQuotes()
    } catch { alert('Thao tác thất bại') }
  }

  const filtered = filterStatus === 'ALL'
    ? quotes
    : quotes.filter((q) => q.status === filterStatus)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Danh sách yêu cầu báo giá</CardTitle>
          <CardDescription>
            {isPricer
              ? 'Xử lý và hoàn thành báo giá cho các yêu cầu từ Sale'
              : 'Theo dõi trạng thái và xác nhận báo giá'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-1">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter tabs */}
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as QuoteStatus | 'ALL')}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ALL">Tất cả</TabsTrigger>
            <TabsTrigger value="PENDING">Chờ báo giá</TabsTrigger>
            <TabsTrigger value="QUOTING">Đang xử lý</TabsTrigger>
            <TabsTrigger value="QUOTED">Đã báo giá</TabsTrigger>
            <TabsTrigger value="CONFIRMED">Khách chốt</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table */}
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
                  const sc = STATUS_CONFIG[q.status]
                  return (
                    <motion.tr
                      key={q._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-mono text-xs">{q.quoteCode}</TableCell>
                      <TableCell className="font-medium">{q.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.materialType.replace('_', ' ')}</Badge>
                      </TableCell>
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
                        <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* NV báo giá: Mở form tính giá */}
                          {isPricer && q.status === 'PENDING' && (
                            <Button size="sm" variant="outline" onClick={() => openDetail(q)} className="gap-1 h-7 text-xs">
                              <Calculator className="h-3 w-3" /> Tính giá
                            </Button>
                          )}
                          {/* Sale: Xem + Chốt/Huỷ */}
                          {!isPricer && q.status === 'QUOTED' && (
                            <>
                              <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => handleConfirm(q._id)}>
                                <ThumbsUp className="h-3 w-3" /> Chốt
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => handleCancel(q._id)}>
                                <Ban className="h-3 w-3" /> Huỷ
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(q)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Detail / Pricing Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.quoteCode} — {selected?.productName}</DialogTitle>
            <DialogDescription>
              {isPricer && selected?.status === 'PENDING'
                ? 'Nhập thông tin giá để hoàn thành báo giá'
                : 'Chi tiết báo giá'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 py-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Người yêu cầu:</span>
                  <p className="font-medium">{selected.requestedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Chất liệu:</span>
                  <p className="font-medium">{selected.materialType.replace('_', ' ')}</p>
                </div>
                {selected.productDescription && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Mô tả:</span>
                    <p>{selected.productDescription}</p>
                  </div>
                )}
                {selected.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Ghi chú:</span>
                    <p>{selected.notes}</p>
                  </div>
                )}
              </div>

              {/* Pricing form — chỉ NV báo giá thấy khi status=PENDING */}
              {isPricer && selected.status === 'PENDING' && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium">Nhập thông tin giá</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selected.materialType !== 'SILVER' ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Số chi vàng</Label>
                        <Input
                          type="number" placeholder="0"
                          value={priceForm.weightChi}
                          onChange={(e) => setPriceForm((f) => ({ ...f, weightChi: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs">Trọng lượng (gram)</Label>
                        <Input
                          type="number" placeholder="0"
                          value={priceForm.weightGram}
                          onChange={(e) => setPriceForm((f) => ({ ...f, weightGram: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Tiền công (VNĐ)</Label>
                      <Input
                        type="number" placeholder="0"
                        value={priceForm.laborCost}
                        onChange={(e) => setPriceForm((f) => ({ ...f, laborCost: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Giá vốn (VNĐ)</Label>
                      <Input
                        type="number" placeholder="0"
                        value={priceForm.costPrice}
                        onChange={(e) => setPriceForm((f) => ({ ...f, costPrice: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Giá bán đề xuất (VNĐ)</Label>
                      <Input
                        type="number" placeholder="0"
                        value={priceForm.sellingPrice}
                        onChange={(e) => setPriceForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Kết quả giá khi đã báo giá */}
              {selected.status !== 'PENDING' && (
                <div className="space-y-2 border-t pt-3">
                  {canViewCost && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giá vốn:</span>
                      <span className="font-medium">{formatCurrency(selected.costPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giá bán:</span>
                    <span className="font-bold text-primary text-lg">{formatCurrency(selected.sellingPrice)}</span>
                  </div>
                </div>
              )}

              {/* Sale actions: Chốt / Huỷ */}
              {!isPricer && selected.status === 'QUOTED' && (
                <div className="flex gap-2 border-t pt-3">
                  <Button className="flex-1 gap-2" onClick={() => { handleConfirm(selected._id); setSelected(null) }}>
                    <ThumbsUp className="h-4 w-4" /> Khách chốt
                  </Button>
                  <Button variant="destructive" className="flex-1 gap-2" onClick={() => { handleCancel(selected._id); setSelected(null) }}>
                    <Ban className="h-4 w-4" /> Huỷ
                  </Button>
                </div>
              )}

              {/* NV báo giá: Hoàn thành */}
              {isPricer && selected.status === 'PENDING' && (
                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button variant="outline" onClick={() => setSelected(null)}>Đóng</Button>
                  <Button onClick={handleCompleteQuoting} disabled={saving} className="gap-2">
                    {saving
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</>
                      : <><CheckCircle className="h-4 w-4" /> Hoàn thành báo giá</>
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

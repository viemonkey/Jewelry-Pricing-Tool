'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { quotesApi, BASE_URL } from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import type { Quote } from '@/lib/types'
import {
  Check, X, Loader2, Eye, AlertCircle, FileText, CheckCircle2,
  Calendar, User, Gem, Sparkles
} from 'lucide-react'

interface QuickQuoteApprovalsProps {
  currentUserName?: string
}

export function QuickQuoteApprovals({ currentUserName }: QuickQuoteApprovalsProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  
  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const { addNotification } = useNotifications()

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      // Fetch only quick quotes
      const res = await quotesApi.list(undefined, true)
      setQuotes(res)
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: err.message || 'Không thể tải danh sách duyệt giá nhanh.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  const filteredQuotes = quotes.filter((q) => {
    if (filterStatus === 'ALL') return true
    return q.status === filterStatus
  })

  // Quick Approve directly from table or modal
  const handleApprove = async (quote: Quote) => {
    setActionLoading(true)
    try {
      await quotesApi.completeQuoting(quote._id)
      addNotification({
        type: 'success',
        title: 'Đã duyệt báo giá',
        message: `Báo giá nhanh "${quote.quoteCode}" đã được duyệt thành công.`,
      })
      setIsDetailOpen(false)
      fetchQuotes()
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Duyệt thất bại',
        message: err.message || 'Không thể duyệt yêu cầu báo giá này.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Reject with reason
  const handleRejectSubmit = async () => {
    if (!selectedQuote) return
    if (!rejectReason.trim()) {
      addNotification({
        type: 'error',
        title: 'Thiếu lý do từ chối',
        message: 'Vui lòng nhập lý do từ chối trước khi gửi.',
      })
      return
    }

    setActionLoading(true)
    try {
      await quotesApi.rejectQuote(selectedQuote._id, rejectReason.trim())
      addNotification({
        type: 'success',
        title: 'Đã từ chối báo giá',
        message: `Yêu cầu "${selectedQuote.quoteCode}" đã được chuyển về trạng thái Cần bổ sung.`,
      })
      setIsRejectOpen(false)
      setIsDetailOpen(false)
      setRejectReason('')
      fetchQuotes()
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Từ chối thất bại',
        message: err.message || 'Có lỗi xảy ra khi từ chối yêu cầu.',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-amber-100 border-amber-300 text-amber-700 font-semibold shadow-sm">Chờ duyệt</Badge>
      case 'QUOTED':
        return <Badge className="bg-emerald-100 border-emerald-300 text-emerald-700 font-semibold shadow-sm">Đã duyệt</Badge>
      case 'NEED_MORE_INFO':
        return <Badge className="bg-red-100 border-red-300 text-red-700 font-semibold shadow-sm">Yêu cầu sửa</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getMaterialLabel = (type: string) => {
    const map: Record<string, string> = {
      GOLD_24K: 'Vàng 24K',
      GOLD_18K: 'Vàng 18K',
      GOLD_14K: 'Vàng 14K',
      GOLD_610: 'Vàng 610',
      GOLD_10K: 'Vàng 10K',
      SILVER: 'Bạc 925',
      PLATINUM: 'Bạch kim',
    }
    return map[type] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
            Duyệt giá nhanh sản phẩm
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
            Duyệt nhanh các yêu cầu tính giá được gửi lên từ bộ phận Sale
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshIcon className="h-4 w-4" />}
          Tải lại danh sách
        </Button>
      </div>

      {/* Tabs lọc */}
      <div className="flex gap-2 border-b border-border pb-px">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'PENDING', label: 'Chờ duyệt' },
          { key: 'QUOTED', label: 'Đã duyệt' },
          { key: 'NEED_MORE_INFO', label: 'Yêu cầu sửa' },
        ].map((tab) => {
          const isActive = filterStatus === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors duration-200 ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {tab.key === 'ALL'
                  ? quotes.length
                  : quotes.filter(q => q.status === tab.key).length}
              </span>
            </button>
          )
        })}
      </div>

      <Card className="luxury-card border-luxury">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-3 text-primary" />
              Đang tải dữ liệu báo giá nhanh...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 opacity-25 mb-2" />
              <p className="text-sm">Không tìm thấy yêu cầu duyệt giá nhanh nào</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-foreground">Mã</TableHead>
                  <TableHead className="font-semibold text-foreground">Sản phẩm</TableHead>
                  <TableHead className="font-semibold text-foreground">Chất liệu / Tuổi</TableHead>
                  <TableHead className="font-semibold text-foreground">Trọng lượng (chỉ)</TableHead>
                  <TableHead className="font-semibold text-foreground">Ước tính giá đề xuất</TableHead>
                  <TableHead className="font-semibold text-foreground">Người yêu cầu</TableHead>
                  <TableHead className="font-semibold text-foreground">Trạng thái</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => {
                  const primaryOption = quote.options?.[0]
                  const sellingPriceVal = primaryOption?.sellingPrice || quote.sellingPrice || 0
                  
                  return (
                    <TableRow key={quote._id} className="hover:bg-muted/10 transition-colors duration-200">
                      <TableCell className="font-mono text-xs font-semibold">{quote.quoteCode}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{quote.productName}</TableCell>
                      <TableCell className="text-sm">{getMaterialLabel(quote.materialType)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{quote.weightChi || '—'}</TableCell>
                      <TableCell className="text-sm font-semibold text-primary tabular-nums">
                        {sellingPriceVal ? formatCurrency(sellingPriceVal) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{quote.requestedBy}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 gap-1"
                            onClick={() => {
                              setSelectedQuote(quote)
                              setIsDetailOpen(true)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Xem chi tiết
                          </Button>
                          
                          {quote.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800"
                                onClick={() => handleApprove(quote)}
                                disabled={actionLoading}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 hover:text-red-800"
                                onClick={() => {
                                  setSelectedQuote(quote)
                                  setRejectReason('')
                                  setIsRejectOpen(true)
                                }}
                                disabled={actionLoading}
                              >
                                <X className="h-3.5 w-3.5" />
                                Trả lại
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL CHI TIẾT YÊU CẦU */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedQuote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <DialogTitle className="text-xl font-serif text-primary font-bold">
                      {selectedQuote.productName}
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs mt-1">
                      Mã yêu cầu: {selectedQuote.quoteCode}
                    </DialogDescription>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedQuote.status)}
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 border p-3 flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Người yêu cầu</p>
                      <p className="text-sm font-semibold">{selectedQuote.requestedBy}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 border p-3 flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ngày tạo</p>
                      <p className="text-sm font-semibold">
                        {new Date(selectedQuote.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product details */}
                <div className="rounded-xl border p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    ⚙️ Thông số sản phẩm
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Phân loại / Giới tính:</span>
                      <span className="font-medium">{selectedQuote.productDescription?.split(' · ')[0] || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Tuổi vàng:</span>
                      <span className="font-medium">{getMaterialLabel(selectedQuote.materialType)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Trọng lượng:</span>
                      <span className="font-medium tabular-nums">{selectedQuote.weightChi} chỉ</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Tiền đá quý:</span>
                      <span className="font-medium tabular-nums">
                        {selectedQuote.options?.[0]?.stoneCost ? formatCurrency(selectedQuote.options[0].stoneCost) : '—'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedQuote.notes && (
                    <div className="mt-2 text-xs bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg p-2.5 text-amber-800 dark:text-amber-300">
                      <strong>Ghi chú từ Sale:</strong> {selectedQuote.notes}
                    </div>
                  )}

                  {selectedQuote.rejectReason && selectedQuote.status === 'NEED_MORE_INFO' && (
                    <div className="mt-2 text-xs bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 rounded-lg p-2.5 text-red-800 dark:text-red-300">
                      <strong>Lý do yêu cầu sửa:</strong> {selectedQuote.rejectReason}
                    </div>
                  )}
                </div>

                {/* Cost / Suggested Price summary */}
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-amber-500/5 p-4 text-center">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">GIÁ BÁN ĐỀ XUẤT</p>
                  <p className="text-3xl font-serif font-bold text-primary tabular-nums">
                    {selectedQuote.options?.[0]?.sellingPrice
                      ? formatCurrency(selectedQuote.options[0].sellingPrice)
                      : selectedQuote.sellingPrice
                        ? formatCurrency(selectedQuote.sellingPrice)
                        : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Giá vốn gồm VAT: {selectedQuote.options?.[0]?.costPrice ? formatCurrency(selectedQuote.options[0].costPrice) : '—'}
                  </p>
                </div>

                {/* Images */}
                {selectedQuote.images?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">🖼 Hình ảnh sản phẩm</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuote.images.map((img, i) => (
                        <a
                          key={i}
                          href={`${BASE_URL}${img}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img src={`${BASE_URL}${img}`} alt={`Ảnh ${i + 1}`} className="h-24 w-24 object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-3 flex gap-2">
                <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>
                  Đóng
                </Button>
                
                {selectedQuote.status === 'PENDING' && (
                  <>
                    <Button
                      variant="outline"
                      className="border-red-200 bg-red-50/50 text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setRejectReason('')
                        setIsRejectOpen(true)
                      }}
                      disabled={actionLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Yêu cầu sửa
                    </Button>
                    
                    <Button
                      className="bg-gold-gradient text-white hover:opacity-95"
                      onClick={() => handleApprove(selectedQuote)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Phê duyệt giá bán
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL TỪ CHỐI / YÊU CẦU SỬA */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-semibold font-serif">
              <AlertCircle className="h-5 w-5" />
              Yêu cầu điều chỉnh báo giá
            </DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối hoặc hướng dẫn điều chỉnh chi tiết cho nhân viên Sale.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="rejectReason" className="text-sm font-semibold">Lý do yêu cầu sửa</Label>
            <Textarea
              id="rejectReason"
              placeholder="VD: Sai trọng lượng vàng, tiền đá cần cộng thêm chi phí kiểm định..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>
              Quay lại
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleRejectSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Gửi yêu cầu sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  )
}

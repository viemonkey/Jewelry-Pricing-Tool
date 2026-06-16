'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Loader2, Eye, FileText, Calendar, User, Edit3, AlertCircle, RefreshCw, Gem,
  Scale, Tag, Coins, Hammer, Sparkles
} from 'lucide-react'

interface QuickQuoteHistoryListProps {
  currentRole: string
  currentUserName?: string
  refreshTrigger: number
  onLoadQuote: (quote: Quote) => void
}

export function QuickQuoteHistoryList({
  currentRole,
  currentUserName,
  refreshTrigger,
  onLoadQuote
}: QuickQuoteHistoryListProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const { addNotification } = useNotifications()

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const res = await quotesApi.list(undefined, true)
      // Filter by requestedBy for sale role
      const filtered = currentRole === 'order'
        ? res
        : res.filter(q => q.requestedBy === currentUserName)
      setQuotes(filtered)
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Lỗi tải lịch sử',
        message: err.message || 'Không thể tải lịch sử yêu cầu duyệt giá nhanh.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [refreshTrigger, currentUserName, currentRole])

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

  const getCategoryLabel = (type?: string | null) => {
    const map: Record<string, string> = {
      'RING': 'Nhẫn',
      'NECKLACE': 'Dây chuyền',
      'BRACELET': 'Vòng / Lắc tay',
      'ANKLET': 'Lắc chân',
    }
    return map[type || ''] || '—'
  }

  const getGenderLabel = (g?: string) => {
    const map: Record<string, string> = {
      'men': 'Nam',
      'women': 'Nữ',
      'unisex': 'Unisex',
    }
    return map[g || ''] || '—'
  }

  return (
    <Card className="luxury-card border-luxury">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-serif font-semibold text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lịch sử yêu cầu duyệt giá nhanh
          </CardTitle>
          <CardDescription>
            Theo dõi tình trạng phê duyệt các yêu cầu tính giá nhanh của bạn
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-1 h-7 text-xs">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-36 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Đang tải lịch sử yêu cầu...
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center text-muted-foreground border-t">
            <p className="text-xs">Chưa có yêu cầu duyệt giá nhanh nào được gửi</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="font-semibold text-foreground text-xs py-2">Mã</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2">Sản phẩm</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2">Chất liệu / Tuổi</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2">Trọng lượng (chỉ)</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2 font-mono">Giá đề xuất</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2">Ngày gửi</TableHead>
                <TableHead className="font-semibold text-foreground text-xs py-2">Trạng thái</TableHead>
                <TableHead className="text-right font-semibold text-foreground text-xs py-2">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => {
                const primaryOption = quote.options?.[0]
                const sellingPriceVal = primaryOption?.sellingPrice || quote.sellingPrice || 0
                
                return (
                  <TableRow key={quote._id} className="hover:bg-muted/5 transition-colors duration-150">
                    <TableCell className="font-mono text-xs font-semibold py-2">{quote.quoteCode}</TableCell>
                    <TableCell className="font-medium text-xs py-2 max-w-[150px] truncate">{quote.productName}</TableCell>
                    <TableCell className="text-xs py-2">{getMaterialLabel(quote.materialType)}</TableCell>
                    <TableCell className="text-xs py-2 tabular-nums">{quote.weightChi || quote.options?.[0]?.weightChi || '—'}</TableCell>
                    <TableCell className="text-xs py-2 font-semibold text-primary tabular-nums">
                      {sellingPriceVal ? `${formatCurrency(sellingPriceVal)} - ${formatCurrency(sellingPriceVal + 5000000)}` : '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground py-2">
                      {new Date(quote.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="py-2">{getStatusBadge(quote.status)}</TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setSelectedQuote(quote)
                            setImageError(false)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Xem
                        </Button>
                        
                        {quote.status === 'NEED_MORE_INFO' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 border-primary/30 text-primary hover:bg-primary/5 gap-1 text-xs"
                            onClick={() => onLoadQuote(quote)}
                          >
                            <Edit3 className="h-3 w-3" />
                            Sửa lại
                          </Button>
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

      {/* DETAIL DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedQuote && (() => {
            const primaryOption = selectedQuote.options?.[0]
            const weight = selectedQuote.weightChi || primaryOption?.weightChi || 0
            const laborCost = primaryOption?.laborCost || 0
            const goldPrice24K = primaryOption?.goldPrice24K || 0
            const stoneCost = primaryOption?.stoneCost || 0
            const sellingPrice = primaryOption?.sellingPrice || selectedQuote.sellingPrice || 0

            return (
              <>
                <DialogHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Phiếu yêu cầu duyệt nhanh
                      </span>
                      <DialogTitle className="text-xl font-serif text-foreground font-bold tracking-tight mt-1.5 flex items-center gap-1.5">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        {selectedQuote.productName}
                      </DialogTitle>
                      <DialogDescription className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        Mã yêu cầu: <span className="font-semibold text-foreground">{selectedQuote.quoteCode}</span>
                      </DialogDescription>
                    </div>
                    <div>
                      {getStatusBadge(selectedQuote.status)}
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-5 space-y-5 text-xs">
                  {/* Timeline Meta Card */}
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 border rounded-2xl p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Người yêu cầu</p>
                        <p className="font-semibold mt-1 text-foreground leading-none">{selectedQuote.requestedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border shadow-sm shrink-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Ngày tạo yêu cầu</p>
                        <p className="font-semibold mt-1 text-foreground leading-none">
                          {new Date(selectedQuote.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-[160px_1fr]">
                    {/* Left: Image Card */}
                    <div className="flex flex-col items-center justify-center border border-primary/20 rounded-2xl bg-muted/15 h-[160px] w-[160px] mx-auto shrink-0 relative overflow-hidden group">
                      {(() => {
                        const hasImage = selectedQuote.images?.length > 0 && 
                          (selectedQuote.images[0].startsWith('/uploads/') || selectedQuote.images[0].startsWith('http')) &&
                          !imageError;
                        if (hasImage) {
                          return (
                            <a
                              href={`${BASE_URL}${selectedQuote.images[0]}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full h-full block"
                            >
                              <img 
                                src={`${BASE_URL}${selectedQuote.images[0]}`} 
                                alt={selectedQuote.productName} 
                                className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105" 
                                onError={() => setImageError(true)}
                              />
                            </a>
                          )
                        }
                        return (
                          <div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 text-center p-4">
                            <Gem className="h-9 w-9 text-muted-foreground/40" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">Không có ảnh</span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Right: Technical Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border bg-card rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <Tag className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Phân loại</span>
                          <p className="font-bold text-foreground mt-0.5 leading-none">{getCategoryLabel(selectedQuote.productType)}</p>
                        </div>
                      </div>

                      <div className="border bg-card rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Giới tính</span>
                          <p className="font-bold text-foreground mt-0.5 leading-none">{getGenderLabel(selectedQuote.gender)}</p>
                        </div>
                      </div>

                      <div className="border bg-card rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <Coins className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Tuổi vàng</span>
                          <p className="font-bold text-foreground mt-0.5 leading-none">{getMaterialLabel(selectedQuote.materialType)}</p>
                        </div>
                      </div>

                      <div className="border bg-card rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                          <Scale className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Trọng lượng</span>
                          <p className="font-bold text-primary mt-0.5 leading-none">{weight ? `${weight} chỉ` : '—'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial details breakdown card */}
                  <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
                    <div className="bg-muted/40 border-b px-4 py-2.5 flex items-center gap-1.5">
                      <Hammer className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E8E7A]">Thông số tính toán chi tiết</span>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-4 text-center">
                      <div className="border-r pr-2">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Vàng 24K</p>
                        <p className="font-bold text-foreground tabular-nums">{goldPrice24K ? formatCurrency(goldPrice24K) : '—'}</p>
                      </div>
                      <div className="border-r pr-2">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Tiền công</p>
                        <p className="font-bold text-foreground tabular-nums">{laborCost ? formatCurrency(laborCost) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Tiền đá quý</p>
                        <p className="font-bold text-foreground tabular-nums">{stoneCost !== undefined ? formatCurrency(stoneCost) : '0 đ'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú & Lý do trả lại */}
                  {(selectedQuote.notes || (selectedQuote.rejectReason && selectedQuote.status === 'NEED_MORE_INFO')) && (
                    <div className="space-y-3">
                      {selectedQuote.notes && (
                        <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-4 text-amber-800 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/[0.02] rounded-full blur-lg" />
                          <strong className="text-[9px] font-extrabold uppercase tracking-widest text-[#9B7630] block mb-1">Ghi chú từ Sale:</strong>
                          <p className="text-xs leading-relaxed">{selectedQuote.notes}</p>
                        </div>
                      )}
                      {selectedQuote.rejectReason && selectedQuote.status === 'NEED_MORE_INFO' && (
                        <div className="bg-destructive/[0.03] border border-destructive/20 rounded-2xl p-4 text-destructive relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/[0.02] rounded-full blur-lg" />
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-[9px] font-extrabold uppercase tracking-widest text-destructive block mb-1">Yêu cầu sửa đổi từ Admin:</strong>
                              <p className="text-xs leading-relaxed font-semibold">{selectedQuote.rejectReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Banner Display */}
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent p-5 text-center shadow-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.15),transparent_70%)] pointer-events-none" />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 leading-none">
                      {selectedQuote.status === 'QUOTED' ? 'GIÁ BÁN ĐÃ PHÊ DUYỆT' : 'KHOẢNG GIÁ BÁN LẺ ĐỀ XUẤT'}
                    </p>
                    <p className="text-2xl sm:text-3xl font-serif font-bold text-primary tabular-nums tracking-wide drop-shadow-[0_2px_8px_rgba(212,175,55,0.15)] leading-none my-1">
                      {sellingPrice ? `${formatCurrency(sellingPrice)} - ${formatCurrency(sellingPrice + 5000000)}` : '—'}
                    </p>
                    <p className="text-[8.5px] text-muted-foreground uppercase tracking-widest mt-1.5">Đã bao gồm VAT và tỷ suất sinh lợi chuẩn</p>
                  </div>
                </div>

                <DialogFooter className="border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                    Đóng
                  </Button>
                  {selectedQuote.status === 'NEED_MORE_INFO' && (
                    <Button
                      size="sm"
                      className="bg-gold-gradient text-white"
                      onClick={() => {
                        onLoadQuote(selectedQuote)
                        setIsDetailOpen(false)
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Sửa đổi & Gửi lại
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

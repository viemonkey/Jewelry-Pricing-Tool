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
  Loader2, Eye, FileText, Calendar, User, Edit3, AlertCircle, RefreshCw, Gem
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
                <DialogHeader>
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <DialogTitle className="text-lg font-serif text-primary font-bold">
                        {selectedQuote.productName}
                      </DialogTitle>
                      <DialogDescription className="font-mono text-[10px] mt-0.5">
                        Mã yêu cầu: {selectedQuote.quoteCode}
                      </DialogDescription>
                    </div>
                    <div>
                      {getStatusBadge(selectedQuote.status)}
                    </div>
                  </div>
                </DialogHeader>

                <div className="py-4 space-y-4 text-xs">
                  {/* Meta & Status Card */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/20 border rounded-xl p-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ngày tạo</p>
                      <p className="font-semibold mt-0.5">
                        {new Date(selectedQuote.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Người yêu cầu</p>
                      <p className="font-semibold mt-0.5">{selectedQuote.requestedBy}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                    {/* Left Column: Image placeholder or image */}
                    <div className="flex flex-col items-center justify-center border rounded-xl p-3 bg-muted/10 h-[140px] w-[140px] mx-auto shrink-0 relative overflow-hidden">
                      {(() => {
                        const hasImage = selectedQuote.images?.length > 0 && 
                          (selectedQuote.images[0].startsWith('/uploads/') || selectedQuote.images[0].startsWith('http'));
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
                                className="w-full h-full object-cover rounded-lg" 
                              />
                            </a>
                          )
                        }
                        return (
                          <div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-1 text-center">
                            <Gem className="h-8 w-8 text-muted-foreground/45" />
                            <span className="text-[9px] font-medium leading-tight">Không có ảnh mẫu</span>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Right Column: Detail Grid */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-card border rounded-xl p-3">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Phân loại:</span>
                          <span className="font-semibold">{getCategoryLabel(selectedQuote.productType)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Giới tính:</span>
                          <span className="font-semibold">{getGenderLabel(selectedQuote.gender)}</span>
                        </div>
                        <div className="border-t pt-1.5 mt-0.5">
                          <span className="text-muted-foreground block text-[10px]">Tuổi vàng:</span>
                          <span className="font-semibold">{getMaterialLabel(selectedQuote.materialType)}</span>
                        </div>
                        <div className="border-t pt-1.5 mt-0.5">
                          <span className="text-muted-foreground block text-[10px]">Trọng lượng:</span>
                          <span className="font-semibold text-primary">{weight ? `${weight} chỉ` : '—'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-card border rounded-xl p-3">
                        <div>
                          <span className="text-muted-foreground block text-[10px] truncate">Vàng 24K:</span>
                          <span className="font-medium">{goldPrice24K ? `${formatCurrency(goldPrice24K)}` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Tiền công:</span>
                          <span className="font-medium">{laborCost ? formatCurrency(laborCost) : '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Tiền đá:</span>
                          <span className="font-medium">{stoneCost !== undefined ? formatCurrency(stoneCost) : '0 đ'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes and feedback */}
                  {(selectedQuote.notes || (selectedQuote.rejectReason && selectedQuote.status === 'NEED_MORE_INFO')) && (
                    <div className="space-y-2">
                      {selectedQuote.notes && (
                        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 rounded-xl p-3 text-amber-800 dark:text-amber-300">
                          <strong className="text-[10px] block uppercase tracking-wider mb-0.5">Ghi chú từ Sale:</strong>
                          <p className="text-xs leading-relaxed">{selectedQuote.notes}</p>
                        </div>
                      )}
                      {selectedQuote.rejectReason && selectedQuote.status === 'NEED_MORE_INFO' && (
                        <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/40 rounded-xl p-3 text-red-800 dark:text-red-300">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-[10px] block uppercase tracking-wider mb-0.5">Yêu cầu chỉnh sửa từ Admin:</strong>
                              <p className="text-xs leading-relaxed">{selectedQuote.rejectReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Display */}
                  <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent p-4 text-center shadow-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.1),transparent_70%)] pointer-events-none" />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                      {selectedQuote.status === 'QUOTED' ? 'GIÁ BÁN ĐÃ DUYỆT' : 'GIÁ BÁN BÁN LẺ ƯỚC TÍNH'}
                    </p>
                    <p className="text-2xl font-serif font-bold text-primary tabular-nums tracking-wide">
                      {sellingPrice ? `${formatCurrency(sellingPrice)} - ${formatCurrency(sellingPrice + 5000000)}` : '—'}
                    </p>
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

'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/pricing'
import { quotesApi } from '@/lib/api'
import type { UserRole } from './header'
import type { Quote, QuoteStatus } from '@/lib/types'
import { Eye, MoreHorizontal, FileText, TrendingUp, Loader2, RefreshCw } from 'lucide-react'

interface RecentQuotesProps {
  currentRole: UserRole
}

const STATUS_MAP: Record<QuoteStatus, { label: string; color: string }> = {
  PENDING:          { label: 'Chờ báo giá',   color: 'border-amber-400 text-amber-600 bg-amber-50' },
  NEED_MORE_INFO:   { label: 'Cần bổ sung',   color: 'border-rose-400 text-rose-600 bg-rose-50' },
  QUOTING:          { label: 'Đang báo giá',  color: 'border-violet-400 text-violet-600 bg-violet-50' },
  QUOTED:           { label: 'Đã báo giá',    color: 'border-blue-400 text-blue-600 bg-blue-50' },
  SENT_TO_CUSTOMER: { label: 'Đã gửi khách',  color: 'border-teal-400 text-teal-600 bg-teal-50' },
  CONFIRMED:        { label: 'Đã đặt hàng',   color: 'border-emerald-400 text-emerald-600 bg-emerald-50' },
  CANCELLED:        { label: 'Đã huỷ',        color: 'border-slate-300 text-slate-500 bg-slate-50' },
}


const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function RecentQuotes({ currentRole }: RecentQuotesProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  const canViewCost = currentRole === 'order'

  const fetchQuotes = () => {
    setLoading(true)
    quotesApi.list()
      .then((data) => setQuotes(data.slice(0, 10))) // chỉ hiển thị 10 gần nhất
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchQuotes() }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <FileText className="h-5 w-5 text-primary" />
              </motion.div>
              Báo giá gần đây
            </CardTitle>
            <CardDescription>
              Danh sách các yêu cầu báo giá mới nhất
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={fetchQuotes} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Đang tải dữ liệu...
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Chưa có báo giá nào
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8F9FA] border-b border-slate-200">
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Mã báo giá</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Sản phẩm</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Chất liệu</TableHead>
                    {canViewCost && <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider text-right h-11">Giá vốn</TableHead>}
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider text-right h-11">Giá bán</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Trạng thái</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider h-11">Ngày tạo</TableHead>
                    <TableHead className="w-10 h-11" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote, index) => {
                    const statusCfg = STATUS_MAP[quote.status] ?? { label: quote.status, color: '' }
                    return (
                      <motion.tr
                        key={quote._id}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={tableRowVariants}
                        className="group border-b transition-colors hover:bg-muted/50"
                        whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}
                      >
                        <TableCell className="font-mono text-sm">
                          <motion.span
                            whileHover={{ color: '#D4AF37' }}
                            transition={{ duration: 0.2 }}
                          >
                            {quote.quoteCode}
                          </motion.span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {quote.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">{quote.requestedBy}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="transition-all group-hover:border-primary/50">
                            {quote.materialType.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        {canViewCost && (
                          <TableCell className="text-right font-medium">
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 + index * 0.08 }}
                            >
                              {quote.costPrice ? formatCurrency(quote.costPrice) : '—'}
                            </motion.span>
                          </TableCell>
                        )}
                        <TableCell className="text-right font-bold text-primary">
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + index * 0.08, type: 'spring' }}
                          >
                            {quote.sellingPrice ? formatCurrency(quote.sellingPrice) : '—'}
                          </motion.span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusCfg.color}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(quote.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <FileText className="mr-2 h-4 w-4" />
                                Xuất PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

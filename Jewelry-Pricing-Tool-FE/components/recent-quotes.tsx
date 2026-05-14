'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/pricing'
import type { UserRole } from './header'
import { Eye, MoreHorizontal, FileText, TrendingUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RecentQuotesProps {
  currentRole: UserRole
}

const SAMPLE_QUOTES = [
  {
    id: 'QT-2024-001',
    product: 'Nhẫn kim cương 18K',
    type: 'Vàng 18K',
    costPrice: 15_500_000,
    sellingPrice: 22_143_000,
    status: 'completed',
    date: '14/05/2024',
    requestedBy: 'Nguyen Van A',
  },
  {
    id: 'QT-2024-002',
    product: 'Dây chuyền bạc 925',
    type: 'Bạc',
    costPrice: 1_200_000,
    sellingPrice: 3_600_000,
    status: 'pending',
    date: '14/05/2024',
    requestedBy: 'Tran Thi B',
  },
  {
    id: 'QT-2024-003',
    product: 'Vòng tay vàng 14K',
    type: 'Vàng 14K',
    costPrice: 8_750_000,
    sellingPrice: 13_462_000,
    status: 'processing',
    date: '13/05/2024',
    requestedBy: 'Le Van C',
  },
  {
    id: 'QT-2024-004',
    product: 'Bông tai kim cương Lab',
    type: 'Vàng 18K',
    costPrice: 25_000_000,
    sellingPrice: 35_714_000,
    status: 'ordered',
    date: '13/05/2024',
    requestedBy: 'Pham Thi D',
  },
  {
    id: 'QT-2024-005',
    product: 'Nhẫn đôi vàng 24K',
    type: 'Vàng 24K',
    costPrice: 45_000_000,
    sellingPrice: 60_000_000,
    status: 'completed',
    date: '12/05/2024',
    requestedBy: 'Hoang Van E',
  },
]

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  pending: { label: 'Chờ báo giá', variant: 'outline', color: 'border-warning text-warning' },
  processing: { label: 'Đang xử lý', variant: 'secondary', color: 'bg-info/20 text-info border-info/30' },
  completed: { label: 'Đã báo giá', variant: 'default', color: 'bg-success/20 text-success border-success/30' },
  ordered: { label: 'Đã đặt hàng', variant: 'default', color: 'bg-primary/20 text-primary border-primary/30' },
}

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  }),
}

export function RecentQuotes({ currentRole }: RecentQuotesProps) {
  const canViewCost = currentRole === 'order' || currentRole === 'admin'

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
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Xem tất cả
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mã báo giá</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Loại</TableHead>
                  {canViewCost && <TableHead className="text-right">Giá vốn</TableHead>}
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {SAMPLE_QUOTES.map((quote, index) => (
                  <motion.tr
                    key={quote.id}
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
                        {quote.id}
                      </motion.span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {quote.product}
                        </p>
                        <p className="text-xs text-muted-foreground">{quote.requestedBy}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="transition-all group-hover:border-primary/50">
                        {quote.type}
                      </Badge>
                    </TableCell>
                    {canViewCost && (
                      <TableCell className="text-right font-medium">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          {formatCurrency(quote.costPrice)}
                        </motion.span>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-bold text-primary">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
                      >
                        {formatCurrency(quote.sellingPrice)}
                      </motion.span>
                    </TableCell>
                    <TableCell>
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <Badge
                          variant="outline"
                          className={STATUS_MAP[quote.status].color}
                        >
                          {STATUS_MAP[quote.status].label}
                        </Badge>
                      </motion.div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{quote.date}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

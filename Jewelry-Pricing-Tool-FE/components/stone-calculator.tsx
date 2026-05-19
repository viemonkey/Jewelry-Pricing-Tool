'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  type StoneEntry,
  type StoneType,
  STONE_TYPE_LABELS,
  calculateTotalStoneCost,
  formatCurrency,
} from '@/lib/pricing'
import { Plus, Trash2, Gem, Minus } from 'lucide-react'

interface StoneCalculatorProps {
  onTotalChange: (total: number) => void
}

const parseRaw = (s: string) => parseFloat(s.replace(/[^\d.]/g, '')) || 0

export function StoneCalculator({ onTotalChange }: StoneCalculatorProps) {
  const [entries, setEntries] = useState<StoneEntry[]>([])

  // FIX: formatted unit price display
  const [unitPriceDisplay, setUnitPriceDisplay] = useState('')
  const [qty, setQty] = useState(1)
  const [stoneType, setStoneType] = useState<StoneType>('lab_diamond')
  const [size, setSize] = useState('')
  const [priceMethod, setPriceMethod] = useState<'per_piece' | 'per_carat'>('per_piece')

  useEffect(() => {
    const total = calculateTotalStoneCost(entries)
    onTotalChange(total)
  }, [entries, onTotalChange])

  const handleUnitPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setUnitPriceDisplay(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '')
  }, [])

  const stepQty = (delta: number) => setQty((q) => Math.max(1, q + delta))

  const addEntry = () => {
    const unitPrice = parseRaw(unitPriceDisplay)
    if (!size || !unitPrice) return

    const entry: StoneEntry = {
      id: Date.now().toString(),
      type: stoneType,
      quantity: qty,
      size,
      unitPrice,
      priceMethod,
    }

    setEntries((prev) => [...prev, entry])
    // reset
    setSize('')
    setUnitPriceDisplay('')
    setQty(1)
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const calculateEntryTotal = (entry: StoneEntry): number => {
    if (entry.priceMethod === 'per_piece') {
      return entry.quantity * entry.unitPrice
    }
    const caratWeight = parseFloat(entry.size) || 0
    return entry.quantity * caratWeight * entry.unitPrice
  }

  const total = calculateTotalStoneCost(entries)

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gem className="h-4 w-4 text-primary" />
          Bảng tính giá đá
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new stone row */}
        <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-6">
          {/* Loại đá */}
          <div className="sm:col-span-2">
            <Label className="text-xs">Loại đá</Label>
            <Select value={stoneType} onValueChange={(v) => setStoneType(v as StoneType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STONE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FIX: Stepper cho số lượng đá */}
          <div>
            <Label className="text-xs">Số lượng</Label>
            <div className="mt-1 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => stepQty(-1)}
                disabled={qty <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value.replace(/\D/g, '')) || 1))}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => stepQty(1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Kích thước */}
          <div>
            <Label className="text-xs">Kích thước (mm/ct)</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="VD: 3mm"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>

          {/* FIX: Đơn giá — currency formatted */}
          <div>
            <Label className="text-xs">Đơn giá (VND)</Label>
            <div className="relative mt-1">
              <Input
                inputMode="numeric"
                placeholder="VD: 500,000"
                value={unitPriceDisplay}
                onChange={handleUnitPriceChange}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
            </div>
          </div>

          <div className="flex items-end">
            <Button onClick={addEntry} size="sm" className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              Thêm
            </Button>
          </div>
        </div>

        {/* Price method */}
        <div className="flex gap-2">
          <Button
            variant={priceMethod === 'per_piece' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPriceMethod('per_piece')}
          >
            Giá theo viên
          </Button>
          <Button
            variant={priceMethod === 'per_carat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPriceMethod('per_carat')}
          >
            Giá theo carat
          </Button>
        </div>

        {/* Stone entries table */}
        {entries.length > 0 && (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại đá</TableHead>
                  <TableHead className="text-center">SL</TableHead>
                  <TableHead className="text-center">Kích thước</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {STONE_TYPE_LABELS[entry.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{entry.quantity}</TableCell>
                    <TableCell className="text-center">{entry.size}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.unitPrice)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        /{entry.priceMethod === 'per_piece' ? 'viên' : 'ct'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(calculateEntryTotal(entry))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
          <span className="font-medium">Tổng tiền đá:</span>
          <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

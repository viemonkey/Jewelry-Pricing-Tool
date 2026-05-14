'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Trash2, Gem } from 'lucide-react'

interface StoneCalculatorProps {
  onTotalChange: (total: number) => void
}

export function StoneCalculator({ onTotalChange }: StoneCalculatorProps) {
  const [entries, setEntries] = useState<StoneEntry[]>([])
  const [newEntry, setNewEntry] = useState<Partial<StoneEntry>>({
    type: 'lab_diamond',
    quantity: 1,
    size: '',
    unitPrice: 0,
    priceMethod: 'per_piece',
  })

  useEffect(() => {
    const total = calculateTotalStoneCost(entries)
    onTotalChange(total)
  }, [entries, onTotalChange])

  const addEntry = () => {
    if (!newEntry.size || !newEntry.unitPrice) return

    const entry: StoneEntry = {
      id: Date.now().toString(),
      type: newEntry.type as StoneType,
      quantity: newEntry.quantity || 1,
      size: newEntry.size,
      unitPrice: newEntry.unitPrice,
      priceMethod: newEntry.priceMethod as 'per_piece' | 'per_carat',
    }

    setEntries([...entries, entry])
    setNewEntry({
      type: 'lab_diamond',
      quantity: 1,
      size: '',
      unitPrice: 0,
      priceMethod: 'per_piece',
    })
  }

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id))
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
        {/* Add new stone entry */}
        <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <Label className="text-xs">Loại đá</Label>
            <Select
              value={newEntry.type}
              onValueChange={(v) => setNewEntry({ ...newEntry, type: v as StoneType })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STONE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Số lượng</Label>
            <Input
              type="number"
              min="1"
              className="mt-1"
              value={newEntry.quantity || ''}
              onChange={(e) => setNewEntry({ ...newEntry, quantity: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <Label className="text-xs">Kích thước (mm/ct)</Label>
            <Input
              type="text"
              className="mt-1"
              placeholder="VD: 3mm, 0.5ct"
              value={newEntry.size || ''}
              onChange={(e) => setNewEntry({ ...newEntry, size: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-xs">Đơn giá (VND)</Label>
            <Input
              type="number"
              min="0"
              className="mt-1"
              value={newEntry.unitPrice || ''}
              onChange={(e) => setNewEntry({ ...newEntry, unitPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={addEntry} size="sm" className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              Thêm
            </Button>
          </div>
        </div>

        {/* Price method selector */}
        <div className="flex gap-2">
          <Button
            variant={newEntry.priceMethod === 'per_piece' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setNewEntry({ ...newEntry, priceMethod: 'per_piece' })}
          >
            Giá theo viên
          </Button>
          <Button
            variant={newEntry.priceMethod === 'per_carat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setNewEntry({ ...newEntry, priceMethod: 'per_carat' })}
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
                    <TableCell className="text-right">
                      {formatCurrency(entry.unitPrice)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        /{entry.priceMethod === 'per_piece' ? 'viên' : 'ct'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
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
          <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

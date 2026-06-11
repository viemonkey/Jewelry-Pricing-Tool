'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calculateSilverProductPrice, formatCurrency } from '@/lib/pricing'
import { pricingConfigApi, type PricingConfig } from '@/lib/api'
import type { UserRole } from './header'
import { Calculator, ArrowRight, Info, Save, FileDown, CheckCircle2, Loader2 } from 'lucide-react'

interface SilverCalculatorProps {
  currentRole: UserRole
}

// ── Currency input hook (same pattern as gold-calculator) ────────────────────
const parseRaw = (s: string) => parseFloat(s.replace(/\D/g, '')) || 0

function useCurrencyInput() {
  const [display, setDisplay] = useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setDisplay(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '')
  }, [])

  const handleBlur = useCallback(() => {
    const n = parseRaw(display)
    setDisplay(n ? new Intl.NumberFormat('vi-VN').format(n) : '')
  }, [display])

  const rawValue = parseRaw(display)

  return { display, handleChange, handleBlur, rawValue }
}

export function SilverCalculator({ currentRole }: SilverCalculatorProps) {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  const [productName, setProductName] = useState('')
  const [calculationMode, setCalculationMode] = useState<'cost-to-sell' | 'sell-to-cost'>('cost-to-sell')
  const [isSaving, setIsSaving] = useState(false)

  // FIX: currency-formatted inputs
  const costPriceInput = useCurrencyInput()
  const sellingPriceInput = useCurrencyInput()

  const canViewCost = currentRole === 'order'

  useEffect(() => {
    pricingConfigApi.get()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false))
  }, [])

  const silverMultiplier = config?.silverMultiplier ?? 3

  const result = useMemo(() => {
    if (!config) return null
    if (calculationMode === 'cost-to-sell') {
      const cost = costPriceInput.rawValue
      if (cost > 0) return calculateSilverProductPrice(cost, silverMultiplier)
    } else {
      const sell = sellingPriceInput.rawValue
      if (sell > 0) return { costPrice: sell / silverMultiplier, sellingPrice: sell }
    }
    return null
  }, [costPriceInput.rawValue, sellingPriceInput.rawValue, calculationMode, config, silverMultiplier])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  if (configLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Đang tải cấu hình giá...
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-48 items-center justify-center text-destructive text-sm">
        Không thể tải cấu hình giá từ server. Vui lòng kiểm tra kết nối backend.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="luxury-card border-luxury hover:shadow-lg transition-shadow duration-300 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
              <Calculator className="h-4 w-4" />
            </div>
            Tính giá sản phẩm bạc
          </CardTitle>
          <CardDescription>
            Quy tắc đặc biệt: Giá bán = Giá vốn × {silverMultiplier}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Tên sản phẩm */}
          <div className="space-y-2">
            <Label htmlFor="silverProductName">Tên/Mã sản phẩm</Label>
            <Input
              id="silverProductName"
              placeholder="VD: Vòng tay bạc 925"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          {/* Calculation Mode Tabs */}
          <Tabs
            value={calculationMode}
            onValueChange={(v) => setCalculationMode(v as 'cost-to-sell' | 'sell-to-cost')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="cost-to-sell"
                disabled={!canViewCost}
              >
                Từ giá vốn
              </TabsTrigger>
              <TabsTrigger value="sell-to-cost">
                Từ giá bán
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="cost-to-sell" className="space-y-4 mt-4">
                {canViewCost ? (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Label htmlFor="costPrice">Giá vốn (VND)</Label>
                    {/* FIX: currency formatted */}
                    <div className="relative">
                      <Input
                        id="costPrice"
                        inputMode="numeric"
                        placeholder="VD: 500,000"
                        value={costPriceInput.display}
                        onChange={costPriceInput.handleChange}
                        onBlur={costPriceInput.handleBlur}
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        đ
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
                    Bạn không có quyền xem giá vốn
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sell-to-cost" className="space-y-4 mt-4">
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="sellingPrice">Giá bán (VND)</Label>
                  {/* FIX: currency formatted */}
                  <div className="relative">
                    <Input
                      id="sellingPrice"
                      inputMode="numeric"
                      placeholder="VD: 1,500,000"
                      value={sellingPriceInput.display}
                      onChange={sellingPriceInput.handleChange}
                      onBlur={sellingPriceInput.handleBlur}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      đ
                    </span>
                  </div>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                className="space-y-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent p-6 shadow-inner relative overflow-hidden flex items-center justify-center gap-6">
                  {/* Spotlight glow effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />

                  {canViewCost && (
                    <>
                      <div className="text-center relative z-10">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GIÁ VỐN</p>
                        <p className="text-lg font-semibold tabular-nums mt-1">
                          {formatCurrency(result.costPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground relative z-10">
                        <span className="text-[11px] font-bold bg-muted px-1.5 py-0.5 rounded border">×{silverMultiplier}</span>
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                    </>
                  )}
                  <div className="text-center relative z-10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">GIÁ BÁN ĐỀ XUẤT</p>
                    <motion.p
                      className="text-3xl font-serif font-bold text-primary tabular-nums tracking-wide mt-1 drop-shadow-[0_2px_10px_rgba(212,175,55,0.25)]"
                      key={result.sellingPrice}
                      initial={{ scale: 1.05, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {formatCurrency(result.sellingPrice)}
                    </motion.p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Sản phẩm bạc áp dụng hệ số ×{silverMultiplier} từ giá vốn</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2 bg-gold-gradient hover:opacity-95 shadow-md active:scale-98 transition-all hover-gold-glow" onClick={handleSave} disabled={isSaving}>
                    {isSaving
                      ? <><CheckCircle2 className="h-4 w-4" />Đã lưu!</>
                      : <><Save className="h-4 w-4" />Lưu báo giá</>
                    }
                  </Button>
                  <Button className="flex-1 gap-2" variant="outline">
                    <FileDown className="h-4 w-4" />
                    Xuất PDF
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex h-32 items-center justify-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center">
                  <Calculator className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm">Nhập giá để xem kết quả</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

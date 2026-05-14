'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  GOLD_RATIOS,
  calculateGoldProductPrice,
  formatCurrency,
  type PricingResult,
} from '@/lib/pricing'
import { StoneCalculator } from './stone-calculator'
import type { UserRole } from './header'
import { Calculator, Info, Sparkles, Eye, EyeOff, Save, FileDown, CheckCircle2 } from 'lucide-react'

interface GoldCalculatorProps {
  currentRole: UserRole
}

const inputVariants = {
  focus: { scale: 1.02, borderColor: '#D4AF37' },
}

export function GoldCalculator({ currentRole }: GoldCalculatorProps) {
  const [productName, setProductName] = useState('')
  const [karatType, setKaratType] = useState<keyof typeof GOLD_RATIOS>('18K')
  const [weight, setWeight] = useState<string>('1')
  const [goldPrice24K, setGoldPrice24K] = useState<string>('9000000')
  const [laborCost, setLaborCost] = useState<string>('500000')
  const [stoneCost, setStoneCost] = useState<number>(0)
  const [showStoneCalculator, setShowStoneCalculator] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canViewCost = currentRole === 'order' || currentRole === 'admin'

  const result: PricingResult | null = useMemo(() => {
    const weightNum = parseFloat(weight) || 0
    const goldPriceNum = parseFloat(goldPrice24K) || 0
    const laborNum = parseFloat(laborCost) || 0

    if (weightNum > 0 && goldPriceNum > 0) {
      return calculateGoldProductPrice({
        name: productName,
        karatType,
        weight: weightNum,
        goldPrice24K: goldPriceNum,
        laborCost: laborNum,
        stoneCost,
      })
    }
    return null
  }, [productName, karatType, weight, goldPrice24K, laborCost, stoneCost])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Calculator className="h-5 w-5 text-primary" />
              </motion.div>
              Tính giá sản phẩm vàng
            </CardTitle>
            <CardDescription>
              Nhập thông tin sản phẩm để tính giá tự động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Name */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="productName">Tên/Mã sản phẩm</Label>
              <motion.div whileFocus="focus" variants={inputVariants}>
                <Input
                  id="productName"
                  placeholder="VD: Nhẫn kim cương 18K"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/50"
                />
              </motion.div>
            </motion.div>

            {/* Karat Type */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label htmlFor="karatType">Tuổi vàng</Label>
              <Select value={karatType} onValueChange={(v) => setKaratType(v as keyof typeof GOLD_RATIOS)}>
                <SelectTrigger id="karatType" className="transition-all hover:border-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOLD_RATIOS).map(([key, { label, applied }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{label}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(applied * 100)}%
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tỷ lệ áp dụng đã bao gồm 5% phụ phí hao hụt chế tác
              </p>
            </motion.div>

            {/* Weight */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="weight">Trọng lượng (chỉ)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                placeholder="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                1 chỉ = 3.75g
              </p>
            </motion.div>

            {/* Gold Price 24K */}
            {canViewCost && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="goldPrice24K" className="flex items-center gap-2">
                  Giá vàng nguyên liệu 24K (VND/chỉ)
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Badge variant="secondary" className="text-xs">
                      Cập nhật hàng ngày
                    </Badge>
                  </motion.div>
                </Label>
                <Input
                  id="goldPrice24K"
                  type="number"
                  step="100000"
                  min="0"
                  placeholder="9000000"
                  value={goldPrice24K}
                  onChange={(e) => setGoldPrice24K(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/50"
                />
              </motion.div>
            )}

            {/* Labor Cost */}
            {canViewCost && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label htmlFor="laborCost">Tiền công chế tác (VND)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="10000"
                  min="0"
                  placeholder="500000"
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary/50"
                />
              </motion.div>
            )}

            {/* Stone Cost */}
            {canViewCost && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Label className="flex items-center gap-2">
                  Tiền đá
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </motion.div>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="10000"
                    min="0"
                    placeholder="0"
                    value={stoneCost || ''}
                    onChange={(e) => setStoneCost(parseFloat(e.target.value) || 0)}
                    className="flex-1 transition-all focus:ring-2 focus:ring-primary/50"
                  />
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowStoneCalculator(!showStoneCalculator)}
                      className="transition-all"
                    >
                      {showStoneCalculator ? (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Ẩn bảng tính
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Mở bảng tính đá
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Stone Calculator Panel */}
            <AnimatePresence>
              {showStoneCalculator && canViewCost && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <StoneCalculator onTotalChange={setStoneCost} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-primary/20 bg-card hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Info className="h-5 w-5 text-primary" />
              </motion.div>
              Kết quả tính giá
            </CardTitle>
            <CardDescription>
              {productName || 'Sản phẩm vàng'} - {GOLD_RATIOS[karatType].label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Cost Breakdown - Only visible to Order/Admin */}
                  {canViewCost && (
                    <>
                      <motion.div
                        className="rounded-lg bg-muted/50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                          Chi tiết giá vốn
                        </h4>
                        <div className="space-y-2">
                          {[
                            { label: `Giá vàng theo tuổi (${karatType}):`, value: result.breakdown.goldCost },
                            { label: 'Tiền công:', value: result.breakdown.laborCost },
                            { label: 'Tiền đá:', value: result.breakdown.stoneCost },
                          ].map((item, index) => (
                            <motion.div
                              key={item.label}
                              className="flex justify-between text-sm"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + index * 0.1 }}
                            >
                              <span>{item.label}</span>
                              <motion.span
                                className="font-medium"
                                key={item.value}
                                initial={{ scale: 1.1, color: '#D4AF37' }}
                                animate={{ scale: 1, color: 'inherit' }}
                                transition={{ duration: 0.3 }}
                              >
                                {formatCurrency(item.value)}
                              </motion.span>
                            </motion.div>
                          ))}
                          <Separator />
                          <motion.div
                            className="flex justify-between text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                          >
                            <span>Giá vốn (chưa VAT):</span>
                            <span className="font-medium">{formatCurrency(result.costBeforeVAT)}</span>
                          </motion.div>
                          <motion.div
                            className="flex justify-between text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                          >
                            <span>VAT (10%):</span>
                            <span className="font-medium">{formatCurrency(result.breakdown.vat)}</span>
                          </motion.div>
                          <motion.div
                            className="flex justify-between font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                          >
                            <span>Giá vốn (có VAT):</span>
                            <span className="text-primary">{formatCurrency(result.costWithVAT)}</span>
                          </motion.div>
                        </div>
                      </motion.div>

                      <motion.div
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                      >
                        <Info className="h-4 w-4" />
                        Áp dụng biên lợi nhuận: {result.profitMargin}
                      </motion.div>

                      <Separator />
                    </>
                  )}

                  {/* Suggested Price - Visible to all roles */}
                  <motion.div
                    className="rounded-lg border-2 border-primary bg-primary/5 p-6 text-center overflow-hidden relative"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    />
                    <p className="mb-1 text-sm text-muted-foreground relative z-10">GIÁ BÁN ĐỀ XUẤT</p>
                    <motion.p
                      className="text-3xl font-bold text-primary relative z-10"
                      key={result.suggestedPrice}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {formatCurrency(result.suggestedPrice)}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Badge variant="secondary" className="mt-2 relative z-10">
                        Biên lợi nhuận: {result.profitMargin}
                      </Badge>
                    </motion.div>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    className="flex gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="w-full gap-2"
                        variant="default"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        <AnimatePresence mode="wait">
                          {isSaving ? (
                            <motion.div
                              key="saving"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="save"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Save className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {isSaving ? 'Đã lưu!' : 'Lưu báo giá'}
                      </Button>
                    </motion.div>
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full gap-2" variant="outline">
                        <FileDown className="h-4 w-4" />
                        Xuất PDF
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="flex h-48 items-center justify-center text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Calculator className="mx-auto mb-3 h-12 w-12 opacity-20" />
                    </motion.div>
                    <p>Nhập thông tin sản phẩm để xem kết quả tính giá</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

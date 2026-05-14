'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { calculateSilverProductPrice, formatCurrency, SILVER_MULTIPLIER } from '@/lib/pricing'
import type { UserRole } from './header'
import { Calculator, ArrowRight, Info, Save, FileDown, CheckCircle2 } from 'lucide-react'

interface SilverCalculatorProps {
  currentRole: UserRole
}

export function SilverCalculator({ currentRole }: SilverCalculatorProps) {
  const [productName, setProductName] = useState('')
  const [costPrice, setCostPrice] = useState<string>('')
  const [sellingPrice, setSellingPrice] = useState<string>('')
  const [calculationMode, setCalculationMode] = useState<'cost-to-sell' | 'sell-to-cost'>('cost-to-sell')
  const [isSaving, setIsSaving] = useState(false)

  const canViewCost = currentRole === 'order' || currentRole === 'admin'

  const result = useMemo(() => {
    if (calculationMode === 'cost-to-sell') {
      const cost = parseFloat(costPrice) || 0
      if (cost > 0) {
        return calculateSilverProductPrice(cost)
      }
    } else {
      const sell = parseFloat(sellingPrice) || 0
      if (sell > 0) {
        return {
          costPrice: sell / SILVER_MULTIPLIER,
          sellingPrice: sell,
        }
      }
    }
    return null
  }, [costPrice, sellingPrice, calculationMode])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-silver text-foreground"
              whileHover={{ scale: 1.1, rotate: 5 }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(192, 192, 192, 0)',
                  '0 0 15px 3px rgba(192, 192, 192, 0.3)',
                  '0 0 0 0 rgba(192, 192, 192, 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Calculator className="h-4 w-4" />
            </motion.div>
            Tính giá sản phẩm bạc
          </CardTitle>
          <CardDescription>
            Quy tắc đặc biệt: Giá bán = Giá vốn x {SILVER_MULTIPLIER}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Name */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Label htmlFor="silverProductName">Tên/Mã sản phẩm</Label>
            <Input
              id="silverProductName"
              placeholder="VD: Vòng tay bạc 925"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="transition-all focus:ring-2 focus:ring-silver/50"
            />
          </motion.div>

          {/* Calculation Mode Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs
              value={calculationMode}
              onValueChange={(v) => setCalculationMode(v as 'cost-to-sell' | 'sell-to-cost')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="cost-to-sell"
                  disabled={!canViewCost}
                  className="transition-all data-[state=active]:shadow-md"
                >
                  Từ giá vốn
                </TabsTrigger>
                <TabsTrigger
                  value="sell-to-cost"
                  className="transition-all data-[state=active]:shadow-md"
                >
                  Từ giá bán
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="cost-to-sell" className="space-y-4">
                  {canViewCost ? (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label htmlFor="costPrice">Giá vốn (VND)</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        min="0"
                        placeholder="Nhập giá vốn"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        className="transition-all focus:ring-2 focus:ring-silver/50"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Bạn không có quyền xem giá vốn
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="sell-to-cost" className="space-y-4">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="sellingPrice">Giá bán (VND)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      min="0"
                      placeholder="Nhập giá bán"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-silver/50"
                    />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="flex items-center justify-center gap-4 rounded-lg bg-muted/50 p-6 overflow-hidden relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-silver/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                  />
                  {canViewCost && (
                    <>
                      <motion.div
                        className="text-center relative z-10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-xs text-muted-foreground">GIÁ VỐN</p>
                        <motion.p
                          className="text-lg font-semibold"
                          key={result.costPrice}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                        >
                          {formatCurrency(result.costPrice)}
                        </motion.p>
                      </motion.div>
                      <motion.div
                        className="flex items-center gap-2 text-muted-foreground relative z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <motion.span
                          className="text-xs font-bold"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          x{SILVER_MULTIPLIER}
                        </motion.span>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      </motion.div>
                    </>
                  )}
                  <motion.div
                    className="text-center relative z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-xs text-muted-foreground">GIÁ BÁN</p>
                    <motion.p
                      className="text-2xl font-bold text-primary"
                      key={result.sellingPrice}
                      initial={{ scale: 1.2, color: '#C0C0C0' }}
                      animate={{ scale: 1, color: '#D4AF37' }}
                      transition={{ duration: 0.5 }}
                    >
                      {formatCurrency(result.sellingPrice)}
                    </motion.p>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="flex items-center gap-2 rounded-lg bg-info/10 p-3 text-sm text-info"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Info className="h-4 w-4" />
                  </motion.div>
                  <span>Sản phẩm bạc áp dụng hệ số x{SILVER_MULTIPLIER} từ giá vốn</span>
                </motion.div>

                {/* Actions */}
                <motion.div
                  className="flex gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
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
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
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
                className="flex h-32 items-center justify-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Calculator className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  </motion.div>
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

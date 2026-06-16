'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  calculateGoldProductPrice,
  formatCurrency,
  type PricingResult,
} from '@/lib/pricing'
import { pricingConfigApi, quotesApi, BASE_URL, type PricingConfig } from '@/lib/api'
import { StoneCalculator } from './stone-calculator'
import type { UserRole } from './header'
import type { Quote } from '@/lib/types'
import { useNotifications } from '@/lib/notifications'
import { QuickQuoteHistoryList } from './quick-quote-history'
import {
  Calculator, Info, Sparkles, Eye, EyeOff,
  Save, FileDown, CheckCircle2, Loader2, ImagePlus,
  Gem, Watch, Send, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'NHAN', label: 'Nhẫn', icon: Gem },
  { value: 'DAY_CHUYEN', label: 'Dây chuyền', icon: Sparkles },
  { value: 'VONG_LAC_TAY', label: 'Vòng / Lắc tay', icon: Watch },
  { value: 'LAC_CHAN', label: 'Lắc chân', icon: Sparkles },
]

const GENDER_OPTIONS = [
  { value: 'men', label: 'Nam' },
  { value: 'women', label: 'Nữ' },
  { value: 'unisex', label: 'Unisex' },
]

interface GoldCalculatorProps {
  currentRole: UserRole
  currentUserName?: string
}

type QuickMaterial = 'gold' | 'silver'

// ── Currency helpers ─────────────────────────────────────────────────────────
/** Convert formatted display string → raw number */
const parseRaw = (s: string) => parseFloat(s.replace(/\D/g, '')) || 0

/** Format number with thousand separators for display */
const fmtDisplay = (n: number | string) => {
  const num = typeof n === 'string' ? parseRaw(n) : n
  if (!num) return ''
  return new Intl.NumberFormat('vi-VN').format(num)
}

/** useCurrencyInput — keeps a display string with separators and raw number in sync */
function useCurrencyInput(initial = '') {
  const [display, setDisplay] = useState(initial)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setDisplay(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '')
  }, [])

  const handleBlur = useCallback(() => {
    const n = parseRaw(display)
    setDisplay(n ? new Intl.NumberFormat('vi-VN').format(n) : '')
  }, [display])

  const rawValue = parseRaw(display)

  return { display, setDisplay, handleChange, handleBlur, rawValue }
}

const roundToThousand = (value: number) => Math.round(value / 1000) * 1000

export function GoldCalculator({ currentRole, currentUserName }: GoldCalculatorProps) {
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  const [productImage, setProductImage] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [material, setMaterial] = useState<QuickMaterial>('gold')
  const [karatType, setKaratType] = useState<string>('GOLD_18K')
  const [weight, setWeight] = useState<string>('')
  const [stoneCost, setStoneCost] = useState<number>(0)
  const [showStoneCalculator, setShowStoneCalculator] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [hasCalculated, setHasCalculated] = useState(false)
  const [productName, setProductName] = useState<string>('')
  const [productCategory, setProductCategory] = useState<string>('NHAN')
  const [gender, setGender] = useState<string>('unisex')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const currentCategoryLabel = CATEGORIES.find(c => c.value === productCategory)?.label ?? 'Sản phẩm'
  const currentGenderLabel = GENDER_OPTIONS.find(g => g.value === gender)?.label ?? 'Unisex'

  // FIX: currency-formatted inputs for gold price and labor cost
  const goldPriceInput = useCurrencyInput()
  const laborCostInput = useCurrencyInput()

  const canViewCost = currentRole === 'order'

  useEffect(() => {
    pricingConfigApi.get()
      .then((cfg) => {
        setConfig(cfg)
        if (cfg?.goldPrice24K) {
          goldPriceInput.setDisplay(new Intl.NumberFormat('vi-VN').format(cfg.goldPrice24K))
        }
      })
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (productImage) URL.revokeObjectURL(productImage)
    }
  }, [productImage])

  const goldRatiosMap = useMemo(() => {
    if (!config) return {}
    return Object.fromEntries(
      config.goldRatios.map((r) => [r.key, { standard: r.standard, applied: r.applied, label: r.label }])
    )
  }, [config])

  const calculatedResult: PricingResult | null = useMemo(() => {
    if (!config || material !== 'gold') return null
    const weightNum = parseFloat(weight) || 0
    const goldPriceNum = goldPriceInput.rawValue || config.goldPrice24K
    const laborNum = laborCostInput.rawValue || 0

    if (weightNum > 0 && goldPriceNum > 0) {
      return calculateGoldProductPrice({
        name: productName,
        karatType,
        weight: weightNum,
        goldPrice24K: goldPriceNum,
        laborCost: laborNum,
        stoneCost,
        goldRatios: goldRatiosMap,
        profitMargins: config.profitMargins,
      })
    }
    return null
  }, [productName, material, karatType, weight, goldPriceInput.rawValue, laborCostInput.rawValue, stoneCost, config, goldRatiosMap])

  const result: PricingResult | null = hasCalculated ? calculatedResult : null
  const canCalculate = material === 'gold' && Boolean(calculatedResult)
  const saleBaseEstimate = result ? roundToThousand(result.suggestedPrice) : 0
  const saleMaxEstimate = saleBaseEstimate ? saleBaseEstimate + 5000000 : 0

  const handleSave = () => {
    if (!result) return
    setIsSaving(true)
    try {
      const history = JSON.parse(localStorage.getItem('pricing_history') || '[]')
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleString('vi-VN'),
        productName: productName.trim()
          ? `${productName.trim()} (${currentCategoryLabel} - ${currentGenderLabel})`
          : `${currentCategoryLabel} (${currentGenderLabel})`,
        karatType,
        weight,
        goldPrice24K: goldPriceInput.rawValue,
        laborCost: laborCostInput.rawValue,
        stoneCost,
        costBeforeVAT: result.costBeforeVAT,
        costWithVAT: result.costWithVAT,
        suggestedPrice: result.suggestedPrice,
        profitMargin: result.profitMargin,
      }
      history.unshift(entry)
      localStorage.setItem('pricing_history', JSON.stringify(history.slice(0, 50)))
    } catch {}
    setTimeout(() => setIsSaving(false), 1500)
  }

  const { addNotification } = useNotifications()

  const handleSendApproval = async () => {
    if (!result) return
    if (!productName.trim()) {
      addNotification({
        type: 'error',
        title: 'Thiếu tên sản phẩm',
        message: 'Vui lòng nhập tên sản phẩm trước khi gửi yêu cầu duyệt.',
      })
      return
    }

    setIsSendingRequest(true)
    try {
      const weightNum = parseFloat(weight) || 0
      const goldPriceNum = goldPriceInput.rawValue || config?.goldPrice24K || 0
      const laborNum = laborCostInput.rawValue || 0

      const categoryMap: Record<string, string> = {
        'NHAN': 'RING',
        'DAY_CHUYEN': 'NECKLACE',
        'VONG_LAC_TAY': 'BRACELET',
        'LAC_CHAN': 'ANKLET'
      }

      await quotesApi.create({
        productName: productName.trim(),
        productType: categoryMap[productCategory] as any,
        materialType: karatType as any,
        productDescription: `Phân loại: ${currentCategoryLabel} (${currentGenderLabel}) · Vàng ${currentKaratLabel}`,
        notes: `Yêu cầu tính giá nhanh. Trọng lượng: ${weight} chỉ.`,
        images: imageFile ? [imageFile] : [],
        requestedBy: currentUserName || 'Sale',
        isQuickQuote: true,
        gender: gender,
        options: [
          {
            materialType: karatType as any,
            weightChi: weightNum,
            laborCost: laborNum,
            goldPrice24K: goldPriceNum,
            stoneCost: stoneCost,
            sellingPrice: result.suggestedPrice,
            costPrice: result.costWithVAT,
          }
        ]
      })

      addNotification({
        type: 'success',
        title: 'Gửi yêu cầu thành công',
        message: `Yêu cầu duyệt giá nhanh cho "${productName.trim()}" đã được gửi tới Admin.`,
      })
      setRequestSent(true)
      setRefreshTrigger(prev => prev + 1)
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Gửi yêu cầu thất bại',
        message: err.message || 'Có lỗi xảy ra khi gửi yêu cầu.',
      })
    } finally {
      setIsSendingRequest(false)
    }
  }

  const onLoadQuote = (quote: Quote) => {
    setProductName(quote.productName)
    setWeight(String(quote.weightChi || ''))
    setKaratType(quote.materialType)
    setGender(quote.gender || 'unisex')
    
    const reverseCategoryMap: Record<string, string> = {
      'RING': 'NHAN',
      'NECKLACE': 'DAY_CHUYEN',
      'BRACELET': 'VONG_LAC_TAY',
      'ANKLET': 'LAC_CHAN'
    }
    if (quote.productType && reverseCategoryMap[quote.productType]) {
      setProductCategory(reverseCategoryMap[quote.productType])
    }
    
    const option = quote.options?.[0]
    if (option) {
      setStoneCost(option.stoneCost || 0)
      if (option.goldPrice24K) {
        goldPriceInput.setDisplay(new Intl.NumberFormat('vi-VN').format(option.goldPrice24K))
      }
      if (option.laborCost) {
        laborCostInput.setDisplay(new Intl.NumberFormat('vi-VN').format(option.laborCost))
      }
    }

    if (quote.images && quote.images.length > 0) {
      setProductImage(`${BASE_URL}${quote.images[0]}`)
      setImageFile(null)
    } else {
      setProductImage('')
      setImageFile(null)
    }
    
    setHasCalculated(false)
    setRequestSent(false)
    
    addNotification({
      type: 'info',
      title: 'Đã nạp dữ liệu',
      message: `Đã nạp yêu cầu "${quote.productName}" vào máy tính. Bạn có thể sửa và gửi duyệt lại.`,
    })
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

  const currentKaratLabel = material === 'gold' ? (goldRatiosMap[karatType]?.label ?? karatType) : 'Bạc'
  const materialLabel = material === 'gold' ? 'Sản phẩm vàng' : 'Sản phẩm bạc'

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Input Form ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="luxury-card border-luxury hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Tính giá nhanh sản phẩm
            </CardTitle>
            <CardDescription>Nhập thông tin cơ bản để tính nhanh giá tham khảo cho khách</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-2">
              <Label htmlFor="productImage">Hình ảnh sản phẩm</Label>
              <label
                htmlFor="productImage"
                className="flex min-h-28 cursor-pointer items-center gap-4 rounded-lg border border-dashed border-primary/25 bg-muted/20 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {productImage ? (
                  <img
                    src={productImage}
                    alt="Hình ảnh sản phẩm"
                    className="h-20 w-20 rounded-md object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
                    <ImagePlus className="h-7 w-7" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {productImage ? 'Đổi hình ảnh' : 'Tải hình ảnh lên'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dùng để Sale đối chiếu mẫu khi tư vấn nhanh
                  </p>
                </div>
              </label>
              <Input
                id="productImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setImageFile(file)
                  if (productImage) URL.revokeObjectURL(productImage)
                  setProductImage(URL.createObjectURL(file))
                }}
              />
            </div>

            {/* Tên sản phẩm */}
            <div className="space-y-2">
              <Label htmlFor="productName">Tên sản phẩm</Label>
              <Input
                id="productName"
                placeholder="Nhập tên sản phẩm (VD: Nhẫn cưới hoa mai)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            {/* Phân loại sản phẩm */}
            <div className="space-y-2">
              <Label>Phân loại sản phẩm</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = productCategory === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setProductCategory(cat.value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                          : "border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isSelected ? "text-primary animate-pulse" : "text-muted-foreground")} />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Đối tượng sử dụng */}
            <div className="space-y-2">
              <Label>Đối tượng sử dụng</Label>
              <div className="flex rounded-lg bg-muted/50 p-1">
                {GENDER_OPTIONS.map((opt) => {
                  const isSelected = gender === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-center text-xs font-medium transition-all duration-200",
                        isSelected
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="material">Chất liệu</Label>
              <Select
                value={material}
                onValueChange={(value) => {
                  setMaterial(value as QuickMaterial)
                  setHasCalculated(false)
                }}
              >
                <SelectTrigger id="material">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Vàng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tuổi vàng */}
            {material === 'gold' && (
              <div className="space-y-2">
                <Label htmlFor="karatType">Tuổi vàng</Label>
                <Select
                  value={karatType}
                  onValueChange={(value) => {
                    setKaratType(value)
                    setHasCalculated(false)
                  }}
                >
                  <SelectTrigger id="karatType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.goldRatios.map(({ key, label, applied }) => (
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
                  Tỷ lệ áp dụng đã bao gồm phụ phí hao hụt chế tác
                </p>
              </div>
            )}

            {/* Trọng lượng */}
            {material === 'gold' ? (
              <div className="space-y-2">
                <Label htmlFor="weight">Trọng lượng (chỉ)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value)
                    setHasCalculated(false)
                  }}
                />
                <p className="text-xs text-muted-foreground">1 chỉ = 3.75g</p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                Sản phẩm bạc cần Order báo giá theo giá vốn thực tế. Sale chưa có dữ liệu giá vốn bạc để tính nhanh tại màn này.
              </div>
            )}

            <Button
              type="button"
              className="w-full gap-2 bg-gold-gradient hover:opacity-95 shadow-md"
              disabled={!canCalculate}
              onClick={() => setHasCalculated(true)}
            >
              <Calculator className="h-4 w-4" />
              Tính giá
            </Button>

            {/* Giá vàng 24K — FIX: currency formatted input */}
            {canViewCost && (
              <div className="space-y-2">
                <Label htmlFor="goldPrice24K" className="flex items-center gap-2">
                  Giá vàng nguyên liệu 24K (VND/chỉ)
                  <Badge variant="secondary" className="text-xs">Cập nhật hàng ngày</Badge>
                </Label>
                <div className="relative">
                  <Input
                    id="goldPrice24K"
                    inputMode="numeric"
                    placeholder="VD: 8,500,000"
                    value={goldPriceInput.display}
                    onChange={goldPriceInput.handleChange}
                    onBlur={goldPriceInput.handleBlur}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    đ
                  </span>
                </div>
              </div>
            )}

            {/* Tiền công — FIX: currency formatted */}
            {canViewCost && (
              <div className="space-y-2">
                <Label htmlFor="laborCost">Tiền công chế tác (VND)</Label>
                <div className="relative">
                  <Input
                    id="laborCost"
                    inputMode="numeric"
                    placeholder="VD: 500,000"
                    value={laborCostInput.display}
                    onChange={laborCostInput.handleChange}
                    onBlur={laborCostInput.handleBlur}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    đ
                  </span>
                </div>
              </div>
            )}

            {/* Tiền đá */}
            {canViewCost && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Tiền đá
                  <Sparkles className="h-4 w-4 text-primary" />
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      inputMode="numeric"
                      placeholder="0"
                      value={stoneCost ? new Intl.NumberFormat('vi-VN').format(stoneCost) : ''}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value.replace(/\D/g, '')) || 0
                        setStoneCost(raw)
                      }}
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      đ
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowStoneCalculator(!showStoneCalculator)}
                  >
                    {showStoneCalculator
                      ? <><EyeOff className="mr-2 h-4 w-4" />Ẩn bảng tính</>
                      : <><Eye className="mr-2 h-4 w-4" />Mở bảng tính đá</>
                    }
                  </Button>
                </div>
              </div>
            )}

            {/* Stone Calculator panel */}
            <AnimatePresence>
              {showStoneCalculator && canViewCost && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <StoneCalculator onTotalChange={setStoneCost} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Results ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="luxury-card border-primary/30 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {productName.trim() || 'Kết quả tính giá'}
            </CardTitle>
            <CardDescription>
              Phân loại: {currentCategoryLabel} ({currentGenderLabel}) · Vàng {currentKaratLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  className="space-y-5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Cost Breakdown — Order/Admin only */}
                  {canViewCost && (
                    <>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                          Chi tiết giá vốn
                        </h4>
                        <div className="space-y-2">
                          {[
                            { label: `Giá vàng theo tuổi (${karatType}):`, value: result.breakdown.goldCost },
                            { label: 'Tiền công:',                         value: result.breakdown.laborCost },
                            { label: 'Tiền đá:',                           value: result.breakdown.stoneCost },
                          ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium tabular-nums">
                                {formatCurrency(item.value)}
                              </span>
                            </div>
                          ))}
                          <Separator />
                          <div className="flex justify-between text-sm">
                            <span>Giá vốn (chưa VAT):</span>
                            <span className="font-medium tabular-nums">{formatCurrency(result.costBeforeVAT)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>VAT (10%):</span>
                            <span className="font-medium tabular-nums">{formatCurrency(result.breakdown.vat)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Giá vốn (có VAT):</span>
                            <span className="text-primary tabular-nums">{formatCurrency(result.costWithVAT)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0" />
                        Áp dụng biên lợi nhuận: {result.profitMargin}
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Suggested Price */}
                  <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-amber-500/5 to-transparent p-6 text-center shadow-inner relative overflow-hidden group">
                    {/* Spotlight glow effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.15),transparent_70%)] pointer-events-none" />

                    {canViewCost ? (
                      <>
                        <p className="mb-1 text-[11px] font-bold text-primary uppercase tracking-widest leading-none drop-shadow-xs">GIÁ BÁN ĐỀ XUẤT</p>
                        <motion.p
                          className="text-4xl font-serif font-bold text-primary tabular-nums tracking-wide my-2 drop-shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
                          key={result.suggestedPrice}
                          initial={{ scale: 1.05, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {formatCurrency(result.suggestedPrice)}
                        </motion.p>
                      </>
                    ) : (
                      <>
                        <p className="mb-1 text-[11px] font-bold text-primary uppercase tracking-widest leading-none drop-shadow-xs">
                          TỪ KHOẢNG
                        </p>
                        <motion.p
                          className="text-2xl font-serif font-bold text-primary tabular-nums tracking-wide my-2 drop-shadow-[0_2px_12px_rgba(212,175,55,0.25)] sm:text-3xl"
                          key={`${saleBaseEstimate}-${saleMaxEstimate}`}
                          initial={{ scale: 1.05, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {saleBaseEstimate ? `${formatCurrency(saleBaseEstimate)} - ${formatCurrency(saleMaxEstimate)}` : '—'}
                        </motion.p>
                      </>
                    )}
                    {canViewCost && (
                      <Badge variant="outline" className="mt-1 bg-primary/10 border-primary/20 text-primary">
                        Biên lợi nhuận: {result.profitMargin}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  {canViewCost ? (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2 bg-gold-gradient hover:opacity-95 shadow-md active:scale-98 transition-all hover-gold-glow"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
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
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        className="w-full gap-2 bg-gold-gradient hover:opacity-95 shadow-md active:scale-98 transition-all hover-gold-glow"
                        onClick={handleSendApproval}
                        disabled={isSendingRequest || requestSent}
                      >
                        {isSendingRequest ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang gửi yêu cầu...
                          </>
                        ) : requestSent ? (
                          <>
                            <Check className="h-4 w-4" />
                            Đã gửi duyệt thành công!
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Gửi yêu cầu duyệt
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
                    <Calculator className="mx-auto mb-3 h-12 w-12 opacity-20" />
                    <p className="text-sm">
                      {material === 'silver'
                        ? 'Sản phẩm bạc cần Order báo giá theo giá vốn thực tế'
                        : 'Nhập thông tin sản phẩm rồi bấm Tính giá để xem kết quả'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>

    {/* Lịch sử yêu cầu duyệt giá nhanh */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <QuickQuoteHistoryList
        currentRole={currentRole}
        currentUserName={currentUserName}
        refreshTrigger={refreshTrigger}
        onLoadQuote={onLoadQuote}
      />
    </motion.div>
  </div>
  )
}

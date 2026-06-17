'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  pricingConfigApi,
} from '@/lib/api'
import { formatCurrency } from '@/lib/pricing'
import { useNotifications } from '@/lib/notifications'
import {
  Save,
  Loader2,
  Coins,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react'

export function PricingSettings() {
  const [loading, setLoading] = useState(true)
  const [savingGold, setSavingGold] = useState(false)
  const [savingPlatinum, setSavingPlatinum] = useState(false)
  
  const [goldPriceDisplay, setGoldPriceDisplay] = useState('')
  const [goldPriceRaw, setGoldPriceRaw] = useState(0)

  const [platinumPriceDisplay, setPlatinumPriceDisplay] = useState('')
  const [platinumPriceRaw, setPlatinumPriceRaw] = useState(0)

  const { addNotification } = useNotifications()

  // Load configuration from API
  const fetchConfig = async () => {
    setLoading(true)
    try {
      const data = await pricingConfigApi.get()
      if (data) {
        setGoldPriceRaw(data.goldPrice24K)
        setGoldPriceDisplay(new Intl.NumberFormat('vi-VN').format(data.goldPrice24K))
        setPlatinumPriceRaw(data.platinumPrice || 0)
        setPlatinumPriceDisplay(data.platinumPrice ? new Intl.NumberFormat('vi-VN').format(data.platinumPrice) : '')
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Lỗi tải cấu hình',
        message: err.message || 'Không thể lấy cấu hình giá từ máy chủ.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  // Format gold price display as user types
  const handleGoldPriceChange = (value: string) => {
    const raw = parseFloat(value.replace(/\D/g, '')) || 0
    setGoldPriceRaw(raw)
    setGoldPriceDisplay(raw ? new Intl.NumberFormat('vi-VN').format(raw) : '')
  }

  // Format platinum price display as user types
  const handlePlatinumPriceChange = (value: string) => {
    const raw = parseFloat(value.replace(/\D/g, '')) || 0
    setPlatinumPriceRaw(raw)
    setPlatinumPriceDisplay(raw ? new Intl.NumberFormat('vi-VN').format(raw) : '')
  }

  // Save gold price changes
  const handleSaveGold = async () => {
    if (goldPriceRaw <= 0) {
      addNotification({
        type: 'error',
        title: 'Lỗi dữ liệu',
        message: 'Giá vàng 24K phải lớn hơn 0.',
      })
      return
    }

    setSavingGold(true)
    try {
      const updated = await pricingConfigApi.update({
        goldPrice24K: goldPriceRaw,
      })
      
      setGoldPriceRaw(updated.goldPrice24K)
      setGoldPriceDisplay(new Intl.NumberFormat('vi-VN').format(updated.goldPrice24K))
      
      addNotification({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Giá vàng 24K đã được cập nhật thành ${formatCurrency(updated.goldPrice24K)}/chỉ. Tất cả yêu cầu báo giá đã được tính toán lại.`,
      })
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể lưu giá vàng mới.',
      })
    } finally {
      setSavingGold(false)
    }
  }

  // Save platinum price changes
  const handleSavePlatinum = async () => {
    if (platinumPriceRaw <= 0) {
      addNotification({
        type: 'error',
        title: 'Lỗi dữ liệu',
        message: 'Giá bạch kim phải lớn hơn 0.',
      })
      return
    }

    setSavingPlatinum(true)
    try {
      const updated = await pricingConfigApi.update({
        platinumPrice: platinumPriceRaw,
      })
      
      setPlatinumPriceRaw(updated.platinumPrice)
      setPlatinumPriceDisplay(new Intl.NumberFormat('vi-VN').format(updated.platinumPrice))
      
      addNotification({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Giá bạch kim đã được cập nhật thành ${formatCurrency(updated.platinumPrice)}/chỉ. Tất cả yêu cầu báo giá bạch kim đã được tính toán lại.`,
      })
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể lưu giá bạch kim mới.',
      })
    } finally {
      setSavingPlatinum(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Đang tải thông tin giá nguyên liệu...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
          Cấu hình giá nguyên liệu hàng ngày
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
          Cập nhật giá vàng 24K và giá bạch kim nguyên liệu áp dụng cho toàn hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card giá vàng */}
        <motion.div
          className="h-full flex flex-col"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="luxury-card border-luxury relative overflow-hidden shimmer-gold shadow-md min-h-[520px] flex flex-col flex-1 p-4">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <Coins className="h-16 w-16 text-primary" />
            </div>
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base font-serif font-bold text-foreground">
                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
                Giá Vàng 24K Hôm Nay
              </CardTitle>
              <CardDescription className="text-xs">Giá vàng nguyên liệu dùng làm gốc định giá</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="goldPrice24K" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Giá vàng nguyên liệu (VND / Chỉ)
                  </Label>
                  <div className="relative">
                    <Input
                      id="goldPrice24K"
                      value={goldPriceDisplay}
                      inputMode="numeric"
                      onChange={(e) => handleGoldPriceChange(e.target.value)}
                      placeholder="9,000,000"
                      className="pr-20 text-xl font-semibold tabular-nums text-primary border-primary/20 focus-visible:ring-primary h-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      VND / chỉ
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Đơn giá theo chỉ:</span>
                    <span className="font-semibold text-primary">
                      {goldPriceRaw > 0 ? `${formatCurrency(goldPriceRaw)} / chỉ` : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn giá theo gram (chia 3.75):</span>
                    <span className="font-medium text-amber-700 dark:text-amber-500">
                      {goldPriceRaw > 0 ? `${formatCurrency(Math.round(goldPriceRaw / 3.75))} / gram` : 'Chưa cấu hình'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed bg-amber-500/5 p-4 rounded-lg border border-amber-500/10">
                  <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    <b>Lưu ý:</b> Khi thay đổi giá vàng 24K nguyên liệu, toàn bộ các yêu cầu báo giá vàng hiện có trong cơ sở dữ liệu sẽ tự động được hệ thống tính toán lại giá vốn và giá bán đề xuất.
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSaveGold}
                disabled={savingGold}
                className="w-full gap-2 bg-gold-gradient hover:opacity-95 shadow-md active:scale-98 transition-all hover-gold-glow h-14 text-primary-foreground font-semibold shrink-0"
              >
                {savingGold ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Cập nhật giá vàng
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card giá bạch kim */}
        <motion.div
          className="h-full flex flex-col"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="luxury-card border-luxury relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 shadow-md min-h-[520px] flex flex-col flex-1 p-4">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <Layers className="h-16 w-16 text-slate-500" />
            </div>
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-base font-serif font-bold text-foreground">
                <Layers className="h-4.5 w-4.5 text-slate-500 animate-pulse" />
                Giá Bạch Kim Hôm Nay
              </CardTitle>
              <CardDescription className="text-xs">Giá bạch kim nguyên liệu dùng làm gốc định giá (gồm công)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="platinumPrice" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Giá bạch kim nguyên liệu (VND / Chỉ)
                  </Label>
                  <div className="relative">
                    <Input
                      id="platinumPrice"
                      value={platinumPriceDisplay}
                      inputMode="numeric"
                      onChange={(e) => handlePlatinumPriceChange(e.target.value)}
                      placeholder="7,500,000"
                      className="pr-20 text-xl font-semibold tabular-nums text-slate-700 dark:text-slate-300 border-slate-200 focus-visible:ring-slate-400 h-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      VND / chỉ
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-500/5 border border-slate-500/10 p-4 text-xs space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Đơn giá theo chỉ:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {platinumPriceRaw > 0 ? `${formatCurrency(platinumPriceRaw)} / chỉ` : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn giá theo gram (chia 3.75):</span>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      {platinumPriceRaw > 0 ? `${formatCurrency(Math.round(platinumPriceRaw / 3.75))} / gram` : 'Chưa cấu hình'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed bg-slate-500/5 p-4 rounded-lg border border-slate-500/10">
                  <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                  <span>
                    <b>Lưu ý:</b> Khi thay đổi giá bạch kim, toàn bộ các yêu cầu báo giá bạch kim đang xử lý trong hệ thống sẽ tự động được tính toán lại giá vốn và giá bán đề xuất.
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSavePlatinum}
                disabled={savingPlatinum}
                className="w-full gap-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-md active:scale-98 transition-all h-14 text-white font-semibold shrink-0"
              >
                {savingPlatinum ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Cập nhật giá bạch kim
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

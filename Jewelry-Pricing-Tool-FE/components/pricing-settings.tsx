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
} from 'lucide-react'

export function PricingSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [goldPriceDisplay, setGoldPriceDisplay] = useState('')
  const [goldPriceRaw, setGoldPriceRaw] = useState(0)

  const { addNotification } = useNotifications()

  // Load configuration from API
  const fetchConfig = async () => {
    setLoading(true)
    try {
      const data = await pricingConfigApi.get()
      if (data) {
        setGoldPriceRaw(data.goldPrice24K)
        setGoldPriceDisplay(new Intl.NumberFormat('vi-VN').format(data.goldPrice24K))
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Lỗi tải giá vàng',
        message: err.message || 'Không thể lấy cấu hình giá vàng từ máy chủ.',
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

  // Save gold price changes
  const handleSave = async () => {
    if (goldPriceRaw <= 0) {
      addNotification({
        type: 'error',
        title: 'Lỗi dữ liệu',
        message: 'Giá vàng 24K phải lớn hơn 0.',
      })
      return
    }

    setSaving(true)
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
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Đang tải thông tin giá vàng...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
          Cập nhật giá vàng
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
          Cập nhật giá vàng 24K nguyên liệu áp dụng cho toàn hệ thống
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="luxury-card border-luxury relative overflow-hidden shimmer-gold shadow-md">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <Coins className="h-16 w-16 text-primary" />
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-serif font-bold text-foreground">
              <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
              Giá Vàng 24K Hôm Nay
            </CardTitle>
            <CardDescription className="text-xs">Giá vàng nguyên liệu dùng làm gốc định giá</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
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
                  className="pr-16 text-xl font-semibold tabular-nums text-primary border-primary/20 focus-visible:ring-primary h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  VND / chỉ
                </span>
              </div>
            </div>

            {goldPriceRaw > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Đơn giá theo chỉ:</span>
                  <span className="font-semibold text-primary">{formatCurrency(goldPriceRaw)} / chỉ</span>
                </div>
                <div className="flex justify-between">
                  <span>Đơn giá theo gram (chia 3.75):</span>
                  <span className="font-medium">{formatCurrency(Math.round(goldPriceRaw / 3.75))} / gram</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
              <span>
                <b>Lưu ý:</b> Khi thay đổi giá vàng 24K nguyên liệu, toàn bộ các yêu cầu báo giá hiện có trong cơ sở dữ liệu sẽ tự động được hệ thống tính toán lại giá vốn và giá bán đề xuất.
              </span>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2 bg-gold-gradient hover:opacity-95 shadow-md active:scale-98 transition-all hover-gold-glow h-11 text-primary-foreground font-semibold"
            >
              {saving ? (
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
    </div>
  )
}

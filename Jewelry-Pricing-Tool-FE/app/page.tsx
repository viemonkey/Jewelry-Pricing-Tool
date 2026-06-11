'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header, type UserRole } from '@/components/header'
import { cn } from '@/lib/utils'
import { GoldCalculator } from '@/components/gold-calculator'
import { StatsCards } from '@/components/stats-cards'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber } from '@/lib/pricing'
import { authApi, pricingConfigApi, type GoldRatioConfig } from '@/lib/api'
import type { AuthUser } from '@/lib/types'
import { useSseNotifications } from '@/lib/use-sse-notifications'
import { useNotifications } from '@/lib/notifications'
import { LayoutDashboard, Calculator, Settings, Sparkles, TrendingUp, ClipboardList, Save, Loader2, BarChart3 } from 'lucide-react'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { QuoteListPricer } from '@/components/quote-list-pricer'
import { SaleDashboard } from '@/components/sale-dashboard'
import { BusinessAnalytics } from '@/components/business-analytics'

const tabContentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  }),
}

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [goldPrice24K, setGoldPrice24K] = useState<string>('9000000')
  const [goldPriceInputDisplay, setGoldPriceInputDisplay] = useState<string>('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [latestQuote, setLatestQuote] = useState<any>(null)
  const [goldRatios, setGoldRatios] = useState<GoldRatioConfig[]>([])
  const [pricingConfig, setPricingConfig] = useState<any>(null)
  const [isUpdatingGoldPrice, setIsUpdatingGoldPrice] = useState(false)

  const { addNotification } = useNotifications()

  useEffect(() => {
    authApi.me()
      .then((res) => setAuthUser(res.user))
      .catch(() => setAuthUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    pricingConfigApi.get().then((config) => {
      if (config) {
        setPricingConfig(config)
        if (config.goldRatios) setGoldRatios(config.goldRatios)
        if (config.goldPrice24K) {
          setGoldPrice24K(String(config.goldPrice24K))
          setGoldPriceInputDisplay(new Intl.NumberFormat('vi-VN').format(config.goldPrice24K))
        }
      }
    }).catch(() => {})
  }, [])

  const handleSaveGoldPrice = async (priceStr: string) => {
    const priceNum = parseFloat(priceStr.replace(/\D/g, '')) || 0
    if (priceNum <= 0) {
      addNotification({
        type: 'error',
        title: 'Lỗi nhập liệu',
        message: 'Giá vàng phải lớn hơn 0.',
      })
      return
    }
    setIsUpdatingGoldPrice(true)
    try {
      const updatedConfig = await pricingConfigApi.update({ goldPrice24K: priceNum })
      setGoldPrice24K(String(updatedConfig.goldPrice24K))
      setPricingConfig(updatedConfig)
      setGoldPriceInputDisplay(new Intl.NumberFormat('vi-VN').format(updatedConfig.goldPrice24K))
      addNotification({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Giá vàng 24K hôm nay đã được cập nhật thành ${formatCurrency(priceNum)}/chỉ.`,
      })
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể lưu giá vàng mới.',
      })
    } finally {
      setIsUpdatingGoldPrice(false)
    }
  }

  // ── SSE: nhận thông báo real-time từ backend ──
  const currentRole: UserRole = authUser?.role ?? 'order'

  useSseNotifications(currentRole, (event) => {
    // Map type sang notif severity
    const typeMap: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
      QUOTE_COMPLETED: 'success',
      QUOTE_CONFIRMED: 'success',
      QUOTE_CANCELLED: 'warning',
      QUOTE_REJECTED:  'warning',
    }
    addNotification({
      type: typeMap[event.type] ?? 'info',
      title: event.title,
      message: event.message,
    })
  })

  const handleLogout = async () => {
    await authApi.logout().catch(() => {})
    setAuthUser(null)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </div>
    )
  }

  if (!authUser) {
    return <AuthScreen onAuthenticated={setAuthUser} />
  }

  const canViewSettings = currentRole === 'order'
  const canViewCalculator = currentRole === 'sale'
  const currentUserName = authUser.fullName

  return (
    <div className="flex min-h-screen bg-background tactile-noise">
      {/* Sidebar trái */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 flex flex-col justify-between h-screen sticky top-0 z-30 shadow-lg">
        <div className="flex flex-col">
          {/* Logo Area */}
          <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-md select-none shrink-0">
              <span className="text-sm font-bold tracking-wider font-serif">JQ</span>
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-sidebar-foreground leading-none">Báo giá Trang sức</h2>
              <p className="text-[9px] font-bold text-sidebar-primary uppercase tracking-widest mt-1">Quản lý Cao cấp</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 flex-1">
            {[
              { value: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển', show: true },
              { value: 'quotes', icon: ClipboardList, label: 'Danh sách báo giá', show: true },
              { value: 'analytics', icon: BarChart3, label: 'Phân tích kinh doanh', show: currentRole === 'order' },
              { value: 'calculator', icon: Calculator, label: 'Máy tính giá', show: canViewCalculator },
              { value: 'settings', icon: Settings, label: 'Cấu hình & Cài đặt', show: canViewSettings },
            ].filter(item => item.show).map((item) => {
              const isActive = activeTab === item.value
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  onClick={() => setActiveTab(item.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-semibold'
                      : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
      </aside>

      {/* Vùng nội dung chính bên phải */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar thay thế Header cũ */}
        <Header 
          currentRole={currentRole} 
          currentUserName={currentUserName}
          onLogout={handleLogout}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Tabs value={activeTab} className="space-y-6">
            
            {/* Dashboard Tab */}
            <AnimatePresence mode="wait">
              <TabsContent value="dashboard" className="space-y-6 mt-0">
                <motion.div
                  key="dashboard"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  {currentRole === 'sale' ? (
                    <SaleDashboard
                      currentUserName={currentUserName}
                      search={search}
                      onCreateSuccess={(q) => { setLatestQuote(q); setActiveTab('quotes') }}
                      onViewAll={() => setActiveTab('quotes')}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
                          Bảng điều khiển quản trị
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
                          Giám sát thống kê kinh doanh và quy trình báo giá của tiệm
                        </p>
                      </div>

                      {/* Gold Price Quick Update Widget for Manager */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 }}
                      >
                        <Card className="border-primary/20 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent relative overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_-20%,rgba(212,175,55,0.1),transparent_60%)] pointer-events-none" />
                          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg text-primary-foreground">
                                <TrendingUp className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-serif text-lg font-semibold text-foreground tracking-wide flex items-center gap-2">
                                  Giá vàng 24K nguyên liệu hôm nay
                                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] uppercase font-mono tracking-widest px-2 py-0">
                                    Hệ thống
                                  </Badge>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Dùng để tự động tính toán giá vốn nguyên liệu vàng cho tất cả các bản báo giá.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                              <div className="relative">
                                <Input
                                  type="text"
                                  className="w-48 font-medium text-sm transition-all focus:ring-2 focus:ring-primary/50 text-right pr-14"
                                  value={goldPriceInputDisplay}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    setGoldPriceInputDisplay(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '')
                                  }}
                                  placeholder="9,000,000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                                  đ/chỉ
                                </span>
                              </div>
                              
                              <Button
                                onClick={() => handleSaveGoldPrice(goldPriceInputDisplay)}
                                disabled={isUpdatingGoldPrice}
                                className="bg-gold-gradient hover:opacity-95 text-primary-foreground font-semibold text-xs px-4 shadow active:scale-98 transition-all shrink-0"
                              >
                                {isUpdatingGoldPrice ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Đang lưu...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3.5 w-3.5 mr-1.5" />
                                    Cập nhật giá
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <StatsCards />
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </AnimatePresence>

            {/* Quotes Tab */}
            <TabsContent value="quotes" className="space-y-4 mt-0">
              <motion.div
                key="quotes"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-2"
              >
                <QuoteListPricer
                  currentRole={currentRole}
                  currentUserName={currentUserName}
                  newQuote={latestQuote}
                  action={
                    currentRole === 'sale' && (
                      <QuoteRequestModal
                        requesterName={currentUserName}
                        onSuccess={(q) => setLatestQuote(q)}
                      />
                    )
                  }
                />
              </motion.div>
            </TabsContent>


            {/* Business Analytics Tab */}
            {currentRole === 'order' && (
              <TabsContent value="analytics" className="space-y-6 mt-0">
                <motion.div
                  key="analytics"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <BusinessAnalytics />
                </motion.div>
              </TabsContent>
            )}


            {/* Calculator Tab */}
            {canViewCalculator && (
              <TabsContent value="calculator" className="space-y-6 mt-0">
                <motion.div
                  key="calculator"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
                      Máy tính giá trang sức
                    </h1>
                    <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
                      Công cụ tính nhanh giá vốn và đề xuất giá bán lẻ trang sức vàng, bạc
                    </p>
                  </div>

                  {/* Gold Price Banner */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/5 border border-primary/20 relative overflow-hidden shimmer-gold shadow-md">
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"
                            animate={{
                              boxShadow: [
                                '0 0 0 0 rgba(212, 175, 55, 0)',
                                '0 0 20px 5px rgba(212, 175, 55, 0.25)',
                                '0 0 0 0 rgba(212, 175, 55, 0)',
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className="h-5 w-5 text-primary-foreground" />
                          </motion.div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium tracking-wide">
                              GIÁ VÀNG 24K HÔM NAY
                              <motion.span
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                <TrendingUp className="h-3 w-3 text-success" />
                              </motion.span>
                            </p>
                            <motion.p
                              className="text-3xl font-serif font-semibold text-primary tracking-wide"
                              key={goldPrice24K}
                              initial={{ scale: 1.1 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              {formatCurrency(parseFloat(goldPrice24K) || 0)} / chỉ
                            </motion.p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <GoldCalculator currentRole={currentRole} />
                  </motion.div>
                </motion.div>
              </TabsContent>
            )}

            {/* Settings Tab */}
            {canViewSettings && (
              <TabsContent value="settings" className="space-y-6 mt-0">
                <motion.div
                  key="settings"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-semibold bg-gradient-to-r from-primary via-amber-600 to-primary bg-clip-text text-transparent tracking-wide">
                      Cấu hình & Cài đặt hệ thống
                    </h1>
                    <p className="text-xs text-muted-foreground sm:text-sm font-medium mt-1">
                      Thiết lập bảng tỷ lệ tuổi vàng, phân chia biên lợi nhuận và quy tắc bán lẻ
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Gold Ratios */}
                    <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                          <CardTitle>Bảng tỷ lệ vàng áp dụng</CardTitle>
                          <CardDescription>
                            Tỷ lệ đã bao gồm 5% phụ phí hao hụt chế tác
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {goldRatios.map(({ key, label, standard, applied }, index) => (
                              <motion.div
                                key={key}
                                className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/30 transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02, x: 4 }}
                              >
                                <div>
                                  <p className="font-medium">{label}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Tỷ lệ chuẩn: {formatNumber(standard * 100)}%
                                  </p>
                                </div>
                                <motion.div whileHover={{ scale: 1.1 }}>
                                  <Badge variant="secondary" className="text-lg">
                                    {Math.round(applied * 100)}%
                                  </Badge>
                                </motion.div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Profit Margins */}
                    <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                          <CardTitle>Bảng biên lợi nhuận</CardTitle>
                          <CardDescription>
                            Hệ số chia áp dụng theo giá vốn
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              { range: 'Dưới 10 triệu', divisor: '0.65', margin: '35%', color: 'bg-success' },
                              { range: '10 - 50 triệu', divisor: '0.70', margin: '30%', color: 'bg-info' },
                              { range: 'Trên 50 triệu', divisor: '0.75', margin: '25%', color: 'bg-primary' },
                            ].map((item, index) => (
                              <motion.div
                                key={item.range}
                                className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/30 transition-colors"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02, x: -4 }}
                              >
                                <div>
                                  <p className="font-medium">{item.range}</p>
                                  <p className="text-sm text-muted-foreground">Giá vốn chia {item.divisor}</p>
                                </div>
                                <motion.div whileHover={{ scale: 1.1 }}>
                                  <Badge variant="default" className={cn('text-lg', item.color)}>
                                    {item.margin}
                                  </Badge>
                                </motion.div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Silver Rule */}
                    <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                          <CardTitle>Quy tắc sản phẩm bạc</CardTitle>
                          <CardDescription>
                            Quy tắc tính giá đặc biệt cho sản phẩm bạc
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <motion.div
                            className="rounded-lg bg-silver/20 p-6 text-center"
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <p className="text-sm text-muted-foreground">Công thức:</p>
                            <motion.p
                              className="mt-2 text-2xl font-bold"
                              animate={{
                                color: ['#64748b', '#D4AF37', '#64748b'],
                              }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              Giá bán = Giá vốn x 3
                            </motion.p>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Permissions */}
                    <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                          <CardTitle>Phân quyền người dùng</CardTitle>
                          <CardDescription>
                            Quyền truy cập theo vai trò
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {[
                              {
                                role: 'Sale',
                                color: 'bg-info',
                                description: 'Chỉ xem được giá bán đề xuất gửi khách hàng. Không xem được giá vốn, tiền công và chi tiết đá.',
                              },
                              {
                                role: 'Báo giá & Quản trị (Order)',
                                color: 'bg-primary text-primary-foreground',
                                description: 'Toàn quyền báo giá: tính giá vốn, giá bán, theo dõi xưởng sản xuất và cấu hình hệ thống.',
                              },
                            ].map((item, index) => (
                              <motion.div
                                key={item.role}
                                className="rounded-lg border p-3 hover:border-primary/30 transition-colors"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                whileHover={{ scale: 1.01, x: 4 }}
                              >
                                <div className="flex items-center gap-2">
                                  <Badge className={item.color}>{item.role}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Gold Price 24K Daily Config */}
                    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2">
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Giá vàng nguyên liệu 24K hàng ngày
                          </CardTitle>
                          <CardDescription>
                            Cập nhật giá vàng 24K nguyên liệu áp dụng cho việc tính toán giá vốn toàn hệ thống.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
                            <div>
                              <p className="font-semibold text-base text-primary">Giá vàng hiện tại</p>
                              <p className="text-2xl font-bold font-serif mt-1">
                                {formatCurrency(parseFloat(goldPrice24K) || 0)} <span className="text-sm font-sans font-normal text-muted-foreground">/ chỉ</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Cập nhật lần cuối: {pricingConfig?.updatedAt ? new Date(pricingConfig.updatedAt).toLocaleString('vi-VN') : 'Vừa xong'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <div className="relative flex-1 sm:flex-initial">
                                <Input
                                  type="text"
                                  className="w-full sm:w-48 font-medium text-sm text-right pr-14"
                                  value={goldPriceInputDisplay}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    setGoldPriceInputDisplay(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '')
                                  }}
                                  placeholder="9,000,000"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                                  đ/chỉ
                                </span>
                              </div>
                              
                              <Button
                                onClick={() => handleSaveGoldPrice(goldPriceInputDisplay)}
                                disabled={isUpdatingGoldPrice}
                                className="bg-gold-gradient hover:opacity-95 text-primary-foreground text-xs font-semibold shrink-0"
                              >
                                {isUpdatingGoldPrice ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Đang lưu...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Cập nhật
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </motion.div>
              </TabsContent>
            )}
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t py-4 px-6 bg-card/60 backdrop-blur-md">
          <p className="text-center text-xs text-muted-foreground">
            © 2024 Hệ thống Quản lý Báo giá Trang sức • Trải nghiệm Đẳng cấp
          </p>
        </footer>
      </div>
    </div>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await authApi.register({
          fullName,
          username,
          email: email || undefined,
          password,
        })
      }

      const res = await authApi.login({ usernameOrEmail: username, password })
      onAuthenticated(res.user)
    } catch (err: any) {
      setError(err.message || 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background tactile-noise flex items-center justify-center p-6">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl">
        <div className="border-b bg-primary/5 px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <span className="font-serif text-sm font-bold">JQ</span>
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold leading-none">Báo giá Trang sức</h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {mode === 'login' ? 'Đăng nhập để tiếp tục làm việc' : 'Tạo tài khoản Sale mới'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 px-7 py-6">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ tên</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn Sale" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập hoặc email</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="sale hoặc order" autoComplete="username" />
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sale@jewelry.local" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
            className="w-full text-center text-sm font-medium text-primary hover:underline"
          >
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký Sale' : 'Đã có tài khoản? Đăng nhập'}
          </button>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Tài khoản seed mặc định: <b>sale / sale123456</b> hoặc <b>order / order123456</b>.
          </div>
        </form>
      </div>
    </div>
  )
}

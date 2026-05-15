'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header, type UserRole } from '@/components/header'
import { GoldCalculator } from '@/components/gold-calculator'
import { SilverCalculator } from '@/components/silver-calculator'
import { WorkflowStatus, type WorkflowStep } from '@/components/workflow-status'
import { StatsCards } from '@/components/stats-cards'
import { RecentQuotes } from '@/components/recent-quotes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GOLD_RATIOS, formatCurrency, formatNumber } from '@/lib/pricing'
import { LayoutDashboard, Calculator, Settings, Sparkles, TrendingUp, ClipboardList, Hammer } from 'lucide-react'
import { QuoteRequestModal } from '@/components/quote-request-modal'
import { QuoteListPricer } from '@/components/quote-list-pricer'
import { ProductionBoard } from '@/components/production-board'

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
  const [currentRole, setCurrentRole] = useState<UserRole>('admin')
  const [currentStep] = useState<WorkflowStep>(3)
  const [goldPrice24K, setGoldPrice24K] = useState<string>('9000000')
  const [activeTab, setActiveTab] = useState('dashboard')

  const canViewSettings = currentRole === 'order' || currentRole === 'admin'
  const canViewProduction = currentRole === 'workshop' || currentRole === 'admin'
  const currentUserName = currentRole === 'sale' ? 'Nguyễn Văn Sale' : currentRole === 'order' ? 'NV Báo Giá' : 'Admin'

  return (
    <div className="min-h-screen bg-background">
      <Header currentRole={currentRole} onRoleChange={setCurrentRole} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.h1
            className="text-2xl font-bold text-foreground sm:text-3xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Hệ thống báo giá trang sức
          </motion.h1>
          <motion.p
            className="mt-1 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Quản lý và tính toán giá sản phẩm vàng, bạc và đá quý
          </motion.p>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
              {[
                { value: 'dashboard', icon: LayoutDashboard, label: 'Bảng điều khiển' },
                { value: 'quotes', icon: ClipboardList, label: 'Báo giá' },
                { value: 'calculator', icon: Calculator, label: 'Tính giá' },
                ...(canViewProduction ? [{ value: 'production', icon: Hammer, label: 'Sản xuất' }] : []),
                ...(canViewSettings ? [{ value: 'settings', icon: Settings, label: 'Cài đặt' }] : []),
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 transition-all duration-300 data-[state=active]:shadow-md"
                >
                  <motion.div whileHover={{ rotate: 10 }} transition={{ duration: 0.2 }}>
                    <tab.icon className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Dashboard Tab */}
          <AnimatePresence mode="wait">
            <TabsContent value="dashboard" className="space-y-6">
              <motion.div
                key="dashboard"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Stats */}
                <StatsCards />

                {/* Workflow Status */}
                <WorkflowStatus currentStep={currentStep} />

                {/* Recent Quotes */}
                {/* Recent Quotes */}
                <RecentQuotes currentRole={currentRole} />

                {/* Sale: nút tạo yêu cầu báo giá nhanh từ dashboard */}
                {currentRole === 'sale' && (
                  <div className="flex justify-end">
                    <QuoteRequestModal
                      requesterName={currentUserName}
                      onSuccess={() => {}}
                    />
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>

          {/* Quotes Tab — GĐ1: Luồng báo giá */}
          <TabsContent value="quotes" className="space-y-6">
            <motion.div
              key="quotes"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              {currentRole === 'sale' && (
                <div className="flex justify-end">
                  <QuoteRequestModal
                    requesterName={currentUserName}
                    onSuccess={() => {}}
                  />
                </div>
              )}
              <QuoteListPricer currentRole={currentRole} currentUserName={currentUserName} />
            </motion.div>
          </TabsContent>

          {/* Production Tab — GĐ2: Luồng sản xuất */}
          {canViewProduction && (
            <TabsContent value="production" className="space-y-6">
              <motion.div
                key="production"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <ProductionBoard currentUserName={currentUserName} />
              </motion.div>
            </TabsContent>
          )}

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <motion.div
              key="calculator"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* Gold Price Banner */}
              {canViewSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden relative">
                    {/* Animated background shimmer */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' as const }}
                    />
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"
                          animate={{
                            boxShadow: [
                              '0 0 0 0 rgba(212, 175, 55, 0)',
                              '0 0 20px 5px rgba(212, 175, 55, 0.3)',
                              '0 0 0 0 rgba(212, 175, 55, 0)',
                            ],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="h-5 w-5 text-primary-foreground" />
                        </motion.div>
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            Giá vàng 24K hôm nay
                            <motion.span
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <TrendingUp className="h-3 w-3 text-success" />
                            </motion.span>
                          </p>
                          <motion.p
                            className="text-xl font-bold text-primary"
                            key={goldPrice24K}
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {formatCurrency(parseFloat(goldPrice24K) || 0)}/chi
                          </motion.p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="globalGoldPrice" className="text-sm">
                          Cập nhật:
                        </Label>
                        <motion.div whileFocus={{ scale: 1.02 }}>
                          <Input
                            id="globalGoldPrice"
                            type="number"
                            className="w-40 transition-all focus:ring-2 focus:ring-primary/50"
                            value={goldPrice24K}
                            onChange={(e) => setGoldPrice24K(e.target.value)}
                          />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Calculator Tabs */}
              <Tabs defaultValue="gold" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="gold" className="gap-2 transition-all">
                    <motion.div
                      className="h-3 w-3 rounded-full bg-gold"
                      whileHover={{ scale: 1.3 }}
                      animate={{
                        boxShadow: [
                          '0 0 0 0 rgba(255, 215, 0, 0)',
                          '0 0 8px 2px rgba(255, 215, 0, 0.4)',
                          '0 0 0 0 rgba(255, 215, 0, 0)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    Sản phẩm vàng
                  </TabsTrigger>
                  <TabsTrigger value="silver" className="gap-2 transition-all">
                    <motion.div
                      className="h-3 w-3 rounded-full bg-silver"
                      whileHover={{ scale: 1.3 }}
                    />
                    Sản phẩm bạc
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gold">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <GoldCalculator currentRole={currentRole} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="silver">
                  <motion.div
                    className="max-w-xl"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <SilverCalculator currentRole={currentRole} />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          {canViewSettings && (
            <TabsContent value="settings" className="space-y-6">
              <motion.div
                key="settings"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
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
                          {Object.entries(GOLD_RATIOS).map(([key, { label, standard, applied }], index) => (
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
                                <Badge variant="default" className={`text-lg ${item.color}`}>
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
                              description: 'Chỉ xem được giá bán đề xuất. Không xem được giá vốn, tiền công, chi tiết đá.',
                            },
                            {
                              role: 'Order',
                              color: 'bg-warning text-warning-foreground',
                              description: 'Xem được tất cả thông tin: giá vốn, tiền công, giá đá, tỷ lệ.',
                            },
                            {
                              role: 'Admin',
                              color: 'bg-primary',
                              description: 'Toàn quyền truy cập và chỉnh sửa cài đặt hệ thống.',
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
                </div>
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <motion.footer
        className="border-t border-border bg-card py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.p
            className="text-center text-sm text-muted-foreground"
            whileHover={{ scale: 1.02 }}
          >
            Jewelry Quote System v1.0 - Hệ thống báo giá trang sức chuyên nghiệp
          </motion.p>
        </div>
      </motion.footer>
    </div>
  )
}

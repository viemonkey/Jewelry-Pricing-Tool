'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  FileText,
  Search,
  Calculator,
  CheckCircle,
  Send,
  Handshake,
  ArrowRight,
} from 'lucide-react'

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6

interface WorkflowStatusProps {
  currentStep: WorkflowStep
  className?: string
}

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: 'Tạo yêu cầu báo giá',
    role: 'Sale',
    status: 'Chờ báo giá',
    icon: FileText,
    description: 'Sale nhập thông tin sản phẩm',
  },
  {
    step: 2,
    title: 'Tiếp nhận yêu cầu',
    role: 'NV Báo giá',
    status: 'Đang báo giá',
    icon: Search,
    description: 'Kiểm tra thông tin và hình ảnh',
  },
  {
    step: 3,
    title: 'Tính giá trên hệ thống',
    role: 'NV Báo giá',
    status: 'Đang báo giá',
    icon: Calculator,
    description: 'Áp dụng công thức tính giá',
  },
  {
    step: 4,
    title: 'Hoàn thành báo giá',
    role: 'NV Báo giá',
    status: 'Đã báo giá',
    icon: CheckCircle,
    description: 'Lưu giá vốn, giá bán',
  },
  {
    step: 5,
    title: 'Sale gửi giá cho khách',
    role: 'Sale',
    status: 'Đang xử lý',
    icon: Send,
    description: 'Tư vấn và gửi báo giá',
  },
  {
    step: 6,
    title: 'Khách chốt đơn',
    role: 'Sale',
    status: 'Đặt hàng',
    icon: Handshake,
    description: 'Khách đồng ý đặt hàng',
  },
]

const STATUS_COLORS: Record<string, string> = {
  'Chờ báo giá': 'bg-warning/20 text-warning border-warning/30',
  'Đang báo giá': 'bg-info/20 text-info border-info/30',
  'Đã báo giá': 'bg-success/20 text-success border-success/30',
  'Đang xử lý': 'bg-primary/20 text-primary border-primary/30',
  'Đặt hàng': 'bg-success/20 text-success border-success/30',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

const arrowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
}

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(212, 175, 55, 0)',
      '0 0 0 8px rgba(212, 175, 55, 0.2)',
      '0 0 0 0 rgba(212, 175, 55, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

export function WorkflowStatus({ currentStep, className }: WorkflowStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Quy trình báo giá</CardTitle>
          <CardDescription>
            Theo dõi trạng thái xử lý yêu cầu báo giá
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Desktop view - horizontal */}
            <motion.div
              className="hidden gap-2 lg:flex"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {WORKFLOW_STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = step.step === currentStep
                const isCompleted = step.step < currentStep
                const isPending = step.step > currentStep

                return (
                  <motion.div
                    key={step.step}
                    className="flex flex-1 items-center"
                    variants={stepVariants}
                  >
                    <motion.div
                      className={cn(
                        'flex flex-1 flex-col items-center rounded-lg border p-3 text-center transition-all',
                        isActive && 'border-primary bg-primary/5 shadow-sm',
                        isCompleted && 'border-success/30 bg-success/5',
                        isPending && 'border-border bg-muted/30 opacity-60'
                      )}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <motion.div
                        className={cn(
                          'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                          isActive && 'bg-primary text-primary-foreground',
                          isCompleted && 'bg-success text-success-foreground',
                          isPending && 'bg-muted text-muted-foreground'
                        )}
                        animate={isActive ? 'pulse' : undefined}
                        variants={pulseVariants}
                      >
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                          >
                            <CheckCircle className="h-5 w-5" />
                          </motion.div>
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </motion.div>
                      <p className="mb-1 text-xs font-medium">{step.title}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', isActive && STATUS_COLORS[step.status])}
                      >
                        {step.status}
                      </Badge>
                    </motion.div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <motion.div
                        variants={arrowVariants}
                        animate={
                          step.step < currentStep
                            ? {
                                x: [0, 4, 0],
                                transition: { duration: 1.5, repeat: Infinity },
                              }
                            : undefined
                        }
                      >
                        <ArrowRight
                          className={cn(
                            'mx-1 h-4 w-4 flex-shrink-0',
                            step.step < currentStep ? 'text-success' : 'text-muted-foreground/30'
                          )}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Mobile/Tablet view - vertical */}
            <motion.div
              className="space-y-3 lg:hidden"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {WORKFLOW_STEPS.map((step) => {
                const Icon = step.icon
                const isActive = step.step === currentStep
                const isCompleted = step.step < currentStep
                const isPending = step.step > currentStep

                return (
                  <motion.div
                    key={step.step}
                    variants={stepVariants}
                    className={cn(
                      'flex items-center gap-4 rounded-lg border p-4 transition-all',
                      isActive && 'border-primary bg-primary/5',
                      isCompleted && 'border-success/30 bg-success/5',
                      isPending && 'border-border bg-muted/30 opacity-60'
                    )}
                    whileHover={{ scale: 1.01, x: 4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <motion.div
                      className={cn(
                        'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && 'bg-success text-success-foreground',
                        isPending && 'bg-muted text-muted-foreground'
                      )}
                      animate={isActive ? 'pulse' : undefined}
                      variants={pulseVariants}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <CheckCircle className="h-6 w-6" />
                        </motion.div>
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Bước {step.step}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {step.role}
                        </Badge>
                      </div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex-shrink-0',
                        isActive && STATUS_COLORS[step.status]
                      )}
                    >
                      {step.status}
                    </Badge>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

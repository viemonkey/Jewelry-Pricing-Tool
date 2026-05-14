'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FileText, Clock, CheckCircle, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react'

const STATS = [
  {
    title: 'Tổng yêu cầu',
    value: 156,
    change: '+12%',
    trend: 'up',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'hover:border-primary/50',
  },
  {
    title: 'Chờ xử lý',
    value: 23,
    change: '-5%',
    trend: 'down',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'hover:border-warning/50',
  },
  {
    title: 'Đã báo giá',
    value: 89,
    change: '+18%',
    trend: 'up',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'hover:border-success/50',
  },
  {
    title: 'Đã đặt hàng',
    value: 44,
    change: '+8%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'hover:border-info/50',
  },
]

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration * 1000

    const updateValue = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / (endTime - startTime), 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(easeProgress * value))

      if (progress < 1) {
        requestAnimationFrame(updateValue)
      }
    }

    requestAnimationFrame(updateValue)
  }, [value, duration])

  return <span>{displayValue}</span>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export function StatsCards() {
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon
        const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

        return (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card
              className={cn(
                'group cursor-pointer transition-all duration-300',
                'hover:shadow-lg hover:-translate-y-1',
                stat.borderColor
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <motion.div
                    className={cn('rounded-lg p-2', stat.bgColor)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </motion.div>
                  <motion.div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      stat.trend === 'up' ? 'text-success' : 'text-destructive'
                    )}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      animate={{ y: stat.trend === 'up' ? [0, -2, 0] : [0, 2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <TrendIcon className="h-3 w-3" />
                    </motion.div>
                    {stat.change}
                  </motion.div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">
                    <AnimatedNumber value={stat.value} duration={1.5} />
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
                {/* Animated underline on hover */}
                <motion.div
                  className={cn('mt-3 h-1 rounded-full', stat.bgColor)}
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

'use client'

import { motion, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

interface AnimatedWrapperProps {
  children: ReactNode
  delay?: number
  className?: string
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export function FadeInUp({ children, delay = 0, className }: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FadeInDown({ children, delay = 0, className }: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInDown}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function ScaleIn({ children, delay = 0, className }: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({ children, className }: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeInUp} className={className}>
      {children}
    </motion.div>
  )
}

// Animated counter for numbers
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ value, duration = 1, className, prefix = '', suffix = '' }: AnimatedCounterProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {prefix}
        <CountUp target={value} duration={duration} />
        {suffix}
      </motion.span>
    </motion.span>
  )
}

function CountUp({ target, duration }: { target: number; duration: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        key={target}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {target}
      </motion.span>
    </motion.span>
  )
}

// Pulse animation for highlighting
export function PulseWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: 'loop',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Shimmer effect for loading
export function ShimmerEffect({ className }: { className?: string }) {
  return (
    <motion.div
      className={`absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      animate={{ x: ['100%', '-100%'] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'linear',
      }}
    />
  )
}

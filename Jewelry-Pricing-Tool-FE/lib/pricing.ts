// Gold karat ratios with 5% manufacturing loss
export const GOLD_RATIOS: Record<string, { standard: number; applied: number; label: string }> = {
  '10K': { standard: 0.417, applied: 0.47, label: 'Vàng 10K' },
  '14K': { standard: 0.583, applied: 0.64, label: 'Vàng 14K' },
  '18K': { standard: 0.750, applied: 0.80, label: 'Vàng 18K' },
  '610': { standard: 0.610, applied: 0.66, label: 'Vàng 610' },
  '24K': { standard: 0.9999, applied: 1.05, label: 'Vàng 24K' },
}

// Profit margin tiers
export const PROFIT_MARGINS: Array<{ maxCost: number; divisor: number; margin: string }> = [
  { maxCost: 10_000_000, divisor: 0.65, margin: '35%' },
  { maxCost: 50_000_000, divisor: 0.70, margin: '30%' },
  { maxCost: Infinity, divisor: 0.75, margin: '25%' },
]

// Silver multiplier
export const SILVER_MULTIPLIER = 3

export type StoneType = 'lab_diamond' | 'natural_diamond' | 'colored_stone'

export interface StoneEntry {
  id: string
  type: StoneType
  quantity: number
  size: string // mm or carat
  unitPrice: number
  priceMethod: 'per_piece' | 'per_carat'
}

export interface GoldProductInput {
  name: string
  karatType: keyof typeof GOLD_RATIOS
  weight: number // in chi (1 chi = 3.75g)
  goldPrice24K: number // VND per chi
  laborCost: number
  stoneCost: number
}

export interface SilverProductInput {
  name: string
  costPrice: number
}

export interface PricingResult {
  goldPriceByKarat: number
  costBeforeVAT: number
  costWithVAT: number
  suggestedPrice: number
  profitMargin: string
  breakdown: {
    goldCost: number
    laborCost: number
    stoneCost: number
    vat: number
  }
}

// Calculate gold price by karat
export function calculateGoldPriceByKarat(
  karatType: keyof typeof GOLD_RATIOS,
  weight: number,
  goldPrice24K: number
): number {
  const ratio = GOLD_RATIOS[karatType].applied
  return ratio * goldPrice24K * weight
}

// Get profit margin divisor based on cost
export function getProfitDivisor(costWithVAT: number): { divisor: number; margin: string } {
  for (const tier of PROFIT_MARGINS) {
    if (costWithVAT < tier.maxCost) {
      return { divisor: tier.divisor, margin: tier.margin }
    }
  }
  return { divisor: 0.75, margin: '25%' }
}

// Calculate full pricing for gold product
export function calculateGoldProductPrice(input: GoldProductInput): PricingResult {
  const goldPriceByKarat = calculateGoldPriceByKarat(
    input.karatType,
    input.weight,
    input.goldPrice24K
  )

  const costBeforeVAT = goldPriceByKarat + input.laborCost + input.stoneCost
  const vat = costBeforeVAT * 0.1
  const costWithVAT = costBeforeVAT + vat

  const { divisor, margin } = getProfitDivisor(costWithVAT)
  const suggestedPrice = Math.round(costWithVAT / divisor / 1000) * 1000 // Round to nearest 1000 VND

  return {
    goldPriceByKarat,
    costBeforeVAT,
    costWithVAT,
    suggestedPrice,
    profitMargin: margin,
    breakdown: {
      goldCost: goldPriceByKarat,
      laborCost: input.laborCost,
      stoneCost: input.stoneCost,
      vat,
    },
  }
}

// Calculate silver product price
export function calculateSilverProductPrice(costPrice: number): {
  costPrice: number
  sellingPrice: number
} {
  return {
    costPrice,
    sellingPrice: costPrice * SILVER_MULTIPLIER,
  }
}

// Calculate total stone cost from entries
export function calculateTotalStoneCost(entries: StoneEntry[]): number {
  return entries.reduce((total, entry) => {
    if (entry.priceMethod === 'per_piece') {
      return total + entry.quantity * entry.unitPrice
    }
    // Per carat: parse size as carat weight
    const caratWeight = parseFloat(entry.size) || 0
    return total + entry.quantity * caratWeight * entry.unitPrice
  }, 0)
}

// Format currency in VND
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

// Format number with thousand separators
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

// Stone type labels
export const STONE_TYPE_LABELS: Record<StoneType, string> = {
  lab_diamond: 'Kim cuong Lab',
  natural_diamond: 'Kim cuong thien nhien',
  colored_stone: 'Da mau',
}

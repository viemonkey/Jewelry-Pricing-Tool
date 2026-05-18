// ============================================================
// pricing.ts — Logic tính giá (không còn hardcode config)
// Tất cả config (GOLD_RATIOS, PROFIT_MARGINS, SILVER_MULTIPLIER)
// được load từ backend qua pricingConfigApi.get()
// ============================================================

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
  karatType: string
  weight: number          // in chi (1 chi = 3.75g)
  goldPrice24K: number    // VND per chi
  laborCost: number
  stoneCost: number
  goldRatios: Record<string, { standard: number; applied: number; label: string }>
  profitMargins: Array<{ maxCost: number; divisor: number; margin: string }>
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
  karatType: string,
  weight: number,
  goldPrice24K: number,
  goldRatios: Record<string, { standard: number; applied: number; label: string }>
): number {
  const ratio = goldRatios[karatType]?.applied ?? 0
  return ratio * goldPrice24K * weight
}

// Get profit margin divisor based on cost
export function getProfitDivisor(
  costWithVAT: number,
  profitMargins: Array<{ maxCost: number; divisor: number; margin: string }>
): { divisor: number; margin: string } {
  for (const tier of profitMargins) {
    if (costWithVAT < tier.maxCost) {
      return { divisor: tier.divisor, margin: tier.margin }
    }
  }
  const last = profitMargins[profitMargins.length - 1]
  return { divisor: last?.divisor ?? 0.75, margin: last?.margin ?? '25%' }
}

// Calculate full pricing for gold product
export function calculateGoldProductPrice(input: GoldProductInput): PricingResult {
  const goldPriceByKarat = calculateGoldPriceByKarat(
    input.karatType,
    input.weight,
    input.goldPrice24K,
    input.goldRatios
  )

  const costBeforeVAT = goldPriceByKarat + input.laborCost + input.stoneCost
  const vat = costBeforeVAT * 0.1
  const costWithVAT = costBeforeVAT + vat

  const { divisor, margin } = getProfitDivisor(costWithVAT, input.profitMargins)
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
export function calculateSilverProductPrice(
  costPrice: number,
  silverMultiplier: number
): {
  costPrice: number
  sellingPrice: number
} {
  return {
    costPrice,
    sellingPrice: costPrice * silverMultiplier,
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

export class StoneDetailDto {
  name: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

export class UpdateQuotePriceDto {
  weightChi?: number
  weightGram?: number
  laborCost: number
  goldPrice24K?: number
  materialCost?: number
  stoneCost?: number
  costBeforeVAT?: number
  costWithVAT?: number
  stones: StoneDetailDto[]
  costPrice: number
  sellingPrice: number
  quotedBy: string
}

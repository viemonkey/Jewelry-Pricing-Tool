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
  stones: StoneDetailDto[]
  costPrice: number
  sellingPrice: number
  quotedBy: string
}

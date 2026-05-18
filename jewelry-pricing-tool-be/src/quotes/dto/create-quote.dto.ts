export class CreateQuoteDto {
  productName: string
  productDescription?: string
  dimensions?: string
  stoneRequirements?: string
  quantity?: number
  deadline?: string
  materialType: 'GOLD_24K' | 'GOLD_18K' | 'GOLD_14K' | 'GOLD_10K' | 'SILVER'
  notes?: string
  requestedBy: string
}

import { ProductType, MaterialType } from '../quote.schema'

export class CreateQuoteDto {
  productName: string
  productDescription?: string
  productType?: ProductType          // Nhẫn / Dây chuyền / Vòng / Lắc chân
  dimensions?: string
  stoneRequirements?: string
  quantity?: number
  deadline?: string
  materialType: MaterialType
  weightChi?: number
  weightGram?: number
  notes?: string
  requestedBy: string
}

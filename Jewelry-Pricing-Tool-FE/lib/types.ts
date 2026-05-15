// ============================================================
// Shared TypeScript types cho toàn bộ ứng dụng
// ============================================================

export type UserRole = 'sale' | 'order' | 'admin' | 'workshop'

export type QuoteStatus =
  | 'PENDING'      // Chờ báo giá
  | 'QUOTING'      // Đang báo giá
  | 'QUOTED'       // Đã báo giá (Sale chưa xem)
  | 'CONFIRMED'    // Khách chốt
  | 'CANCELLED'    // Huỷ
  | 'IN_PRODUCTION'// Đang sản xuất

export type ProductionStatus =
  | 'PENDING_PRODUCTION' // Chờ sản xuất
  | 'CASTING'            // Đang đúc
  | 'SETTING_STONES'     // Đang gắn đá
  | 'POLISHING'          // Đang đánh bóng
  | 'QUALITY_CHECK'      // Kiểm tra chất lượng
  | 'COMPLETED'          // Hoàn thành

export interface StoneDetail {
  name: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

export interface Quote {
  _id: string
  quoteCode: string        // VD: QT-2025-001
  productName: string
  productDescription?: string
  materialType: 'GOLD_24K' | 'GOLD_18K' | 'GOLD_14K' | 'GOLD_10K' | 'SILVER'
  weightChi?: number       // Số chi vàng
  weightGram?: number      // Gram bạc
  laborCost: number        // Tiền công
  stones: StoneDetail[]
  costPrice: number        // Giá vốn (chỉ Order/Admin thấy)
  sellingPrice: number     // Giá bán đề xuất
  notes?: string
  images: string[]         // URLs ảnh sản phẩm
  status: QuoteStatus
  requestedBy: string      // Tên Sale
  quotedBy?: string        // Tên NV báo giá
  createdAt: string
  updatedAt: string
}

export interface ProductionOrder {
  _id: string
  orderCode: string        // VD: PO-2025-001
  quote: Quote | string    // Populated hoặc ID
  deadline: string
  assignedTo?: string      // Tên thợ
  progressStatus: ProductionStatus
  progressNotes?: string
  completedImages: string[]
  createdAt: string
  updatedAt: string
}

// DTO for creating a quote request (Sale gửi lên)
export interface CreateQuoteRequest {
  productName: string
  productDescription?: string
  materialType: Quote['materialType']
  notes?: string
  images: File[]
  requestedBy: string
}

// DTO for pricer to update quote
export interface UpdateQuotePrice {
  weightChi?: number
  weightGram?: number
  laborCost: number
  stones: StoneDetail[]
  costPrice: number
  sellingPrice: number
  quotedBy: string
}

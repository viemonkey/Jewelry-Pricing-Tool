// ============================================================
// Shared TypeScript types cho toàn bộ ứng dụng
// ============================================================

export type UserRole = 'sale' | 'order'

export type QuoteStatus =
  | 'PENDING'           // Chờ báo giá
  | 'NEED_MORE_INFO'    // NV order trả lại — Sale cần bổ sung
  | 'QUOTING'           // Đang báo giá
  | 'QUOTED'            // Đã báo giá — Sale chưa gửi khách
  | 'SENT_TO_CUSTOMER'  // Sale đã gửi giá cho khách — chờ khách trả lời
  | 'CONFIRMED'         // Khách chốt đơn
  | 'CANCELLED'         // Huỷ

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
  materialType: 'GOLD_24K' | 'GOLD_18K' | 'GOLD_14K' | 'GOLD_10K' | 'GOLD_610' | 'SILVER'
  weightChi?: number       // Số chi vàng
  weightGram?: number      // Gram bạc
  laborCost: number        // Tiền công
  stones: StoneDetail[]
  costPrice: number        // Giá vốn (chỉ Order/Admin thấy)
  sellingPrice: number     // Giá bán đề xuất
  notes?: string
  rejectReason?: string    // Lý do NV order trả lại (khi status = NEED_MORE_INFO)
  images: string[]         // URLs ảnh sản phẩm
  status: QuoteStatus
  requestedBy: string      // Tên Sale
  quotedBy?: string        // Tên NV báo giá
  createdAt: string
  updatedAt: string
}

// DTO for creating a quote request (Sale gửi lên)
export interface CreateQuoteRequest {
  productName: string
  materialType: Quote['materialType']
  productDescription?: string
  dimensions?: string
  stoneRequirements?: string
  quantity?: number
  deadline?: string
  notes?: string
  images: File[]
  requestedBy: string
}

// DTO for pricer to update quote
export interface UpdateQuotePrice {
  weightChi?: number
  weightGram?: number
  goldPrice24K?: number    // Giá vàng 24K/chỉ tại thời điểm báo giá — lưu để restore
  materialCost?: number    // Giá vàng theo tuổi (tự tính)
  stoneCost?: number       // Tổng tiền đá
  costBeforeVAT?: number   // Giá vốn chưa VAT
  laborCost: number        // Tiền công chế tác
  stones: StoneDetail[]
  costPrice: number        // Giá vốn có VAT
  sellingPrice: number     // Giá bán đề xuất
  quotedBy: string
}

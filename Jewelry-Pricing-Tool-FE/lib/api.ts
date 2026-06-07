// ============================================================
// API Client — wrapper cho tất cả calls đến NestJS backend
// Base URL đọc từ env: NEXT_PUBLIC_API_URL
// ============================================================

import type { Quote, CreateQuoteRequest, UpdateQuotePrice } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ─── QUOTES ────────────────────────────────────────────────

export const quotesApi = {
  /** Lấy tất cả quotes, có thể lọc theo status */
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : ''
    return request<Quote[]>(`/quotes${qs}`)
  },

  /** Lấy 1 quote theo ID */
  get: (id: string) => request<Quote>(`/quotes/${id}`),

  /** Sale tạo yêu cầu báo giá (có ảnh → dùng FormData) */
  create: async (data: CreateQuoteRequest): Promise<Quote> => {
    const form = new FormData()
    form.append('productName', data.productName)
    form.append('materialType', data.materialType)
    form.append('requestedBy', data.requestedBy)
    if (data.productDescription) form.append('productDescription', data.productDescription)
    if (data.dimensions) form.append('dimensions', data.dimensions)
    if (data.stoneRequirements) form.append('stoneRequirements', data.stoneRequirements)
    if (data.quantity) form.append('quantity', String(data.quantity))
    if (data.deadline) form.append('deadline', data.deadline)
    if (data.notes) form.append('notes', data.notes)
    if (data.options) form.append('options', JSON.stringify(data.options))
    data.images.forEach((file) => form.append('images', file))

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) throw new Error('Tạo yêu cầu thất bại')
    return res.json()
  },

  /** NV báo giá cập nhật giá */
  updatePrice: (id: string, data: UpdateQuotePrice) =>
    request<Quote>(`/quotes/${id}/price`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** NV báo giá: Tiếp nhận yêu cầu → QUOTING */
  startQuoting: (id: string) =>
    request<Quote>(`/quotes/${id}/start-quoting`, { method: 'PATCH' }),

  /** NV báo giá: Trả lại Sale bổ sung → PENDING (kèm lý do) */
  rejectQuote: (id: string, reason: string) =>
    request<Quote>(`/quotes/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  /** NV báo giá: Hoàn thành báo giá → QUOTED */
  completeQuoting: (id: string) =>
    request<Quote>(`/quotes/${id}/complete-quoting`, { method: 'PATCH' }),

  /** Sale: Cập nhật thông tin bổ sung (khi bị trả lại) */
  updateInfo: async (id: string, data: {
    dimensions?: string
    stoneRequirements?: string
    productDescription?: string
    notes?: string
    keepImages?: string[]   // URL ảnh cũ muốn giữ lại
    newImages?: File[]      // File ảnh mới cần upload
  }): Promise<Quote> => {
    const form = new FormData()
    if (data.dimensions) form.append('dimensions', data.dimensions)
    if (data.stoneRequirements) form.append('stoneRequirements', data.stoneRequirements)
    if (data.productDescription) form.append('productDescription', data.productDescription)
    if (data.notes) form.append('notes', data.notes)
    // Gửi danh sách ảnh cũ cần giữ dưới dạng JSON string
    form.append('keepImages', JSON.stringify(data.keepImages ?? []))
    // Gửi file ảnh mới
    ;(data.newImages ?? []).forEach((file) => form.append('images', file))

    const res = await fetch(`${BASE_URL}/quotes/${id}/info`, {
      method: 'PATCH',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as any).message || 'Cập nhật thông tin thất bại')
    }
    return res.json()
  },

  /** Sale: Gửi lại sau khi bổ sung → PENDING */
  resubmit: (id: string) =>
    request<Quote>(`/quotes/${id}/resubmit`, { method: 'PATCH' }),

  /** Sale: Đã gửi giá cho khách → SENT_TO_CUSTOMER */
  sentToCustomer: (id: string) =>
    request<Quote>(`/quotes/${id}/sent-to-customer`, { method: 'PATCH' }),

  /** Sale: Khách chốt → CONFIRMED */
  confirm: (id: string) =>
    request<Quote>(`/quotes/${id}/confirm`, { method: 'PATCH' }),

  /** Sale: Khách huỷ → CANCELLED */
  cancel: (id: string) =>
    request<Quote>(`/quotes/${id}/cancel`, { method: 'PATCH' }),
}

// ─── STATS ─────────────────────────────────────────────────

export interface QuoteStats {
  total: number
  pending: number
  quoted: number
  confirmed: number
  confirmedRevenue: number
}

export const statsApi = {
  /** Lấy thống kê tổng quan từ backend */
  get: () => request<QuoteStats>('/quotes/stats'),
}

// ─── PRICING CONFIG ────────────────────────────────────────

export interface GoldRatioConfig {
  key: string
  standard: number
  applied: number
  label: string
}

export interface ProfitMarginConfig {
  maxCost: number
  divisor: number
  margin: string
}

export interface PricingConfig {
  goldRatios: GoldRatioConfig[]
  profitMargins: ProfitMarginConfig[]
  silverMultiplier: number
  goldPrice24K: number
}

export const pricingConfigApi = {
  /** Lấy cấu hình giá từ backend (tỷ lệ vàng, biên lợi nhuận, hệ số bạc) */
  get: () => request<PricingConfig>('/pricing-config'),
  /** Cập nhật cấu hình giá lên backend (ví dụ giá vàng hàng ngày) */
  update: (data: Partial<PricingConfig>) =>
    request<PricingConfig>('/pricing-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ─── UPLOAD (standalone) ───────────────────────────────────

export const uploadApi = {
  uploadImages: async (files: File[]): Promise<string[]> => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload thất bại')
    const data = await res.json()
    return data.urls as string[]
  },
}

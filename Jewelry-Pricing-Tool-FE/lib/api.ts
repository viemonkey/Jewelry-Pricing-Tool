// ============================================================
// API Client — wrapper cho tất cả calls đến NestJS backend
// Base URL đọc từ env: NEXT_PUBLIC_API_URL
// ============================================================

import type { Quote, ProductionOrder, CreateQuoteRequest, UpdateQuotePrice } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
    if (data.notes) form.append('notes', data.notes)
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

  /** NV báo giá: Hoàn thành báo giá → QUOTED */
  completeQuoting: (id: string) =>
    request<Quote>(`/quotes/${id}/complete-quoting`, { method: 'PATCH' }),

  /** Sale: Khách chốt → CONFIRMED */
  confirm: (id: string) =>
    request<Quote>(`/quotes/${id}/confirm`, { method: 'PATCH' }),

  /** Sale: Khách huỷ → CANCELLED */
  cancel: (id: string) =>
    request<Quote>(`/quotes/${id}/cancel`, { method: 'PATCH' }),
}

// ─── PRODUCTION ORDERS ─────────────────────────────────────

export const productionApi = {
  /** Lấy danh sách production orders */
  list: (status?: string) => {
    const qs = status ? `?status=${status}` : ''
    return request<ProductionOrder[]>(`/production${qs}`)
  },

  /** Tạo production order từ quote đã CONFIRMED */
  create: (data: { quoteId: string; deadline: string; assignedTo?: string }) =>
    request<ProductionOrder>('/production', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Xưởng cập nhật trạng thái tiến độ */
  updateProgress: (id: string, data: { progressStatus: string; progressNotes?: string }) =>
    request<ProductionOrder>(`/production/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Xưởng hoàn thành + upload ảnh thành phẩm */
  complete: async (id: string, images: File[]): Promise<ProductionOrder> => {
    const form = new FormData()
    images.forEach((file) => form.append('completedImages', file))
    const res = await fetch(`${BASE_URL}/production/${id}/complete`, {
      method: 'PATCH',
      body: form,
    })
    if (!res.ok) throw new Error('Hoàn thành sản xuất thất bại')
    return res.json()
  },
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

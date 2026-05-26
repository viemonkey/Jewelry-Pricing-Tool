'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Dialog, DialogContent, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format, addYears } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Plus, Upload, X, ImageIcon, Loader2, FileText,
  CalendarIcon, Minus, Layers, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { quotesApi } from '@/lib/api'
import { useNotifications } from '@/lib/notifications'
import type { Quote } from '@/lib/types'

interface QuoteRequestModalProps {
  requesterName: string
  onSuccess?: (quote: Quote) => void
}

const MATERIAL_OPTIONS = [
  { value: 'GOLD_24K', label: 'Vàng 24K', isGold: true },
  { value: 'GOLD_18K', label: 'Vàng 18K', isGold: true },
  { value: 'GOLD_14K', label: 'Vàng 14K', isGold: true },
  { value: 'GOLD_610', label: 'Vàng 610',  isGold: true },
  { value: 'GOLD_10K', label: 'Vàng 10K', isGold: true },
  { value: 'SILVER',   label: 'Bạc 925',  isGold: false },
] as const

type MaterialValue = (typeof MATERIAL_OPTIONS)[number]['value']
type ProductCategory = 'NHAN' | 'DAY_CHUYEN' | 'VONG_LAC_TAY' | 'LAC_CHAN'

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
  { value: 'NHAN',         label: 'Nhẫn',           icon: '💍' },
  { value: 'DAY_CHUYEN',   label: 'Dây chuyền',     icon: '📿' },
  { value: 'VONG_LAC_TAY', label: 'Vòng / Lắc tay', icon: '⌚' },
  { value: 'LAC_CHAN',     label: 'Lắc chân',        icon: '✨' },
]

const RING_SIZES     = ['5', '6', '7', '8', '9', '10']
const BRACELET_SIZES = ['15cm', '16cm', '17cm', '18cm']
const ANKLET_SIZES   = ['21cm', '22cm', '23cm', '24cm']
const NECKLACE_SIZES = ['40cm', '42cm', '45cm']

const STONE_OPTIONS = [
  { value: 'kim-cuong-lab',         label: 'Kim cương lab' },
  { value: 'kim-cuong-thien-nhien', label: 'Kim cương thiên nhiên' },
  { value: 'da-mau',                label: 'Đá màu' },
]

const MAX_DEADLINE = addYears(new Date(), 1)

interface MaterialRow {
  id: string
  materialType: MaterialValue | ''
  weight: string
  unit: 'chi' | 'gram'
}

function newRow(): MaterialRow {
  return { id: `${Date.now()}-${Math.random()}`, materialType: '', weight: '', unit: 'chi' }
}

interface FormErrors {
  productName?: string
  materials?: string
  category?: string
}

// ── Design tokens ─────────────────────────────────────────────
const GOLD        = '#C9981A'
const GOLD_DARK   = '#A07810'
const GOLD_LIGHT  = '#FBF6E9'
const GOLD_GLOW   = '#C9981A22'
const SURFACE     = '#FAFAF8'
const SURFACE2    = '#F5F3EE'
const BORDER      = '#E6DFD0'
const BORDER_SOFT = '#EDE8DE'
const TEXT_PRI    = '#1A1814'
const TEXT_SEC    = '#6B5E4C'
const TEXT_MUTED  = '#9E8E7A'
const ERROR       = '#D94040'

export function QuoteRequestModal({ requesterName, onSuccess }: QuoteRequestModalProps) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [touched, setTouched]   = useState<Record<string, boolean>>({})
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { addNotification } = useNotifications()

  const [form, setForm]     = useState({ productName: '', productDescription: '', quantity: 1, notes: '' })
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [ringSize,     setRingSize]     = useState('')
  const [ringSizeCustom,     setRingSizeCustom]     = useState('')
  const [necklaceSize, setNecklaceSize] = useState('')
  const [necklaceSizeCustom, setNecklaceSizeCustom] = useState('')
  const [braceletSize, setBraceletSize] = useState('')
  const [braceletSizeCustom, setBraceletSizeCustom] = useState('')
  const [ankletSize,   setAnkletSize]   = useState('')
  const [ankletSizeCustom,   setAnkletSizeCustom]   = useState('')
  const [stoneType, setStoneType] = useState('')
  const [stoneNote, setStoneNote] = useState('')
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([newRow()])

  useEffect(() => {
    return () => { previews.forEach((p) => URL.revokeObjectURL(p.url)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const setAndTouch = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setTouched((t) => ({ ...t, [key]: true }))
    }

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }))

  const handleCategoryChange = (val: ProductCategory) => {
    setCategory(val)
    setRingSize(''); setRingSizeCustom('')
    setNecklaceSize(''); setNecklaceSizeCustom('')
    setBraceletSize(''); setBraceletSizeCustom('')
    setAnkletSize(''); setAnkletSizeCustom('')
    touch('category')
  }

  const errors: FormErrors = {}
  if (touched.productName && !form.productName.trim()) errors.productName = 'Vui lòng nhập tên sản phẩm'
  if (touched.materials && materialRows.every((r) => !r.materialType)) errors.materials = 'Vui lòng chọn ít nhất 1 chất liệu'
  if (touched.category && !category) errors.category = 'Vui lòng chọn loại sản phẩm'

  const isValid = form.productName.trim() && materialRows.some((r) => r.materialType) && !!category

  const stepQty = (delta: number) =>
    setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity + delta) }))

  const updateRow = (id: string, patch: Partial<MaterialRow>) =>
    setMaterialRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = (id: string) =>
    setMaterialRows((rows) => rows.filter((r) => r.id !== id))
  const addRow = () =>
    setMaterialRows((rows) => [...rows, newRow()])

  const selectedTypes = materialRows.map((r) => r.materialType).filter(Boolean)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5))
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const buildSizeString = (): string => {
    if (category === 'NHAN') {
      const s = ringSize === 'other' ? ringSizeCustom : ringSize
      return s ? `Size nhẫn: ${s}` : ''
    }
    if (category === 'DAY_CHUYEN') {
      const s = necklaceSize === 'other' ? necklaceSizeCustom : necklaceSize
      return s ? `Dài: ${s}` : ''
    }
    if (category === 'VONG_LAC_TAY') {
      const s = braceletSize === 'other' ? braceletSizeCustom : braceletSize
      return s ? `Chu vi: ${s}` : ''
    }
    if (category === 'LAC_CHAN') {
      const s = ankletSize === 'other' ? ankletSizeCustom : ankletSize
      return s ? `Chu vi: ${s}` : ''
    }
    return ''
  }

  const handleSubmit = async () => {
    setTouched({ productName: true, materials: true, category: true })
    if (!isValid) return
    setLoading(true)

    const filledRows    = materialRows.filter((r) => r.materialType)
    const materialSummary = filledRows.map((r) => {
      const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
      return `${opt?.label ?? r.materialType}${r.weight ? ` – ${r.weight} ${r.unit}` : ''}`
    }).join('; ')

    const primaryMaterial = filledRows[0].materialType as Quote['materialType']
    const weightNotes = filledRows.filter((r) => r.weight).map((r) => {
      const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
      return `${opt?.label}: ${r.weight} ${r.unit}`
    }).join(', ')

    const catLabel   = PRODUCT_CATEGORIES.find((c) => c.value === category)?.label ?? ''
    const sizeStr    = buildSizeString()
    const stoneLabel = STONE_OPTIONS.find((s) => s.value === stoneType)?.label ?? ''
    const stoneReq   = [stoneLabel, stoneNote].filter(Boolean).join(' – ')
    const dimensionParts = [catLabel && `Loại: ${catLabel}`, sizeStr, weightNotes].filter(Boolean)

    try {
      const quote = await quotesApi.create({
        productName:        form.productName,
        materialType:       primaryMaterial,
        productDescription: form.productDescription,
        dimensions:         dimensionParts.join(' | ') || undefined,
        stoneRequirements:  stoneReq || undefined,
        quantity:           form.quantity,
        deadline:           deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : '',
        notes:              [filledRows.length > 1 ? `Chất liệu: ${materialSummary}` : '', form.notes].filter(Boolean).join('\n'),
        images:             previews.map((p) => p.file),
        requestedBy:        requesterName,
      })
      resetForm()
      setOpen(false)
      addNotification({ type: 'success', title: 'Đã gửi yêu cầu báo giá!', message: `Mã yêu cầu: ${quote.quoteCode || ''}. NV báo giá sẽ xử lý sớm nhất.` })
      onSuccess?.(quote)
    } catch (err) {
      console.error(err)
      addNotification({ type: 'error', title: 'Tạo yêu cầu thất bại', message: 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ productName: '', productDescription: '', quantity: 1, notes: '' })
    setMaterialRows([newRow()])
    setDeadlineDate(undefined)
    setTouched({})
    setCategory('')
    setRingSize(''); setRingSizeCustom('')
    setNecklaceSize(''); setNecklaceSizeCustom('')
    setBraceletSize(''); setBraceletSizeCustom('')
    setAnkletSize(''); setAnkletSizeCustom('')
    setStoneType(''); setStoneNote('')
    setPreviews((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.url)); return [] })
  }

  // ── Sub-components ────────────────────────────────────────────
  const FieldLabel = ({
    children, required, hint,
  }: { children: React.ReactNode; required?: boolean; hint?: string }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
      <label style={{
        fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.09em',
        textTransform: 'uppercase' as const, color: TEXT_SEC,
      }}>
        {children}
        {required && <span style={{ color: ERROR, marginLeft: '3px' }}>*</span>}
      </label>
      {hint && (
        <span style={{ fontSize: '11px', color: TEXT_MUTED, fontWeight: 400, textTransform: 'none' as const, letterSpacing: 0 }}>
          {hint}
        </span>
      )}
    </div>
  )

  const Chip = ({
    label, selected, onClick,
  }: { label: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        padding: '5px 13px',
        borderRadius: '8px',
        border: selected ? `1.5px solid ${GOLD}` : `1.5px solid ${BORDER}`,
        background: selected ? GOLD_LIGHT : 'white',
        color: selected ? GOLD_DARK : TEXT_SEC,
        fontSize: '12.5px',
        fontWeight: selected ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  )

  const CatChip = ({
    value, label, icon,
  }: { value: ProductCategory; label: string; icon: string }) => {
    const selected = category === value
    return (
      <button
        type="button"
        onClick={() => handleCategoryChange(value)}
        aria-pressed={selected}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '12px 8px',
          borderRadius: '12px',
          border: selected ? `2px solid ${GOLD}` : `1.5px solid ${BORDER}`,
          background: selected ? GOLD_LIGHT : 'white',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: selected ? `0 0 0 4px ${GOLD_GLOW}` : 'none',
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontSize: '11.5px',
          fontWeight: selected ? 700 : 400,
          color: selected ? GOLD_DARK : TEXT_MUTED,
          whiteSpace: 'nowrap' as const,
          letterSpacing: '0.01em',
        }}>
          {label}
        </span>
      </button>
    )
  }

  const fieldStyle = {
    width: '100%',
    padding: '9px 13px',
    borderRadius: '10px',
    border: `1.5px solid ${BORDER}`,
    background: 'white',
    fontSize: '13.5px',
    color: TEXT_PRI,
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        [data-slot="dialog-content"].qrm-dialog {
          border-radius: 20px !important;
          border: 1px solid ${BORDER} !important;
          box-shadow: 0 40px 100px -16px rgba(0,0,0,0.22), 0 8px 32px -8px rgba(0,0,0,0.1) !important;
          padding: 0 !important;
          width: min(900px, calc(100vw - 32px)) !important;
          max-width: min(900px, calc(100vw - 32px)) !important;
          max-height: 90vh !important;
          overflow: hidden !important;
          font-family: 'DM Sans', sans-serif !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .qrm-scroll {
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
        .qrm-scroll::-webkit-scrollbar { width: 5px; }
        .qrm-scroll::-webkit-scrollbar-track { background: transparent; }
        .qrm-scroll::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 4px; }

        .qrm-input:focus,
        .qrm-textarea:focus {
          border-color: ${GOLD} !important;
          box-shadow: 0 0 0 3px ${GOLD_GLOW} !important;
          outline: none !important;
        }

        .qrm-select [data-slot="select-trigger"] {
          border-radius: 10px !important;
          border: 1.5px solid ${BORDER} !important;
          font-size: 13px !important;
          font-family: 'DM Sans', sans-serif !important;
          height: 40px !important;
          padding: 0 12px !important;
        }
        .qrm-select [data-slot="select-trigger"]:focus-within {
          border-color: ${GOLD} !important;
          box-shadow: 0 0 0 3px ${GOLD_GLOW} !important;
        }

        .qrm-img-add:hover {
          border-color: ${GOLD} !important;
          background: ${GOLD_LIGHT} !important;
          color: ${GOLD} !important;
        }

        .qrm-cancel-btn:hover {
          background: ${SURFACE2} !important;
          border-color: #D0C8BB !important;
        }

        .qrm-submit-btn:hover:not(:disabled) {
          background: ${GOLD_DARK} !important;
          box-shadow: 0 6px 20px ${GOLD}55 !important;
          transform: translateY(-1px);
        }

        .qrm-del-btn:hover:not(:disabled) {
          border-color: #FCCACA !important;
          background: #FFF5F5 !important;
          color: #D94040 !important;
        }

        .qrm-rm-img:hover {
          opacity: 1 !important;
          background: rgba(217, 64, 64, 0.8) !important;
        }

        .qrm-add-mat:hover {
          background: ${GOLD_LIGHT} !important;
          border-color: ${GOLD} !important;
        }

        @keyframes qrm-spin { to { transform: rotate(360deg); } }
        .qrm-spin { animation: qrm-spin 0.9s linear infinite; }
      `}</style>

      <Dialog open={open} onOpenChange={(o) => { if (!loading) { setOpen(o); if (!o) resetForm() } }}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo yêu cầu báo giá
          </Button>
        </DialogTrigger>

          <DialogContent className="qrm-dialog" showCloseButton={false}>

            {/* ══ HEADER ══════════════════════════════════════════════ */}
            <div style={{
              padding: '20px 28px',
              background: `linear-gradient(120deg, ${GOLD_LIGHT} 0%, #FFFDF7 55%, white 100%)`,
              borderBottom: `1px solid ${BORDER_SOFT}`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              {/* Icon */}
              <div style={{
                width: '42px', height: '42px', borderRadius: '13px', flexShrink: 0,
                background: `linear-gradient(135deg, #E8C44A, ${GOLD})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 14px ${GOLD}44`,
              }}>
                <FileText style={{ width: '18px', height: '18px', color: 'white' }} />
              </div>

              {/* Title */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: TEXT_PRI,
                  fontFamily: "'Lora', serif",
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}>
                  Tạo yêu cầu báo giá
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: TEXT_MUTED }}>
                  Điền đầy đủ để NV xử lý nhanh nhất
                </p>
              </div>

              {/* Requester badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'white',
                border: `1px solid ${BORDER}`,
                borderRadius: '999px',
                padding: '5px 12px',
                flexShrink: 0,
              }}>
                <Sparkles style={{ width: '12px', height: '12px', color: GOLD }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_SEC }}>{requesterName}</span>
              </div>
            </div>

            {/* ══ BODY ════════════════════════════════════════════════ */}
            <div className="qrm-scroll">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
              }}>

                {/* ── CỘT TRÁI ──────────────────────────────── */}
                <div style={{
                  padding: '24px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
                  borderRight: `1px solid ${BORDER_SOFT}`,
                }}>

                  {/* Tên sản phẩm */}
                  <div>
                    <FieldLabel required>Tên sản phẩm</FieldLabel>
                    <input
                      className="qrm-input"
                      placeholder="VD: Nhẫn kim cương, Dây chuyền vàng..."
                      value={form.productName}
                      onChange={setAndTouch('productName')}
                      onBlur={() => touch('productName')}
                      aria-invalid={!!errors.productName}
                      style={{
                        ...fieldStyle,
                        borderColor: errors.productName ? ERROR : BORDER,
                        boxShadow: errors.productName ? `0 0 0 3px ${ERROR}18` : undefined,
                      }}
                    />
                    {errors.productName && (
                      <p role="alert" style={{ margin: '5px 0 0', fontSize: '11.5px', color: ERROR }}>
                        {errors.productName}
                      </p>
                    )}
                  </div>

                  {/* Loại sản phẩm */}
                  <div>
                    <FieldLabel required>Loại sản phẩm</FieldLabel>
                    <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label="Loại sản phẩm">
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <CatChip key={cat.value} {...cat} />
                      ))}
                    </div>
                    {errors.category && (
                      <p role="alert" style={{ margin: '6px 0 0', fontSize: '11.5px', color: ERROR }}>
                        {errors.category}
                      </p>
                    )}
                  </div>

                  {/* Size theo loại */}
                  <AnimatePresence mode="wait">
                    {category && (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                        style={{
                          borderRadius: '12px',
                          border: `1.5px solid ${GOLD}44`,
                          background: GOLD_LIGHT,
                          padding: '14px 16px',
                        }}
                      >
                        <p style={{
                          margin: '0 0 10px',
                          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: GOLD_DARK,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          <span style={{ display: 'inline-block', width: '16px', height: '1.5px', background: GOLD, borderRadius: '2px', verticalAlign: 'middle' }} />
                          {category === 'NHAN' && 'Size nhẫn'}
                          {category === 'DAY_CHUYEN' && 'Chiều dài dây chuyền'}
                          {category === 'VONG_LAC_TAY' && 'Chu vi vòng / lắc tay'}
                          {category === 'LAC_CHAN' && 'Chu vi lắc chân'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} role="group">
                          {(category === 'NHAN' ? RING_SIZES
                            : category === 'DAY_CHUYEN' ? NECKLACE_SIZES
                            : category === 'VONG_LAC_TAY' ? BRACELET_SIZES
                            : ANKLET_SIZES
                          ).map((s) => {
                            const cur = category === 'NHAN' ? ringSize : category === 'DAY_CHUYEN' ? necklaceSize : category === 'VONG_LAC_TAY' ? braceletSize : ankletSize
                            const setCur = category === 'NHAN' ? setRingSize : category === 'DAY_CHUYEN' ? setNecklaceSize : category === 'VONG_LAC_TAY' ? setBraceletSize : setAnkletSize
                            const setCustom = category === 'NHAN' ? setRingSizeCustom : category === 'DAY_CHUYEN' ? setNecklaceSizeCustom : category === 'VONG_LAC_TAY' ? setBraceletSizeCustom : setAnkletSizeCustom
                            return (
                              <Chip key={s} label={s} selected={cur === s}
                                onClick={() => { setCur(s); setCustom('') }} />
                            )
                          })}
                          {(() => {
                            const cur = category === 'NHAN' ? ringSize : category === 'DAY_CHUYEN' ? necklaceSize : category === 'VONG_LAC_TAY' ? braceletSize : ankletSize
                            const setCur = category === 'NHAN' ? setRingSize : category === 'DAY_CHUYEN' ? setNecklaceSize : category === 'VONG_LAC_TAY' ? setBraceletSize : setAnkletSize
                            const customVal = category === 'NHAN' ? ringSizeCustom : category === 'DAY_CHUYEN' ? necklaceSizeCustom : category === 'VONG_LAC_TAY' ? braceletSizeCustom : ankletSizeCustom
                            const setCustom = category === 'NHAN' ? setRingSizeCustom : category === 'DAY_CHUYEN' ? setNecklaceSizeCustom : category === 'VONG_LAC_TAY' ? setBraceletSizeCustom : setAnkletSizeCustom
                            return (
                              <>
                                <Chip label="Khác" selected={cur === 'other'} onClick={() => setCur('other')} />
                                {cur === 'other' && (
                                  <input
                                    className="qrm-input"
                                    placeholder="Nhập kích thước..."
                                    value={customVal}
                                    onChange={(e) => setCustom(e.target.value)}
                                    style={{ ...fieldStyle, marginTop: '8px', background: 'white', width: '100%' }}
                                  />
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mô tả */}
                  <div>
                    <FieldLabel>Mô tả sản phẩm</FieldLabel>
                    <textarea
                      className="qrm-textarea"
                      placeholder="Mô tả kiểu dáng, yêu cầu đặc biệt..."
                      rows={3}
                      value={form.productDescription}
                      onChange={set('productDescription')}
                      style={{ ...fieldStyle, resize: 'vertical', lineHeight: '1.6', minHeight: '82px' }}
                    />
                  </div>

                  {/* Ảnh */}
                  <div>
                    <FieldLabel hint="tối đa 5">Hình ảnh</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <AnimatePresence>
                        {previews.map((p, i) => (
                          <motion.div
                            key={p.url}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              position: 'relative', width: '68px', height: '68px',
                              borderRadius: '10px', overflow: 'hidden',
                              border: `1.5px solid ${BORDER}`, flexShrink: 0,
                            }}
                          >
                            <img src={p.url} alt={`Ảnh ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              className="qrm-rm-img"
                              aria-label={`Xoá ảnh ${i + 1}`}
                              onClick={() => removeImage(i)}
                              style={{
                                position: 'absolute', top: '3px', right: '3px',
                                width: '19px', height: '19px', borderRadius: '50%',
                                background: 'rgba(0,0,0,0.45)', color: 'white',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0.9, transition: 'all 0.15s',
                              }}
                            >
                              <X style={{ width: '10px', height: '10px' }} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {previews.length < 5 && (
                        <button
                          type="button"
                          className="qrm-img-add"
                          aria-label="Thêm ảnh"
                          onClick={() => fileRef.current?.click()}
                          style={{
                            width: '68px', height: '68px', borderRadius: '10px',
                            border: `2px dashed ${BORDER}`,
                            background: SURFACE, cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '4px', color: TEXT_MUTED, transition: 'all 0.15s',
                          }}
                        >
                          <ImageIcon style={{ width: '18px', height: '18px' }} />
                          <span style={{ fontSize: '10.5px' }}>Thêm</span>
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                    </div>
                  </div>
                </div>

                {/* ── CỘT PHẢI ──────────────────────────────── */}
                <div style={{
                  padding: '24px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
                  background: SURFACE,
                }}>

                  {/* Chất liệu */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <FieldLabel required>Chất liệu</FieldLabel>
                      {materialRows.length < MATERIAL_OPTIONS.length && (
                        <button
                          type="button"
                          className="qrm-add-mat"
                          onClick={addRow}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '11.5px', fontWeight: 600, color: GOLD_DARK,
                            background: 'white',
                            border: `1px solid ${BORDER}`,
                            cursor: 'pointer',
                            padding: '4px 10px', borderRadius: '8px',
                            transition: 'all 0.15s',
                            marginBottom: '8px',
                          }}
                        >
                          <Layers style={{ width: '11px', height: '11px' }} />
                          Thêm chất liệu
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="qrm-select">
                      <AnimatePresence initial={false}>
                        {materialRows.map((row, idx) => (
                          <motion.div
                            key={row.id}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.14 }}
                          >
                            {/* Sub-header for 2nd+ rows */}
                            {idx > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <div style={{ height: '1px', flex: 1, background: BORDER }} />
                                <span style={{ fontSize: '10px', color: TEXT_MUTED, letterSpacing: '0.07em' }}>CHẤT LIỆU {idx + 1}</span>
                                <div style={{ height: '1px', flex: 1, background: BORDER }} />
                              </div>
                            )}

                            {/* Row header labels (first row only) */}
                            {idx === 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 64px 36px', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10.5px', color: TEXT_MUTED }}>Loại</span>
                                <span style={{ fontSize: '10.5px', color: TEXT_MUTED }}>Trọng lượng</span>
                                <span style={{ fontSize: '10.5px', color: TEXT_MUTED }}>Đơn vị</span>
                                <span />
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 64px 36px', gap: '6px', alignItems: 'center' }}>
                              <Select
                                value={row.materialType}
                                onValueChange={(v) => { updateRow(row.id, { materialType: v as MaterialValue }); touch('materials') }}
                              >
                                <SelectTrigger className={cn(errors.materials && !row.materialType && 'border-destructive')}>
                                  <SelectValue placeholder="Chọn loại..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {MATERIAL_OPTIONS.map((opt) => {
                                    if (selectedTypes.includes(opt.value) && row.materialType !== opt.value) return null
                                    return <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  })}
                                </SelectContent>
                              </Select>

                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="2.5"
                                className="qrm-input"
                                value={row.weight}
                                onChange={(e) => updateRow(row.id, { weight: e.target.value.replace(/[^0-9.]/g, '') })}
                                style={{ ...fieldStyle, textAlign: 'right', padding: '8px 10px', fontSize: '13px' }}
                              />

                              <Select value={row.unit} onValueChange={(v) => updateRow(row.id, { unit: v as 'chi' | 'gram' })}>
                                <SelectTrigger className="px-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="chi">Chỉ</SelectItem>
                                  <SelectItem value="gram">Gram</SelectItem>
                                </SelectContent>
                              </Select>

                              <button
                                type="button"
                                className="qrm-del-btn"
                                disabled={materialRows.length === 1}
                                onClick={() => removeRow(row.id)}
                                aria-label={`Xoá chất liệu ${idx + 1}`}
                                style={{
                                  width: '36px', height: '36px', borderRadius: '9px',
                                  border: `1.5px solid ${BORDER}`, background: 'white',
                                  cursor: materialRows.length === 1 ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: materialRows.length === 1 ? BORDER : TEXT_MUTED,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <X style={{ width: '13px', height: '13px' }} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {errors.materials && (
                      <p role="alert" style={{ margin: '6px 0 0', fontSize: '11.5px', color: ERROR }}>{errors.materials}</p>
                    )}

                    {/* Material summary chips */}
                    {(() => {
                      const filled = materialRows.filter((r) => r.materialType)
                      if (filled.length <= 1) return null
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                          {filled.map((r) => {
                            const opt = MATERIAL_OPTIONS.find((o) => o.value === r.materialType)
                            return (
                              <span key={r.id} style={{
                                fontSize: '11.5px', padding: '3px 10px', borderRadius: '6px',
                                background: GOLD_LIGHT, color: GOLD_DARK, fontWeight: 600,
                                border: `1px solid ${GOLD}44`,
                              }}>
                                {opt?.label}{r.weight && ` · ${r.weight} ${r.unit}`}
                              </span>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Yêu cầu đá */}
                  <div>
                    <FieldLabel>Yêu cầu đá / phụ kiện</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }} role="group" aria-label="Loại đá">
                      {STONE_OPTIONS.map((s) => (
                        <Chip key={s.value} label={s.label} selected={stoneType === s.value}
                          onClick={() => setStoneType(stoneType === s.value ? '' : s.value)} />
                      ))}
                    </div>
                    <input
                      className="qrm-input"
                      placeholder="Ghi chú (VD: 0.3ct, màu D, VS1...)"
                      value={stoneNote}
                      onChange={(e) => setStoneNote(e.target.value)}
                      style={fieldStyle}
                    />
                  </div>

                  {/* Số lượng + Deadline */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Số lượng */}
                    <div>
                      <FieldLabel>Số lượng</FieldLabel>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        border: `1.5px solid ${BORDER}`,
                        borderRadius: '10px', overflow: 'hidden', background: 'white',
                        height: '40px',
                      }}>
                        <button
                          type="button"
                          onClick={() => stepQty(-1)}
                          disabled={form.quantity <= 1}
                          aria-label="Giảm"
                          style={{
                            width: '38px', height: '100%', border: 'none',
                            background: 'transparent',
                            cursor: form.quantity <= 1 ? 'not-allowed' : 'pointer',
                            color: form.quantity <= 1 ? BORDER : TEXT_MUTED,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            borderRight: `1px solid ${BORDER_SOFT}`,
                            transition: 'color 0.15s',
                          }}
                        >
                          <Minus style={{ width: '13px', height: '13px' }} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={form.quantity}
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, '')) || 1
                            setForm((f) => ({ ...f, quantity: Math.max(1, n) }))
                          }}
                          style={{
                            flex: 1, border: 'none', outline: 'none', textAlign: 'center',
                            fontSize: '14px', fontWeight: 600, color: TEXT_PRI,
                            background: 'transparent', fontFamily: 'inherit',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => stepQty(1)}
                          aria-label="Tăng"
                          style={{
                            width: '38px', height: '100%', border: 'none',
                            background: 'transparent', cursor: 'pointer', color: TEXT_MUTED,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            borderLeft: `1px solid ${BORDER_SOFT}`,
                            transition: 'color 0.15s',
                          }}
                        >
                          <Plus style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div>
                      <FieldLabel>Deadline</FieldLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            style={{
                              ...fieldStyle,
                              display: 'flex', alignItems: 'center', gap: '8px',
                              cursor: 'pointer',
                              color: deadlineDate ? TEXT_PRI : TEXT_MUTED,
                              height: '40px',
                              background: 'white',
                            }}
                          >
                            <CalendarIcon style={{ width: '14px', height: '14px', flexShrink: 0, color: GOLD }} />
                            <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {deadlineDate ? format(deadlineDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày...'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={deadlineDate}
                            onSelect={(d) => { setDeadlineDate(d); setCalendarOpen(false) }}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || d > MAX_DEADLINE}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <FieldLabel>Ghi chú cho NV báo giá</FieldLabel>
                    <textarea
                      className="qrm-textarea"
                      placeholder="Thông tin thêm, yêu cầu đặc biệt..."
                      rows={3}
                      value={form.notes}
                      onChange={set('notes')}
                      style={{ ...fieldStyle, resize: 'vertical', lineHeight: '1.6', minHeight: '82px' }}
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* ══ FOOTER ══════════════════════════════════════════════ */}
            <div style={{
              padding: '14px 26px',
              borderTop: `1px solid ${BORDER_SOFT}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'white',
              flexShrink: 0,
            }}>
              {/* Completion hint */}
              {!isValid && (
                <span style={{ fontSize: '12px', color: TEXT_MUTED, marginRight: 'auto' }}>
                  {!form.productName.trim() ? '① Nhập tên sản phẩm' : !category ? '② Chọn loại sản phẩm' : '③ Chọn chất liệu'}
                </span>
              )}

              <button
                type="button"
                className="qrm-cancel-btn"
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  padding: '9px 20px', borderRadius: '10px',
                  border: `1.5px solid ${BORDER}`, background: 'white',
                  fontSize: '13.5px', fontWeight: 500, color: TEXT_SEC,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Huỷ
              </button>

              <button
                type="button"
                className="qrm-submit-btn"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: '9px 24px', borderRadius: '10px',
                  border: 'none',
                  background: GOLD,
                  fontSize: '13.5px', fontWeight: 600, color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  boxShadow: `0 4px 16px ${GOLD}44`,
                  transition: 'all 0.18s',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 style={{ width: '14px', height: '14px' }} className="qrm-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Upload style={{ width: '14px', height: '14px' }} />
                    Gửi yêu cầu
                  </>
                )}
              </button>
            </div>

          </DialogContent>
      </Dialog>
    </>
  )
}
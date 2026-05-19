# Jewelry Pricing Tool — FE Improvements

Paste từng file vào đúng đường dẫn trong project của bạn.

## Danh sách file đã sửa

| File đính kèm | Đặt vào project tại |
|---|---|
| `styles/globals.css` | `Jewelry-Pricing-Tool-FE/styles/globals.css` |
| `components/ui/select.tsx` | `Jewelry-Pricing-Tool-FE/components/ui/select.tsx` |
| `components/quote-request-modal.tsx` | `Jewelry-Pricing-Tool-FE/components/quote-request-modal.tsx` |
| `components/gold-calculator.tsx` | `Jewelry-Pricing-Tool-FE/components/gold-calculator.tsx` |
| `components/silver-calculator.tsx` | `Jewelry-Pricing-Tool-FE/components/silver-calculator.tsx` |
| `components/stone-calculator.tsx` | `Jewelry-Pricing-Tool-FE/components/stone-calculator.tsx` |

## Cài thêm 1 package (bắt buộc cho Calendar date picker)

```bash
cd Jewelry-Pricing-Tool-FE
npm install date-fns
```
> `date-fns` dùng để format ngày trong Calendar Popover. Nếu đã có rồi thì bỏ qua.

## Tóm tắt thay đổi

### ① globals.css — Theme màu vàng gold
- Đổi toàn bộ `--primary` và palette từ neutral gray sang warm gold (`oklch(0.72 0.13 85)`)
- Background có tông ấm nhẹ, border/ring màu vàng
- Dark mode cũng được cập nhật tương tự

### ② components/ui/select.tsx — Fix w-fit → w-full
- `SelectTrigger` đổi `w-fit` thành `w-full` để Select fill đúng container
- Đặc biệt quan trọng khi dùng trong grid 2 cột (form chất liệu)

### ③ components/quote-request-modal.tsx — Date picker + Stepper + Inline errors
- **Deadline**: thay `<Input type="date">` bằng `Calendar + Popover` (shadcn) — nhất quán design system, hiển thị dd/MM/yyyy tiếng Việt
- **Số lượng**: thay `<Input type="number">` bằng stepper +/− button — UX tốt hơn trên mobile
- **Inline errors**: thêm validation `blur` cho "Tên sản phẩm" và "Chất liệu" với message đỏ dưới field

### ④ gold-calculator.tsx + silver-calculator.tsx + stone-calculator.tsx — Currency formatting
- Tất cả input tiền tệ (giá vàng, tiền công, tiền đá, giá vốn, giá bán) đều có thousand-separator tự động
- Thêm ký hiệu `đ` ở cuối field
- Dùng `inputMode="numeric"` thay `type="number"` để tránh spinner xấu trên mobile

### ⑤ Giảm animation (gold + silver calculator)
- Xóa tất cả `repeat: Infinity` pulse/rotate animations trên icon
- Xóa stagger delay 0.1–0.9s cho từng dòng kết quả
- Giữ lại transition enter/exit quan trọng (fade + slide nhẹ, duration ≤ 0.35s)
- Giá bán đề xuất vẫn có micro-animation khi giá trị thay đổi

# UI-Kit: CRM_FE (Single Source of Truth)

Tài liệu này là nguồn tham chiếu duy nhất về thiết kế (Design System) và phát triển giao diện (Frontend Architecture) cho dự án CRM_FE. Được thiết kế tối ưu cho cả Con người (Designer, Developer) và các Trợ lý lập trình AI (Gemini, Claude, ChatGPT, Cursor, Windsurf).

---

## 1. Design Principles

### Triết lý thiết kế (Design Philosophy)
- **Data-First (Ưu tiên dữ liệu):** Giao diện CRM được thiết kế để hiển thị thông tin phức tạp một cách rõ ràng và khoa học. Giảm thiểu "noise" thị giác để người dùng tập trung vào dữ liệu quan trọng.
- **Efficiency (Hiệu suất tối đa):** Giảm thiểu số click chuột, tối ưu hóa di chuyển phím tắt và tốc độ tải trang.
- **Accessibility-First:** Mọi component và tương tác đều được thiết kế tuân thủ tiêu chuẩn tiếp cận WCAG AA.

### Tone & Feel
- **Chuyên nghiệp & Tin cậy:** Sử dụng phông chữ Roboto hiện đại, màu sắc dịu mắt, độ tương phản cao.
- **Chính xác & Rõ ràng:** Các đường phân cách sắc nét, lưới layout chặt chẽ và nhất quán.

### UX Guidelines
- **Phản hồi tức thì (Instant Feedback):** Mọi hành động click, hover, loading hay lưu dữ liệu phải có phản hồi thị giác trong vòng 150ms.
- **Bảo toàn dữ liệu (Data Preservation):** Không bao giờ làm mất dữ liệu của khách hàng khi chuyển trang hoặc xảy ra lỗi mạng. Sử dụng cơ chế lưu nháp tự động hoặc cảnh báo rời trang nếu form chưa lưu.

---

## 2. Color System

Dự án sử dụng dải màu cố định cho các yếu tố giao diện chuẩn và hệ màu **OKLCH** cho các token ngữ nghĩa (Semantic Tokens) để tự động hóa hỗ trợ Dark Mode.

### Neutral Colors (Dải màu trung tính)
| Biến CSS | Hex | RGB | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| `--white` | `#ffffff` | `255, 255, 255` | Nền trắng chính, nền thẻ |
| `--n-50` | `#f9fafb` | `249, 250, 251` | Nền phụ, hover nhẹ |
| `--n-100` | `#f3f4f6` | `243, 244, 246` | Nền ứng dụng chính, nền phân vùng |
| `--n-200` | `#e5e7eb` | `229, 231, 235` | Đường viền border mặc định |
| `--n-300` | `#d1d5db` | `209, 213, 223` | Đường viền hover, scrollbar thumb |
| `--n-400` | `#9ca3af` | `156, 163, 175` | Text phụ (Muted text), icon vô hiệu |
| `--n-500` | `#6b7280` | `107, 114, 128` | Text phụ thứ cấp, nhãn phụ |
| `--n-600` | `#4b5563` | `75, 85, 99` | Text chính thứ cấp, nhãn form |
| `--n-700` | `#374151` | `55, 65, 81` | Text trạng thái, menu phụ |
| `--n-800` | `#1f2937` | `31, 41, 55` | Text nội dung chính, tiêu đề phụ |
| `--n-900` | `#111827` | `17, 24, 39` | Tiêu đề chính, tiêu đề trang |
| `--n-950` | `#030712` | `3, 7, 18` | Nền cực tối (Chỉ dùng trong Dark Mode) |

### Functional Colors (Màu sắc chức năng)
| Biến CSS | Hex | RGB | Sử dụng |
| :--- | :--- | :--- | :--- |
| **Success (Thành công)** | | | |
| `--success-50` | `#f0fdf4` | `240, 253, 244` | Nền thông báo thành công |
| `--success-100` | `#dcfce7` | `220, 252, 231` | Badge nền thành công |
| `--success-500` | `#22c55e` | `34, 197, 94` | Trạng thái hoạt động, icon thành công |
| `--success-600` | `#16a34a` | `22, 163, 74` | Text thành công, viền thông báo |
| **Warning (Cảnh báo)** | | | |
| `--warning-50` | `#fffbeb` | `255, 251, 235` | Nền cảnh báo |
| `--warning-100` | `#fef3c7` | `254, 243, 199` | Badge nền cảnh báo |
| `--warning-500` | `#f59e0b` | `245, 158, 11` | Icon cảnh báo, trạng thái chờ |
| `--warning-600` | `#d97706` | `217, 119, 6` | Text cảnh báo, viền cảnh báo |
| **Danger (Nguy hiểm/Lỗi)** | | | |
| `--danger-50` | `#fef2f2` | `254, 242, 242` | Nền lỗi/nguy hiểm |
| `--danger-100` | `#fee2e2` | `254, 226, 226` | Badge lỗi |
| `--danger-500` | `#ef4444` | `239, 68, 68` | Icon lỗi, nút hành động nguy hiểm |
| `--danger-600` | `#dc2626` | `220, 38, 38` | Text lỗi, trạng thái huỷ bỏ |

### Semantic OKLCH Colors (Tự động thích ứng Dark Mode)
Các biến CSS này được định cấu hình bằng OKLCH trong `src/index.css` và tự động đảo ngược giá trị khi chuyển lớp `.dark`:
- `--primary`: Màu sắc thương hiệu chính (Light Mode: tối, Dark Mode: sáng).
- `--primary-foreground`: Màu chữ trên nền primary.
- `--background`: Nền chính của toàn app.
- `--foreground`: Màu chữ chính trên toàn app.
- `--card`: Nền của các widget/card.
- `--card-foreground`: Màu chữ trên card.
- `--border`: Màu đường viền chuẩn.
- `--input`: Màu đường viền input.
- `--ring`: Màu của viền focus.

---

## 3. Typography

Dự án áp dụng thang đo phông chữ Roboto chặt chẽ để đảm bảo tính phân cấp thông tin rõ ràng.

### Typography Scale
| Tailwind Class | Font Size | Line Height | Font Weight | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `text-xs` | `11px` (0.785rem) | `16px` (1.45) | `400` / `500` | Thẻ nhãn phụ, ngày tháng, caption dưới bảng |
| `text-sm` | `13px` (0.928rem) | `20px` (1.54) | `400` / `500` / `600`| Text nội dung chính, nhãn form, text trong bảng |
| `text-base` | `15px` (1.07rem) | `22px` (1.46) | `400` / `500` / `600`| Tiêu đề mục nhỏ, văn bản chính trong mô tả |
| `text-lg` | `18px` (1.28rem) | `26px` (1.44) | `600` / `700` | Tiêu đề card, tiêu đề nhóm thông tin |
| `text-xl` | `21px` (1.5rem) | `28px` (1.33) | `700` / `800` | Tiêu đề trang chính, giá trị KPI nổi bật |
| `text-2xl` | `24px` (1.71rem) | `32px` (1.33) | `800` | Tiêu đề lớn (Dashboard / Report chính) |

- **Font Family:** `Roboto`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`.
- **Cơ sở thiết lập:** `html { font-size: 14px; -webkit-font-smoothing: antialiased; }`

---

## 4. Spacing System (4px Grid)

Hệ thống Spacing tuân thủ nghiêm ngặt bội số của `4px` để duy trì sự cân bằng về mặt thị giác.

| Thang đo (Tailwind Scale) | Kích thước thực tế | Quy tắc sử dụng |
| :--- | :--- | :--- |
| `1` (`0.25rem`) | `4px` | Khoảng cách cực nhỏ (khoảng cách giữa icon và text) |
| `2` (`0.5rem`) | `8px` | Padding trong input, margin giữa các nút nhỏ |
| `3` (`0.75rem`) | `12px` | Padding của card nhỏ, gap trong danh sách ngắn |
| `4` (`1rem`) | `16px` | Padding chuẩn của Card, Gap mặc định giữa các cột |
| `5` (`1.25rem`) | `20px` | Padding chính của Layout (`.app-content`), khoảng cách giữa các phần lớn |
| `6` (`1.5rem`) | `24px` | Margin dưới tiêu đề trang, khoảng cách giữa các widget chính |
| `8` (`2rem`) | `32px` | Khoảng cách phân chia các khu vực nội dung độc lập |
| `12` (`3rem`) | `48px` | Khoảng cách lề cực lớn trong các trang chào mừng / Landing |

---

## 5. Border Radius

Các giá trị bo góc đồng bộ giúp xây dựng cảm giác mềm mại nhưng chuyên nghiệp.

- **`--radius-sm` (4px):** Dùng cho checkbox, các tag trạng thái nhỏ, scrollbar thumb.
- **`--radius-md` (6px):** Dùng cho Button, Input, Select, Tooltip.
- **`--radius-lg` (8px):** Dùng cho Card nhỏ, Dropdown menu, Popover.
- **`--radius-xl` (12px):** Dùng cho Card lớn, Modal, Drawer/Sheet, AI Widget.
- **`--radius-full` (9999px):** Dùng cho Avatar, Badge hình tròn hoàn toàn, Pill tag.

---

## 6. Shadows

Các lớp đổ bóng phân tách độ nổi vật lý (Elevation) của các thành phần giao diện.

- **`--shadow-card` (Độ nổi thấp - Level 1):**
  `0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`
  *Sử dụng cho:* Thẻ dữ liệu (Cards), bảng biểu, bộ lọc cố định trên màn hình.
- **`--shadow-md` (Độ nổi trung bình - Level 2):**
  `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)`
  *Sử dụng cho:* Dropdown menu, Popover, AI Widget, phần tử khi hover thẻ dữ liệu.
- **Độ nổi cao - Level 3 (Dialog/Modal/Drawer):**
  `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
  *Sử dụng cho:* Các hộp thoại chặn (Modal), Ngăn kéo trượt (Drawer).

---

## 7. Responsive System

Hệ thống breakpoint đáp ứng các kích thước màn hình làm việc phổ biến của nhân viên CRM.

### Breakpoints Table
| Breakpoint | Kích thước tối thiểu | Quy tắc sử dụng |
| :--- | :--- | :--- |
| `sm` | `640px` | Màn hình điện thoại xoay ngang |
| `md` | `768px` | Máy tính bảng (Tablet) dọc/ngang |
| `lg` | `1024px` | Máy tính bảng lớn hoặc Laptop nhỏ (Sidebar bắt đầu hiển thị cố định) |
| `xl` | `1280px` | Màn hình máy tính văn phòng tiêu chuẩn (Độ phân giải tối ưu nhất) |
| `2xl` | `1536px` | Màn hình máy tính lớn / Widescreen |

### Quy tắc thiết kế đáp ứng
- **Mobile-first:** Viết CSS/Tailwind cơ bản cho mobile trước, sau đó dùng `lg:` hoặc `xl:` để mở rộng bố cục nhiều cột.
- **Sidebar & Layout:**
  - Trên màn hình `< lg`, Sidebar mặc định ẩn và chỉ xuất hiện dạng Drawer khi nhấn nút menu.
  - Trên màn hình `>= lg`, Sidebar cố định ở lề trái với chiều rộng `210px` (`--sidebar-w`).

---

## 8. Layer / Z-index System

Hệ thống phân tầng Z-index ngăn ngừa lỗi chồng lấp giao diện (visual clipping).

| Cấp độ | Giá trị Z-index | Áp dụng cho các thành phần |
| :--- | :--- | :--- |
| `z-toast` | `1000` | Thông báo nổi (Toasts) - Phải luôn ở trên cùng |
| `z-dialog` | `900` | Hộp thoại (Dialogs/Modals) + Nền mờ (Overlay) |
| `z-drawer` | `800` | Ngăn kéo trượt (Sheets/Drawers) |
| `z-tooltip`| `700` | Chú thích công cụ (Tooltips) |
| `z-popover`| `600` | Popovers, Date Pickers, Select Dropdown mở rộng |
| `z-header` | `100` | Thanh tiêu đề trên (`.header`) |
| `z-sidebar`| `100` | Thanh điều hướng trái (`.sidebar`) |
| `z-base` | `1` | Phần tử có vị trí tương đối (relative elements) |

---

## 9. Component Inventory

Dưới đây là danh sách các component chuẩn của hệ thống, điều kiện sử dụng để đảm bảo tính nhất quán.

### Component Table
| Component | Mục đích sử dụng | Khi nào dùng | Khi nào KHÔNG dùng |
| :--- | :--- | :--- | :--- |
| **Button** | Kích hoạt hành động hoặc điều hướng | Gửi form, mở hộp thoại, thực hiện tác vụ | Thay thế liên kết văn bản đơn giản |
| **Input** | Nhập văn bản một dòng ngắn | Tên, Email, Số điện thoại, Mã định danh | Nhập mô tả dài nhiều dòng |
| **Textarea**| Nhập văn bản nhiều dòng | Nhập phản hồi, mô tả sản phẩm, ghi chú | Nhập dữ liệu ngắn có định dạng |
| **Select** | Chọn 1 giá trị duy nhất từ danh sách | Danh sách lựa chọn cố định `< 10` mục | Danh sách `> 10` mục hoặc có tìm kiếm |
| **Combobox**| Chọn giá trị kèm tính năng lọc tìm kiếm | Danh sách khách hàng, sản phẩm cực dài | Danh sách chỉ có dưới 5 lựa chọn đơn giản |
| **DatePicker**| Chọn ngày tháng từ lịch | Ngày sinh, lọc khoảng thời gian báo cáo | Nhập năm hoặc tháng đơn thuần |
| **Dialog** | Hộp thoại xác nhận hoặc form nhanh | Xác nhận xóa dữ liệu, Form thêm nhanh | Form đăng ký/quy trình dài nhiều bước |
| **Sheet** | Slide-out panel chi tiết | Xem chi tiết thông tin Khách hàng/Sản phẩm | Hiển thị thông báo ngắn gọn |
| **Tabs** | Phân nhóm nội dung cùng cấp | Chuyển đổi giữa Thông tin chung - Lịch sử mua hàng | Điều hướng sang các trang chức năng khác nhau |
| **Tooltip** | Giải thích bổ sung khi hover | Giải nghĩa cho icon-only button | Chứa thông tin quan trọng bắt buộc phải đọc |
| **DropdownMenu**| Menu hành động ngữ cảnh | Danh sách thao tác (Sửa, Xóa, Xuất dữ liệu) | Làm thanh menu điều hướng chính |
| **Avatar** | Đại diện trực quan cho tài khoản | Ảnh nhân viên, Khách hàng trong danh sách | Thay thế ảnh sản phẩm/ảnh minh họa |
| **Badge** | Hiển thị trạng thái hoặc nhãn phân loại | Trạng thái đơn hàng (Đang xử lý, Thất bại) | Làm nút bấm kích hoạt hành động |
| **Card** | Bao bọc nhóm thông tin độc lập | Widget Dashboard, khối thông tin liên hệ | Hiển thị dữ liệu dạng bảng lặp lại |
| **DataTable**| Hiển thị dữ liệu có cấu trúc lớn | Danh sách khách hàng kèm lọc, sắp xếp | Hiển thị dữ liệu dưới 3 bản ghi đơn giản |
| **Pagination**| Phân trang dữ liệu | Bảng dữ liệu có trên 20 bản ghi | Danh sách tin nhắn dạng chat |
| **Skeleton** | Trạng thái chờ tải dữ liệu | Placeholder khi gọi API danh sách, biểu đồ | Các hành động tương tác đồng bộ tức thì |
| **Toast** | Thông báo phản hồi không chặn | Xác nhận "Đã cập nhật", "Lỗi kết nối" | Yêu cầu người dùng lựa chọn Có/Không |

---

## 10. Form Guidelines

Mọi Form trong dự án phải tuân thủ cấu trúc chuẩn để đảm bảo sự mạch lạc và trải nghiệm người dùng tối ưu.

### Cấu trúc Form chuẩn (Form Layout & Spacing)
- **Spacing:** Sử dụng class `space-y-4` làm khoảng cách mặc định giữa các trường thông tin (form fields).
- **Yêu cầu bắt buộc (Required Fields):** Đánh dấu bằng dấu sao đỏ `*` sát bên phải nhãn (`text-danger-500`).
- **Nút hành động (Form Actions):** Luôn đặt ở góc dưới cùng bên phải của Form. Nút "Hủy" (Cancel) nằm trước nút "Lưu" (Save/Submit).

### Định dạng thành phần trong Form Field
- **Label (Nhãn):** `text-sm font-semibold text-n-700 mb-1.5 block`
- **Helper Text (Ghi chú phụ):** `text-xs text-n-500 mt-1 block`
- **Error Text (Thông báo lỗi):** `text-xs text-danger-600 mt-1 block anim-fade`
- **Focus State:** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

### Ví dụ cấu trúc mã React mẫu cho Form Field:
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-semibold text-n-700">
    Email Khách Hàng <span className="text-danger-500">*</span>
  </label>
  <input 
    type="email" 
    className="px-3 py-2 bg-white border border-n-200 rounded-md text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
    placeholder="customer@company.com"
  />
  <p className="text-xs text-n-500">Chúng tôi sẽ gửi hóa đơn điện tử vào email này.</p>
</div>
```

---

## 11. Table Guidelines

Bảng biểu là "trọng tâm" của hệ thống CRM. Cấu trúc bảng phải cực kỳ cô đọng thông tin nhưng dễ đọc.

### Các thông số kỹ thuật chuẩn
- **Độ cao dòng (Row Height):** Giới hạn từ `36px` đến `44px` (dense layout). Sử dụng class padding dọc `py-2` hoặc `py-2.5`.
- **Hành vi tiêu đề (Header Behavior):**
  - Luôn sử dụng `sticky top-0 bg-white dark:bg-n-900 z-10` để giữ tiêu đề khi cuộn dữ liệu.
  - Text trong thẻ `th` luôn viết hoa nhẹ, font-size `text-xs`, màu `text-n-500`, có thuộc tính `tracking-wider`.
- **Cột Thao tác (Action Column):** Luôn cố định ở phía ngoài cùng bên phải, sử dụng Dropdown Menu (icon ba chấm dọc `MoreVertical`) để gom các hành động.

### Sắp xếp & Lọc (Sorting & Filtering)
- Cột có tính năng sắp xếp phải có biểu tượng `ArrowUpDown` bên cạnh tiêu đề.
- Khi một cột đang được sắp xếp, biểu tượng đổi sang `ArrowUp` hoặc `ArrowDown` kèm màu sắc làm nổi bật (`text-primary-600`).

---

## 12. State Guidelines

Mọi màn hình và component bất đồng bộ đều phải xử lý đầy đủ 4 trạng thái trải nghiệm.

### 1. Loading State (Đang tải)
- **Quy tắc UX:** Không để màn hình trống trơn hoặc đơ. Luôn hiển thị Skeleton Loader có kích thước khớp chính xác với component thực tế sẽ hiển thị sau đó.
- Đối với nút bấm đang thực hiện lưu trữ, chuyển nút sang trạng thái `disabled` và thay thế text bằng Spinner hoặc biểu tượng quay.

### 2. Empty State (Trống dữ liệu)
- **Quy tắc UX:** Luôn bao gồm:
  - Một icon minh họa trực quan (opacity thấp).
  - Tiêu đề ngắn gọn (ví dụ: "Chưa có khách hàng nào").
  - Mô tả chi tiết gợi ý hành động (ví dụ: "Hãy thêm khách hàng đầu tiên để bắt đầu quản lý").
  - Một nút kêu gọi hành động (Call-to-Action) chính ngay bên dưới.

### 3. Error State (Lỗi kết nối / Hệ thống)
- **Quy tắc UX:** Cung cấp thông báo lỗi rõ ràng, dễ hiểu đối với người dùng cuối (không hiển thị thô mã lỗi hệ thống dạng JSON).
- Luôn cung cấp nút "Thử lại" (Retry) để cho phép người dùng kích hoạt tải lại dữ liệu mà không cần tải lại toàn bộ trang web.

### 4. Success State (Thành công)
- **Quy tắc UX:** Hiển thị phản hồi thành công tức thì thông qua Toast Notification ở góc phải màn hình.
- Đối với các quy trình dài (nhập file Excel, thanh toán), hiển thị một màn hình hoặc Dialog chúc mừng kèm tóm tắt kết quả.

---

## 13. Icons

Sử dụng bộ icon đồng bộ để tránh rối mắt cho người dùng.

- **Thư viện đề xuất:** **Lucide Icons** (được định cấu hình mặc định trong `components.json`).
- **Kích thước tiêu chuẩn:**
  - Nhỏ (Inline text, button nhỏ): `14px` (size={14}).
  - Mặc định (Thanh menu, button thường, danh sách): `16px` (size={16}).
  - Lớn (Dashboard KPI, Header lớn, Empty State): `24px` hoặc `32px`.
- **Stroke Width:** Luôn sử dụng độ dày nét vẽ mặc định là `1.75px` hoặc `2px` để icon rõ nét trên màn hình độ phân giải thường.

---

## 14. Accessibility

Mọi cải tiến giao diện phải giúp ứng dụng có thể tiếp cận được bởi tất cả mọi người.

- **Keyboard Navigation (Điều hướng bàn phím):**
  - Sử dụng phím `Tab` để di chuyển tuần tự qua các thành phần tương tác (links, buttons, inputs).
  - Phím `Enter` / `Space` để kích hoạt hành động.
  - Phím `Escape` (Esc) để đóng tức thì các Dialog, Popover, Dropdown.
- **Focus Ring:** Không bao giờ ẩn viền focus mặc định mà không thay thế bằng giải pháp thay thế trực quan. Luôn dùng `focus-visible:ring-2 focus-visible:ring-primary`.
- **Contrast Ratio (Tỷ lệ tương phản):** Độ tương phản của văn bản chính với nền phải đạt tối thiểu `4.5:1`.

---

## 15. Dark Mode

Dự án hỗ trợ hoàn chỉnh Dark Mode thông qua cấu hình `.dark` selector và OKLCH variables.

- **Quy tắc ánh xạ màu (Color Mapping):**
  - Mọi nền màu trắng (`--white`, `bg-white`) chuyển sang màu tối (`oklch(0.205 0 0)` hoặc màu trung tính đậm `--n-900`/`--n-950`).
  - Mọi text màu tối (`text-n-900`) tự động chuyển sang màu sáng (`text-n-50`).
- **Quy tắc bề mặt (Surface Rules):** Sử dụng các sắc độ tối khác nhau để tạo chiều sâu vật lý (ví dụ: nền ứng dụng tối nhất, sau đó đến card sáng hơn một chút để tạo độ nổi).

---

## 16. Motion System (Animation Guidelines)

Các chuyển động phải nhẹ nhàng, tinh tế và phục vụ cho mục đích định hướng trải nghiệm, không gây xao nhãng.

- **Fast Transition (`--tr-fast`):** `150ms ease` - Dùng cho các tương tác tức thì như Hover nút, hover dòng bảng, thay đổi màu sắc văn bản.
- **Base Transition (`--tr-base`):** `200ms ease` - Dùng cho các thành phần trượt, mở rộng (Collapse, Sidebar toggle).
- **Easing Function:** Luôn ưu tiên dùng hàm easing tiêu chuẩn `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Animations phổ biến:**
  - `anim-fade` (fadeIn): Mở mờ dần cho tooltip và popup nhỏ.
  - `anim-up` (slideUp): Trượt nhẹ từ dưới lên (12px) kết hợp mờ dần cho Dialog/Modal khi mở ra.

---

## 17. AI Coding Rules V2 (Ràng buộc nghiêm ngặt cho AI Assistant)

Để duy trì tính nhất quán tuyệt đối của hệ thống thiết kế này, mọi Trợ lý Lập trình AI (AI Coding Agent) khi chỉnh sửa hoặc tạo mới code giao diện trong dự án này **BẮT BUỘC** phải tuân thủ nghiêm ngặt 10 quy tắc vàng sau đây:

1.  **KHÔNG ĐƯỢC Hardcode mã màu Hex:** Tuyệt đối không viết các mã màu dạng `#ffffff` hay `#2563eb` trực tiếp vào code UI. Phải sử dụng semantic Tailwind classes (`bg-background`, `text-foreground`, `border-border`) hoặc hệ thống biến màu CSS đã định nghĩa (`var(--primary)`, `var(--n-100)`).
2.  **KHÔNG ĐƯỢC Hardcode giá trị Spacing/Radius:** Luôn sử dụng thang đo spacing mặc định của Tailwind (`p-4`, `m-2`, `gap-3`) và radius token (`rounded-md`, `rounded-lg`) thay vì tự viết các khoảng cách tùy ý bằng pixel (`style={{ padding: '15px' }}`).
3.  **HẠN CHẾ TỐI ĐA Inline Style:** Chỉ sử dụng `style={{ ... }}` đối với các giá trị động tính toán tại thời điểm runtime (ví dụ: thanh tiến trình `width: ${progress}%`, vị trí tuyệt đối của các phần tử drag-and-drop).
4.  **ƯU TIÊN sử dụng Component có sẵn:** Trước khi tạo mới một nút, input hay nhãn, hãy kiểm tra thư mục `@/components/ui/` xem component đó đã được định cấu hình bằng shadcn chưa. Tuyệt đối không tạo lại các component trùng lặp chức năng.
5.  **LUÔN HỖ TRỢ Dark Mode:** Khi thiết kế giao diện, phải đảm bảo component hoạt động hoàn hảo ở cả hai chế độ Light và Dark Mode. Luôn tận dụng các class ngữ nghĩa tự động thích ứng hoặc sử dụng tiền tố `dark:` khi cần tinh chỉnh chi tiết.
6.  **Sử dụng Absolute Alias Import:** Luôn sử dụng alias `@/` khi import để giữ đường dẫn sạch sẽ (ví dụ: `import { Button } from "@/components/ui/button"` thay vì dùng đường dẫn tương đối cồng kềnh `../../../../components/ui/button`).
7.  **Form bắt buộc phải dùng React Hook Form + Zod:** Mọi form nhập liệu phải được quản lý trạng thái bằng thư viện `react-hook-form` và định nghĩa schema validation chặt chẽ bằng `zod`.
8.  **Tương tác bất đồng bộ phải dùng TanStack Query:** Tất cả các hành động fetch, cache, và mutation dữ liệu từ API bắt buộc phải sử dụng `@tanstack/react-query` (Sử dụng `useQuery` và `useMutation`). Không sử dụng `useEffect` thuần để gọi API.
9.  **Bọc trang chuẩn Layout:** Mọi trang giao diện mới (pages) phải được bọc bên trong cấu trúc layout tiêu chuẩn của hệ thống: `.app-content` với cơ chế layout flex và ẩn cuộn ngang mặc định.
10. **KHÔNG tự động tạo file cấu hình mới:** Không tự ý tạo thêm các file cấu hình Tailwind hoặc cấu hình dự án ngoài các file chuẩn đã được thiết lập.

---

## 18. Frontend Token Export (JSON)

Dưới đây là bản xuất Design Tokens chuẩn để tích hợp hoặc đồng bộ sang các công cụ thiết kế khác (như Figma):

```json
{
  "colors": {
    "primary": "oklch(0.205 0 0)",
    "background": "oklch(1 0 0)",
    "foreground": "oklch(0.145 0 0)",
    "border": "oklch(0.922 0 0)",
    "input": "oklch(0.922 0 0)",
    "ring": "oklch(0.708 0 0)"
  },
  "spacing": {
    "sidebar": "210px",
    "header": "52px",
    "base_grid": "4px"
  },
  "radius": {
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "12px",
    "full": "9999px"
  },
  "font": {
    "family": "Roboto",
    "base_size": "14px"
  },
  "shadows": {
    "card": "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)"
  }
}
```

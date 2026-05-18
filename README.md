# 💍 Jewelry Pricing Tool — Hướng dẫn chạy dự án

## Cấu trúc thư mục

```
Jewelry-Pricing-Tool/
├── Jewelry-Pricing-Tool-FE/     ← Next.js Frontend
└── Jewelry-Pricing-Tool-BE/     ← NestJS Backend
```

---

## 1. Chạy Backend (NestJS)

```bash
cd Jewelry-Pricing-Tool-BE

# Cài dependencies (lần đầu)
npm install

# Tạo file .env từ mẫu
cp .env.example .env
# Mở .env và sửa MONGODB_URI cho đúng với MongoDB của bạn

# Chạy dev
npm run start:dev
# Backend sẽ chạy tại: http://localhost:3001
```

### Cấu hình .env:
```
MONGODB_URI=mongodb://localhost:27017/jewelry-pricing
PORT=3001
FE_URL=http://localhost:3000
```

---

## 2. Chạy Frontend (Next.js)

```bash
cd Jewelry-Pricing-Tool-FE

# Cài dependencies (lần đầu)
npm install

# Tạo file .env.local từ mẫu
cp .env.local.example .env.local

# Chạy dev
npm run dev
# Frontend sẽ chạy tại: http://localhost:3000
```

---

## 3. Các tính năng theo role

| Role | Tab hiển thị | Chức năng |
|------|------|------|
| **sale** | Dashboard, Báo giá | Tạo yêu cầu báo giá, xem giá, Chốt/Huỷ |
| **order** | Dashboard, Báo giá, Calculator, Cài đặt | Xử lý báo giá, tính giá, hoàn thành BG |
| **admin** | Tất cả | Toàn quyền |
| **workshop** | Dashboard, Sản xuất | Cập nhật tiến độ, hoàn thành SX |

---

## 4. API Endpoints (Backend)

### Quotes (Báo giá)
- `GET    /quotes?status=PENDING`   — Danh sách
- `POST   /quotes`                  — Tạo yêu cầu (multipart/form-data)
- `PATCH  /quotes/:id/price`        — NV báo giá: nhập giá
- `PATCH  /quotes/:id/complete-quoting` — Hoàn thành báo giá
- `PATCH  /quotes/:id/confirm`      — Sale: Khách chốt
- `PATCH  /quotes/:id/cancel`       — Sale: Huỷ

### Production (Sản xuất)
- `GET    /production`              — Danh sách đơn SX
- `POST   /production`              — Tạo đơn SX từ quote CONFIRMED
- `PATCH  /production/:id/progress` — Cập nhật tiến độ
- `PATCH  /production/:id/complete` — Hoàn thành + upload ảnh (multipart)

# Hướng Dẫn Sử Dụng Project FOCUS CAMERA

## 1. Tổng quan

Project này là bản clone giao diện và backend cơ bản cho website FOCUS CAMERA.

Hiện tại project đã có:

- Frontend tĩnh cho trang chủ, chính sách, liên hệ, giỏ hàng, danh mục, chi tiết sản phẩm, đăng nhập, đăng ký
- Backend Node.js dùng Express
- Kết nối MySQL để lưu tài khoản đăng nhập, phiên đăng nhập và giỏ hàng
- Cơ chế bootstrap database tự động khi server khởi động

Project chưa có:

- Trang quản trị
- Quản lý đơn thuê hoàn chỉnh
- Thanh toán
- Phân quyền admin/user

## 2. Cấu trúc thư mục

```text
clone_web_quynhnhu/
├─ public/
│  ├─ assets/
│  │  ├─ css/
│  │  ├─ catalog/
│  │  ├─ images/
│  │  └─ js/
│  ├─ index.html
│  ├─ chinh-sach.html
│  ├─ lien-he.html
│  ├─ gio-hang.html
│  ├─ danh-muc.html
│  ├─ chi-tiet-san-pham.html
│  ├─ dang-nhap.html
│  └─ dang-ky.html
├─ src/
│  ├─ config/
│  ├─ data/
│  ├─ database/
│  ├─ services/
│  └─ server.js
├─ scripts/
│  └─ sync_real_catalog.py
├─ project-data/
│  ├─ README.md
│  └─ actual-api/
├─ database/
│  └─ schema.sql
├─ docs/
│  ├─ HUONG_DAN_SU_DUNG.md
│  └─ reference/
├─ .env.example
├─ package.json
└─ README.md
```

## 3. Yêu cầu môi trường

- Node.js `>= 18`
- Laragon đã cài MySQL
- MySQL đang chạy trên Laragon

Mặc định project đang cấu hình hợp với Laragon local:

- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: để trống
- Database: `focus_camera`

## 4. Cấu hình database MySQL trên Laragon

### Bước 1: Khởi động Laragon

Mở Laragon và bật MySQL.

### Bước 2: Tạo file môi trường

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Nếu bạn dùng user/password MySQL khác mặc định của Laragon thì sửa lại các biến sau trong `.env`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=focus_camera
DB_USER=root
DB_PASSWORD=
AUTO_SEED_CATALOG=true
```

### Bước 3: Cài package

```bash
npm install
```

Project cần tối thiểu:

- `express`
- `mysql2`

### Bước 4: Đồng bộ catalog thật

Trước khi chạy server lần đầu, hãy đồng bộ dữ liệu thật và ảnh thật:

```bash
python scripts/sync_real_catalog.py
```

Hoặc nếu `npm` hoạt động bình thường:

```bash
npm run sync:catalog
```

Script này sẽ:

- Gọi API thật từ `api.dathanhcamera.com`
- Lưu JSON thô vào `project-data/actual-api/raw`
- Tạo file chuẩn hóa tại `project-data/actual-api/catalog.json`
- Tải toàn bộ ảnh category, company, product về `public/assets/catalog`
- Tạo file insert dữ liệu tại `database/seeds/catalog_seed.sql`

### Bước 5: Import dữ liệu catalog vào MySQL

Sau khi sync xong, import file seed vào MySQL:

```bash
cmd /c "mysql -u root focus_camera < database\\seeds\\catalog_seed.sql"
```

Nếu Laragon của bạn có mật khẩu cho MySQL:

```bash
cmd /c "mysql -u root -p focus_camera < database\\seeds\\catalog_seed.sql"
```

Bạn cũng có thể mở file `database/seeds/catalog_seed.sql` bằng HeidiSQL / phpMyAdmin rồi chạy thủ công.

Nếu `AUTO_SEED_CATALOG=true`, backend cũng sẽ tự nạp seed khi phát hiện catalog đang trống và file seed đã tồn tại.

### Bước 6: Chạy server

```bash
npm start
```

Hoặc khi phát triển:

```bash
npm run dev
```

Khi server khởi động:

- Database `focus_camera` sẽ được tạo nếu chưa có
- Các bảng cần thiết sẽ được tạo tự động từ file `database/schema.sql`
- Catalog API sẽ đọc trực tiếp từ MySQL

## 5. Mở project

Sau khi server chạy thành công, mở:

[http://localhost:3000](http://localhost:3000)

Các trang chính:

- `/`
- `/chinh-sach.html`
- `/lien-he.html`
- `/gio-hang.html`
- `/danh-muc.html?category=thue-camera-may-anh`
- `/chi-tiet-san-pham.html?slug=thue-may-anh-sony-alpha-a7s-iii`
- `/dang-nhap.html`
- `/dang-ky.html`

## 6. Cơ chế backend hiện tại

### Danh mục và sản phẩm

- Dữ liệu thật được đồng bộ trước về project bằng script Python
- Ảnh thật được lưu local trong `public/assets/catalog`
- File SQL insert được tạo tại `database/seeds/catalog_seed.sql`
- Backend đọc dữ liệu catalog trực tiếp từ MySQL

### Tài khoản

- Đăng ký tài khoản lưu vào bảng `users`
- Đăng nhập tạo phiên trong bảng `auth_sessions`

### Giỏ hàng

- Giỏ hàng lưu trong bảng `carts`
- Sản phẩm trong giỏ hàng lưu trong bảng `cart_items`
- Giỏ hàng hỗ trợ cả khách vãng lai lẫn người dùng đã đăng nhập

## 7. Các API đang có

### Catalog

- `GET /api/health`
- `GET /api/categories`
- `GET /api/companies?category=...`
- `GET /api/products?category=...`
- `GET /api/products/:slug`
- `GET /api/products/:slug/suggestions`
- `GET /api/price-rules`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Cart

- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/:itemId`

## 8. File quan trọng để phát triển tiếp

- `src/server.js`: điểm khởi động backend
- `src/config/env.js`: đọc biến môi trường
- `src/database/bootstrap.js`: tạo database và chạy schema
- `src/database/connection.js`: kết nối MySQL
- `src/services/authService.js`: xử lý đăng ký, đăng nhập
- `src/services/cartService.js`: xử lý giỏ hàng
- `src/services/catalogService.js`: xử lý danh mục và sản phẩm
- `scripts/sync_real_catalog.py`: script tải dữ liệu thật và ảnh thật
- `project-data/actual-api/catalog.json`: dữ liệu catalog thật sau khi sync
- `database/seeds/catalog_seed.sql`: file insert dữ liệu vào MySQL
- `database/schema.sql`: cấu trúc bảng MySQL
- `public/assets/js/components.js`: header/footer dùng chung

## 9. Gợi ý phát triển tiếp theo

- Thêm bảng đơn thuê
- Thêm quản trị sản phẩm
- Xây trang quản trị để cập nhật catalog trực tiếp trên MySQL
- Thêm chức năng quên mật khẩu
- Thêm phân quyền admin

## 10. Lưu ý

- Hiện tại project ưu tiên phát triển local trên Laragon
- Nếu MySQL không chạy, server sẽ không khởi động được
- Nếu cần import schema thủ công, bạn có thể dùng file `database/schema.sql`

# 🚀 DoAnChuyenNganh - Learning & Course Management System

Dự án Đồ án Chuyên ngành Xây dựng hệ thống học tập trực tuyến tích hợp quản lý nội dung khóa học, ngân hàng câu hỏi và phân hệ học viên.

---

## 👥 Thành viên nhóm

Phân hệ Nội dung

| MSSV        | Họ và tên              |
| :---------- | :------------------------ |
| `2314288` | Trần Thị Phương Trang |
| `2312647` | Lê Anh Khoa              |
| `2312663` | Đỗ Đặng Diệu Linh    |


---

## 🏗️ Cấu trúc dự án

- `backend/src/`: API NestJS, gồm các module xác thực, khóa học, câu hỏi, quiz, luyện tập và AI.
- `frontend/src/app/`: các trang Next.js cho học sinh và người biên soạn.
- `frontend/src/components/`, `frontend/src/lib/`: thành phần giao diện dùng chung và API client.
- `database/migrations/`: các tệp SQL ghi lại thay đổi cấu trúc cơ sở dữ liệu.
- `docs/`: đặc tả chức năng, từ điển dữ liệu, phân công và quy tắc làm việc.

Xem [tài liệu cấu trúc dự án](docs/cau-truc-du-an.md) để biết vai trò từng thư mục và vị trí thêm chức năng.

## ⚙️ Hướng dẫn thao tác với Git & Dự án

### 1. Lần đầu tiên clone dự án về máy

Khi mới bắt đầu lấy mã nguồn về máy tính,cần đứng ở thư mục gốc và chạy lệnh cài đặt chung cho toàn bộ dự án:

```bash
# Clone dự án từ GitHub về máy
git clone https://github.com/ChuChoaChan131019/DoAnChuyenNganh-LearningProject.git
cd DoAnChuyenNganh-LearningProject

# Cài đặt toàn bộ thư viện cho cả gốc, frontend và backend cùng lúc
npm install

# Hoặc chạy lệnh tổng:
npm run install:all
```

### 2. Cấu hình biến môi trường

Các file `.env` không được commit lên Git. Sau khi clone, tạo file từ mẫu:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Trong `backend/.env`, điền thông tin Supabase của project:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<secret-key>
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

Không commit `SUPABASE_SECRET_KEY` hoặc chia sẻ file `backend/.env`.

Database Supabase là database dùng chung của project, vì vậy người clone cần
được cấp tài khoản đăng nhập hợp lệ và dùng đúng Supabase project. Các trang
Courses sẽ gọi API backend tại `http://localhost:3001`.

## Cách chạy dự án

1. Mở terminal tại thư mục gốc của dự án.
2. Chạy lệnh khởi động chung:

```bash
npm run dev
```

3. Giao diện web sẽ chạy tại: http://localhost:3000 (hoặc đường link ghi trong terminal)

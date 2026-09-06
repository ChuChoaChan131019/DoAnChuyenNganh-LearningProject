# Hệ thống Hỗ trợ Tự học – Phân hệ Người dùng

> Đọc file này trước tiên. Đây là tài liệu duy nhất bạn cần đọc trước khi bắt đầu bất kỳ task nào.

## Dự án là gì

Phân hệ Người dùng cho hệ thống web hỗ trợ tự học. Quản lý tài khoản và theo dõi quá trình học tập của Learner với 3 vai trò: Learner, Content Manager, Admin.

## Tech stack nhanh

| Layer | Technology |
|-------|------------|
| Backend | NestJS + TypeScript (không dùng express) |
| Frontend | Next.js 14 + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Authentication |
| AI | OpenAI / Qwen |
| Package Manager | npm workspaces |

## Đọc file nào tiếp theo

| Nếu task liên quan đến... | Đọc file này |
|---|---|
| Kiến trúc, component, luồng dữ liệu | `architecture.md` |
| Tìm file, tạo file mới, cấu trúc folder | `structure.md` |
| Viết code, naming, git commit, testing | `conventions.md` |
| Database, query, schema | `database.md` |
| API endpoint, request/response | `api.md` |
| Authentication, authorization | `auth.md` |

## Tài liệu tham khảo (để hiểu business logic)

| Tài liệu | Mục đích |
|-----------|----------|
| `DeCuong_ThucHienDoAn_PhanHeNguoiDung_V2.md` | Tổng quan đề tài, mục tiêu, nội dung |
| `ChiTiet_ChucNang_NguoiHoc_PhanHeNguoiDung_V2.md` | Chi tiết chức năng Learner |
| `ChiTiet_ChucNang_ContentManager_PhanHeNguoiDung_V2.md` | Chi tiết chức năng Content Manager |
| `ChiTiet_ChucNang_QuanTriVien_PhanHeNguoiDung_V2.md` | Chi tiết chức năng Admin |
| `ChiTiet_ChucNangChung_HeThong_PhanHeNguoiDung_V2.md` | Cơ chế hệ thống dùng chung (Auth, Enrollment, Notification...) |
| `Event_Contract_V1.md` | Contract event giữa User Module và Content Module |
| `API_Contract_User_Content_V1.md` | API contract với Content Module |
| `Database_Schema_PhanHeNguoiDung.sql` | Schema đầy đủ 21 bảng |

## Quy tắc tuyệt đối (xem chi tiết trong `conventions.md`)

- **Không tạo duplicate Enrollment** — kiểm tra status trước khi insert
- **Không xóa record** — dùng soft delete hoặc update status
- **Không hardcode credential** — dùng environment variable
- **Không gọi Content Module trực tiếp** — luôn qua ContentGateway
- **Không sửa message sau khi gửi** — message là immutable

## Môi trường làm việc

```bash
# Cài tất cả dependencies
npm install

# Cài dependencies riêng lẻ
npm run install:all

# Chạy cả backend và frontend
npm run dev

# Chạy chỉ backend
npm run dev:backend

# Chạy chỉ frontend
npm run dev:frontend
```

### Backend (NestJS)

```bash
cd backend

# Tạo resource mới
nest g resource <name>

# Chạy dev server
npm run start:dev

# Chạy test
npm run test
```

### Frontend (Next.js)

```bash
cd frontend

# Chạy dev server
npm run dev

# Build production
npm run build
```

## Cấu hình môi trường

### Backend (.env)

```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=...
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
PORT=3001
```

### Frontend (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Trạng thái dự án

- **Backend**: Đang được xây dựng từ đầu
- **Frontend**: Có sẵn một số UI components, chưa kết nối backend
- **Database**: Schema đã thiết kế (21 bảng)

## Liên kết bên ngoài

- Repository: https://github.com/ChuChoaChan131019/DoAnChuyenNganh-LearningProject

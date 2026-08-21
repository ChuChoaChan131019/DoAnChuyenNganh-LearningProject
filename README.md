# 🚀 DoAnChuyenNganh - Learning & Course Management System

Dự án Đồ án Chuyên ngành Xây dựng hệ thống học tập trực tuyến tích hợp quản lý nội dung khóa học, ngân hàng câu hỏi và phân hệ học viên.

---

## 👥 Thành viên nhóm
Phân hệ Nội dung

| MSSV | Họ và tên | Nhánh làm việc chính |
| :--- | :--- | :--- |
| `2314288` | Trần Thị Phương Trang | `feature/trang` |
| `2312647` | Lê Anh Khoa | `feature/khoa` |
| `2312663` | Đỗ Đặng Diệu Linh | `feature/linh` |

Phân hệ Người dùng

| MSSV | Họ và tên | Nhánh làm việc chính |
| :--- | :--- | :--- |
| `2312609` | Nguyễn Ngọc Thanh Hiền | `feature/` |
| `2312693` | Nguyễn Thi Trà My | `feature/` |
| `2312617` | Trần Xuân Hiếu | `feature/` |
---

## 🏗️ Cấu trúc dự án (Project Architecture)

```text
DoAnChuyenNganh-LearningProject/
├── backend/ 👉 PHẦN SERVER & XỬ LÝ
│   ├── node_modules/ 👉 Thư viện của backend
│   ├── src/
│   │   ├── controllers/ 👉 Nhận yêu cầu từ web rồi điều phối
│   │   ├── middlewares/ 👉 Kiểm tra quyền đăng nhập, phân quyền
│   │   ├── models/ 👉 Cấu trúc bảng Database (Khóa học, Bài học...)
│   │   ├── routes/ 👉 Các đường dẫn API để gọi dữ liệu
│   │   └── services/ 👉 Xử lý logic nặng & tích hợp AI (OpenAI/Qwen)
│   ├── server.js 👉 File tổng chạy server backend
│   ├── package.json 👉 Danh sách thư viện backend
│   └── package-lock.json
│
├── frontend/ 👉 PHẦN GIAO DIỆN WEB
│   ├── .next/ 👉 Thư mục build Next.js
│   ├── node_modules/ 👉 Thư viện của frontend
│   ├── public/ 👉 Chứa hình ảnh, logo, icon
│   ├── src/
│   │   ├── app/ 👉 Các trang web chính
│   │   │   ├── admin/ 👉 Trang quản trị hệ thông...
│   │   │   ├── content-manager/ 👉 Trang quản lý nội dung (Dashboard, khóa học, ngân hàng câu hỏi)
│   │   │   ├── learner/ 👉 Trang học bài, làm Quiz, khung chat AI Tutor
│   │   ├── components/ 👉 Các nút bấm, thanh menu, shell dùng chung
│   │   ├── lib/ 👉 File kết nối gọi API sang backend
│   │   └── types/ 👉 Định nghĩa kiểu dữ liệu (để code không bị lỗi đỏ)
│   ├── next.config.ts 👉 Cấu hình Next.js
│   ├── tsconfig.json 👉 Cấu hình TypeScript
│   └── package.json 👉 Danh sách thư viện frontend
│
├── .gitignore 👉 Các file/thư mục không đưa lên GitHub
├── package.json 👉 File điều phối gốc (Workspaces & concurrently)
├── package-lock.json
└── README.md 👉 Tài liệu hướng dẫn dự án

```

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

## Cách chạy dự án 

1. Mở terminal tại thư mục gốc của dự án.
2. Chạy lệnh khởi động chung:

```bash
npm run dev
```
3. Giao diện web sẽ chạy tại: http://localhost:3000 (hoặc đường link ghi trong terminal)

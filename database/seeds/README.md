# Bộ dữ liệu C# cơ bản

Bộ seed tạo khóa học `lap-trinh-csharp-co-ban` gồm 6 chương, 24 bài học,
96 câu hỏi, 6 bài kiểm tra chương (60 liên kết câu hỏi) và 12 bài tập code.

Các lệnh kiểm tra và import được chạy từ thư mục gốc:

```bash
npm run data:validate:csharp
npm run data:compile:csharp
npm run data:import:csharp
npm run data:verify:csharp
```

Importer đọc `SUPABASE_DB_URL` từ biến môi trường hoặc `backend/.env`, chạy
trong transaction và sử dụng ID cố định. Chạy lại không tạo bản sao. Khi nội
dung bài học trong seed thay đổi, importer cập nhật bài qua quy trình
unpublish, edit, validate, approve và publish để giữ lịch sử kiểm duyệt.

Khóa Advanced C# cũ không bị xóa hoặc thay đổi.


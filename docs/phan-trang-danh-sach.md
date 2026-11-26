# Phân trang danh sách

`GET /api/v1/catalog/:kind` nhận `page` (từ 1) và `page_size` (1–50), trả
`{ items, total, page, page_size, total_pages, stats }` trong envelope API hiện có.

Các loại: `courses`, `lessons`, `questions`, `quizzes`, `code`, `review`.
Tìm kiếm và bộ lọc chạy trước phân trang trong PostgreSQL. Tổng số bản ghi và
trang rỗng vẫn được trả khi trang cuối biến mất sau một thao tác thay đổi dữ liệu.

Learner chỉ được xem khóa học và bài học đã xuất bản cùng các cấp cha đã xuất bản.
Những danh sách biên soạn chỉ dành cho Content Manager/Admin. Actor luôn lấy từ
JWT; RPC không nhận scope do frontend tự quyết định, và chỉ `service_role` được gọi.

- Áp dụng `database/migrations/20261126065322_content_catalog_pagination.sql`
  trước khi triển khai backend/frontend mới. Migration chỉ thêm RPC đọc và index.
- Các API danh sách cũ được giữ để tương thích với các nơi sử dụng khác.
- `/api/v1/practice/ai-sets` có thêm `page`, `page_size`; khi không truyền hai tham số
  này vẫn giữ định dạng `{ sets }` cũ và cơ chế phát hiện tác vụ AI bị gián đoạn.
- Hai trình biên soạn quiz giữ lựa chọn qua nhiều trang; ID đã gán được loại trước
  khi chia trang, nên không tạo trang thiếu hàng do lọc sau khi tải.
- Hàng đợi duyệt chia theo số nội dung (khóa học/chương/bài học), rồi dựng lại cây
  của trang hiện tại, tránh tải toàn bộ bài học dưới mỗi khóa học.

Tin nhắn AI Tutor dùng `GET /api/v1/ai/tutor/conversations/:id/messages` với
`page_size` và `before` (cursor trả từ `next_cursor`). Khóa sắp xếp là
`created_at DESC, id DESC`; giữ nguyên độ chính xác microsecond của PostgreSQL.
Tin mới không làm thay đổi mốc tải tin cũ. Hội thoại luôn được kiểm tra chủ sở hữu.

Kiểm chứng tự động: catalog SQL trên PGlite với hơn 1.000 câu hỏi, các trang rỗng,
tìm kiếm/bộ lọc, quyền Learner, lựa chọn bị loại; unit test quyền API và cursor chat
khi có tin mới, timestamp trùng nhau và cursor không hợp lệ.

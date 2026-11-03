# API bài đăng thảo luận — D01

Mọi endpoint yêu cầu `Authorization: Bearer <access_token>` và vai trò `learner`. Backend xác định tác giả từ token, không nhận `author_id` trong body. Phản hồi thành công được bọc trong `{ "data": ... }` theo cấu hình chung của backend.

| Thao tác | Endpoint | Thành công |
| --- | --- | --- |
| Tạo | `POST /api/v1/discussion/posts` | `201`, bản ghi bài đăng |
| Sửa | `PATCH /api/v1/discussion/posts/:id` | `200`, bản ghi đã cập nhật |
| Xóa mềm | `DELETE /api/v1/discussion/posts/:id` | `200`, `{ id, deleted: true, deleted_at }` |

Tạo bài theo bài học:

```json
{
  "lesson_id": "UUID-bai-hoc",
  "post_type": "question",
  "title": "Cách sử dụng vòng lặp for?",
  "content": "Mình chưa hiểu điều kiện dừng của vòng lặp trong ví dụ này."
}
```

Chỉ truyền một trong `chapter_id` hoặc `lesson_id` với giá trị UUID thật. Nếu gửi bài học, backend tự lấy chương của bài đó. Khóa học, chương và bài học liên quan phải đang `published`; không có quyền tạo bài trong nội dung chưa công bố. `post_type` gồm `question`, `note`, `resource`. Loại `resource` yêu cầu `resource_url` HTTPS hợp lệ, không chứa thông tin đăng nhập; hai loại còn lại không được có URL tài liệu.

PATCH chỉ nhận `title`, `content`, `resource_url` và phải có ít nhất một trường. Có thể gửi riêng một trường; `title: null`/`content: null` bị trả `400`. Tiêu đề sau trim dài 5–160 ký tự; nội dung dài 10–20.000 ký tự. Không được đổi tác giả, loại bài, vị trí hoặc trạng thái qua PATCH. Trước khi sửa, backend kiểm tra lại trạng thái xuất bản hiện tại của nội dung liên quan; nội dung đã thu hồi không cho sửa.

Chỉ tác giả sửa/xóa được bài `visible` chưa bị xóa. Bài không tồn tại, thuộc tác giả khác, đã ẩn/gỡ hoặc đã xóa đều trả `404`. Xóa cập nhật `deleted_at` và `updated_at`, không xóa bản ghi khỏi database. Sau khi nội dung học bị thu hồi, tác giả vẫn có thể xóa bài đang hiển thị của mình.

Lỗi body/UUID/URL/vị trí/trạng thái xuất bản trả `400`; thiếu token hoặc token không hợp lệ trả `401`; sai vai trò trả `403`. Lỗi database không dự kiến trả `500` với thông báo chung.

Migration: `database/migrations/20261103143449_discussion_posts.sql`. Cần có sẵn các bảng `profiles`, `courses`, `chapters`, `lessons` và các role Supabase; tệp tái tạo cấu trúc D01 đã có trên database hiện tại, có thể chạy lại mà không xóa dữ liệu. Không chạy lại toàn bộ SQL schema cũ để thêm D01.

Kiểm thử: `npm test -w backend -- src/modules/discussion`. Các test chạy migration và service trên PGlite cô lập, kiểm tra phân quyền tác giả, xóa mềm, dữ liệu null, trạng thái xuất bản, ràng buộc chương/bài học và quyền database. Chúng không kiểm chứng xác thực JWT qua Supabase thật.

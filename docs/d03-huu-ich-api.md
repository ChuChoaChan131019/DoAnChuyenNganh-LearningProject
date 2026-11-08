# Đánh dấu hữu ích — D03

Mọi endpoint yêu cầu Bearer token hợp lệ và role `learner`. Backend lấy `user_id` từ request đã xác thực; frontend không được chọn tài khoản cần đánh dấu. Phản hồi thành công được bọc trong `{ "data": ... }`.

| Thao tác | Endpoint | Thành công |
| --- | --- | --- |
| Đánh dấu bài đăng | `PUT /api/v1/discussion/posts/:id/helpful` | `200`, `{ helpful_count, is_helpful }`. |
| Bỏ đánh dấu bài đăng | `DELETE /api/v1/discussion/posts/:id/helpful` | `200`, cùng cấu trúc. |
| Đánh dấu bình luận | `PUT /api/v1/discussion/comments/:id/helpful` | `200`, cùng cấu trúc. |
| Bỏ đánh dấu bình luận | `DELETE /api/v1/discussion/comments/:id/helpful` | `200`, cùng cấu trúc. |
| Lấy thống kê nhiều nội dung | `POST /api/v1/discussion/helpful/summary` | `201`, `{ posts: Record<ID, State>, comments: Record<ID, State> }`. |

Ví dụ body summary:

```json
{
  "post_ids": ["00000000-0000-4000-8000-000000000001"],
  "comment_ids": ["00000000-0000-4000-8000-000000000002"]
}
```

Mỗi danh sách nhận tối đa 50 UUID; các ID trùng được gộp trước khi truy vấn. Có thể bỏ một hoặc cả hai danh sách; kết quả tương ứng là object rỗng. `helpful_count` đếm mọi tài khoản, còn `is_helpful` là trạng thái của riêng người gọi. Gửi lại PUT không cộng thêm lượt; gửi lại DELETE không làm count âm và không xóa lượt của tài khoản khác. Người dùng có thể đánh dấu lại sau khi bỏ đánh dấu.

Chỉ nội dung `visible`, chưa xóa và nằm dưới khóa học/chương/bài học còn `published` được thao tác. Bình luận còn yêu cầu bài đăng cha khả dụng. PUT/DELETE trả `404` cho nội dung không còn khả dụng; summary bỏ ID đó khỏi kết quả thay vì lộ thông tin. Lượt cũ được giữ khi nội dung bị ẩn/xóa mềm/thu hồi. Trường hợp nội dung thay đổi giữa lần kiểm tra và lúc đọc lại kết quả có thể trả `404`; client cần tải lại dữ liệu khi gặp lỗi.

UUID hoặc danh sách không hợp lệ trả `400`; thiếu/sai token trả `401`; sai role trả `403`; lỗi truy vấn không dự kiến trả `500`, không giả số lượt bằng 0. Frontend chờ kết quả từ backend, khóa nút khi đang xử lý và báo lỗi nếu thao tác thất bại.

Migration: `database/migrations/20261108161402_discussion_helpful_votes.sql`, cần có các bảng D01/D02 và `profiles`. Không cần chạy lại SQL tạo schema cũ. Migration tái tạo cấu trúc đã đối chiếu trên Supabase; lần bổ sung vào repo không thay đổi database thật.

Kiểm thử: `npm test -w backend -- src/modules/discussion/discussion-helpful`. Gồm test service/controller và test PostgreSQL cô lập dùng chính migration, không cần token hay dữ liệu Supabase thật. Chưa thay thế kiểm thử HTTP và thao tác nút bằng tài khoản Learner thật trên trình duyệt.

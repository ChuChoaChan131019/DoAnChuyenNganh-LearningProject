# API danh sách thảo luận và bình luận — D02

Mọi endpoint yêu cầu `Authorization: Bearer <access_token>` và vai trò `learner`. Backend xác định người dùng từ token; body không nhận `author_id`. Phản hồi thành công được bọc trong `{ "data": ... }`.

## 1. Danh sách và chi tiết bài đăng

| Thao tác | Endpoint | Thành công |
| --- | --- | --- |
| Danh sách/tìm/lọc | `GET /api/v1/discussion/posts` | `200`, `{ items, next_cursor }` |
| Chi tiết | `GET /api/v1/discussion/posts/:id` | `200`, bài đăng và `comment_count` |

Phạm vi của API danh sách:

- `scope=all`: xem tất cả bài đăng thuộc khóa học và chương đã xuất bản; không kèm các ID phạm vi khác.
- `course_id`: xem bài đăng của tất cả chương đã xuất bản trong khóa học.
- `course_id` + `chapter_id`: lọc một chương thuộc khóa học.
- `chapter_id`: xem thảo luận của một chương.
- `lesson_id`: xem thảo luận của một bài học.

Không truyền đồng thời `course_id` và `lesson_id`.

Query danh sách:

- Chọn một phạm vi: `scope=all`, `course_id`, `chapter_id` hoặc `lesson_id`; riêng `course_id` có thể kèm `chapter_id` để lọc chương thuộc đúng khóa học.
- `course_id`: trả bài đăng của các chương đã xuất bản trong khóa học.
- `chapter_id`: trả mọi bài có cùng chương, gồm bài gắn trực tiếp chương và bài gắn các bài học trong chương.
- `lesson_id`: chỉ trả bài gắn đúng bài học; backend tự xác định chương.
- `post_type`: tùy chọn `question`, `note`, `resource`.
- `search`: tùy chọn, tối đa 120 ký tự; tìm toàn văn trong tiêu đề và nội dung bằng cấu hình PostgreSQL `simple`.
- `limit`: mặc định 20, từ 1 đến 50.
- `cursor`: con trỏ do `next_cursor` của trang trước trả về; không tự tạo ở frontend.

Danh sách sắp xếp mới đến cũ theo `(created_at, id)` và dùng keyset pagination. Chi tiết và danh sách chỉ trả bài `visible`, chưa xóa, thuộc khóa học/chương/bài học đang `published`. Bài bị ẩn, gỡ, xóa hoặc thuộc nội dung bị thu hồi trả như không tồn tại.

Mỗi item danh sách có `content_preview`, `is_mine` và `comment_count`. `is_mine` được backend tính từ token.

## 2. Bình luận

| Thao tác | Endpoint | Thành công |
| --- | --- | --- |
| Xem bình luận | `GET /api/v1/discussion/posts/:postId/comments` | `200`, `{ items, next_cursor }` |
| Tạo | `POST /api/v1/discussion/posts/:postId/comments` | `201`, bình luận mới |
| Sửa của mình | `PATCH /api/v1/discussion/comments/:id` | `200`, bình luận đã cập nhật |
| Xóa mềm của mình | `DELETE /api/v1/discussion/comments/:id` | `200`, `{ id, deleted: true, deleted_at }` |

Body tạo/sửa:

```json
{
  "content": "Hãy kiểm tra điều kiện trước mỗi vòng lặp."
}
```

Nội dung được trim, phải dài 1–5.000 ký tự. PATCH không nhận trường nào khác. Bình luận hiển thị cũ đến mới theo `(created_at, id)`; `limit` mặc định 30 và tối đa 50.

Tạo, sửa và xóa chỉ hoạt động khi bài cha còn `visible`, chưa xóa và nội dung học tập còn được công bố. Sửa/xóa lọc đồng thời theo ID bình luận, tác giả lấy từ token, `status = visible` và `deleted_at IS NULL`. Người dùng khác nhận `404`, kể cả khi gửi API trực tiếp.

## 3. Lỗi

- `400`: UUID/query/body/con trỏ không hợp lệ hoặc nội dung vượt giới hạn.
- `401`: thiếu token hoặc token không hợp lệ.
- `403`: sai vai trò.
- `404`: nội dung không tồn tại, không còn hiển thị hoặc người gọi không phải tác giả khi sửa/xóa.
- `500`: lỗi database không dự kiến, không trả chi tiết SQL.

## 4. Database và kiểm thử

Migration D02: `database/migrations/20261106140000_discussion_comments.sql`.

Migration tạo `discussion_comments`, chỉ mục một phần cho bình luận còn hiển thị, `search_vector`/GIN index cho bài đăng, bật RLS và thu hồi quyền trực tiếp của `PUBLIC`, `anon`, `authenticated`. Chỉ backend dùng `service_role`; frontend không truy cập bảng trực tiếp.

Chạy kiểm thử:

```bash
npm test -w backend -- src/modules/discussion
```

Các test chạy D01 và D02 trên PGlite cô lập, không cần thông tin kết nối Supabase thật.

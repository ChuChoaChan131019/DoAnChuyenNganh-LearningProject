# Quy trình kiểm tra nội dung AI

**Quyết định ngày 18/11/2026:** Content Manager được tự kiểm tra và tự duyệt nội dung mình tạo. Hệ thống không yêu cầu một người duyệt khác.

## Luồng trạng thái

```text
draft --approve--> approved --publish--> published --unpublish--> approved
```

- Trước `approve`, phiên bản hiện tại phải có một lần kiểm tra tự động đạt yêu cầu.
- Lỗi bắt buộc chặn duyệt; cảnh báo chỉ yêu cầu người biên soạn cân nhắc.
- `unpublish` bắt buộc có lý do.
- Sửa bài đã duyệt đưa bài về `draft` và làm kết quả kiểm tra của phiên bản cũ hết hiệu lực.
- Mọi lần kiểm tra, duyệt, xuất bản, gỡ xuất bản và khôi phục đều được lưu trong lịch sử.

## Kiểm tra tự động

Lỗi chặn duyệt gồm tiêu đề/nội dung không đạt độ dài tối thiểu, thời lượng không hợp lệ, nội dung hoặc code vượt giới hạn và script/HTML nguy hiểm. Cảnh báo gồm thiếu mục tiêu, thiếu ví dụ, thiếu code C#, tiêu đề/nội dung gần trùng và nội dung chưa thể hiện rõ chủ đề chương.

Kết quả được lưu theo `lesson_id` và `lesson_version`. Backend vẫn kiểm tra kết quả này khi duyệt; việc ẩn hoặc bật nút trên giao diện không thay thế kiểm tra phía server/database.

## API

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/v1/courses/lessons/:id/validate` | Chạy và lưu kết quả kiểm tra phiên bản hiện tại. |
| `GET` | `/api/v1/courses/lessons/:id/validations/latest` | Lấy kết quả kiểm tra mới nhất của phiên bản hiện tại. |
| `POST` | `/api/v1/courses/lessons/:id/review-action` | Duyệt, xuất bản hoặc gỡ xuất bản. |
| `GET` | `/api/v1/courses/lessons/:id/review-history` | Xem lịch sử cùng snapshot. |
| `POST` | `/api/v1/courses/lessons/:id/versions/:version/restore` | Khôi phục snapshot thành một bản nháp mới. |

## Phân quyền

Chỉ `content_manager` và `admin` gọi được các API trên. Bảng validation bật RLS và không cấp quyền trực tiếp cho `anon` hoặc `authenticated`; backend truy cập bằng service role. Khôi phục bài đang xuất bản bị chặn cho đến khi bài được gỡ xuất bản.

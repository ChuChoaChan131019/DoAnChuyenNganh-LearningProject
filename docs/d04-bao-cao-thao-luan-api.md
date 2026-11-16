# D04 — Báo cáo nội dung thảo luận

Migration: `database/migrations/20261116090000_discussion_reports.sql`. Cần có bảng `profiles`, `discussion_posts`, `discussion_comments` và các role Supabase. Migration đã được áp dụng lên Supabase dùng chung ngày 16/11/2026.

## API học viên

- `POST /api/v1/discussion/reports` — JWT role `learner`. Body: `{ "target_type": "post" | "comment", "target_id": "uuid", "reason": "10–1000 ký tự" }`. Chỉ báo cáo nội dung đang hiển thị trong khóa/chương/bài đã xuất bản. Trả `id`, `status: "pending"`, `created_at`. Gửi trùng cùng nội dung khi báo cáo trước còn chờ xử lý trả 409.
- Giao diện báo cáo nằm trong chi tiết bài và mỗi bình luận của người khác. Danh tính người báo cáo không được trả về giao diện học viên.

## API admin

- `GET /api/v1/admin/discussion/reports?status=pending&limit=30&offset=0` — JWT role `admin`. `status` nhận `pending`, `dismissed`, `hidden`, `removed`, `all`; `limit` từ 1 đến 50. Trả `items`, `total`, `limit`, `offset`. Mỗi item có loại/ID nội dung, lý do, thời điểm, nội dung bài/bình luận, tiêu đề bài cha, chương/bài học và trạng thái xử lý. Không trả danh tính người báo cáo.
- `PATCH /api/v1/admin/discussion/reports/:id` — JWT role `admin`. Body: `{ "decision": "dismissed" | "hidden" | "removed", "reason": "10–1000 ký tự" }`. Trả bản ghi báo cáo sau xử lý, bao gồm moderator và thời gian xử lý.

RPC `resolve_discussion_report` thực hiện thay đổi trạng thái nội dung và kết thúc các báo cáo đang chờ của cùng nội dung trong một giao dịch. `dismissed` chỉ đóng báo cáo đang xét. Bài/bình luận `hidden` hoặc `removed` không còn hiện trong API học viên và không thể được tương tác tiếp. RPC chỉ cấp quyền thực thi cho `service_role`; API kiểm tra role admin trước khi gọi.

Giao diện quản trị ở `/admin/discussion-reports` dùng hai API admin trên để lọc, xem ngữ cảnh và xử lý báo cáo. Khu vực `/admin` chỉ dành cho vai trò `admin`; quyền thực thi vẫn được kiểm tra tại backend.

### Hoàn thiện trang quản trị

- Danh sách hỗ trợ thêm `target_type=all|post|comment` (mặc định `all`), kết hợp trạng thái và phân trang tại backend. Giá trị không hợp lệ trả 400.
- Trường `post_content` cung cấp nội dung bài gốc; với báo cáo bình luận, admin có thể mở phần ngữ cảnh này ngay trong trang.
- Khi đổi bộ lọc, trang hoặc báo cáo, quyết định và lý do đang nhập được đặt lại. Trong lúc lưu, giao diện khóa lựa chọn để tránh nhầm nội dung.
- Xác nhận ẩn/gỡ nêu rõ tác động đến học viên và các báo cáo đang chờ của cùng nội dung. Danh sách tự tải lại sau xử lý và lùi trang khi trang hiện tại không còn dữ liệu.

Kiểm thử migration bằng `npm test -w backend -- src/modules/discussion/discussion-reports.database.spec.ts`.

## Thông báo khi ẩn/gỡ nội dung

Migration: `database/migrations/20261116151251_discussion_removal_notifications.sql`, đã áp dụng lên Supabase ngày 16/11/2026.

- Quyết định `hidden` và `removed` tạo thông báo trong ứng dụng: bài đăng gửi cho tác giả bài; bình luận gửi cho tác giả bình luận. Không gửi cho người báo cáo, không gửi email; `dismissed` không tạo thông báo. Migration bổ sung: `20261116151806_discussion_hidden_notifications.sql`. Trường `decision` giúp giao diện phân biệt “đã bị ẩn” và “đã bị gỡ”; thông báo cũ giữ trạng thái `removed`.
- Trigger lưu thông báo cùng giao dịch xử lý báo cáo, chống trùng theo loại/ID nội dung. Không tạo hồi tố cho những lần gỡ trước migration.
- Thông báo lưu tiêu đề bài, trích đoạn nội dung và lý do admin nhập, không chứa danh tính người báo cáo. Người nhận xem được dù nội dung đã bị gỡ.
- `GET /api/v1/discussion/notifications?offset=0`: JWT hợp lệ, trả 20 thông báo của chính tài khoản cùng `total`, `unread`, `limit`, `offset`.
- `PATCH /api/v1/discussion/notifications/:id/read`: đánh dấu thông báo của chính tài khoản đã đọc; ID không thuộc người gọi trả 404. Không nhận recipient từ client.
- Bảng `discussion_notifications` bật RLS, không cấp quyền trực tiếp cho `anon`/`authenticated`. Backend kiểm tra tài khoản và giới hạn mọi truy vấn theo người nhận.
- Chuông trên thanh điều hướng học viên hiển thị số chưa đọc, danh sách phân trang và thao tác đánh dấu đã đọc. Tải lại khi mở chuông, quay lại cửa sổ hoặc mỗi 60 giây khi tab đang hiển thị.

## Khôi phục nội dung đã ẩn

Migration `20261116152416_restore_hidden_discussion.sql` đã áp dụng lên Supabase ngày 16/11/2026.

- Admin chọn báo cáo trong bộ lọc **Đã ẩn**, chọn **Khôi phục nội dung**, nhập lý do 10–1000 ký tự và xác nhận.
- `PATCH /api/v1/admin/discussion/reports/:id/restore`, body `{ "reason": "Lý do khôi phục" }`, chỉ dành cho admin. Trả 404 nếu báo cáo không tồn tại; 409 nếu báo cáo đã khôi phục hoặc nội dung không còn đủ điều kiện.
- RPC `restore_hidden_discussion_report` chỉ cấp quyền cho service role. Chỉ đổi `hidden` sang `visible` khi `deleted_at` rỗng; không khôi phục `removed`, không sửa trạng thái bài cha/chương/bài học.
- Giữ nguyên quyết định ẩn và lý do cũ. Các báo cáo cùng đợt ẩn ghi thêm `restored_at`, `restored_by`, `restoration_reason`. Giao diện hiển thị **Đã khôi phục**; bản ghi vẫn nằm trong lịch sử **Đã ẩn**.
- Nội dung có thể được báo cáo lại. Lần ẩn/gỡ mới tạo thông báo mới, không bị chặn bởi thông báo của lần trước. Khôi phục không tạo thêm thông báo cho tác giả.

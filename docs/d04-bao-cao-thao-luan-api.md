# D04 — Báo cáo nội dung thảo luận

Migration: `database/migrations/20261116090000_discussion_reports.sql`. Cần có bảng `profiles`, `discussion_posts`, `discussion_comments` và các role Supabase. Migration đã được áp dụng lên Supabase dùng chung ngày 16/11/2026.

## API học viên

- `POST /api/v1/discussion/reports` — JWT role `learner`. Body: `{ "target_type": "post" | "comment", "target_id": "uuid", "reason": "10–1000 ký tự" }`. Chỉ báo cáo nội dung đang hiển thị trong khóa/chương/bài đã xuất bản. Trả `id`, `status: "pending"`, `created_at`. Gửi trùng cùng nội dung khi báo cáo trước còn chờ xử lý trả 409.
- Giao diện báo cáo nằm trong chi tiết bài và mỗi bình luận của người khác. Danh tính người báo cáo không được trả về giao diện học viên.

## API admin

- `GET /api/v1/admin/discussion/reports?status=pending&limit=30&offset=0` — JWT role `admin`. `status` nhận `pending`, `dismissed`, `hidden`, `removed`, `all`; `limit` từ 1 đến 50. Trả `items`, `total`, `limit`, `offset`. Mỗi item có loại/ID nội dung, lý do, thời điểm, nội dung bài/bình luận, tiêu đề bài cha, chương/bài học và trạng thái xử lý. Không trả danh tính người báo cáo.
- `PATCH /api/v1/admin/discussion/reports/:id` — JWT role `admin`. Body: `{ "decision": "dismissed" | "hidden" | "removed", "reason": "10–1000 ký tự" }`. Trả bản ghi báo cáo sau xử lý, bao gồm moderator và thời gian xử lý.

RPC `resolve_discussion_report` thực hiện thay đổi trạng thái nội dung và kết thúc các báo cáo đang chờ của cùng nội dung trong một giao dịch. `dismissed` chỉ đóng báo cáo đang xét. Bài/bình luận `hidden` hoặc `removed` không còn hiện trong API học viên và không thể được tương tác tiếp. RPC chỉ cấp quyền thực thi cho `service_role`; API kiểm tra role admin trước khi gọi.

Chưa có trang `/admin/discussion-reports`; phần này sẽ làm chung với nhóm chức năng admin sau.

Kiểm thử migration bằng `npm test -w backend -- src/modules/discussion/discussion-reports.database.spec.ts`.

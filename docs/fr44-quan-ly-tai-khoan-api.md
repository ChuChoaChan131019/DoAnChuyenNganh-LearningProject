# FR-44 — Quản lý tài khoản

Phạm vi chốt ngày 16/11/2026: admin quản lý danh sách tài khoản, chỉ **tạo content manager**, sửa họ tên/email và vô hiệu hóa/khôi phục. Không có API đổi vai trò, tạo admin, xóa tài khoản hoặc xem mật khẩu. Học viên tự đăng ký. Trang phụ trách toàn bộ luồng.

## API

Các endpoint dưới đây yêu cầu Bearer token của admin đang hoạt động. API trả envelope `{ data: ... }`; lỗi trả `{ error: { code, message } }` theo quy ước dự án.

| Method | Endpoint | Dữ liệu |
| --- | --- | --- |
| GET | `/api/v1/admin/accounts` | `search`, `role=all/learner/content_manager/admin`, `status=all/active/disabled`, `limit=1..100` (mặc định 20), `offset>=0` |
| GET | `/api/v1/admin/accounts/:id` | Chi tiết hồ sơ, không trả dữ liệu xác thực |
| POST | `/api/v1/admin/accounts` | `{ email, fullName, password }`; tạo content manager; trả `{ id }` |
| PATCH | `/api/v1/admin/accounts/:id` | `{ email, fullName }`; trả `{ id }` |
| PATCH | `/api/v1/admin/accounts/:id/status` | `{ status: "active" hoặc "disabled" }`; trả `{ id }` |

Danh sách trả `items`, `total`, `limit`, `offset`, `stats: { total, active, disabled }`. `total` áp dụng bộ lọc; `stats` tính trên toàn bộ tài khoản. Mỗi dòng có `id`, `email`, `full_name`, `role`, `disabled_at`, `created_at`, `updated_at`.

Email được trim và chuyển chữ thường; họ tên dài 1–100 ký tự; mật khẩu dài 8–128 ký tự và có chữ hoa, chữ thường, số, ký tự đặc biệt. Không nhận `role`, `actor_id`, `app_metadata` hoặc trường ngoài DTO. Email trùng trả 409 `USER_ALREADY_EXISTS`; backend lấy người thực hiện từ JWT đã kiểm tra.

## Dữ liệu và triển khai

Migration: `database/migrations/20261116132831_admin_accounts.sql`. Áp dụng **một lần trước khi khởi động backend mới**; không có thay đổi vai trò hay xóa tài khoản hiện có.

- Supabase Auth tiếp tục quản lý mật khẩu, email, metadata tên và `banned_until`.
- `profiles` bổ sung `email`, `full_name` để tìm kiếm bằng SQL, `disabled_at` để chặn truy cập và `revoked_before` để từ chối access token cũ sau khi khôi phục.
- Trigger riêng trong schema `private` đồng bộ Auth → profiles. Trigger chạy trì hoãn đến cuối giao dịch vì Auth có thể ghi metadata và trạng thái khóa bằng nhiều câu UPDATE. Trigger đọc bản ghi cuối cùng, xác thực admin, đồng bộ hồ sơ và ghi audit trong cùng giao dịch; lỗi làm toàn bộ thao tác Auth rollback.
- Đăng ký thông thường luôn tạo `learner`, bỏ qua `user_metadata.role`. Chỉ thao tác tạo có metadata quản trị do server cấp và actor admin hợp lệ mới tạo `content_manager`.
- `account_admin_events` lưu người thực hiện, tài khoản, thao tác, trước/sau và thời điểm. Không lưu mật khẩu hoặc token. Bảng chỉ đọc từ backend; chưa có màn lịch sử riêng.
- `list_admin_accounts` chỉ cấp EXECUTE cho `service_role`; lọc trước phân trang và không giới hạn tìm kiếm ở 1.000 tài khoản đầu.
- Thu hồi quyền ghi `profiles` của anon/authenticated. Thêm policy hạn chế tài khoản bị khóa hoặc JWT cũ trên các bảng public có RLS và storage.objects hiện có. **Bảng RLS tạo sau migration phải bổ sung policy tương tự khi cần quyền tài khoản hoạt động.**

Vô hiệu hóa dùng Auth Admin API để ban tài khoản và vô hiệu hóa phiên refresh theo cơ chế Auth. Backend kiểm tra `disabled_at` ở login, refresh và JWT guard; so `iat` với `revoked_before` sau khi xác thực token. Khôi phục yêu cầu đăng nhập mới, không khôi phục phiên cũ. Khóa tạm `locked_until` do nhập sai mật khẩu vẫn tách biệt với khóa của admin.

Không cho tự vô hiệu hóa và không cho khóa admin hoạt động cuối cùng. Trigger kiểm tra lại bên trong giao dịch và tuần tự hóa thao tác admin để bảo vệ khi có yêu cầu đồng thời. Mọi thao tác tạo/sửa Auth chạy bằng client backend riêng; khóa bí mật không gửi xuống trình duyệt.

## Kiểm tra

- Unit/SQL: `npm run test -w backend -- src/modules/admin-accounts src/common/guards/account-access.spec.ts src/modules/auth/auth.service.spec.ts`.
- Kiểm tra build/lint theo `docs/quy-tac-commit-push-pr.md`.
- Nghiệm thu trình duyệt: tạo content manager; email trùng; sửa tên/email; lọc/tìm; vô hiệu hóa rồi thử login, token đang có và refresh; khôi phục rồi đăng nhập mới; kiểm tra learner/content manager bị từ chối API admin; gửi thêm `role` phải bị từ chối.
- Lỗi mật khẩu có một dòng hướng dẫn dưới ô, chuyển đỏ khi sai. Dialog có focus trap, Escape, khóa nút khi gửi và xác nhận trước khi thay đổi trạng thái.

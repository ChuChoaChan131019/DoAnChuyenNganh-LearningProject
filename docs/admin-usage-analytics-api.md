# Admin System Usage & Feature Analytics API

Hai endpoint dưới đây chỉ đọc dữ liệu tổng hợp. Cả hai yêu cầu Bearer token hợp lệ và `profiles.role = admin`; response nằm trong envelope `{ "data": ... }` của backend. Không trả danh sách người dùng hay PII.

## Bộ lọc chung

- `GET /api/v1/admin/usage?days=7&role=all` (mặc định 7 ngày)
- `GET /api/v1/admin/analytics?days=30&role=learner` (mặc định 30 ngày, API mặc định `role=all` nếu bỏ qua tham số)
- `days`: `7`, `30`, `90`.
- Hoặc thay `days` bằng cặp `from=YYYY-MM-DD&to=YYYY-MM-DD`, bao gồm cả hai ngày, tối đa 90 ngày và không vượt ngày hiện tại.
- `role`: `all`, `learner`, `content_manager`, `admin`.
- Ngày được nhóm theo UTC+7 (`Asia/Ho_Chi_Minh`); `generatedAt` là thời điểm UTC.
- Bộ lọc sai trả HTTP 400. Thiếu/quá hạn token trả 401; không phải Admin trả 403; lỗi truy vấn trả 500 thay vì trả số 0 giả.

## System Usage

Response có `range`, `role`, `source`, `coverage`, `available`, `metrics`, `daily`.

- `metrics.activeUsers`: user duy nhất có meaningful activity trong khoảng chọn.
- `metrics.meaningfulActivities`: tổng business actions trong khoảng chọn.
- `metrics.dau/wau/mau`: user duy nhất ở ngày cuối/7 ngày/30 ngày kết thúc tại `to`.
- `daily`: DAU, WAU, MAU rolling và số actions cho từng ngày trong khoảng; ngày không có hoạt động vẫn xuất hiện với 0.
- Các trường `*Delta` là phần trăm so với kỳ liền trước cùng độ dài; DAU/WAU/MAU so với ngày/7 ngày/30 ngày trước đó. Nếu kỳ trước bằng 0 thì trả `null`, không suy diễn thành `0%`.
- Hoạt động học tập của Learner (`lesson_*`, `quiz_*`, `exercise_*`, `practice_completed`) lấy từ `learning_history`. Những business actions khác lấy từ `analytics_events`. Nếu cùng một hoạt động học tập của Learner xuất hiện ở cả hai bảng, chỉ tính `learning_history` để tránh đếm trùng.
- Chỉ dùng event thuộc allowlist business action; login, page view, session và error không được tính. Khi có cả hai nguồn, `source=combined`, `coverage=partial_recorded_activity`; nếu chỉ có một nguồn, `source` và `coverage` mô tả nguồn đó. Các nhãn coverage nhắc rằng số liệu chỉ bao gồm sự kiện đã được ghi nhận.
- Khi chưa có analytics event, `all` **chỉ bao phủ Learner**; `content_manager` và `admin` trả `available=false` và metrics `null`, không giả vờ rằng họ có 0 hoạt động. Nếu có event của hai vai trò này, bộ lọc tương ứng sẽ trả dữ liệu đã ghi nhận.

Với dữ liệu hiện tại, `analytics_events` chưa ghi sự kiện nên System Usage dùng nguồn dự phòng. Việc chuyển hoàn toàn sang `analytics_events` cần triển khai Event Contract ở các phân hệ phát sự kiện và kiểm tra chất lượng telemetry; thay đổi đó nằm ngoài phạm vi Admin hiện tại.

## Feature Analytics

Response có `source=analytics_events`, `coverage=instrumented_events_only`, `events`, `funnel`.

- Mỗi event có `uniqueUsers` (user ID duy nhất, bỏ qua null), `totalActions` và `deltaPct` so với kỳ trước cùng độ dài. `deltaPct=null` nếu kỳ trước bằng 0.
- `events` chỉ gồm event đã xuất hiện ở kỳ hiện tại hoặc kỳ trước; event chưa hề được ghi không được hiển thị với số giả.
- Funnel chỉ hiển thị khi đủ ba loại event của Learner có `user_id` và `course_id`: `course_viewed` → `enrollment_started` → `lesson_started`. Một hành trình phải cùng user, cùng course và đúng thứ tự thời gian; mỗi user chỉ được đếm một lần ở mỗi bước. Thiếu một loại event thì `funnel.available=false`.
- Chưa có writer cho `analytics_events` (`backend/src/modules/events` hiện là TODO), nên `events=[]` và funnel unavailable là kết quả đúng hiện tại. Không thêm instrumentation vào Learner hay Content Studio trong thay đổi này.

## Kiểm thử dữ liệu

Ngày 12/10/2026, truy vấn read-only xác nhận `analytics_events` có 0 dòng; `learning_history` có 26 dòng `practice_completed`, trong khoảng 14/09–02/10. Kết quả thực tế sẽ thay đổi khi có dữ liệu mới. Không có schema migration và không sửa `frontend/src/app/globals.css`.

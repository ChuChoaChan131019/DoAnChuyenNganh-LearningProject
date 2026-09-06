# CHI TIẾT CƠ CHẾ HỆ THỐNG DÙNG CHUNG
## PHÂN HỆ NGƯỜI DÙNG

# SYS-01 – XÁC THỰC VÀ PHÂN QUYỀN

## Mô tả

Cung cấp Authentication, Role và điều hướng người dùng tới đúng vùng chức năng.

## Luồng

1. User đăng ký bằng email/password.
2. Chỉ được chọn Learner hoặc Content Manager.
3. Admin không được tự chọn.
4. User đăng nhập.
5. Hệ thống kiểm tra Authentication và Role.
6. Điều hướng:
   - Learner → Learner Dashboard.
   - Content Manager → Teacher Dashboard.
   - Admin → Admin Dashboard.
7. User có thể Logout.

## Quy tắc

- Không yêu cầu email verification.
- Backend phải chặn request cố gắng tự gán Admin.
- Role không được thay đổi bởi user.
- Backend và UI đều phải kiểm tra quyền.

## Account Lock [Cập nhật mới]

- Mỗi lần sai mật khẩu liên tiếp làm tăng `failed_login_attempts`.
- Sau 5 lần sai:
  - `locked_until = current_time + 15 minutes`.
- Trong thời gian khóa, kể cả mật khẩu đúng vẫn không được login.
- Login thành công:
  - đặt lại `failed_login_attempts = 0`;
  - xóa `locked_until`.

## Shared Auth [Cập nhật mới]

Phân hệ Nội dung sử dụng cùng Supabase Authentication/Role.

Không xây:
- hệ thống login thứ hai;
- bảng role độc lập;
- API kiểm tra role cho mọi request nếu hai phân hệ dùng chung Supabase context.

# SYS-02 – TRACKING CONTEXT

## Mô tả

Cho phép Content Manager theo dõi Learner trong phạm vi quản lý mà không hard-code entity Class.

## Phiên bản hiện tại [Cập nhật mới]

Tracking Context thực tế = Course.

Quyền quản lý Course:

`courses.created_by == current_content_manager_id`

`courses.created_by` thuộc Phân hệ Nội dung và là nguồn chính thức.

Danh sách Learner trong Course:

`course_enrollments.course_id == course.id`
và
`course_enrollments.status == active`.

Không tạo mapping Content Manager ↔ Course trùng lặp.

# SYS-03 – NOTIFICATION DÙNG CHUNG

## Mô tả

Một hệ Notification chung phục vụ:

- Reminder.
- Learning Notification.
- Message Notification.
- System Notification.
- Notification từ Phân hệ Nội dung.

## Mô hình dữ liệu [Cập nhật mới]

Tách:

### `notifications`

Lưu nội dung thông báo.

### `notification_recipients`

Lưu user thực sự nhận Notification và read-state.

Quan hệ:

1 Notification
→ nhiều Notification Recipient.

## Kênh

- In-app.
- Email khi chức năng cho phép.

## Scheduled Notification

Notification chưa gửi:
- sửa được;
- hủy được.

Notification đã gửi:
- không sửa;
- không xóa.

Recipient của Scheduled Notification phải được kiểm tra lại tại thời điểm gửi.

# SYS-04 – ANALYTICS VÀ EVENT

## Mô tả

Thu thập Meaningful Activities, Feature Events và dữ liệu phục vụ Admin Analytics.

## Event Contract [Cập nhật mới]

Event chuẩn có:

- `event_id`.
- `event_name`.
- `event_version`.
- `occurred_at`.
- `actor`.
- `source`.
- `context`.
- `metadata`.

`event_id` là duy nhất và dùng chống duplicate.

Phân hệ Nội dung gửi Event qua:

`POST /api/v1/internal/events`

## Tách dữ liệu [Cập nhật mới]

- `analytics_events`: dữ liệu telemetry/analytics.
- `learning_history`: lịch sử học Learner.

Một Event như `quiz_completed` có thể tạo record ở cả hai bảng.

Không phải mọi Analytics Event đều là Learning History.

# SYS-05 – XUẤT BÁO CÁO

- T-M09 và A-M06 hỗ trợ:
  - Web.
  - PDF.
  - Excel.
- Không lưu report snapshot.
- Report được tính lại mỗi lần xem/export.
- Nếu thiếu nguồn dữ liệu bắt buộc:
  - Web hiển thị phần còn có.
  - Không cho export.

# SYS-06 – COURSE ENROLLMENT [Cập nhật mới]

## Mô tả

Quản lý quan hệ Learner đang tham gia Course nào.

## Luồng Join

1. Learner chọn Course.
2. Chọn “Tham gia khóa học”.
3. User Backend kiểm tra role Learner.
4. User Backend kiểm tra Course với Content API.
5. Course phải tồn tại và được phép tham gia.
6. Nếu chưa có Enrollment:
   - tạo record `active`.
7. Nếu Enrollment đang `left`:
   - chuyển lại `active`.
8. Nếu đã `active`:
   - không tạo duplicate.

## Luồng Leave

1. Learner chọn “Rời khóa học”.
2. Enrollment chuyển:
   - `active → left`.
3. Không DELETE dữ liệu lịch sử.
4. Active Study Plan của Course:
   - `archived`.
5. Task chưa hoàn thành:
   - `cancelled`.
6. Reminder chưa gửi:
   - `cancelled`.
7. Conversation:
   - `read_only`.
8. Progress, Learning History, Note, Bookmark, Feedback, Message:
   - giữ nguyên.

## Quy tắc

- Learner được có nhiều Enrollment Active.
- Chỉ được một Study Plan Active trên toàn hệ thống.
- Enrollment và Study Plan là hai entity độc lập.

# SYS-07 – INTEGRATION LAYER [Cập nhật mới]

## Mục đích

Cô lập dependency vào Phân hệ Nội dung.

## Thành phần

`ContentGateway`

Các implementation:

- `MockContentGateway`.
- `HttpContentGateway`.

Business logic User không gọi trực tiếp JSON mock hoặc HTTP endpoint.

## Mapping

Các giá trị Content có thể thay đổi, ví dụ:

`exercise` → `practice`

phải được chuẩn hóa tại Mapper/Adapter.

Không hard-code raw value trong nhiều module.

# SYS-08 – MOCK VÀ DEVELOPMENT DATA [Cập nhật mới]

Dependency của Content:
- JSON fixture.
- Mock Gateway.

Dữ liệu User:
- Supabase/PostgreSQL Development DB.
- SQL Seed.

Mock bắt buộc có:
- success;
- 404;
- timeout;
- 503;
- hidden content;
- insufficient practice questions;
- duplicate event;
- invalid event.
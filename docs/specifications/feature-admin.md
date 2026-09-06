# Đặc tả Chức năng Admin (Admin Feature Specification)

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [A-M01 – Admin Dashboard](#2-a-m01--admin-dashboard)
3. [A-M02 – System Usage](#3-a-m02--system-usage)
4. [A-M03 – Feature Analytics](#4-a-m03--feature-analytics)
5. [A-M04 – Error/UX Monitoring](#5-a-m04--errorux-monitoring)
6. [A-M05 – System Notification](#6-a-m05--system-notification)
7. [A-M06 – System Report](#7-a-m06--system-report)
8. [Phụ lục A – Event Catalog](#8-phụ-lục-a--event-catalog)
9. [Phụ lục B – Mô hình dữ liệu tham chiếu](#9-phụ-lục-b--mô-hình-dữ-liệu-tham-chiếu)

---

## 1. Tổng quan

### 1.1. Mục đích tài liệu

Tài liệu này mô tả đặc tả chức năng (functional specification) của tất cả các tính năng dành cho vai trò **Admin** (Quản trị viên) trong Phân hệ Người dùng.

### 1.2. Định nghĩa vai trò Admin

Admin là người dùng có quyền quản trị hệ thống. Admin không được tự đăng ký mà phải được tạo bởi Admin khác hoặc hệ thống.

**Quyền hạn của Admin:**
- Xem toàn bộ analytics và usage data
- Giám sát system health và error
- Gửi thông báo hệ thống
- Xuất báo cáo tổng hợp
- Quản lý người dùng hệ thống

### 1.3. Nguồn dữ liệu Analytics

**Nguyên tắc:**
- Analytics sử dụng bảng `analytics_events` làm nguồn dữ liệu chính
- Content Module gửi event vào hệ Analytics chung qua HTTP Event Contract
- Event Catalog là nguồn thống nhất tên event giữa hai phân hệ

### 1.4. Quy ước trong tài liệu

| Ký hiệu | Ý nghĩa |
|----------|----------|
| **[TODO]** | Tính năng hoặc quy tắc phụ thuộc vào Phân hệ Nội dung, đang chờ contract chính thức |
| **[OPEN]** | Vấn đề chưa được giải quyết, cần thảo luận thêm |
| **Must** | Yêu cầu bắt buộc |
| **Should** | Yêu cầu khuyến nghị |
| **May** | Yêu cầu tùy chọn |

---

## 2. A-M01 – Admin Dashboard

### 2.1. Mục đích

Admin Dashboard là màn hình chính mà Admin nhìn thấy ngay sau khi đăng nhập. Mục đích là cung cấp cái nhìn tổng quan về tình trạng toàn hệ thống.

### 2.2. Thời gian mặc định

**Default:** 7 ngày gần nhất

Admin có thể thay đổi khoảng thời gian hiển thị.

### 2.3. Thành phần hiển thị

Dashboard bao gồm các thành phần sau:

| STT | Thành phần | Mô tả |
|-----|------------|--------|
| 1 | Total Accounts | Tổng số tài khoản trong hệ thống |
| 2 | New Accounts | Số tài khoản mới đăng ký |
| 3 | Active Users | Số user có Meaningful Activity |
| 4 | DAU | Daily Active Users - User hoạt động trong ngày |
| 5 | WAU | Weekly Active Users - User hoạt động trong tuần |
| 6 | MAU | Monthly Active Users - User hoạt động trong tháng |
| 7 | AI Usage | Thống kê sử dụng AI features |
| 8 | System Status | Trạng thái hoạt động của hệ thống |

### 2.4. Định nghĩa Active User

**Quy tắc:**
- Active User phải có **Meaningful Activity**
- Login đơn thuần **không** được tính là Active

**Ví dụ Meaningful Activity:**
- Tạo Study Plan
- Hoàn thành Lesson
- Nộp Quiz
- Gửi Feedback
- Sử dụng AI Learning Plan

### 2.5. AI Usage Metrics

| Metric | Mô tả |
|--------|--------|
| Total AI Calls | Tổng số lần gọi AI API |
| AI Plan Usage | Số lần sử dụng AI Learning Plan |
| Personalized Usage | Số lần sử dụng Personalized Learning |
| Adaptive Usage | Số lần sử dụng Adaptive Learning |
| Tokens Used | Số tokens đã sử dụng (nếu có) |

### 2.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A01 | Admin đăng nhập → Dashboard hiển thị đầy đủ 8 thành phần | Manual |
| AC-A02 | Default hiển thị 7 ngày | Manual |
| AC-A03 | Login đơn thuần không tính là Active User | Automated |
| AC-A04 | AI Usage hiển thị đúng metrics | Manual |

---

## 3. A-M02 – System Usage

### 3.1. Mục đích

System Usage theo dõi mức độ sử dụng hệ thống của người dùng, tập trung vào các hoạt động có ý nghĩa nghiệp vụ.

### 3.2. Định nghĩa Meaningful Activity

**Nguyên tắc:**
- Meaningful Activity = Business action có ý nghĩa nghiệp vụ
- Page view đơn thuần **không** được tính là Meaningful Activity

**Ví dụ Meaningful Activity (không giới hạn):**
- Tạo/cập nhật/xóa Study Plan
- Hoàn thành Lesson
- Bắt đầu/nộp Quiz
- Gửi/nhận Feedback
- Tạo/xóa Note, Bookmark
- Gửi Message
- Đăng ký/rời Course
- Sử dụng AI features

### 3.3. Metrics được theo dõi

| Metric | Mô tả |
|--------|--------|
| Active Users | Số user có ít nhất 1 Meaningful Activity |
| Meaningful Activities | Tổng số Meaningful Activity |
| DAU | User có Meaningful Activity trong ngày |
| WAU | User có Meaningful Activity trong 7 ngày gần nhất |
| MAU | User có Meaningful Activity trong 30 ngày gần nhất |

### 3.4. Bộ lọc (Filters)

| Filter | Tùy chọn |
|--------|-----------|
| Role | Learner, Content Manager, Admin, All |
| Time Period | 7 ngày, 30 ngày, 90 ngày, Custom |

### 3.5. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| No drill-down user list | Không cho phép xem chi tiết danh sách user cụ thể |
| Aggregate only | Chỉ hiển thị dữ liệu tổng hợp |
| Privacy | Không tiết lộ thông tin cá nhân của user |

### 3.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A05 | Metrics hiển thị đúng theo Meaningful Activity | Automated |
| AC-A06 | Page view không được tính | Automated |
| AC-A07 | Filter by role hoạt động đúng | Manual |
| AC-A08 | Filter by time period hoạt động đúng | Manual |
| AC-A09 | Không hiển thị danh sách user cụ thể | Manual |

---

## 4. A-M03 – Feature Analytics

### 4.1. Mục đích

Feature Analytics theo dõi mức độ sử dụng các tính năng cụ thể trong hệ thống, giúp hiểu hành vi người dùng và đánh giá hiệu quả tính năng.

### 4.2. Dữ liệu nguồn

**Feature usage dựa trên Meaningful Feature Event.**

Mỗi tính năng có các event tương ứng được ghi nhận khi người dùng tương tác.

### 4.3. Ví dụ Feature Events

| Feature | Events |
|---------|--------|
| Study Plan | `study_plan_created`, `study_plan_updated`, `study_plan_completed` |
| Bookmark | `bookmark_added`, `bookmark_removed` |
| Quiz | `quiz_started`, `quiz_completed` |
| Feedback | `feedback_sent`, `feedback_received` |
| AI Learning | `ai_learning_plan_applied`, `ai_recommendation_accepted` |

### 4.4. Metrics

| Metric | Mô tả |
|--------|--------|
| Unique Users | Số lượng user duy nhất đã sử dụng feature |
| Total Actions | Tổng số action trên feature |
| Trend | Xu hướng sử dụng theo thời gian |

### 4.5. Funnel Analytics

**Nguyên tắc:**
- Funnel chỉ được xây dựng cho feature có flow rõ ràng
- Mỗi funnel gồm các bước (steps) theo thứ tự

**Cấu trúc Funnel:**
| Thành phần | Mô tả |
|------------|--------|
| Step | Mỗi bước trong flow |
| Step Name | Tên bước |
| Users at Step | Số user đạt đến bước này |
| Conversion Rate | Tỷ lệ chuyển đổi từ bước trước |

**Ví dụ cấu trúc Funnel:**
```
Enrollment Funnel:
Step 1: View Course → 1000 users
Step 2: Click Join → 500 users (50% conversion)
Step 3: Confirm Enrollment → 400 users (80% conversion)
Step 4: Active in Course → 300 users (75% conversion)
```

### 4.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A10 | Feature Events được ghi nhận khi user tương tác | Automated |
| AC-A11 | Unique Users đếm đúng user duy nhất | Automated |
| AC-A12 | Total Actions đếm đúng tổng actions | Automated |
| AC-A13 | Funnel hiển thị conversion rate đúng | Manual |
| AC-A14 | Funnel chỉ cho feature có flow rõ | Manual |

---

## 5. A-M04 – Error/UX Monitoring

### 5.1. Mục đích

Error/UX Monitoring theo dõi các lỗi và vấn đề trải nghiệm người dùng trong hệ thống.

### 5.2. Loại lỗi được theo dõi

| Loại | Mô tả |
|------|--------|
| Backend Error | Lỗi phía server, API failure |
| External Failure | Lỗi khi gọi service bên ngoài |
| Critical Client Error | Lỗi nghiêm trọng phía client |
| UX Failure Signal | Dấu hiệu vấn đề về trải nghiệm người dùng |

### 5.3. Error Group Attributes

Mỗi Error Group chứa các thông tin sau:

| Thuộc tính | Mô tả |
|------------|--------|
| Type/Name | Loại và tên lỗi |
| Severity | Mức độ nghiêm trọng |
| Count | Số lần xuất hiện |
| First Seen | Thời điểm xuất hiện lần đầu |
| Last Seen | Thời điểm xuất hiện lần cuối |
| Status | Open / Resolved |

### 5.4. Error Severity Levels

| Level | Ký hiệu | Mô tả | Ví dụ |
|-------|---------|--------|--------|
| Critical | 🔴 | Hệ thống không hoạt động, mất dữ liệu | Database down, Auth failure |
| High | 🟠 | Chức năng chính bị ảnh hưởng nghiêm trọng | Payment failed, Data corruption |
| Medium | 🟡 | Chức năng bị ảnh hưởng nhưng có workaround | Slow response, UI glitch |
| Low | 🔵 | Vấn đề nhỏ, ảnh hưởng không đáng kể | Minor UI bug, warning |

### 5.5. Quy tắc Privacy

**Log KHÔNG được chứa:**

| Loại dữ liệu | Lý do |
|---------------|--------|
| Password | Bảo mật tài khoản |
| Access Token | Bảo mật phiên làm việc |
| Refresh Token | Bảo mật phiên làm việc |
| Full Message | Dữ liệu riêng tư |
| Full Feedback | Dữ liệu riêng tư |
| Dữ liệu riêng tư không cần thiết | Bảo vệ privacy |

**User ID Pseudonymization:**
- Log ghi user_id nhưng phải được **hash/anonymize**
- Không lưu user_id thực trong log
- Ví dụ: `user_id: "hash_abc123xyz"` thay vì `user_id: "user_12345"`

### 5.6. Phân tách dữ liệu

**Nguyên tắc:**
- Error telemetry **không được** trộn vào Learning History
- Analytics Events và Learning History là hai stream riêng biệt

### 5.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A15 | Error được nhóm theo type/name | Automated |
| AC-A16 | Severity được phân loại đúng | Manual |
| AC-A17 | Log không chứa password/token/message/feedback thực | Automated |
| AC-A18 | User ID được pseudonymize trong log | Automated |
| AC-A19 | Error telemetry không trộn vào Learning History | Automated |

---

## 6. A-M05 – System Notification

### 6.1. Mục đích

System Notification cho phép Admin gửi thông báo đến người dùng trong hệ thống.

### 6.2. Người nhận (Recipient)

| Loại | Mô tả |
|------|--------|
| All | Tất cả người dùng trong hệ thống |
| Learner | Chỉ người dùng có vai trò Learner |
| Content Manager | Chỉ người dùng có vai trò Content Manager |
| Admin | Chỉ người dùng có vai trò Admin |

### 6.3. Loại thông báo (Types)

| Type | Mô tả | Mức độ ưu tiên |
|------|--------|----------------|
| General | Thông báo chung | Thấp |
| Warning | Cảnh báo | Trung bình |
| Maintenance | Bảo trì hệ thống | Cao |

### 6.4. Thời điểm gửi

| Loại | Mô tả |
|------|--------|
| Now | Gửi ngay lập tức |
| Scheduled | Đặt lịch gửi vào thời điểm cụ thể |

### 6.5. Kênh gửi

| Kênh | Mô tả | Mặc định |
|-------|-------|-----------|
| In-app | Thông báo trong ứng dụng | Bắt buộc |
| Email | Gửi qua email | Tùy chọn (optional) |

### 6.6. Trạng thái

| Trạng thái | Mô tả |
|-------------|--------|
| Sent | Đã gửi - **immutable**, không thể sửa hoặc xóa |

### 6.7. Metrics đọc (Read Metrics)

| Metric | Mô tả |
|--------|--------|
| Total Recipients | Tổng số người nhận |
| Read | Số người đã đọc |
| Unread | Số người chưa đọc |
| Read Rate | Tỷ lệ đã đọc (Read / Total × 100%) |

### 6.8. Mô hình dữ liệu

**Bảng `notifications`:**
| Trường | Kiểu | Mô tả |
|---------|------|--------|
| id | UUID | Khóa chính |
| type | ENUM | 'general', 'warning', 'maintenance' |
| title | VARCHAR | Tiêu đề thông báo |
| content | TEXT | Nội dung thông báo |
| sent_at | TIMESTAMP | Thời điểm gửi (nullable nếu scheduled) |
| created_by | UUID | ID Admin tạo notification |
| created_at | TIMESTAMP | Thời điểm tạo |

**Bảng `notification_recipients`:**
| Trường | Kiểu | Mô tả |
|---------|------|--------|
| id | UUID | Khóa chính |
| notification_id | UUID | Khóa ngoại đến notifications |
| user_id | UUID | ID người nhận |
| read_at | TIMESTAMP | Thời điểm đọc (nullable) |

### 6.9. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A20 | Gửi cho All → Tất cả user nhận | Automated |
| AC-A21 | Gửi cho role cụ thể → Chỉ user đúng role nhận | Automated |
| AC-A22 | Scheduled notification → Gửi đúng thời điểm | Automated |
| AC-A23 | Email optional → Gửi khi được chọn | Manual |
| AC-A24 | Notification đã Sent → Không sửa/xóa được | Automated |
| AC-A25 | Read metrics hiển thị đúng | Automated |

---

## 7. A-M06 – System Report

### 7.1. Mục đích

System Report cho phép Admin xuất báo cáo tổng hợp về tình trạng hệ thống.

### 7.2. Thời gian mặc định

**Default:** 30 ngày gần nhất

Admin có thể thay đổi khoảng thời gian báo cáo.

### 7.3. Các nhóm bắt buộc

Báo cáo bắt buộc bao gồm 4 nhóm sau:

| Nhóm | Mô tả |
|------|--------|
| Usage | Thống kê sử dụng hệ thống |
| Feature Analytics | Phân tích sử dụng tính năng |
| Error/UX | Lỗi và trải nghiệm người dùng |
| AI Usage | Thống kê sử dụng AI |

### 7.4. AI Usage Metrics trong Report

| Metric | Mô tả |
|--------|--------|
| Total AI Calls | Tổng số lần gọi AI API |
| AI Features Breakdown | Phân chia theo từng AI feature |
| Success Rate | Tỷ lệ thành công của AI calls |
| Average Response Time | Thời gian phản hồi trung bình |

### 7.5. Định dạng xuất (Output Formats)

| Định dạng | Mô tả |
|-----------|--------|
| Web | Hiển thị trên giao diện |
| PDF | Tải về dạng PDF |
| Excel | Tải về dạng Excel (.xlsx) |

### 7.6. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| No snapshot | Không lưu report snapshot |
| Recalculate | Report được tính lại mỗi lần xem/export |
| Partial web | Nếu thiếu nguồn bắt buộc: Web hiển thị phần còn có |
| Lock export | Nếu thiếu một nhóm bắt buộc: Khóa export, hiển thị cảnh báo |

### 7.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-A26 | Default hiển thị 30 ngày | Manual |
| AC-A27 | Web hiển thị đầy đủ 4 nhóm bắt buộc | Manual |
| AC-A28 | Export PDF hoạt động | Manual |
| AC-A29 | Export Excel hoạt động | Manual |
| AC-A30 | Thiếu nhóm bắt buộc → Cảnh báo, khóa export | Manual |

---

## 8. Phụ lục A – Event Catalog

### A.1. Mục đích

Event Catalog là nguồn thống nhất tên event giữa Phân hệ Người dùng và Phân hệ Nội dung.

### A.2. User Module Events

| Event Name | Mô tả | Nguồn |
|------------|--------|-------|
| `user_registered` | User đăng ký tài khoản mới | User Module |
| `user_login` | User đăng nhập | User Module |
| `user_logout` | User đăng xuất | User Module |
| `enrollment_started` | Learner bắt đầu tham gia Course | User Module |
| `enrollment_left` | Learner rời Course | User Module |
| `study_plan_created` | Tạo Study Plan mới | User Module |
| `study_plan_updated` | Cập nhật Study Plan | User Module |
| `study_plan_completed` | Hoàn thành Study Plan | User Module |
| `lesson_started` | Bắt đầu học Lesson | Content → User |
| `lesson_completed` | Hoàn thành Lesson | Content → User |
| `bookmark_added` | Thêm Bookmark | User Module |
| `bookmark_removed` | Xóa Bookmark | User Module |
| `note_created` | Tạo Note | User Module |
| `note_updated` | Cập nhật Note | User Module |
| `note_deleted` | Xóa Note | User Module |
| `feedback_sent` | Gửi Feedback | User Module |
| `message_sent` | Gửi Message | User Module |
| `ai_learning_plan_applied` | Áp dụng AI Learning Plan | User Module |
| `ai_recommendation_accepted` | Chấp nhận AI recommendation | User Module |
| `notification_sent` | Gửi Notification | User Module |
| `notification_read` | Đọc Notification | User Module |

### A.3. Content Module Events

| Event Name | Mô tả | Nguồn |
|------------|--------|-------|
| `quiz_started` | Bắt đầu làm Quiz | Content Module |
| `quiz_completed` | Hoàn thành Quiz | Content Module |
| `exercise_started` | Bắt đầu làm Exercise | Content Module |
| `exercise_completed` | Hoàn thành Exercise | Content Module |
| `course_viewed` | Xem Course | Content Module |
| `material_accessed` | Truy cập Material | Content Module |

### A.4. Analytics Events

| Event Name | Mô tả | Ghi chú |
|------------|--------|---------|
| `error_occurred` | Lỗi xảy ra | User Module |
| `api_call_failed` | API call thất bại | User Module |
| `page_view` | Xem trang | Không phải Meaningful Activity |
| `session_started` | Bắt đầu session | User Module |
| `session_ended` | Kết thúc session | User Module |

### A.5. Cấu trúc Event

**Event chuẩn có các trường sau:**

| Trường | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|--------|
| event_id | UUID | Yes | ID duy nhất của event |
| event_name | String | Yes | Tên event |
| event_version | String | Yes | Phiên bản event schema |
| occurred_at | Timestamp | Yes | Thời điểm xảy ra |
| actor | Object | Yes | Người thực hiện |
| source | String | Yes | Nguồn phát sinh |
| context | Object | No | Ngữ cảnh bổ sung |
| metadata | Object | No | Dữ liệu bổ sung |

---

## 9. Phụ lục B – Mô hình dữ liệu tham chiếu

### B.1. Mục đích

Phụ lục này mô tả cấu trúc dữ liệu chính liên quan đến các tính năng Admin. Chi tiết đầy đủ xem trong `docs/design/database-schema.sql`.

### B.2. Các bảng chính

| Bảng | Chức năng | Module |
|------|-----------|--------|
| `users` | Thông tin người dùng | System |
| `analytics_events` | Sự kiện phân tích | A-M02, A-M03 |
| `error_events` | Sự kiện lỗi | A-M04 |
| `notifications` | Thông báo hệ thống | A-M05 |
| `notification_recipients` | Người nhận thông báo | A-M05 |

### B.3. Mối quan hệ chính

```
users (1) ─── (n) analytics_events
users (1) ─── (n) error_events
users (1) ─── (n) notifications (as creator)
notifications (1) ─── (n) notification_recipients
notification_recipients (n) ─── (1) users
```

### B.4. Quy tắc Privacy cho Analytics

| Quy tắc | Mô tả |
|----------|--------|
| No PII in events | Event không chứa thông tin cá nhân thực |
| User pseudonymization | User ID trong events phải được hash |
| Data retention | Dữ liệu analytics có thời gian lưu trữ giới hạn |
| Separate from learning | Analytics không trộn với Learning History |

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ ChiTiet_ChucNang_QuanTriVien_PhanHeNguoiDung_V2.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| Đề cương Đồ án | `docs/reference/de-cuong-du-an.md` | Tổng quan đề tài |
| Chi tiết chức năng Admin (gốc) | `ChiTiet_ChucNang_QuanTriVien_PhanHeNguoiDung_V2.md` | Nguồn tham khảo |
| Database Schema | `docs/design/database-schema.sql` | Chi tiết bảng và cột |
| Event Contract | `docs/design/event-contract.md` | Contract event giữa hai phân hệ |
| Chi tiết chức năng Learner | `docs/specifications/feature-learner.md` | Learner features |
| Chi tiết chức năng Content Manager | `docs/specifications/feature-content-manager.md` | Content Manager features |

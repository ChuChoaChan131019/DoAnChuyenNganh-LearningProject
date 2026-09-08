# Đặc tả Cơ chế Hệ thống (System Mechanisms Specification)

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [SYS-01 – Xác thực và Phân quyền](#2-sys-01--xác-thực-và-phân-quyền)
3. [SYS-02 – Tracking Context](#3-sys-02--tracking-context)
4. [SYS-03 – Notification Dùng chung](#4-sys-03--notification-dùng-chung)
5. [SYS-04 – Analytics và Event](#5-sys-04--analytics-và-event)
6. [SYS-05 – Xuất Báo cáo](#6-sys-05--xuất-báo-cáo)
7. [SYS-06 – Course Enrollment](#7-sys-06--course-enrollment)
8. [SYS-07 – Integration Layer](#8-sys-07--integration-layer)
9. [SYS-08 – Mock và Development Data](#9-sys-08--mock-và-development-data)
10. [Phụ lục A – Soft Delete Pattern](#10-phụ-lục-a--soft-delete-pattern)
11. [Phụ lục B – Retry Logic](#11-phụ-lục-b--retry-logic)

---

## 1. Tổng quan

### 1.1. Mục đích tài liệu

Tài liệu này mô tả các cơ chế hệ thống dùng chung (shared system mechanisms) được sử dụng bởi tất cả các vai trò: Learner, Content Manager, và Admin.

### 1.2. Phạm vi

Các cơ chế được mô tả trong tài liệu này áp dụng cho:

- Xác thực và phân quyền người dùng
- Theo dõi ngữ cảnh (Tracking Context)
- Hệ thống thông báo
- Thu thập và xử lý event
- Xuất báo cáo
- Quản lý Enrollment
- Tích hợp với Phân hệ Nội dung
- Môi trường phát triển và testing

### 1.3. Quy ước trong tài liệu

| Ký hiệu | Ý nghĩa |
|----------|----------|
| **[TODO]** | Tính năng đang chờ contract chính thức từ Phân hệ Nội dung |
| **[OPEN]** | Vấn đề chưa được giải quyết |
| **Must** | Yêu cầu bắt buộc |
| **Should** | Yêu cầu khuyến nghị |

---

## 2. SYS-01 – Xác thực và Phân quyền

### 2.1. Mục đích

Cung cấp cơ chế Authentication (xác thực), Role (vai trò) và điều hướng người dùng đến đúng vùng chức năng.

### 2.2. Luồng xác thực

```
1. User đăng ký bằng email/password
2. User chọn vai trò (Learner hoặc Content Manager)
3. Admin không được tự chọn
4. User đăng nhập
5. Hệ thống kiểm tra Authentication và Role
6. Điều hướng:
   - Learner → Learner Dashboard
   - Content Manager → Teacher Dashboard
   - Admin → Admin Dashboard
7. User có thể Logout
```

### 2.3. Vai trò (Roles)

| Vai trò | Mô tả | Tự đăng ký |
|---------|--------|-------------|
| Learner | Người học | Yes |
| Content Manager | Quản lý nội dung | Yes |
| Admin | Quản trị viên | No |

### 2.4. Quy tắc đăng ký

| Quy tắc | Mô tả |
|----------|--------|
| No email verification | Không yêu cầu xác minh email |
| Role selection | Chỉ được chọn Learner hoặc Content Manager khi đăng ký |
| No Admin self-registration | Backend phải chặn request cố gắng tự gán Admin |
| Role immutability | Role không được thay đổi bởi user |

### 2.5. Quy tắc ủy quyền

| Quy tắc | Mô tả |
|----------|--------|
| Backend enforcement | Backend phải kiểm tra quyền cho mọi request |
| Frontend enforcement | UI phải kiểm tra quyền trước khi hiển thị |
| Defense in depth | Cả backend và UI đều phải kiểm tra |

### 2.6. Account Lock

**Cơ chế khóa tài khoản:**

| Tham số | Giá trị |
|---------|---------|
| Số lần thất bại | 5 lần liên tiếp |
| Thời gian khóa | 15 phút |

**Luồng khóa:**

```
1. User nhập sai mật khẩu
2. failed_login_attempts tăng thêm 1
3. Nếu failed_login_attempts >= 5:
   - locked_until = current_time + 15 minutes
4. Nếu locked_until > current_time:
   - Kể cả mật khẩu đúng → không cho login
5. User phải chờ hết thời gian khóa
```

**Luồng mở khóa khi login thành công:**

```
1. User nhập đúng mật khẩu
2. Kiểm tra locked_until
3. Nếu chưa hết khóa → báo tài khoản bị khóa
4. Nếu đã hết khóa:
   - failed_login_attempts = 0
   - locked_until = NULL
   - Cho phép login
```

### 2.7. Shared Authentication

**Nguyên tắc:**
- Phân hệ Nội dung sử dụng cùng Supabase Authentication/Role
- Không xây dựng:
  - Hệ thống login thứ hai
  - Bảng role độc lập
  - API kiểm tra role cho mọi request

### 2.8. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S01 | User đăng ký → Tài khoản được tạo với role đã chọn | Automated |
| AC-S02 | Không thể tự gán Admin | Automated |
| AC-S03 | Login thành công → Reset failed_login_attempts | Automated |
| AC-S04 | 5 lần sai → Bị khóa 15 phút | Automated |
| AC-S05 | Trong thời gian khóa → Không login được | Automated |
| AC-S06 | Backend chặn request không có quyền | Automated |

---

## 3. SYS-02 – Tracking Context

### 3.1. Mục đích

Cho phép Content Manager theo dõi Learner trong phạm vi quản lý mà không hard-code entity Class.

### 3.2. Tracking Context hiện tại

**Tracking Context = Course**

### 3.3. Quyền quản lý Course

**Nguồn xác định:**
```
courses.created_by == current_content_manager_id
```

**Lưu ý:**
- `courses.created_by` thuộc Phân hệ Nội dung
- Đây là nguồn chính thức
- Không tạo mapping Content Manager ↔ Course trùng lặp ở User Module

### 3.4. Danh sách Learner trong Course

**Cách xác định:**
```
course_enrollments.course_id == course.id
và
course_enrollments.status == 'active'
```

### 3.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S07 | Content Manager chỉ thấy Course do mình tạo | Automated |
| AC-S08 | Chỉ hiển thị Learner active trong Course | Automated |

---

## 4. SYS-03 – Notification Dùng chung

### 4.1. Mục đích

Cung cấp hệ Notification chung phục vụ tất cả các loại thông báo trong hệ thống.

### 4.2. Loại thông báo

Hệ Notification phục vụ:

| Loại | Mô tả | Vai trò liên quan |
|------|--------|------------------|
| Reminder | Nhắc nhở buổi học | Learner |
| Learning Notification | Thông báo học tập | Learner, Content Manager |
| Message Notification | Thông báo tin nhắn mới | Learner, Content Manager |
| System Notification | Thông báo hệ thống | Tất cả |
| Content Notification | Thông báo từ Phân hệ Nội dung | Learner |

### 4.3. Mô hình dữ liệu

**Bảng `notifications`:**
- Lưu nội dung thông báo
- Các trường: id, type, title, content, sent_at, created_by, created_at

**Bảng `notification_recipients`:**
- Lưu người nhận thông báo và trạng thái đọc
- Các trường: id, notification_id, user_id, read_at

**Quan hệ:**
```
1 Notification → nhiều Notification Recipient
```

### 4.4. Kênh gửi

| Kênh | Mô tả | Mặc định |
|-------|-------|-----------|
| In-app | Thông báo trong ứng dụng | Bắt buộc |
| Email | Gửi qua email | Tùy chọn |

### 4.5. Scheduled Notification

**Trạng thái Notification:**

| Trạng thái | Mô tả | Hành động |
|-------------|--------|-----------|
| Scheduled (chưa gửi) | Đã lên lịch nhưng chưa đến giờ | Có thể sửa, có thể hủy |
| Sent (đã gửi) | Đã được gửi đến người nhận | Không thể sửa, không thể xóa |

### 4.6. Re-check Recipient Logic

**Nguyên tắc:**
- Recipient của Scheduled Notification phải được kiểm tra lại tại thời điểm gửi

**Luồng Re-check:**

```
1. Đến thời điểm gửi notification
2. Lấy danh sách recipients đã lưu
3. Với mỗi recipient:
   a. Kiểm tra trạng thái hiện tại (enrollment, user status)
   b. Nếu hợp lệ → Gửi notification
   c. Nếu không hợp lệ → Bỏ qua, không gửi
4. Cập nhật notification status
```

**Ví dụ Re-check:**

| Trường hợp | Xử lý |
|-------------|--------|
| Learner rời Course | Không gửi notification về Course đó |
| User bị khóa | Không gửi notification |
| User xóa tài khoản | Không gửi notification |

### 4.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S09 | Scheduled notification có thể sửa trước khi gửi | Manual |
| AC-S10 | Sent notification không thể sửa/xóa | Automated |
| AC-S11 | Re-check đúng trước khi gửi | Automated |

---

## 5. SYS-04 – Analytics và Event

### 5.1. Mục đích

Thu thập Meaningful Activities, Feature Events và dữ liệu phục vụ Admin Analytics.

### 5.2. Event Contract

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

**Nguyên tắc:**
- `event_id` là duy nhất
- Dùng để chống duplicate event

### 5.3. Gửi Event từ Content Module

**Endpoint:**
```
POST /api/v1/internal/events
```

**Quy tắc:**
- Phân hệ Nội dung gửi event qua endpoint này
- Event phải tuân theo Event Contract

### 5.4. Idempotency

**Nguyên tắc:**
- Duplicate event cùng `event_id` → không tạo record thứ hai
- Hệ thống phải xử lý idempotent

### 5.5. Tách dữ liệu

**Hai bảng riêng biệt:**

| Bảng | Mục đích |
|------|-----------|
| `analytics_events` | Dữ liệu telemetry/analytics |
| `learning_history` | Lịch sử học tập của Learner |

**Nguyên tắc:**
- Một event như `quiz_completed` có thể tạo record ở cả hai bảng
- Không phải mọi Analytics Event đều là Learning History
- Analytics Events và Learning History là hai stream dữ liệu riêng biệt

### 5.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S12 | Event tuân theo contract chuẩn | Automated |
| AC-S13 | Duplicate event_id không tạo record trùng lặp | Automated |
| AC-S14 | Analytics và Learning History tách riêng | Automated |

---

## 6. SYS-05 – Xuất Báo cáo

### 6.1. Mục đích

Cung cấp cơ chế xuất báo cáo cho Learner, Content Manager và Admin.

### 6.2. Định dạng xuất

| Định dạng | Mô tả |
|-----------|--------|
| Web | Hiển thị trên giao diện |
| PDF | Tải về dạng PDF |
| Excel | Tải về dạng Excel (.xlsx) |

### 6.3. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| No snapshot | Không lưu report snapshot |
| Recalculate | Report được tính lại mỗi lần xem/export |
| Partial web | Nếu thiếu nguồn bắt buộc: Web hiển thị phần còn có |
| Lock export | Nếu thiếu nguồn bắt buộc: Không cho export |

### 6.4. Xử lý thiếu nguồn dữ liệu

**Web:**
- Hiển thị phần dữ liệu còn có
- Hiển thị cảnh báo phần thiếu

**Export:**
- Khóa export (PDF, Excel)
- Hiển thị thông báo lý do

### 6.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S15 | Web hiển thị đúng dữ liệu | Manual |
| AC-S16 | Export PDF hoạt động | Manual |
| AC-S17 | Export Excel hoạt động | Manual |
| AC-S18 | Thiếu nguồn → Khóa export | Automated |

---

## 7. SYS-06 – Course Enrollment

### 7.1. Mục đích

Quản lý quan hệ Learner đang tham gia Course nào.

### 7.2. Luồng Join (Tham gia Course)

```
1. Learner chọn Course
2. Chọn "Tham gia khóa học"
3. User Backend kiểm tra:
   a. Role của user là Learner
   b. Course tồn tại và cho phép tham gia (gọi Content API)
4. Nếu chưa có Enrollment → Tạo record với status 'active'
5. Nếu Enrollment đang 'left' → Chuyển lại status 'active'
6. Nếu đã 'active' → Không tạo duplicate, báo đã tham gia
```

### 7.3. Luồng Leave (Rời Course)

```
1. Learner chọn "Rời khóa học"
2. Enrollment chuyển: 'active' → 'left'
3. Không DELETE dữ liệu lịch sử
4. Active Study Plan của Course → status 'archived'
5. Task chưa hoàn thành → status 'cancelled'
6. Reminder chưa gửi → status 'cancelled'
7. Conversation → status 'read_only'
8. Progress, Learning History, Note, Bookmark, Feedback, Message → Giữ nguyên
```

### 7.4. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| Multiple active enrollment | Learner được có nhiều Enrollment Active |
| Single active Study Plan | Chỉ được một Study Plan Active trên toàn hệ thống |
| Independent entities | Enrollment và Study Plan là hai entity độc lập |

### 7.5. Enrollment Status

| Status | Mô tả |
|--------|--------|
| `active` | Learner đang tham gia Course |
| `left` | Learner đã rời Course |

### 7.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S19 | Join khi chưa có → Tạo enrollment 'active' | Automated |
| AC-S20 | Join khi 'left' → Chuyển sang 'active' | Automated |
| AC-S21 | Join khi 'active' → Không tạo duplicate | Automated |
| AC-S22 | Leave → Dữ liệu lịch sử được giữ | Automated |
| AC-S23 | Leave → Conversation chuyển 'read_only' | Automated |

---

## 8. SYS-07 – Integration Layer

### 8.1. Mục đích

Cô lập dependency vào Phân hệ Nội dung, cho phép phát triển độc lập giữa hai phân hệ.

### 8.2. Content Gateway Pattern

**Kiến trúc:**

```
┌─────────────────┐
│   Business       │
│   Logic          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ContentGateway  │  ← Interface/Abstract class
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌────────┐
│ Mock  │ │  Http  │
│ Impl  │ │  Impl  │
└───────┘ └────────┘
```

### 8.3. Gateway Implementation

| Implementation | Môi trường | Mô tả |
|----------------|-------------|--------|
| `MockContentGateway` | Development | Sử dụng mock data |
| `HttpContentGateway` | Production | Gọi HTTP API thực |

### 8.4. Quy tắc sử dụng

| Quy tắc | Mô tả |
|----------|--------|
| Business logic không gọi trực tiếp | Không gọi mock JSON hoặc HTTP endpoint trực tiếp |
| Luôn qua Gateway | Mọi truy cập Content Module phải qua ContentGateway |

### 8.5. Mapping và Normalization

**Vấn đề:**
- Các giá trị từ Content Module có thể thay đổi
- Ví dụ: `exercise` → `practice`

**Xử lý:**
- Giá trị từ Content phải được chuẩn hóa tại Mapper/Adapter
- Không hard-code raw value trong nhiều module

### 8.6. Ví dụ Mapping

| Content Module | User Module | Ghi chú |
|----------------|-------------|---------|
| `exercise` | `practice` | Exercise được biểu diễn như practice |
| `quiz` | `quiz` | Giữ nguyên |
| `chapter` | `topic` | Trong phiên bản đầu, topic = chapter |

### 8.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S24 | Business logic gọi qua Gateway | Automated |
| AC-S25 | Mock Gateway sử dụng mock data | Manual |
| AC-S26 | Http Gateway gọi API thực | Manual |
| AC-S27 | Mapping được chuẩn hóa tại Adapter | Automated |

---

## 9. SYS-08 – Mock và Development Data

### 9.1. Mục đích

Cho phép phát triển độc lập bằng Mock Data trong thời gian API Nội dung chưa hoàn chỉnh.

### 9.2. Mock Data Strategy

**Nguồn Mock:**

| Loại | Nguồn |
|------|-------|
| Dependency của Content | JSON fixture |
| Mock Gateway | MockContentGateway |
| Dữ liệu User | Supabase/PostgreSQL Development DB, SQL Seed |

### 9.3. Required Mock Scenarios

**Mock phải hỗ trợ các scenario sau:**

#### 9.3.1. Success Cases

| Scenario | Mô tả |
|----------|--------|
| success | Response thành công, dữ liệu hợp lệ |

#### 9.3.2. Error Cases

| Scenario | Mô tả |
|----------|--------|
| 404 | Resource không tìm thấy |
| timeout | Request timeout |
| 503 | Service unavailable |
| rate_limiting | Request bị giới hạn rate |

#### 9.3.3. Data Edge Cases

| Scenario | Mô tả |
|----------|--------|
| hidden_content | Content bị ẩn |
| insufficient_practice_questions | Không đủ câu hỏi practice |
| large_payload | Dữ liệu trả về lớn |

#### 9.3.4. Contract Edge Cases

| Scenario | Mô tả |
|----------|--------|
| duplicate_event | Event với event_id trùng lặp |
| invalid_event | Event không hợp lệ (thiếu trường bắt buộc) |
| invalid_json | JSON response không hợp lệ |

### 9.4. Mock Configuration

**Cấu hình environment:**

| Environment | Gateway |
|-------------|---------|
| Development | MockContentGateway |
| Staging | MockContentGateway (với mock config) |
| Production | HttpContentGateway |

### 9.5. SQL Seed

**Yêu cầu:**
- Cung cấp SQL seed cho dữ liệu User Development
- Đủ dữ liệu để test các scenario

### 9.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-S28 | Mock success hoạt động | Manual |
| AC-S29 | Mock 404, 503, timeout hoạt động | Manual |
| AC-S30 | Mock hidden_content, large_payload hoạt động | Manual |
| AC-S31 | Mock duplicate_event, invalid_event hoạt động | Manual |
| AC-S32 | SQL seed đủ dữ liệu test | Manual |

---

## 10. Phụ lục A – Soft Delete Pattern

### A.1. Mục đích

Mô tả quy ước Soft Delete được áp dụng trong toàn bộ hệ thống.

### A.2. Nguyên tắc

**Không xóa record vĩnh viễn:**
- Không sử dụng DELETE statement
- Sử dụng status field hoặc deleted_at timestamp

### A.3. Mô hình Soft Delete

**Mô hình 1: Status Field**

| Status | Mô tả |
|--------|--------|
| `active` | Record đang hoạt động |
| `inactive` | Record không còn sử dụng |
| `archived` | Record được lưu trữ |

**Mô hình 2: Deleted Timestamp**

| Trường | Kiểu | Mô tả |
|---------|------|--------|
| deleted_at | Timestamp | NULL = chưa xóa, NOT NULL = đã xóa |

### A.4. Áp dụng trong hệ thống

| Entity | Phương pháp | Ghi chú |
|--------|-------------|---------|
| Enrollment | Status field | 'active', 'left' |
| Study Plan | Status field | 'active', 'archived', 'completed' |
| Task | Status field | 'active', 'completed', 'cancelled' |
| Conversation | Status field | 'active', 'read_only' |
| Reminder | Status field | 'pending', 'sent', 'cancelled' |
| User | Deleted timestamp | deleted_at |

### A.5. Query Pattern

**Lấy record active:**
```sql
SELECT * FROM table_name
WHERE status = 'active'
  AND deleted_at IS NULL;
```

**Lấy tất cả (bao gồm đã xóa):**
```sql
SELECT * FROM table_name;
```

### A.6. Quy tắc khi Leave Course

Khi Learner rời Course:

| Dữ liệu | Xử lý |
|---------|--------|
| Enrollment | Status → 'left' |
| Study Plan | Status → 'archived' |
| Task | Status → 'cancelled' |
| Reminder | Status → 'cancelled' |
| Conversation | Status → 'read_only' |
| Progress | Giữ nguyên |
| Learning History | Giữ nguyên |
| Note | Giữ nguyên |
| Bookmark | Giữ nguyên |
| Feedback | Giữ nguyên |
| Message | Giữ nguyên |

---

## 11. Phụ lục B – Retry Logic

### B.1. Mục đích

Mô tả cơ chế retry cho các HTTP request đến Content Module.

### B.2. Retry Policy

| Tham số | Giá trị | Ghi chú |
|---------|---------|---------|
| Max retries | 3 | Số lần retry tối đa |
| Initial delay | 1 second | Thời gian chờ ban đầu |
| Backoff multiplier | 2 | Nhân đôi thời gian chờ |
| Max delay | 30 seconds | Thời gian chờ tối đa |

### B.3. Retry Strategy

**Exponential Backoff:**
```
Attempt 1: Wait 1s
Attempt 2: Wait 2s
Attempt 3: Wait 4s
```

### B.4. Retry Conditions

**Retry khi:**
- Timeout
- 5xx Server Error (503, 500, 502)
- Rate Limiting (429)

**Không retry khi:**
- 4xx Client Error (400, 401, 403, 404)
- Invalid request
- Business logic error

### B.5. Circuit Breaker

**Nguyên tắc:**
- Khi số lần thất bại liên tiếp đạt ngưỡng → Mở circuit breaker
- Circuit breaker mở → Không gọi request trong khoảng thời gian
- Sau thời gian → Thử lại (half-open state)

**Ngưỡng Circuit Breaker:**

| Tham số | Giá trị |
|---------|---------|
| Failure threshold | 5 consecutive failures |
| Timeout | 60 seconds |

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ ChiTiet_ChucNangChung_HeThong_PhanHeNguoiDung_V2.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| Đề cương Đồ án | `docs/reference/de-cuong-du-an.md` | Tổng quan đề tài |
| Cơ chế hệ thống (gốc) | `ChiTiet_ChucNangChung_HeThong_PhanHeNguoiDung_V2.md` | Nguồn tham khảo |
| Database Schema | `docs/design/database-schema.sql` | Chi tiết bảng và cột |
| Event Contract | `docs/design/event-contract.md` | Contract event giữa hai phân hệ |
| API Contract | `docs/design/api-contract-user-content.md` | Contract với Content Module |

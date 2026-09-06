# Đặc tả Chức năng Content Manager (Content Manager Feature Specification)

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [T-M01 – Teacher Dashboard](#2-t-m01--teacher-dashboard)
3. [T-M02 – Progress Tracking](#3-t-m02--progress-tracking)
4. [T-M03 – Result Analysis](#4-t-m03--result-analysis)
5. [T-M04 – Task Monitoring](#5-t-m04--task-monitoring)
6. [T-M05 – Support List](#6-t-m05--support-list)
7. [T-M06 – Feedback](#7-t-m06--feedback)
8. [T-M07 – Learning Notification](#8-t-m07--learning-notification)
9. [T-M08 – Messaging](#9-t-m08--messaging)
10. [T-M09 – Report](#10-t-m09--report)
11. [Phụ lục A – Open Dependencies](#11-phụ-lục-a--open-dependencies)
12. [Phụ lục B – Mô hình dữ liệu tham chiếu](#12-phụ-lục-b--mô-hình-dữ-liệu-tham-chiếu)

---

## 1. Tổng quan

### 1.1. Mục đích tài liệu

Tài liệu này mô tả đặc tả chức năng (functional specification) của tất cả các tính năng dành cho vai trò **Content Manager** (Người quản lý nội dung) trong Phân hệ Người dùng.

### 1.2. Định nghĩa vai trò Content Manager

Content Manager là người dùng đã đăng ký tài khoản với vai trò "Content Manager" trong hệ thống. Content Manager có thể:

- Tạo và quản lý khóa học (Course) — quyền tạo Course thuộc Phân hệ Nội dung
- Theo dõi tiến độ học tập của Learner trong Course do mình quản lý
- Gửi thông báo và nhắn tin cho Learner
- Phản hồi Feedback từ Learner
- Xem báo cáo tổng hợp

### 1.3. Phạm vi Tracking

**Nguyên tắc:**
- Không hard-code entity Class
- Tracking Context = Course

**Quyền quản lý:**
- Content Manager chỉ quản lý Course do mình tạo
- Nguồn xác định: `courses.created_by` (thuộc Phân hệ Nội dung)
- Không lưu mapping Manager ↔ Course thứ hai ở User Module

**Learner thuộc Course:**
- Xác định bằng: `course_enrollments.status = 'active'`

### 1.4. Quy ước trong tài liệu

| Ký hiệu | Ý nghĩa |
|----------|----------|
| **[TODO]** | Tính năng hoặc quy tắc phụ thuộc vào Phân hệ Nội dung, đang chờ contract chính thức |
| **[OPEN]** | Vấn đề chưa được giải quyết, cần thảo luận thêm |
| **Must** | Yêu cầu bắt buộc |
| **Should** | Yêu cầu khuyến nghị |
| **May** | Yêu cầu tùy chọn |

---

## 2. T-M01 – Teacher Dashboard

### 2.1. Mục đích

Teacher Dashboard là màn hình chính mà Content Manager nhìn thấy ngay sau khi đăng nhập. Mục đích là cung cấp cái nhìn tổng quan về tình trạng của tất cả Course do Content Manager quản lý.

### 2.2. Luồng truy cập

```
1. Content Manager đăng nhập
2. Hệ thống lấy danh sách Course mà Manager đã tạo
3. Content Manager chọn một Course để xem chi tiết
4. Dashboard tổng hợp hiển thị cho Course đã chọn
```

### 2.3. Thành phần hiển thị

Dashboard bao gồm các thành phần sau:

| STT | Thành phần | Mô tả |
|-----|------------|--------|
| 1 | Total Active Learners | Tổng số Learner đang active trong Course |
| 2 | Progress | Tiến độ học tập của Learner |
| 3 | Result | Kết quả bài kiểm tra của Learner |
| 4 | Task | Tình trạng nhiệm vụ của Learner |
| 5 | Support List | Danh sách Learner cần hỗ trợ |
| 6 | Recent Activity | Hoạt động gần đây của Learner |
| 7 | Feedback | Phản hồi từ Learner |
| 8 | Notification | Thông báo liên quan |

### 2.4. Trường hợp đặc biệt

**Trường hợp 1: Không có Course**
- Hiển thị: "Bạn chưa có khóa học nào để theo dõi."
- Gợi ý tạo Course mới (nếu có quyền)

**Trường hợp 2: Content API một phần lỗi**
- Block còn lại vẫn hiển thị bình thường
- Block lỗi hiển thị: "Tạm thời chưa tải được dữ liệu."
- Không block toàn bộ Dashboard

### 2.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T01 | Content Manager đăng nhập → Dashboard hiển thị danh sách Course | Manual |
| AC-T02 | Chọn Course → Hiển thị đầy đủ 8 thành phần | Manual |
| AC-T03 | Không có Course → Hiển thị thông báo phù hợp | Manual |
| AC-T04 | Một block lỗi → Các block khác vẫn hoạt động | Manual |

---

## 3. T-M02 – Progress Tracking

### 3.1. Mục đích

Progress Tracking cho phép Content Manager xem tiến độ học tập của tất cả Learner trong Course mà mình quản lý.

### 3.2. Phạm vi dữ liệu

**Chỉ hiển thị cho:**
- Learner có `course_enrollments.status = 'active'`
- Không hiển thị Learner đã rời Course (`status = 'left'`)

### 3.3. Công thức tính Progress

**Progress của Learner:**
```
Progress (%) = (Số Lesson đã hoàn thành / Tổng số Lesson hiện tại) × 100%
```

**Lưu ý:**
- Quiz không được tính vào Progress
- Progress chỉ dựa trên Lesson

### 3.4. Slow Progress

**Định nghĩa Slow Progress:**

Learner được đánh dấu là "slow progress" khi thỏa mãn **đồng thời** hai điều kiện:

| Điều kiện | Mô tả |
|------------|--------|
| Điều kiện 1 | Có Study Plan session đã đến `planned_date` (đã quá hạn hoặc đến hạn) |
| Điều kiện 2 | Vẫn còn Lesson chưa completed trong session đó |

**Loại trừ:**
- Learner không có Study Plan → Hiển thị "Chưa có kế hoạch", không bị đánh dấu là slow

### 3.5. Quyền truy cập

- Content Manager chỉ có quyền **read-only** (xem)
- Không thể sửa Progress của Learner

### 3.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T05 | Chỉ hiển thị Learner active trong Course | Automated |
| AC-T06 | Progress tính đúng công thức Lesson | Automated |
| AC-T07 | Quiz không ảnh hưởng đến Progress | Automated |
| AC-T08 | Slow Progress đúng khi thỏa điều kiện | Automated |
| AC-T09 | Learner không có Plan không bị đánh slow | Automated |

---

## 4. T-M03 – Result Analysis

### 4.1. Mục đích

Result Analysis cho phép Content Manager xem kết quả bài kiểm tra (Quiz/Exercise) của Learner trong Course.

### 4.2. Phạm vi dữ liệu

**Chỉ hiển thị cho:**
- Learner có `course_enrollments.status = 'active'`

### 4.3. Nguồn dữ liệu

**Điểm chính thức:**
- Lấy từ Phân hệ Nội dung qua Content API
- User Module không tự tính điểm

### 4.4. Phạm vi Topic

**Phiên bản đầu:** Topic = Chapter

Trong phiên bản đầu tiên, kết quả được phân tích theo **Chapter**, không chi tiết đến từng Quiz riêng lẻ.

### 4.5. API lấy dữ liệu

| Endpoint | Vai trò |
|----------|---------|
| `/api/v1/quiz-results/latest` | Lấy trạng thái hiện tại của Learner |
| `/api/v1/quiz-attempts` | Lấy lịch sử và trend kết quả |

### 4.6. Ngưỡng đánh giá

| Ngưỡng | Kết quả | Màu sắc gợi ý |
|--------|---------|---------------|
| >= 80% | Tốt | Xanh |
| 60% – 79% | Đạt | Vàng |
| < 60% | Cần cải thiện | Đỏ |

### 4.7. Xử lý Learner chưa làm bài

**Quy tắc:**
- Learner chưa làm Quiz nào → Hiển thị: "Chưa có dữ liệu"
- Không tính là 0%

### 4.8. Open Dependencies [TODO]

**[TODO]** Cơ chế lưu snapshot `max_score` lịch sử trong database Nội dung **chưa được chốt**.

**Ảnh hưởng:**
- Tính năng trend và so sánh có thể bị ảnh hưởng
- Tài liệu phải cập nhật khi Phân hệ Nội dung cung cấp cơ chế chính thức

### 4.9. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T10 | Kết quả hiển thị đúng theo ngưỡng | Automated |
| AC-T11 | Learner chưa làm → Hiển thị "Chưa có dữ liệu" | Automated |
| AC-T12 | Không hiển thị 0% cho Learner chưa làm | Automated |
| AC-T13 | API endpoints hoạt động đúng | Automated |

---

## 5. T-M04 – Task Monitoring

### 5.1. Mục đích

Task Monitoring cho phép Content Manager theo dõi tình trạng nhiệm vụ của tất cả Learner trong Course.

### 5.2. Nguồn Task [TODO]

**[TODO]** Trong phiên bản hiện tại, tất cả các mục sau đều được coi là Task:

| Loại | Nguồn | Ghi chú |
|------|-------|---------|
| Lesson | Study Plan | Đã xác định rõ |
| Quiz | Liên quan đến Course | [TODO] Cần xác nhận từ Phân hệ Nội dung |
| Exercise | Liên quan đến Course | [TODO] Exercise hiện được biểu diễn như Quiz type |

### 5.3. Chế độ xem (Views)

Task Monitoring hỗ trợ hai chế độ xem:

| Chế độ | Mô tả |
|--------|-------|
| Theo Task | Liệt kê tất cả Task, nhóm theo loại |
| Theo Learner | Liệt kê Learner, hiển thị Task của từng người |

### 5.4. Trạng thái Task

| Trạng thái | Mô tả |
|------------|--------|
| `active` | Đang chờ thực hiện |
| `completed` | Đã hoàn thành |
| `cancelled` | Đã hủy |

### 5.5. Phân loại theo Completion Status

| Phân loại | Mô tả |
|-----------|--------|
| Completed on time | Hoàn thành đúng hạn |
| Incomplete before deadline | Chưa hoàn thành, chưa đến deadline |
| Overdue incomplete | Quá hạn, chưa hoàn thành |
| Completed late | Hoàn thành quá hạn |

### 5.6. Quy tắc

- **Cancelled Task không tính** vào completion/overdue hiện hành
- **Content Manager không thể:**
  - Sửa completion status của Task
  - Sửa deadline tại màn hình này

### 5.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T14 | Task hiển thị đúng trạng thái | Automated |
| AC-T15 | Phân loại đúng: on time / incomplete / overdue / late | Manual |
| AC-T16 | Chuyển đổi giữa view "Theo Task" và "Theo Learner" | Manual |
| AC-T17 | Cancelled Task không tính vào thống kê | Automated |

---

## 6. T-M05 – Support List

### 6.1. Mục đích

Support List hiển thị danh sách Learner cần được hỗ trợ, dựa trên các tín hiệu (signals) về tiến độ và kết quả học tập.

### 6.2. Signals (Tín hiệu cảnh báo)

Learner được đưa vào Support List khi thỏa mãn **ít nhất một** trong các điều kiện sau:

| Signal | ID | Mô tả |
|--------|-----|--------|
| Slow Progress | S1 | Learner bị đánh dấu slow progress (xem T-M02) |
| Low Result | S2 | Result < 60% HOẶC Topic < 60% |
| Overdue Task | S3 | Có ít nhất 1 Task đang active và quá hạn (overdue) |

### 6.3. Priority (Độ ưu tiên)

Priority được tính dựa trên **tổng số signals** mà Learner có:

| Số Signals | Priority | Màu sắc gợi ý |
|------------|----------|-----------------|
| 1 signal | Low | Xanh nhạt |
| 2 signals | Medium | Vàng |
| 3 signals | High | Đỏ |

### 6.4. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| No inactivity signal | Không sử dụng tín hiệu dựa trên thời gian không hoạt động |
| No manual removal | Content Manager **không thể** xóa cảnh báo thủ công |
| Auto-update | Support List được cập nhật tự động khi signals thay đổi |

### 6.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T18 | Learner có S1 → Xuất hiện trong Support List với Priority tương ứng | Automated |
| AC-T19 | Learner có S2 → Xuất hiện trong Support List | Automated |
| AC-T20 | Learner có S3 → Xuất hiện trong Support List | Automated |
| AC-T21 | Learner có 1 signal → Low Priority | Automated |
| AC-T22 | Learner có 2 signals → Medium Priority | Automated |
| AC-T23 | Learner có 3 signals → High Priority | Automated |
| AC-T24 | Content Manager không thể xóa thủ công | Manual |

---

## 7. T-M06 – Feedback

### 7.1. Mục đích

Feedback cho phép Content Manager gửi phản hồi cho Learner, có thể là phản hồi chung hoặc phản hồi liên quan đến ngữ cảnh cụ thể.

### 7.2. Loại Feedback

| Loại | Mô tả |
|------|-------|
| General | Phản hồi chung, không gắn với ngữ cảnh cụ thể |
| Context: Progress | Phản hồi liên quan đến tiến độ học tập |
| Context: Result | Phản hồi liên quan đến kết quả bài kiểm tra |
| Context: Task | Phản hồi liên quan đến nhiệm vụ |

### 7.3. Trạng thái Feedback

| Trạng thái | Mô tả | Hành động |
|-------------|-------|-----------|
| Draft | Bản nháp | Có thể sửa, có thể xóa |
| Sent | Đã gửi | Không thể sửa, không thể xóa |

### 7.4. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| Draft editable | Feedback ở trạng thái Draft có thể sửa và xóa |
| Sent immutable | Feedback đã Sent không thể sửa hoặc xóa |
| Rich Text | Hỗ trợ định dạng Rich Text (bold, italic, list, v.v.) |
| Notification | Gửi In-app Notification cho Learner khi Feedback được gửi |
| Read status | Learner có thể đánh dấu đã đọc/chưa đọc |

### 7.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T25 | Tạo Feedback → Lưu thành Draft | Automated |
| AC-T26 | Sửa Draft → Thay đổi được lưu | Automated |
| AC-T27 | Xóa Draft → Feedback bị xóa | Automated |
| AC-T28 | Gửi Feedback → Chuyển sang Sent, không sửa/xóa được | Automated |
| AC-T29 | Feedback Sent → Learner nhận In-app Notification | Automated |
| AC-T30 | Rich Text editor hoạt động đúng | Manual |

---

## 8. T-M07 – Learning Notification

### 8.1. Mục đích

Learning Notification cho phép Content Manager gửi thông báo cho Learner trong Course.

### 8.2. Người nhận (Recipient)

| Loại | Mô tả |
|------|-------|
| Một Learner | Gửi cho một Learner cụ thể |
| Nhiều Learner | Gửi cho nhiều Learner đã chọn |
| Toàn bộ | Gửi cho tất cả Learner active trong Course |

### 8.3. Thời điểm gửi

| Loại | Mô tả |
|------|-------|
| Now | Gửi ngay lập tức |
| Scheduled | Đặt lịch gửi vào thời điểm cụ thể |

### 8.4. Kênh gửi (Channel)

| Kênh | Mô tả | Mặc định |
|-------|-------|-----------|
| In-app | Thông báo trong ứng dụng | Bắt buộc |
| Email | Gửi qua email | Tùy chọn (optional) |

### 8.5. Quy tắc Scheduled Notification

**[Cập nhật mới]**

**Re-check recipient:**
- Tại thời điểm gửi, hệ thống kiểm tra lại recipient
- Chỉ gửi cho Learner có `course_enrollments.status = 'active'`
- Nếu Learner đã rời Course (`status = 'left'`), không gửi notification

### 8.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T31 | Gửi cho một Learner → Chỉ Learner đó nhận | Automated |
| AC-T32 | Gửi cho nhiều Learner → Đúng các Learner đã chọn nhận | Automated |
| AC-T33 | Gửi cho toàn bộ → Tất cả Learner active nhận | Automated |
| AC-T34 | Scheduled → Gửi đúng thời điểm | Automated |
| AC-T35 | Scheduled → Re-check status trước khi gửi | Automated |

---

## 9. T-M08 – Messaging

### 9.1. Mục đích

Messaging cho phép giao tiếp 1-1 (một-một) giữa Learner và Content Manager trong phạm vi một Course cụ thể.

### 9.2. Mô hình giao tiếp

**1-1 Communication:**
- Mỗi cuộc trò chuyện (Conversation) giữa một Learner và một Content Manager
- Trong phạm vi một Course cụ thể

### 9.3. Conversation Identity

**Công thức xác định Conversation:**
```
Conversation ID = learner_id + manager_id + course_id
```

**Quy tắc:**
- Cùng hai người (Learner + Manager) nhưng **Course khác nhau** → Conversation **khác nhau**
- Mỗi cặp Learner-Manager-Course chỉ có **một** Conversation

### 9.4. Quy tắc Message

| Quy tắc | Mô tả |
|----------|--------|
| Immutable | Message không thể sửa sau khi gửi |
| Non-deletable | Message không thể xóa |
| Non-realtime | Realtime không bắt buộc (hỗ trợ polling) |
| Notification | Gửi notification khi có message mới |

### 9.5. Trạng thái Conversation khi Enrollment thay đổi

**Khi Learner rời Course (`status = 'left'`):**

| Hành động | Xử lý |
|------------|--------|
| Messages | Giữ nguyên, không xóa |
| Conversation | Chuyển sang `read_only` |

**Khi Learner re-enroll (`status = 'active'` lại):**

| Hành động | Xử lý |
|------------|--------|
| Conversation | Trở lại `active` (dựa trên Enrollment status hiện hành) |

### 9.6. Storage (Lưu trữ)

**Bảng `conversations`:**
| Trường | Kiểu | Mô tả |
|---------|------|--------|
| id | UUID | Khóa chính |
| learner_id | UUID | ID của Learner |
| manager_id | UUID | ID của Content Manager |
| course_id | UUID | ID của Course |
| status | ENUM | 'active', 'read_only' |
| created_at | TIMESTAMP | Thời điểm tạo |
| updated_at | TIMESTAMP | Thời điểm cập nhật cuối |

**Bảng `messages`:**
| Trường | Kiểu | Mô tả |
|---------|------|--------|
| id | UUID | Khóa chính |
| conversation_id | UUID | Khóa ngoại đến conversations |
| sender_id | UUID | ID người gửi |
| content | TEXT | Nội dung message |
| sent_at | TIMESTAMP | Thời điểm gửi |
| read_at | TIMESTAMP | Thời điểm đọc (nullable) |

### 9.7. Retrieval (Truy xuất)

**API Endpoints:**

| Endpoint | Mô tả |
|----------|--------|
| GET /conversations | Lấy danh sách Conversation của Manager |
| GET /conversations/:id | Lấy chi tiết Conversation và Messages |
| POST /conversations/:id/messages | Gửi Message mới |

**Quy tắc truy xuất:**
- Chỉ hiển thị Conversation thuộc Course do Manager quản lý
- Messages được sắp xếp theo `sent_at` (tăng dần)
- Unread messages được đánh dấu dựa trên `read_at`

### 9.8. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T36 | Gửi message → Message được lưu với đầy đủ thông tin | Automated |
| AC-T37 | Cùng Learner-Manager, Course khác → Conversation khác | Automated |
| AC-T38 | Message đã gửi → Không sửa/xóa được | Manual |
| AC-T39 | Enrollment `left` → Conversation chuyển `read_only` | Automated |
| AC-T40 | Re-enroll → Conversation trở lại `active` | Automated |
| AC-T41 | Message mới → Gửi notification cho người nhận | Automated |

---

## 10. T-M09 – Report

### 10.1. Mục đích

Report cho phép Content Manager xuất báo cáo tổng hợp về tình trạng học tập của Learner trong Course.

### 10.2. Thời gian mặc định

**Default:** 30 ngày gần nhất

Content Manager có thể thay đổi khoảng thời gian báo cáo.

### 10.3. Nội dung báo cáo

Báo cáo bao gồm các phần sau:

| Phần | Mô tả |
|------|--------|
| Progress | Tiến độ học tập của Learner |
| Result | Kết quả bài kiểm tra |
| Task | Tình trạng nhiệm vụ |
| Support List | Danh sách Learner cần hỗ trợ |

### 10.4. Định dạng xuất (Output Formats)

| Định dạng | Mô tả |
|-----------|--------|
| Web | Hiển thị trên giao diện |
| PDF | Tải về dạng PDF |
| Excel | Tải về dạng Excel (.xlsx) |

### 10.5. Quy tắc

| Quy tắc | Mô tả |
|----------|--------|
| No snapshot | Không lưu report snapshot |
| Recalculate | Report được tính lại mỗi lần xem/export |
| Partial web | Nếu thiếu nguồn bắt buộc: Web hiển thị phần còn có |
| Lock export | Nếu thiếu nguồn bắt buộc: Không cho export |

### 10.6. Chi tiết Template

#### 10.6.1. Progress Report

| Section | Nội dung |
|---------|----------|
| Tổng quan | Tổng số Learner, số Learner hoàn thành Course, % trung bình |
| Chi tiết Learner | Bảng: Learner name, Course progress, Chapter progress, Last active |
| Slow Learners | Danh sách Learner có slow progress |

#### 10.6.2. Result Report

| Section | Nội dung |
|---------|----------|
| Tổng quan | Trung bình điểm, phân bố ngưỡng (Tốt/Đạt/Cần cải thiện) |
| Chi tiết theo Chapter | Bảng: Chapter, Avg score, Số Learner đạt, Số Learner chưa làm |
| Chi tiết theo Learner | Bảng: Learner name, Topic, Latest score, Trend, Status |

#### 10.6.3. Task Report

| Section | Nội dung |
|---------|----------|
| Tổng quan | Tổng số Task, completed on time, completed late, overdue |
| Chi tiết | Bảng: Learner, Task type, Status, Deadline, Completion date |
| Overdue summary | Danh sách Task đang overdue |

#### 10.6.4. Support List Report

| Section | Nội dung |
|---------|----------|
| Tổng quan | Tổng số Learner cần hỗ trợ, phân bố Priority |
| Chi tiết | Bảng: Learner, Priority, Signals (S1/S2/S3), Detail |

### 10.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-T42 | Default hiển thị 30 ngày | Manual |
| AC-T43 | Web hiển thị đầy đủ 4 phần | Manual |
| AC-T44 | Export PDF hoạt động | Manual |
| AC-T45 | Export Excel hoạt động | Manual |
| AC-T46 | Thiếu nguồn → Web partial, không export | Manual |

---

## 11. Phụ lục A – Open Dependencies

### A.1. Mục đích

Phụ lục này liệt kê các vấn đề phụ thuộc chưa được giải quyết giữa Phân hệ Người dùng và Phân hệ Nội dung, liên quan đến Content Manager.

### A.2. Danh sách Open Issues

| ID | Vấn đề | Trạng thái | Ảnh hưởng |
|----|--------|------------|-----------|
| OPEN-01 | Nguồn deadline của Quiz/Exercise | Chưa xác định | T-M04 |
| OPEN-02 | Cơ chế lưu snapshot `max_score` lịch sử | Chưa chốt | T-M03 |
| OPEN-03 | API Contract chính thức với Content | Đang xây dựng | Toàn bộ integration |
| OPEN-04 | Event Contract cho Exercise | Cần xác nhận | T-M04 |

### A.3. Xử lý tạm thời

**OPEN-01: Deadline Quiz/Exercise**
- Task phía User phải có deadline
- Tiếp tục dùng placeholder cho đến khi Content Module cung cấp contract

**OPEN-02: max_score**
- User Module không tự tạo nguồn `max_score` chính thức
- Yêu cầu Content trả về `score`, `max_score`, `percentage` qua API

### A.4. Hướng dẫn cập nhật

Khi nhận được thông tin từ Phân hệ Nội dung:

1. Cập nhật section tương ứng trong tài liệu
2. Xóa tag `[TODO]` và thay bằng `[CONFIRMED: <ngày>]`
3. Cập nhật tiêu chí chấp nhận nếu có thay đổi

---

## 12. Phụ lục B – Mô hình dữ liệu tham chiếu

### B.1. Mục đích

Phụ lục này mô tả cấu trúc dữ liệu chính liên quan đến các tính năng Content Manager. Chi tiết đầy đủ xem trong `docs/design/database-schema.sql`.

### B.2. Các bảng chính

| Bảng | Chức năng | Module |
|------|-----------|--------|
| `users` | Thông tin người dùng (bao gồm Manager) | System |
| `courses` | Thông tin khóa học (read-only từ Content) | System |
| `course_enrollments` | Quan hệ Learner ↔ Course | System |
| `conversations` | Cuộc trò chuyện 1-1 | T-M08 |
| `messages` | Tin nhắn trong cuộc trò chuyện | T-M08 |
| `feedback` | Phản hồi từ Manager | T-M06 |
| `notifications` | Thông báo học tập | T-M07 |
| `notification_recipients` | Người nhận thông báo | T-M07 |
| `lesson_progress` | Tiến độ Lesson | T-M02 |

### B.3. Mối quan hệ chính

```
users (1) ─── (n) courses (read via Content API)
courses (1) ─── (n) course_enrollments
course_enrollments (1) ─── (n) lesson_progress
users (1) ─── (n) conversations (as manager)
users (1) ─── (n) conversations (as learner)
conversations (1) ─── (n) messages
users (1) ─── (n) feedback
notifications (1) ─── (n) notification_recipients
```

### B.4. Quy tắc soft delete

Tất cả các bảng trên sử dụng **soft delete** hoặc **status field**:

- **Không xóa record** khi Learner rời Course
- Sử dụng status: `active`, `left`, `read_only`, `archived`
- Dữ liệu lịch sử được giữ nguyên

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ ChiTiet_ChucNang_ContentManager_PhanHeNguoiDung_V2.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| Đề cương Đồ án | `docs/reference/de-cuong-du-an.md` | Tổng quan đề tài |
| Chi tiết chức năng Content Manager (gốc) | `ChiTiet_ChucNang_ContentManager_PhanHeNguoiDung_V2.md` | Nguồn tham khảo |
| Database Schema | `docs/design/database-schema.sql` | Chi tiết bảng và cột |
| API Contract | `docs/design/api-contract-user-content.md` | Contract với Content Module |
| Chi tiết chức năng Learner | `docs/specifications/feature-learner.md` | Phụ lục A liên quan |

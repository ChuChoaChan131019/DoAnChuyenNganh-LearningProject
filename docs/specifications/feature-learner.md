# Đặc tả Chức năng Learner (Learner Feature Specification)

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [L-M01 – Dashboard Học tập (Learning Dashboard)](#2-l-m01--dashboard-học-tập-learning-dashboard)
3. [L-M02 – Kế hoạch học tập (Study Plan)](#3-l-m02--kế-hoạch-học-tập-study-plan)
4. [L-M03 – Tiến độ học tập (Progress)](#4-l-m03--tiến-độ-học-tập-progress)
5. [L-M04 – Nhiệm vụ và Thời hạn (Task & Deadline)](#5-l-m04--nhiệm-vụ-và-thời-hạn-task--deadline)
6. [L-M05 – Lịch và Nhắc nhở (Calendar & Reminder)](#6-l-m05--lịch-và-nhắc-nhở-calendar--reminder)
7. [L-M06 – Ghi chú (Note)](#7-l-m06--ghi-chú-note)
8. [L-M07 – Đánh dấu (Bookmark)](#8-l-m07--đánh-dấu-bookmark)
9. [L-M08 – Lịch sử học tập (Learning History)](#9-l-m08--lịch-sử-học-tập-learning-history)
10. [L-M09 – Kết quả học tập (Result)](#10-l-m09--kết-quả-học-tập-result)
11. [L-A01 – Kế hoạch học AI (AI Learning Plan)](#11-l-a01--kế-hoạch-học-ai-ai-learning-plan)
12. [L-A02 – Học tập cá nhân hóa (Personalized Learning)](#12-l-a02--học-tập-cá-nhân-hóa-personalized-learning)
13. [L-A03 – Học tập thích ứng (Adaptive Learning)](#13-l-a03--học-tập-thích-ứng-adaptive-learning)
14. [Phụ lục A – Open Dependencies](#14-phụ-lục-a--open-dependencies)
15. [Phụ lục B – Mô hình dữ liệu tham chiếu](#15-phụ-lục-b--mô-hình-dữ-liệu-tham-chiếu)

---

## 1. Tổng quan

### 1.1. Mục đích tài liệu

Tài liệu này mô tả đặc tả chức năng (functional specification) của tất cả các tính năng dành cho vai trò **Learner** (Người học) trong Phân hệ Người dùng. Mỗi chương trình bày:

- Mục đích và phạm vi của tính năng
- Các trường hợp sử dụng (use cases)
- Quy tắc nghiệp vụ (business rules)
- Tiêu chí chấp nhận (acceptance criteria)

### 1.2. Định nghĩa vai trò Learner

Learner là người dùng đã đăng ký tài khoản với vai trò "Learner" trong hệ thống. Learner có thể:

- Đăng ký tham gia các khóa học (Course) do Content Manager quản lý
- Theo dõi tiến độ học tập của bản thân
- Tạo và quản lý kế hoạch học tập cá nhân
- Xem kết quả bài kiểm tra và đánh giá
- Sử dụng các công cụ hỗ trợ học tập (ghi chú, đánh dấu, nhắc nhở)
- Nhận đề xuất học tập từ hệ thống AI

### 1.3. Quy ước trong tài liệu

| Ký hiệu | Ý nghĩa |
|----------|----------|
| **[TODO]** | Tính năng hoặc quy tắc phụ thuộc vào Phân hệ Nội dung, đang chờ contract chính thức |
| **[OPEN]** | Vấn đề chưa được giải quyết, cần thảo luận thêm |
| **Must** | Yêu cầu bắt buộc |
| **Should** | Yêu cầu khuyến nghị |
| **May** | Yêu cầu tùy chọn |

---

## 2. L-M01 – Dashboard Học tập (Learning Dashboard)

### 2.1. Mục đích

Dashboard Học tập là màn hình chính mà Learner nhìn thấy ngay sau khi đăng nhập. Mục đích là cung cấp cái nhìn tổng quan về tình trạng học tập hiện tại và các hành động cần thực hiện.

### 2.2. Thành phần hiển thị

Dashboard bao gồm các thành phần sau:

| STT | Thành phần | Mô tả | Ưu tiên |
|-----|------------|--------|----------|
| 1 | Continue Learning (Tiếp tục học) | Nội dung tiếp theo cần học | Cao |
| 2 | Progress (Tiến độ) | Biểu đồ hoặc chỉ số % hoàn thành | Cao |
| 3 | Task/Deadline (Nhiệm vụ/Thời hạn) | Các nhiệm vụ cần thực hiện trong thời gian tới | Cao |
| 4 | Recent Results (Kết quả gần đây) | Kết quả bài kiểm tra mới nhất | Trung bình |
| 5 | Recent Learning History (Lịch sử học gần đây) | Các hoạt động học tập gần đây | Trung bình |
| 6 | Today's Study Plan (Kế hoạch hôm nay) | Lịch học trong ngày | Trung bình |
| 7 | Reminder (Nhắc nhở) | Các thông báo nhắc nhở đã thiết lập | Trung bình |
| 8 | Bookmark (Đánh dấu) | Các mục đã đánh dấu | Thấp |
| 9 | Progress Chart (Biểu đồ tiến độ) | Biểu đồ trực quan về tiến độ học tập | Thấp |

### 2.3. Quy tắc hiển thị Continue Learning

**Trường hợp 1: Có Active Study Plan**
- Hiển thị Lesson tiếp theo trong Study Plan đang hoạt động
- Ưu tiên Course của Active Study Plan

**Trường hợp 2: Không có Active Study Plan nhưng có Lesson đang học dở**
- Hiển thị Lesson bắt đầu gần nhất nhưng chưa hoàn thành (completed)
- Thông tin lấy từ Learning History

**Trường hợp 3: Không có dữ liệu học tập**
- Hiển thị gợi ý "Tạo kế hoạch học tập" (Create Study Plan)

### 2.4. Quy tắc nghiệp vụ

- Learner có thể có nhiều Enrollment đang active (`active`) cùng lúc
- Learner chỉ có một Study Plan đang active trên toàn hệ thống
- Dashboard ưu tiên hiển thị Course của Active Study Plan

### 2.5. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-01 | Learner đăng nhập → Dashboard hiển thị đầy đủ các thành phần | Manual |
| AC-02 | Khi có Active Study Plan → Continue Learning hiển thị Lesson tiếp theo | Manual |
| AC-03 | Khi không có Active Plan nhưng có Lesson dở → Hiển thị Lesson đó | Manual |
| AC-04 | Khi không có dữ liệu → Hiển thị gợi ý tạo kế hoạch | Manual |
| AC-05 | Progress chart cập nhật khi Learner hoàn thành Lesson | Automated |

---

## 3. L-M02 – Kế hoạch học tập (Study Plan)

### 3.1. Mục đích

Study Plan cho phép Learner tạo lịch học tập cá nhân hóa cho một Course cụ thể. Kế hoạch chia nhỏ nội dung Course thành các buổi học (session) với ngày và thời lượng cụ thể.

### 3.2. Phạm vi đối tượng

- **Một Study Plan áp dụng cho một Course duy nhất**
- Learner không thể tạo Plan cho nhiều Course trong cùng một Plan

### 3.3. Quy tắc hệ thống

| Quy tắc | Mô tả |
|----------|--------|
| Single Active Plan | Chỉ một Plan active trên toàn hệ thống tại một thời điểm |
| Enrollment prerequisite | Learner chỉ tạo Study Plan cho Course có Enrollment `active` |
| No auto-enrollment | Tạo Study Plan không tự động tạo Enrollment |
| Max lessons per session | Tối đa 2 Lesson mỗi buổi học |
| Preserve order | Giữ thứ tự Course → Chapter → Lesson |
| Daily/Weekly same data | Chế độ Daily và Weekly dùng cùng dữ liệu |

### 3.4. Thông tin đầu vào khi tạo Plan

Khi tạo Study Plan, Learner cần cung cấp:

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
|--------|--------------|----------|-------|
| Course | Reference | Yes | Khóa học muốn tạo kế hoạch |
| Goal | String | Yes | Mục tiêu học tập của Learner |
| Start date | Date | Yes | Ngày bắt đầu kế hoạch |
| Deadline | Date | Yes | Ngày kết thúc kế hoạch |
| Available weekdays | Array | Yes | Các ngày trong tuần Learner có thể học |
| Session duration | Number | Yes | Thời lượng mỗi buổi học (phút) |

### 3.5. Quy tắc chỉnh sửa (Edit)

**Cho phép:**
- Reschedule (thay đổi lịch) các phần tử tương lai chưa hoàn thành
- Thay đổi ngày, thời lượng, các buổi học chưa done

**Không cho phép:**
- Thay đổi nội dung đã hoàn thành (completed)
- Xóa history đã ghi nhận

### 3.6. Trạng thái Study Plan

| Trạng thái | Mô tả | Chuyển đổi |
|------------|-------|-------------|
| `active` | Đang hoạt động | → `completed` (khi hết deadline), → `archived` (khi Learner leave course) |
| `archived` | Đã lưu trữ | → `active` (khi Learner resume course) |
| `completed` | Đã hoàn thành | Không chuyển tiếp |

### 3.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-06 | Learner tạo Plan → Hệ thống kiểm tra Enrollment `active` trước khi tạo | Automated |
| AC-07 | Khi tạo Plan thứ hai → Plan cũ tự động chuyển sang `archived` | Automated |
| AC-08 | Mỗi buổi học không quá 2 Lesson | Automated |
| AC-09 | Edit Plan → Chỉ thay đổi được phần tương lai | Automated |
| AC-10 | Plan tự động hoàn thành khi đến deadline | Scheduled job |

---

## 4. L-M03 – Tiến độ học tập (Progress)

### 4.1. Mục đích

Progress theo dõi và hiển thị mức độ hoàn thành của Learner đối với Course và Chapter. Dữ liệu này giúp Learner hiểu rõ mình đã tiến bộ đến đâu.

### 4.2. Công thức tính

**Course Progress:**
```
Course Progress (%) = (Số Lesson đã hoàn thành / Tổng số Lesson hiện tại) × 100%
```

**Chapter Progress:**
```
Chapter Progress (%) = (Số Lesson đã hoàn thành trong Chapter / Tổng số Lesson trong Chapter) × 100%
```

### 4.3. Quy tắc quan trọng

| Quy tắc | Mô tả |
|----------|--------|
| Quiz/Exercise không cộng | Quiz và Exercise không được tính vào Progress |
| Không yêu cầu minimum time | Không yêu cầu Learner học tối thiểu bao lâu |
| Không yêu cầu pass Quiz | Không bắt buộc vượt qua Quiz mới tính hoàn thành |
| Không hỗ trợ reset | Không cho phép reset Progress |

### 4.4. Cơ chế đánh dấu hoàn thành Lesson

**Luồng:**
1. Learner học nội dung Lesson
2. Learner bấm nút "Hoàn thành bài học" (Mark as Complete)
3. Nút nằm ở cuối trang Lesson
4. Hệ thống tạo record trong `lesson_progress`

**Data Model:**
- **Có record** trong `lesson_progress` → Lesson đã hoàn thành
- **Không có record** → Lesson chưa hoàn thành

**Không sử dụng** trạng thái `not_started/in_progress/completed` trong bảng Progress.

### 4.5. Trạng thái bắt đầu Lesson

Trạng thái bắt đầu (started/not started) của một Lesson được lấy từ **Learning History**, không phải từ bảng Progress.

### 4.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-11 | Learner hoàn thành Lesson → Record được tạo trong `lesson_progress` | Automated |
| AC-12 | Progress hiển thị đúng % theo công thức | Automated |
| AC-13 | Quiz hoàn thành không làm tăng Progress | Automated |
| AC-14 | Learner không thể reset Progress | Manual |

---

## 5. L-M04 – Nhiệm vụ và Thời hạn (Task & Deadline)

### 5.1. Mục đích

Task giúp Learner theo dõi các công việc cần làm liên quan đến học tập, bao gồm Lesson, Quiz, và Exercise. Deadline giúp Learner biết thời điểm cần hoàn thành.

### 5.2. Nguồn Task [TODO]

**[TODO]** Trong phiên bản hiện tại, tất cả các mục sau đều được coi là Task:

| Loại | Nguồn | Ghi chú |
|------|-------|---------|
| Lesson | Study Plan | Đã xác định rõ |
| Quiz | Liên quan đến Course | [TODO] Cần xác nhận từ Phân hệ Nội dung |
| Exercise | Liên quan đến Course | [TODO] Exercise hiện được biểu diễn như Quiz type |

**Ghi chú về Exercise:**
- Exercise hiện được Phân hệ Nội dung biểu diễn như một loại Quiz
- Integration Layer phải normalize giá trị Quiz type từ Content Module

### 5.3. Quy tắc xác định Deadline

**Lesson trong Study Plan:**
- `planned_date` trong Study Plan là cơ sở xác định deadline

**Quiz và Exercise [TODO]:**
- [TODO] Cơ chế chính thức xác định nguồn deadline chưa được chốt với Phân hệ Nội dung
- Phiên bản hiện tại: **Task phía User phải có deadline**
- Khi Content Module có contract chính thức, tài liệu này phải được cập nhật

### 5.4. Trạng thái Task

| Trạng thái | Mô tả | Điều kiện chuyển |
|------------|-------|------------------|
| `active` | Đang chờ thực hiện | Trạng thái mặc định |
| `completed` | Đã hoàn thành | Learner hoàn thành (Lesson done / Quiz submitted) |
| `cancelled` | Đã hủy | Learner rời Course hoặc Task bị hủy |

### 5.5. Trạng thái Overdue

**Overdue khi:**
- Task có trạng thái `active`
- Thời gian hiện tại > deadline

**Quy tắc:**
- Task có trạng thái `cancelled` **không** được tính là overdue
- Learner **vẫn được** hoàn thành Task quá hạn nếu Task chưa bị cancelled

### 5.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-15 | Task hiển thị đúng trạng thái: active/completed/cancelled | Automated |
| AC-16 | Task active + quá deadline → hiển thị overdue | Automated |
| AC-17 | Task cancelled → không hiển thị overdue | Automated |
| AC-18 | Learner vẫn hoàn thành được Task quá hạn | Manual |

---

## 6. L-M05 – Lịch và Nhắc nhở (Calendar & Reminder)

### 6.1. Mục đích

Calendar cung cấp cái nhìn lịch trình học tập theo ngày/tuần/tháng. Reminder giúp Learner không bỏ lỡ các buổi học quan trọng.

### 6.2. Nguồn dữ liệu Calendar

Calendar tổng hợp dữ liệu từ:

| Nguồn | Mô tả |
|--------|--------|
| Study Plan | Các buổi học đã lên lịch |
| Task | Các nhiệm vụ cần thực hiện |

### 6.3. Chế độ xem (Views)

Calendar hỗ trợ ba chế độ xem:

| Chế độ | Mô tả |
|--------|-------|
| Month (Tháng) | Hiển thị lịch theo tháng |
| Week (Tuần) | Hiển thị lịch theo tuần |
| Day (Ngày) | Hiển thị lịch theo ngày |

### 6.4. Quy tắc Reminder

**Mặc định:**
- Thời gian nhắc trước: **1 ngày** trước deadline
- Kênh gửi: **In-app** và **Email**

**Learner có thể:**
- Chỉnh sửa thời gian nhắc
- Tắt Reminder cho một Task cụ thể

### 6.5. Quy tắc xử lý sự kiện

**Khi Task được hoàn thành:**
- Reminder đang chờ (pending) cho Task đó → **bị hủy (cancelled)**

**Khi Deadline hoặc Plan thay đổi:**
- Reminder đang chờ → **được cập nhật** với thông tin mới

**Khi Enrollment chuyển sang `left`:**
- Tất cả Reminder đang chờ liên quan đến Course đó → **bị hủy (cancelled)**

### 6.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-19 | Calendar hiển thị đúng dữ liệu từ Study Plan và Task | Manual |
| AC-20 | Learner có thể chuyển đổi giữa Month/Week/Day | Manual |
| AC-21 | Task completed → Reminder bị hủy | Automated |
| AC-22 | Deadline thay đổi → Reminder được cập nhật | Automated |
| AC-23 | Enrollment `left` → Reminder của Course bị hủy | Automated |

---

## 7. L-M06 – Ghi chú (Note)

### 7.1. Mục đích

Note cho phép Learner tạo ghi chú cá nhân trong quá trình học tập. Ghi chú có thể độc lập hoặc gắn với một Lesson cụ thể.

### 7.2. Loại Note

| Loại | Mô tả |
|------|-------|
| Free-form Note | Ghi chú tự do, không gắn với nội dung cụ thể |
| Lesson-attached Note | Ghi chú gắn với một Lesson cụ thể |

### 7.3. Quy tắc nghiệp vụ

| Quy tắc | Mô tả |
|----------|--------|
| Multiple notes per lesson | Một Lesson có thể có nhiều Note |
| Rich Text | Note hỗ trợ định dạng Rich Text (bold, italic, list, code, v.v.) |
| Autosave + Save | Note tự động lưu (autosave) và có nút lưu thủ công |
| Edit own notes | Learner chỉ sửa/xóa được Note của bản thân |
| Hidden content | Khi Lesson bị ẩn (hidden), Note không bị xóa |

### 7.4. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-24 | Learner tạo Note → Note được lưu thành công | Automated |
| AC-25 | Learner tạo Note gắn Lesson → Hiển thị trong Lesson đó | Manual |
| AC-26 | Rich Text editor hoạt động đúng | Manual |
| AC-27 | Autosave lưu nội dung định kỳ | Automated |
| AC-28 | Learner không sửa/xóa được Note của người khác | Automated |

---

## 8. L-M07 – Đánh dấu (Bookmark)

### 8.1. Mục đích

Bookmark cho phép Learner đánh dấu nội dung quan trọng để truy cập nhanh sau này.

### 8.2. Đối tượng Bookmark

Learner có thể đánh dấu:

| Đối tượng | Mô tả |
|-----------|-------|
| Lesson | Đánh dấu toàn bộ Lesson |
| Material | Đánh dấu tài liệu cụ thể trong Lesson |

### 8.3. Quy tắc nghiệp vụ

| Quy tắc | Mô tả |
|----------|--------|
| No duplicate | Không cho phép đánh dấu trùng lặp cùng một đối tượng |
| Multiple tags | Mỗi Bookmark có thể gắn nhiều Tag |
| Search/filter | Hỗ trợ tìm kiếm và lọc Bookmark theo tag |
| No folder | Không có cấu trúc thư mục (folder) |
| No separate note | Bookmark không có Note riêng (dùng Note module) |
| Hidden content | Khi nội dung bị ẩn, Bookmark không tự động bị xóa |

### 8.4. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-29 | Learner đánh dấu Lesson → Bookmark được tạo | Automated |
| AC-30 | Đánh dấu cùng một đối tượng 2 lần → Báo lỗi hoặc không tạo duplicate | Automated |
| AC-31 | Bookmark có thể gắn nhiều Tag | Manual |
| AC-32 | Tìm kiếm Bookmark theo Tag hoạt động | Manual |
| AC-33 | Hidden content → Bookmark không bị xóa | Automated |

---

## 9. L-M08 – Lịch sử học tập (Learning History)

### 9.1. Mục đích

Learning History ghi lại toàn bộ hoạt động học tập của Learner, tạo audit trail cho quá trình học và phục vụ phân tích.

### 9.2. Sự kiện được ghi nhận

| Sự kiện | Mô tả |
|---------|-------|
| `lesson_started` | Learner bắt đầu một Lesson |
| `lesson_completed` | Learner hoàn thành một Lesson |
| `quiz_started` | Learner bắt đầu làm Quiz |
| `quiz_completed` | Learner nộp Quiz |
| `exercise_started` | Learner bắt đầu làm Exercise |
| `exercise_completed` | Learner nộp Exercise |

**Ghi chú về Exercise:**
- Exercise sử dụng event namespace `quiz_started` và `quiz_completed`
- Phân biệt qua `quiz_type` trong event data

### 9.3. Dữ liệu đi kèm

Mỗi event Learning History bao gồm:

| Trường | Mô tả |
|--------|-------|
| estimated_study_duration | Thời gian ước tính Learner đã học |

### 9.4. Quy tắc nghiệp vụ

- **Không cho phép Learner sửa/xóa History**
- History là read-only, không thể thay đổi bởi người dùng cuối

### 9.5. Cơ chế tích hợp Event [Cập nhật mới]

**Endpoint nhận event:**
```
POST /api/v1/internal/events
```

**Yêu cầu:**
- Event phải có `event_id` duy nhất
- Duplicate event cùng `event_id` → **không tạo History thứ hai** (idempotent)

**Nguồn event:**
- Phân hệ Nội dung gửi event khi Learner tương tác với nội dung

### 9.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-34 | Lesson started → Tạo event `lesson_started` | Automated |
| AC-35 | Lesson completed → Tạo event `lesson_completed` | Automated |
| AC-36 | Quiz completed → Tạo event `quiz_completed` | Automated |
| AC-37 | Duplicate `event_id` → Không tạo record trùng lặp | Automated |
| AC-38 | Learner không thể sửa/xóa History | Manual |

---

## 10. L-M09 – Kết quả học tập (Result)

### 10.1. Mục đích

Result hiển thị kết quả bài kiểm tra (Quiz/Exercise) của Learner, bao gồm điểm số, xu hướng, và đánh giá tổng quan.

### 10.2. Trách nhiệm dữ liệu

**Phân hệ Nội dung sở hữu:**
- Quiz Attempt (Lần thử làm bài)
- Answer (Câu trả lời)
- Correctness (Đúng/Sai)
- Score (Điểm số)

**Phân hệ Người dùng:**
- Hiển thị dữ liệu từ Phân hệ Nội dung
- Tính toán trend và đánh giá

**Lưu ý:** Result **không chấm điểm** trực tiếp. Điểm chấm chính thức thuộc Phân hệ Nội dung.

### 10.3. API lấy dữ liệu

| Endpoint | Vai trò |
|----------|---------|
| `/api/v1/quiz-results/latest` | Lấy trạng thái hiện tại |
| `/api/v1/quiz-attempts` | Lấy lịch sử và trend |

### 10.4. Phạm vi phiên bản đầu

**Topic = Chapter**

Trong phiên bản đầu tiên, kết quả được tính theo **Chapter**, không chi tiết đến từng Quiz riêng lẻ.

### 10.5. Công thức tính điểm

```
Result (%) = (Tổng điểm / Tổng điểm tối đa) × 100%
```

### 10.6. Tính Trend (Xu hướng)

**Phương pháp:**
- Lấy trung bình 3 kết quả gần nhất
- So sánh với trung bình 3 kết quả liền trước đó

**Điều kiện:**
- Nếu Learner có **ít hơn 6 lần hoàn thành** → Hiển thị: "Chưa đủ dữ liệu để đánh giá xu hướng."

### 10.7. Ngưỡng đánh giá

| Ngưỡng | Kết quả | Màu sắc gợi ý |
|--------|---------|---------------|
| >= 80% | Tốt | Xanh |
| 60% – 79% | Đạt | Vàng |
| < 60% | Cần cải thiện | Đỏ |

### 10.8. Open Dependencies [TODO]

**[TODO]** Cơ chế lưu snapshot `max_score` lịch sử trong database Nội dung **chưa được chốt**.

**Ảnh hưởng:**
- User Module không tự tạo nguồn `max_score` chính thức
- API Contract yêu cầu Content trả về: `score`, `max_score`, `percentage`

**Xử lý:**
- Tài liệu phải cập nhật khi Phân hệ Nội dung cung cấp cơ chế chính thức

### 10.9. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-39 | Result hiển thị đúng công thức | Automated |
| AC-40 | Trend tính đúng từ 3 kết quả gần nhất | Automated |
| AC-41 | Ít hơn 6 attempts → Hiển thị thông báo "Chưa đủ dữ liệu" | Automated |
| AC-42 | Ngưỡng hiển thị đúng: >=80% Tốt, 60-79% Đạt, <60% Cần cải thiện | Automated |

---

## 11. L-A01 – Kế hoạch học AI (AI Learning Plan)

### 11.1. Mục đích

AI Learning Plan sử dụng trí tuệ nhân tạo để đề xuất kế hoạch học tập tối ưu dựa trên dữ liệu cá nhân của Learner.

### 11.2. Dữ liệu đầu vào (Input)

AI sử dụng các thông tin sau để đề xuất:

| Dữ liệu | Nguồn |
|---------|-------|
| Goal (Mục tiêu) | Learner nhập |
| Course | Course đã chọn |
| Schedule availability (Lịch rảnh) | Learner nhập |
| Progress (Tiến độ) | Hệ thống |
| Result (Kết quả) | Phân hệ Nội dung |
| Learning history (Lịch sử học) | Hệ thống |

### 11.3. Quy tắc hoạt động

| Quy tắc | Mô tả |
|---------|-------|
| AI chỉ đề xuất | AI **không tự động** tạo Plan |
| Bắt buộc Preview | Trước khi áp dụng, Learner xem trước đề xuất |
| Bắt buộc validation | Đề xuất phải qua kiểm tra hợp lệ |
| Learner confirm | Chỉ khi Learner xác nhận → Plan mới được lưu |
| Không tự sửa | AI **không tự động sửa** Plan đang có |

### 11.4. Luồng xử lý

```
1. Learner cung cấp Goal, Course, Schedule
2. AI phân tích Progress, Result, History
3. AI đề xuất Study Plan
4. Learner Preview đề xuất
5. Hệ thống Validation đề xuất
6. Learner Confirm → Study Plan được tạo
   Hoặc Learner Reject → Quay lại bước 1
```

### 11.5. Output

Sau khi Learner chấp nhận, đề xuất AI trở thành **Study Plan bình thường** và tuân theo tất cả quy tắc của L-M02.

### 11.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-43 | AI đề xuất Plan → Learner thấy Preview trước | Manual |
| AC-44 | Learner không Confirm → Plan không được tạo | Automated |
| AC-45 | Learner Confirm → Study Plan được tạo đúng | Automated |
| AC-46 | AI không tự động sửa Plan hiện có | Manual |

---

## 12. L-A02 – Học tập cá nhân hóa (Personalized Learning)

### 12.1. Mục đích

Personalized Learning cung cấp đề xuất nội dung phù hợp với từng Learner dựa trên sở thích, tiến độ, và kết quả học tập.

### 12.2. Trách nhiệm Content Module

Content Module trả về danh sách **candidate** (ứng viên) hợp lệ cho việc đề xuất.

### 12.3. Quy trình xử lý phía User Module

| Bước | Xử lý | Ghi chú |
|------|-------|---------|
| 1 | Content trả về recommendation candidates | Nguồn từ Content Module |
| 2 | Business Rules filter | Lọc theo quy tắc nghiệp vụ |
| 3 | AI ranking | Xếp hạng ưu tiên bằng AI |
| 4 | Fallback rule-based | Khi AI lỗi → dùng quy tắc thủ công |

### 12.4. Vị trí hiển thị

Recommendation được hiển thị tại:

| Vị trí | Mô tả |
|--------|-------|
| Dashboard | Hiển thị trên trang chính của Learner |
| Trang riêng | Trang chuyên biệt cho Personalized Learning |

### 12.5. Feedback từ Learner

Sau khi nhận recommendation, Learner có thể phản hồi:

| Feedback | Ý nghĩa |
|----------|---------|
| Phù hợp (Relevant) | Learner thấy đề xuất hữu ích |
| Không phù hợp (Not Relevant) | Learner thấy đề xuất không phù hợp |

Feedback được sử dụng để cải thiện độ chính xác của recommendation trong tương lai.

### 12.6. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-47 | Recommendation hiển thị trên Dashboard | Manual |
| AC-48 | Có trang riêng cho Personalized Learning | Manual |
| AC-49 | Learner gửi Feedback → Feedback được ghi nhận | Automated |
| AC-50 | AI lỗi → Fallback rule-based hoạt động | Manual |

---

## 13. L-A03 – Học tập thích ứng (Adaptive Learning)

### 13.1. Mục đích

Adaptive Learning điều chỉnh độ khó của nội dung và bài tập dựa trên hiệu suất của Learner, nhằm tối ưu hóa quá trình học.

### 13.2. Ba mức độ khó

| Mức | Tiếng Việt | Mô tả |
|-----|------------|-------|
| Easy | Dễ | Nội dung cơ bản, ít thử thách |
| Medium | Trung bình | Nội dung cân bằng |
| Hard | Khó | Nội dung nâng cao, nhiều thử thách |

### 13.3. Quy tắc điều chỉnh

Điều chỉnh dựa trên kết quả học tập gần nhất:

| Kết quả | Hành động |
|---------|-----------|
| < 50% | Giảm độ khó (↓) |
| 50% – 79% | Giữ nguyên độ khó (→) |
| >= 80% | Tăng độ khó (↑) |

### 13.4. Quyền quyết định của Learner

- Hệ thống đề xuất độ khó phù hợp
- **Learner quyết định** có áp dụng recommendation hay không
- Không có tự động thay đổi mà không có sự đồng ý

### 13.5. Vai trò Content Module

Content Module chịu trách nhiệm:

| Trách nhiệm | Mô tả |
|-------------|-------|
| Kiểm tra availability | Xác nhận nội dung độ khó tương ứng có sẵn |
| Tạo practice session | Tạo phiên ôn tập với độ khó phù hợp |

### 13.6. Quy tắc về naming [Cập nhật mới]

**Vấn đề:**
- Content Module có thể sử dụng tên khác cho Exercise/practice
- Ví dụ: `exercise` → `practice`

**Xử lý:**
- Tên gọi từ Content phải qua **Adapter/Integration Layer**
- Business logic của User Module **không phụ thuộc** vào raw string cụ thể

### 13.7. Tiêu chí chấp nhận

| ID | Tiêu chí | Kiểm tra |
|----|----------|----------|
| AC-51 | Kết quả < 50% → Hệ thống đề xuất giảm độ khó | Automated |
| AC-52 | Kết quả 50-79% → Hệ thống đề xuất giữ nguyên | Automated |
| AC-53 | Kết quả >= 80% → Hệ thống đề xuất tăng độ khó | Automated |
| AC-54 | Learner từ chối → Độ khó không thay đổi | Manual |
| AC-55 | Naming từ Content được normalize qua Adapter | Automated |

---

## 14. Phụ lục A – Open Dependencies

### A.1. Mục đích

Phụ lục này liệt kê các vấn đề phụ thuộc chưa được giải quyết giữa Phân hệ Người dùng và Phân hệ Nội dung.

### A.2. Danh sách Open Issues

| ID | Vấn đề | Trạng thái | Ảnh hưởng |
|----|--------|------------|-----------|
| OPEN-01 | Nguồn deadline của Quiz/Exercise | Chưa xác định | L-M04, L-M05 |
| OPEN-02 | Cơ chế lưu snapshot `max_score` lịch sử | Chưa chốt | L-M09 |
| OPEN-03 | API Contract chính thức với Content | Đang xây dựng | Toàn bộ integration |
| OPEN-04 | Event Contract cho Exercise | Cần xác nhận | L-M08 |

### A.3. Xử lý tạm thời

**OPEN-01: Deadline Quiz/Exercise**
- Phiên bản hiện tại: Task phía User phải có deadline
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

## 15. Phụ lục B – Mô hình dữ liệu tham chiếu

### B.1. Mục đích

Phụ lục này mô tả cấu trúc dữ liệu chính liên quan đến các tính năng Learner. Chi tiết đầy đủ xem trong `docs/design/database-schema.sql`.

### B.2. Các bảng chính

| Bảng | Chức năng | Module |
|------|-----------|--------|
| `users` | Thông tin người dùng | System |
| `enrollments` | Quan hệ Learner ↔ Course | System |
| `study_plans` | Kế hoạch học tập | L-M02 |
| `study_plan_items` | Các buổi học trong Plan | L-M02 |
| `lesson_progress` | Tiến độ Lesson | L-M03 |
| `tasks` | Nhiệm vụ | L-M04 |
| `reminders` | Nhắc nhở | L-M05 |
| `notes` | Ghi chú | L-M06 |
| `bookmarks` | Đánh dấu | L-M07 |
| `bookmark_tags` | Tag cho Bookmark | L-M07 |
| `learning_history` | Lịch sử học tập | L-M08 |
| `analytics_events` | Sự kiện phân tích | System |

### B.3. Mối quan hệ chính

```
users (1) ─── (n) enrollments
users (1) ─── (n) study_plans
enrollments (1) ─── (n) study_plans
study_plans (1) ─── (n) study_plan_items
enrollments (1) ─── (n) lesson_progress
users (1) ─── (n) tasks
users (1) ─── (n) reminders
users (1) ─── (n) notes
users (1) ─── (n) bookmarks
bookmarks (1) ─── (n) bookmark_tags
users (1) ─── (n) learning_history
```

### B.4. Quy tắc soft delete

Tất cả các bảng trên sử dụng **soft delete** hoặc **status field**:

- **Không xóa record** khi Learner rời Course
- Sử dụng status: `active`, `left`, `archived`, `cancelled`
- Dữ liệu lịch sử được giữ nguyên

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ ChiTiet_ChucNang_NguoiHoc_PhanHeNguoiDung_V2.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|-------|
| Đề cương Đồ án | `docs/reference/de-cuong-du-an.md` | Tổng quan đề tài |
| Chi tiết chức năng Learner (gốc) | `ChiTiet_ChucNang_NguoiHoc_PhanHeNguoiDung_V2.md` | Nguồn tham khảo |
| Database Schema | `docs/design/database-schema.sql` | Chi tiết bảng và cột |
| API Contract | `docs/design/api-contract-user-content.md` | Contract với Content Module |

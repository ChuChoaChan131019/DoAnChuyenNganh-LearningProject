# Thiết kế Database - Phân hệ Người dùng

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Hệ quản trị:** PostgreSQL (Supabase)  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Danh sách bảng và mối quan hệ](#2-danh-sách-bảng-và-mối-quan-hệ)
3. [Giải thích chi tiết từng bảng](#3-giải-thích-chi-tiết-từng-bảng)
4. [Mối quan hệ giữa các bảng](#4-mối-quan-hệ-giữa-các-bảng)
5. [Nguyên tắc thiết kế](#5-nguyên-tắc-thiết-kế)
6. [Row Level Security (RLS)](#6-row-level-security-rls)
7. [Index và Performance](#7-index-và-performance)
8. [Trigger tự động](#8-trigger-tự-động)
9. [Dữ liệu không thuộc User DB](#9-dữ-liệu-không-thuộc-user-db)

---

## 1. Tổng quan

### 1.1. Mục đích

Phân hệ Người dùng lưu trữ và quản lý các dữ liệu liên quan đến:

- Tài khoản và xác thực người dùng (Authentication)
- Thông tin hồ sơ và vai trò (Profile & Role)
- Việc đăng ký khóa học (Enrollment)
- Kế hoạch và tiến độ học tập (Study Plan & Progress)
- Nhiệm vụ và nhắc nhở (Task & Reminder)
- Ghi chú và đánh dấu (Note & Bookmark)
- Lịch sử hoạt động học tập (Learning History)
- Phản hồi và nhắn tin (Feedback & Messaging)
- Thông báo (Notification)
- Dữ liệu phân tích (Analytics)

### 1.2. Kiểu dữ liệu thường dùng

| Kiểu dữ liệu | Mô tả | Ví dụ |
|---------------|--------|--------|
| `UUID` | Mã định danh duy nhất toàn cầu, tự sinh | `550e8400-e29b-41d4-a716-446655440000` |
| `VARCHAR(n)` | Chuỗi ký tự, tối đa n ký tự | `'learner'`, `'active'` |
| `TEXT` | Chuỗi ký tự không giới hạn độ dài | Nội dung bài viết |
| `INTEGER` | Số nguyên | `0`, `1`, `5` |
| `BOOLEAN` | Giá trị đúng/sai | `true`, `false` |
| `DATE` | Ngày (không có giờ) | `'2026-09-05'` |
| `TIMESTAMP WITH TIME ZONE` | Ngày giờ có múi giờ | `'2026-09-05 10:30:00+07'` |
| `JSONB` | Dữ liệu JSON dạng nhị phân | `'{"key": "value"}'` |

### 1.3. Quy ước đặt tên

| Quy ước | Ví dụ |
|----------|--------|
| Tên bảng | `snake_case`, số nhiều (ví dụ: `study_plans`) |
| Tên cột | `snake_case` (ví dụ: `course_id`) |
| Khóa chính | tên bảng + `_id` hoặc `id` |
| Khóa ngoại | tên bảng liên kết + `_id` |
| Timestamp | có `_at` ở cuối |

### 1.4. Tổng số bảng

**21 bảng** trong Phân hệ Người dùng:

| STT | Tên bảng | Mô tả |
|-----|-----------|--------|
| 1 | `profiles` | Hồ sơ người dùng |
| 2 | `course_enrollments` | Đăng ký khóa học |
| 3 | `study_plans` | Kế hoạch học tập |
| 4 | `study_plan_available_days` | Ngày học trong tuần |
| 5 | `study_plan_sessions` | Buổi học |
| 6 | `study_plan_items` | Bài học trong buổi học |
| 7 | `lesson_progress` | Tiến độ bài học |
| 8 | `tasks` | Nhiệm vụ |
| 9 | `reminders` | Nhắc nhở |
| 10 | `notes` | Ghi chú |
| 11 | `bookmarks` | Đánh dấu |
| 12 | `bookmark_tags` | Thẻ đánh dấu |
| 13 | `bookmark_tag_links` | Liên kết thẻ-bookmark |
| 14 | `learning_history` | Lịch sử học tập |
| 15 | `feedbacks` | Phản hồi |
| 16 | `conversations` | Cuộc hội thoại |
| 17 | `messages` | Tin nhắn |
| 18 | `notifications` | Thông báo |
| 19 | `notification_recipients` | Người nhận thông báo |
| 20 | `analytics_events` | Sự kiện phân tích |

---

## 2. Danh sách bảng và mối quan hệ

### 2.1. Sơ đồ mối quan hệ tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PROFILES (Hồ sơ người dùng)                           │
│  id (PK) ──────────────────────────────────────────────────────────────────►   │
│  role: learner | content_manager | admin                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ COURSE_         │      │   STUDY_PLANS   │      │  LEARNING_      │
│ ENROLLMENTS     │      │                 │      │  HISTORY        │
│ learner_id (FK) │◄──── │ learner_id (FK) │◄──── │ learner_id (FK) │
│ course_id (REF) │      │ course_id (REF) │      │ course_id (REF) │
│ status          │      │ status          │      │ activity_type   │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
           ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
           │ STUDY_PLAN_ │ │ STUDY_PLAN_ │ │ LESSON_     │
           │ AVAILABLE_  │ │ SESSIONS    │ │ PROGRESS    │
           │ DAYS        │ │ study_plan_ │ │ learner_id  │
           │ study_plan_ │ │ id (FK)     │ │ lesson_id   │
           │ id (FK)     │ │ planned_date│ │ (FK)        │
           └─────────────┘ └──────┬──────┘ └─────────────┘
                                  │
                                  ▼
                         ┌─────────────┐
                         │ STUDY_PLAN_ │
                         │ ITEMS       │
                         │ session_id  │
                         │ lesson_id   │
                         └─────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     TASKS       │      │    REMINDERS    │      │     NOTES       │
│ learner_id (FK) │      │ learner_id (FK) │      │ learner_id (FK) │
│ course_id (REF) │      │ task_id (FK)    │      │ lesson_id (REF) │
│ task_type       │      │ session_id (FK) │      │ content         │
│ reference_id    │      │ remind_at       │      └─────────────────┘
│ deadline        │      └─────────────────┘
│ status          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    BOOKMARKS    │      │  BOOKMARK_     │      │   BOOKMARK_     │
│ learner_id (FK) │      │  TAGS           │      │  TAG_LINKS      │
│ target_type     │      │ learner_id (FK) │      │ bookmark_id (FK)│
│ target_id       │      │ name            │      │ tag_id (FK)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   FEEDBACKS    │      │ CONVERSATIONS  │      │  NOTIFICATIONS │
│ manager_id(FK) │      │ learner_id (FK) │      │ created_by (FK) │
│ learner_id(FK) │      │ manager_id (FK) │      │ notification_   │
│ course_id(REF) │      │ course_id (REF) │      │ recipients      │
│ content         │      │ status          │      │ (nhiều-người)  │
│ context_type    │      └────────┬────────┘      └─────────────────┘
└─────────────────┘               │
                                  ▼
                         ┌─────────────────┐
                         │    MESSAGES     │
                         │ conversation_id  │
                         │ sender_id (FK)  │
                         │ content         │
                         │ sent_at         │
                         │ read_at         │
                         └─────────────────┘

┌─────────────────┐
│ ANALYTICS_     │
│ EVENTS         │
│ event_id (UK)  │
│ event_name     │
│ user_id (FK)   │
│ user_role      │
│ source         │
│ course_id      │
│ occurred_at    │
│ metadata (JSON)│
└─────────────────┘

Chú thích:
  (PK) = Primary Key (khóa chính)
  (FK) = Foreign Key (khóa ngoại)
  (REF) = Reference (tham chiếu, không có FK)
  (UK) = Unique (duy nhất)
```

---

## 3. Giải thích chi tiết từng bảng

### 3.1. PROFILES - Hồ sơ người dùng

**Mục đích:** Lưu thông tin hồ sơ, vai trò và trạng thái khóa tài khoản của mỗi người dùng trong hệ thống. Bảng này liên kết trực tiếp với bảng `auth.users` của Supabase thông qua cột `id`.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính, đồng thời là khóa ngoại trỏ đến `auth.users.id` của Supabase |
| `role` | VARCHAR(20) | Yes | Vai trò người dùng: `learner`, `content_manager`, `admin`. Mặc định là `learner` |
| `failed_login_attempts` | INTEGER | Yes | Số lần đăng nhập thất bại liên tiếp. Sau 5 lần sai, tài khoản sẽ bị khóa 15 phút |
| `locked_until` | TIMESTAMP | No | Thời điểm hết khóa đăng nhập. Giá trị `NULL` nghĩa là tài khoản không bị khóa |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo hồ sơ |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
CHECK (role IN ('learner', 'content_manager', 'admin'));
CHECK (failed_login_attempts >= 0);
```

**Ví dụ dữ liệu:**

| id | role | failed_login_attempts | locked_until |
|----|------|----------------------|--------------|
| 550e8400-... | learner | 0 | NULL |
| 660e8400-... | content_manager | 0 | NULL |
| 770e8400-... | admin | 0 | NULL |
| 880e8400-... | learner | 5 | 2026-09-05 10:30:00+07 |

---

### 3.2. COURSE_ENROLLMENTS - Đăng ký khóa học

**Mục đích:** Quản lý quan hệ giữa Learner và Course. Một Learner có thể đăng ký nhiều Course, mỗi quan hệ có trạng thái riêng biệt.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính tự sinh |
| `learner_id` | UUID | Yes | ID của Learner tham gia khóa học (FK → `profiles.id`) |
| `course_id` | UUID | Yes | ID của Course trong Phân hệ Nội dung (chỉ tham chiếu, không tạo khóa ngoại) |
| `status` | VARCHAR(10) | Yes | Trạng thái: `active` (đang học), `left` (đã rời khóa học) |
| `enrolled_at` | TIMESTAMP | Yes | Thời điểm bắt đầu đăng ký |
| `left_at` | TIMESTAMP | No | Thời điểm rời khóa học (NULL nếu chưa rời) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo record |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
UNIQUE (learner_id, course_id);
CHECK (status IN ('active', 'left'));
```

**Quy tắc:** Mỗi cặp (learner_id, course_id) chỉ có 1 record, đảm bảo không tạo duplicate khi Learner đăng ký lại.

---

### 3.3. STUDY_PLANS - Kế hoạch học tập

**Mục đích:** Lưu kế hoạch học tập của Learner cho một Course cụ thể. Mỗi Learner chỉ có tối đa 1 Study Plan đang active trên toàn hệ thống.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Chủ sở hữu kế hoạch (FK → `profiles.id`) |
| `course_id` | UUID | Yes | ID khóa học mà kế hoạch này áp dụng |
| `goal` | TEXT | Yes | Mục tiêu học tập (ví dụ: "Hoàn thành C# cơ bản trong 2 tháng") |
| `start_date` | DATE | Yes | Ngày bắt đầu kế hoạch |
| `deadline` | DATE | Yes | Ngày kết thúc kế hoạch |
| `session_duration_minutes` | INTEGER | Yes | Thời lượng mỗi buổi học (mặc định 60 phút) |
| `status` | VARCHAR(20) | Yes | Trạng thái: `active` (đang áp dụng), `completed` (đã hoàn thành), `archived` (đã lưu trữ) |
| `source_type` | VARCHAR(10) | Yes | Nguồn tạo: `manual` (Learner tự tạo), `ai` (AI đề xuất) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
CHECK (status IN ('active', 'completed', 'archived'));
CHECK (source_type IN ('manual', 'ai'));
CHECK (deadline > start_date);
```

---

### 3.4. STUDY_PLAN_AVAILABLE_DAYS - Ngày học trong tuần

**Mục đích:** Lưu các ngày trong tuần Learner có thể học. Ví dụ: Learner chọn học thứ 2, thứ 4, thứ 6 hàng tuần.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `study_plan_id` | UUID | Yes | Kế hoạch cha (FK → `study_plans.id`) |
| `day_of_week` | INTEGER | Yes | Ngày trong tuần: 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7 |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Ràng buộc (Constraints):**

```sql
UNIQUE (study_plan_id, day_of_week);
CHECK (day_of_week >= 0 AND day_of_week <= 6);
```

---

### 3.5. STUDY_PLAN_SESSIONS - Buổi học

**Mục đích:** Mỗi kế hoạch học tập được chia thành nhiều buổi học (session), mỗi buổi có ngày dự kiến và thời lượng ước tính.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `study_plan_id` | UUID | Yes | Kế hoạch cha (FK → `study_plans.id`) |
| `planned_date` | DATE | Yes | Ngày dự kiến cho buổi học |
| `estimated_duration_minutes` | INTEGER | Yes | Thời lượng ước tính của buổi học (mặc định 60 phút) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

---

### 3.6. STUDY_PLAN_ITEMS - Bài học trong buổi học

**Mục đích:** Liên kết Lesson cụ thể vào buổi học, giữ thứ tự bằng `order_index`.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `session_id` | UUID | Yes | Buổi học cha (FK → `study_plan_sessions.id`) |
| `lesson_id` | UUID | Yes | ID của Lesson trong Phân hệ Nội dung (tham chiếu) |
| `order_index` | INTEGER | Yes | Thứ tự Lesson trong buổi học (0, 1, ...) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

---

### 3.7. LESSON_PROGRESS - Tiến độ bài học

**Mục đích:** Lưu trạng thái hoàn thành của Learner với từng Lesson. **Thiết kế đặc biệt:** Có record = đã hoàn thành, không record = chưa hoàn thành.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Learner đã hoàn thành bài học (FK → `profiles.id`) |
| `course_id` | UUID | Yes | Khóa học chứa bài học này |
| `lesson_id` | UUID | Yes | ID bài học đã hoàn thành |
| `completed_at` | TIMESTAMP | Yes | Thời điểm hoàn thành bài học |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo record |

**Ràng buộc (Constraints):**

```sql
UNIQUE (learner_id, lesson_id);
```

**Quy tắc:** Mỗi Learner chỉ có 1 record hoàn thành cho mỗi Lesson.

---

### 3.8. TASKS - Nhiệm vụ

**Mục đích:** Tổng hợp Lesson trong Study Plan, Quiz và Exercise thành Task - đơn vị công việc Learner cần hoàn thành.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Learner sở hữu Task (FK → `profiles.id`) |
| `course_id` | UUID | Yes | Khóa học chứa Task |
| `task_type` | VARCHAR(20) | Yes | Loại nhiệm vụ: `lesson`, `quiz`, `exercise` |
| `reference_id` | UUID | Yes | ID tham chiếu đến Lesson/Quiz/Exercise gốc trong Phân hệ Nội dung |
| `deadline` | TIMESTAMP | Yes | Thời hạn của Task. Với Lesson: lấy từ planned_date. Với Quiz/Exercise: đang chờ Content Module cung cấp |
| `status` | VARCHAR(20) | Yes | Trạng thái: `active` (đang chờ), `completed` (đã hoàn thành), `cancelled` (đã hủy) |
| `completed_at` | TIMESTAMP | No | Thời điểm hoàn thành (NULL nếu chưa hoàn thành) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
CHECK (task_type IN ('lesson', 'quiz', 'exercise'));
CHECK (status IN ('active', 'completed', 'cancelled'));
```

---

### 3.9. REMINDERS - Nhắc nhở

**Mục đích:** Nhắc nhở Learner về buổi học hoặc Task sắp đến. Có thể gắn với Task cụ thể hoặc Session riêng biệt.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Learner nhận nhắc nhở (FK → `profiles.id`) |
| `task_id` | UUID | No | Nhiệm vụ được nhắc (FK → `tasks.id`, có thể NULL) |
| `session_id` | UUID | No | Buổi học được nhắc (FK → `study_plan_sessions.id`, có thể NULL) |
| `remind_at` | TIMESTAMP | Yes | Thời điểm gửi nhắc nhở (mặc định = 1 ngày trước deadline) |
| `is_enabled` | BOOLEAN | Yes | Bật/tắt nhắc nhở |
| `status` | VARCHAR(20) | Yes | Trạng thái: `pending` (chờ gửi), `sent` (đã gửi), `cancelled` (đã hủy) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Chú ý:** Có thể gắn với Task hoặc Session, không bắt buộc cả hai.

---

### 3.10. NOTES - Ghi chú

**Mục đích:** Ghi chú cá nhân của Learner. Có thể gắn với Lesson cụ thể hoặc ghi chú tự do.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Chủ sở hữu ghi chú (FK → `profiles.id`) |
| `lesson_id` | UUID | No | Bài học gắn với ghi chú (NULL = ghi chú tự do) |
| `title` | VARCHAR(255) | No | Tiêu đề ghi chú (tùy chọn) |
| `content` | TEXT | Yes | Nội dung ghi chú (hỗ trợ Rich Text - lưu dạng HTML/markdown) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

---

### 3.11. BOOKMARKS - Đánh dấu

**Mục đích:** Bookmark cho phép Learner lưu Lesson hoặc Material cần xem lại.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Chủ sở hữu bookmark (FK → `profiles.id`) |
| `target_type` | VARCHAR(20) | Yes | Loại nội dung: `lesson`, `material` |
| `target_id` | UUID | Yes | ID của Lesson hoặc Material được đánh dấu |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Ràng buộc (Constraints):**

```sql
UNIQUE (learner_id, target_type, target_id);
CHECK (target_type IN ('lesson', 'material'));
```

---

### 3.12. BOOKMARK_TAGS - Thẻ đánh dấu

**Mục đích:** Tags do Learner tự tạo để phân loại bookmarks.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Chủ sở hữu tag (FK → `profiles.id`) |
| `name` | VARCHAR(50) | Yes | Tên thẻ (ví dụ: "Quan trọng", "Cần ôn lại") |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Ràng buộc (Constraints):**

```sql
UNIQUE (learner_id, name);
```

---

### 3.13. BOOKMARK_TAG_LINKS - Liên kết thẻ-bookmark

**Mục đích:** Liên kết nhiều-nhiều giữa bookmarks và bookmark_tags.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `bookmark_id` | UUID | Yes | Bookmark được gắn tag (FK → `bookmarks.id`) |
| `tag_id` | UUID | Yes | Tag được gắn vào bookmark (FK → `bookmark_tags.id`) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Khóa chính:** Tổ hợp (bookmark_id, tag_id) đảm bảo mỗi cặp chỉ có 1 liên kết.

---

### 3.14. LEARNING_HISTORY - Lịch sử học tập

**Mục đích:** Lưu lịch sử hoạt động học tập của Learner. Nguồn dữ liệu từ cả Learner và Content Module qua Event Contract.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Learner thực hiện hoạt động (FK → `profiles.id`) |
| `course_id` | UUID | Yes | Khóa học liên quan |
| `activity_type` | VARCHAR(50) | Yes | Loại hoạt động: `lesson_started`, `lesson_completed`, `quiz_started`, `quiz_completed`, ... |
| `activity_id` | UUID | Yes | ID tham chiếu đến Lesson/Quiz gốc |
| `event_type` | VARCHAR(50) | Yes | Tên event từ Event Contract |
| `occurred_at` | TIMESTAMP | Yes | Thời điểm hoạt động xảy ra |
| `estimated_duration_seconds` | INTEGER | No | Thời gian ước tính Learner đã học (giây) |
| `source` | VARCHAR(30) | Yes | Nguồn gốc event: `user_module` hoặc `content_module` |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo record |

---

### 3.15. FEEDBACKS - Phản hồi

**Mục đích:** Content Manager gửi phản hồi/nhận xét cho Learner.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `manager_id` | UUID | Yes | Content Manager gửi phản hồi (FK → `profiles.id`) |
| `learner_id` | UUID | Yes | Learner nhận phản hồi (FK → `profiles.id`) |
| `course_id` | UUID | Yes | Khóa học liên quan |
| `content` | TEXT | Yes | Nội dung phản hồi (Rich Text) |
| `context_type` | VARCHAR(20) | No | Loại ngữ cảnh: `progress`, `result`, `task`, `general`, NULL = general |
| `context_id` | UUID | No | ID của ngữ cảnh |
| `context_snapshot` | JSONB | No | Lưu trạng thái ngữ cảnh tại thời điểm gửi |
| `status` | VARCHAR(10) | Yes | Trạng thái: `draft` (nháp), `sent` (đã gửi) |
| `sent_at` | TIMESTAMP | No | Thời điểm gửi (NULL nếu còn draft) |
| `read_at` | TIMESTAMP | No | Thời điểm Learner đọc (NULL nếu chưa đọc) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
CHECK (context_type IN ('progress', 'result', 'task', 'general'));
CHECK (status IN ('draft', 'sent'));
```

---

### 3.16. CONVERSATIONS - Cuộc hội thoại

**Mục đích:** Tin nhắn 1-1 giữa Learner và Content Manager trong phạm vi một Course.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `learner_id` | UUID | Yes | Learner tham gia (FK → `profiles.id`) |
| `manager_id` | UUID | Yes | Content Manager tham gia (FK → `profiles.id`) |
| `course_id` | UUID | Yes | Khóa học liên quan |
| `status` | VARCHAR(20) | Yes | Trạng thái: `active` (đang hoạt động), `read_only` (chỉ đọc) |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Ràng buộc (Constraints):**

```sql
UNIQUE (learner_id, manager_id, course_id);
CHECK (status IN ('active', 'read_only'));
```

---

### 3.17. MESSAGES - Tin nhắn

**Mục đích:** Tin nhắn trong cuộc hội thoại. Tin nhắn sau khi gửi không được sửa hoặc xóa.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `conversation_id` | UUID | Yes | Cuộc hội thoại chứa tin nhắn (FK → `conversations.id`) |
| `sender_id` | UUID | Yes | Người gửi tin nhắn (FK → `profiles.id`) |
| `content` | TEXT | Yes | Nội dung tin nhắn |
| `sent_at` | TIMESTAMP | Yes | Thời điểm gửi |
| `read_at` | TIMESTAMP | No | Thời điểm người nhận đọc (NULL nếu chưa đọc) |

---

### 3.18. NOTIFICATIONS - Thông báo

**Mục đích:** Hệ thống thông báo chung phục vụ nhiều mục đích.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `created_by` | UUID | No | User tạo thông báo (NULL nếu là system) (FK → `profiles.id`) |
| `notification_type` | VARCHAR(20) | Yes | Loại: `reminder`, `learning`, `message`, `system` |
| `title` | VARCHAR(255) | Yes | Tiêu đề thông báo |
| `content` | TEXT | Yes | Nội dung thông báo |
| `scope_type` | VARCHAR(20) | Yes | Phạm vi gửi: `all`, `role`, `course`, `individual` |
| `scope_value` | TEXT | No | Giá trị phạm vi |
| `send_email` | BOOLEAN | Yes | Có gửi email không |
| `status` | VARCHAR(20) | Yes | Trạng thái: `scheduled`, `sent`, `cancelled` |
| `scheduled_at` | TIMESTAMP | No | Thời điểm dự kiến gửi (NULL = gửi ngay) |
| `sent_at` | TIMESTAMP | No | Thời điểm thực tế gửi |
| `reference_type` | VARCHAR(20) | No | Loại tham chiếu |
| `reference_id` | UUID | No | ID tham chiếu |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |
| `updated_at` | TIMESTAMP | Yes | Thời điểm cập nhật gần nhất |

**Ràng buộc (Constraints):**

```sql
CHECK (notification_type IN ('reminder', 'learning', 'message', 'system'));
CHECK (scope_type IN ('all', 'role', 'course', 'individual'));
CHECK (status IN ('scheduled', 'sent', 'cancelled'));
```

---

### 3.19. NOTIFICATION_RECIPIENTS - Người nhận thông báo

**Mục đích:** Lưu thông tin người nhận và trạng thái đọc cho mỗi thông báo.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `notification_id` | UUID | Yes | Thông báo (FK → `notifications.id`) |
| `user_id` | UUID | Yes | Người nhận thông báo (FK → `profiles.id`) |
| `read_at` | TIMESTAMP | No | Thời điểm đọc (NULL nếu chưa đọc) |
| `email_status` | VARCHAR(20) | Yes | Trạng thái gửi email: `pending`, `sent`, `failed` |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo |

**Ràng buộc (Constraints):**

```sql
UNIQUE (notification_id, user_id);
CHECK (email_status IN ('pending', 'sent', 'failed'));
```

---

### 3.20. ANALYTICS_EVENTS - Sự kiện phân tích

**Mục đích:** Lưu telemetry events cho Analytics. Nguồn từ cả User Module và Content Module qua Event Contract. event_id là duy nhất để chống duplicate events.

| Cột | Kiểu | Bắt buộc | Mô tả |
|-----|------|----------|--------|
| `id` | UUID | Yes | Khóa chính |
| `event_id` | UUID | Yes | ID duy nhất của event (từ Event Contract), dùng để idempotency |
| `event_name` | VARCHAR(50) | Yes | Tên event: `lesson_completed`, `quiz_started`, `ai_learning_plan_applied`, ... |
| `event_version` | INTEGER | Yes | Phiên bản event schema (mặc định 1) |
| `user_id` | UUID | No | User thực hiện hành động (FK → `profiles.id`) |
| `user_role` | VARCHAR(20) | No | Vai trò của user |
| `source` | VARCHAR(30) | Yes | Nguồn phát sinh: `user_module` hoặc `content_module` |
| `course_id` | UUID | No | Khóa học liên quan |
| `occurred_at` | TIMESTAMP | Yes | Thời điểm event xảy ra |
| `received_at` | TIMESTAMP | Yes | Thời điểm event được ghi nhận |
| `metadata` | JSONB | No | Dữ liệu bổ sung của event |
| `created_at` | TIMESTAMP | Yes | Thời điểm tạo record |

**Ràng buộc (Constraints):**

```sql
UNIQUE (event_id);
```

---

## 4. Mối quan hệ giữa các bảng

### 4.1. Sơ đồ quan hệ chi tiết

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                PROFILES                                          │
│  id (PK)                                                                           │
└────┬─────────────────────────────┬─────────────────────────────┬────────────────┘
     │                             │                             │
     │ 1                           │ 1                           │ N
     │                             │                             │
     ▼                             ▼                             ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────────────┐
│ COURSE_         │  │ STUDY_PLANS      │  │ LEARNING_HISTORY              │
│ ENROLLMENTS     │  │                  │  │                              │
│ learner_id (FK) │  │ learner_id (FK)  │  │ learner_id (FK)              │
│                 │  │                  │  │                              │
└────────┬────────┘  └────────┬────────┘  └──────────────────────────────┘
         │                     │
         │                     │ 1
         │                     │
         │                     ▼
         │              ┌──────────────────┐
         │              │ STUDY_PLAN_     │
         │              │ AVAILABLE_DAYS  │
         │              │ study_plan_id(FK)│
         │              └────────┬─────────┘
         │                      │
         │                      │ 1
         │                      │
         │                      ▼
         │              ┌──────────────────┐
         │              │ STUDY_PLAN_     │
         │              │ SESSIONS        │
         │              │ study_plan_id(FK)│
         │              └────────┬─────────┘
         │                      │
         │                      │ 1
         │                      │
         │                      ▼
         │              ┌──────────────────┐
         │              │ STUDY_PLAN_     │
         │              │ ITEMS           │
         │              │ session_id (FK)  │
         │              └──────────────────┘
         │
         │ N
         ▼
┌─────────────────┐
│ LESSON_         │
│ PROGRESS        │
│ learner_id (FK) │
│ lesson_id (REF) │
└─────────────────┘


┌────────────────────────────────────────────────────────────────────────────────────┐
│                                     FEEDBACKS                                      │
│ manager_id (FK) ──────────────────────────────────────────────────────────────►   │
│ learner_id (FK) ◄────────────────────────────────────────────────────────────────   │
└────────────────────────────────────────────────────────────────────────────────────┘
          │
          │ 1
          ▼
┌─────────────────┐      ┌─────────────────┐
│ CONVERSATIONS  │      │ CONVERSATIONS  │
│ learner_id (FK)│      │ manager_id (FK)│
│ manager_id (FK)│◄─────│                 │
│ course_id       │      │                 │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │ 1                      │ N
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│    MESSAGES     │      │    MESSAGES     │
│ conversation_id │◄─────│ sender_id (FK)  │
│ (FK)            │      │                 │
└─────────────────┘      └─────────────────┘


┌────────────────────────────────────────────────────────────────────────────────────┐
│                                   NOTIFICATIONS                                   │
│ id (PK)                                                                           │
└────────────────────────────┬────────────────────────────────────────────────────┘
                             │ 1
                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                            NOTIFICATION_RECIPIENTS                                │
│ notification_id (FK) ◄──────────────────────────────────────────────────────────► │
│ user_id (FK)                                                                      │
│ read_at                                                                           │
│ email_status                                                                      │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2. Giải thích các loại quan hệ

| Ký hiệu | Ý nghĩa | Ví dụ |
|---------|---------|--------|
| 1 - N | Một - Nhiều | 1 Profile có N Task |
| N - 1 | Nhiều - Một | N Task thuộc về 1 Profile |
| 1 - 1 | Một - Một | 1 Conversation có 1 cặp Learner-Manager-Course |
| N - N | Nhiều - Nhiều | N Bookmark có N Tag (qua bảng trung gian) |

---

## 5. Nguyên tắc thiết kế

### 5.1. Nguyên tắc chung

1. **Mỗi dữ liệu có một nguồn chính thức:** Phân hệ Người dùng không lưu dữ liệu thuộc Phân hệ Nội dung (Course, Chapter, Lesson, Quiz, Score) mà chỉ tham chiếu qua ID.

2. **Dùng UUID thay vì Auto Increment:** Tất cả khóa chính dùng kiểu UUID để đảm bảo tính phân tán và bảo mật.

3. **Soft Delete thay vì Hard Delete:** Không xóa dữ liệu mà dùng cột status để đánh dấu (ví dụ: enrollment `left`, task `cancelled`).

4. **Timestamp tiêu chuẩn:** Tất cả bảng có `created_at` và `updated_at` để theo dõi thời gian.

5. **RLS (Row Level Security):** Bật RLS cho tất cả bảng để đảm bảo dữ liệu cô lập giữa các users.

---

## 6. Row Level Security (RLS)

### 6.1. Nguyên tắc chung

- Tất cả bảng có dữ liệu người dùng phải bật RLS
- Mỗi bảng có hai policy cơ bản: `SELECT` và `MODIFY`
- Chỉ người dùng sở hữu dữ liệu hoặc có quyền mới được truy cập

### 6.2. RLS Policies chi tiết

#### 6.2.1. PROFILES

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | public_read | Authenticated users can view all profiles |
| UPDATE | own_profile | user_id = auth.uid() |

#### 6.2.2. COURSE_ENROLLMENTS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |
| SELECT | manager_course | course_id IN (SELECT id FROM courses WHERE created_by = auth.uid()) |
| INSERT | learner_enroll | learner_id = auth.uid() AND role = 'learner' |
| UPDATE | learner_own | learner_id = auth.uid() |

#### 6.2.3. STUDY_PLANS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |
| INSERT | learner_create | learner_id = auth.uid() |
| UPDATE | learner_own | learner_id = auth.uid() |
| DELETE | learner_own | learner_id = auth.uid() |

#### 6.2.4. TASKS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |
| INSERT | learner_create | learner_id = auth.uid() |
| UPDATE | learner_own | learner_id = auth.uid() |

#### 6.2.5. NOTES

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |
| INSERT | learner_create | learner_id = auth.uid() |
| UPDATE | learner_own | learner_id = auth.uid() |
| DELETE | learner_own | learner_id = auth.uid() |

#### 6.2.6. BOOKMARKS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |
| INSERT | learner_create | learner_id = auth.uid() |
| DELETE | learner_own | learner_id = auth.uid() |

#### 6.2.7. LEARNING_HISTORY

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_own | learner_id = auth.uid() |

#### 6.2.8. FEEDBACKS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | learner_view | learner_id = auth.uid() |
| SELECT | manager_view | manager_id = auth.uid() |
| INSERT | manager_create | manager_id = auth.uid() |
| UPDATE | manager_own | manager_id = auth.uid() |

#### 6.2.9. CONVERSATIONS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | participant | learner_id = auth.uid() OR manager_id = auth.uid() |
| INSERT | participant | learner_id = auth.uid() OR manager_id = auth.uid() |

#### 6.2.10. MESSAGES

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | conversation_participant | conversation_id IN (SELECT id FROM conversations WHERE learner_id = auth.uid() OR manager_id = auth.uid()) |
| INSERT | conversation_participant | conversation_id IN (SELECT id FROM conversations WHERE learner_id = auth.uid() OR manager_id = auth.uid()) |

#### 6.2.11. NOTIFICATIONS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | recipient_view | id IN (SELECT notification_id FROM notification_recipients WHERE user_id = auth.uid()) |
| SELECT | admin_all | (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' |
| INSERT | admin_create | (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' |

#### 6.2.12. ANALYTICS_EVENTS

| Operation | Policy Name | Condition |
|-----------|------------|-----------|
| SELECT | admin_only | (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' |
| INSERT | service_role | auth.jwt() ->> 'role' = 'service_role' |

### 6.3. Ví dụ RLS Policy

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Example: Notes - Learner chỉ thấy note của mình
CREATE POLICY "Learner view own notes"
ON notes FOR SELECT
USING (learner_id = auth.uid());

CREATE POLICY "Learner create own notes"
ON notes FOR INSERT
WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learner update own notes"
ON notes FOR UPDATE
USING (learner_id = auth.uid())
WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learner delete own notes"
ON notes FOR DELETE
USING (learner_id = auth.uid());
```

---

## 7. Index và Performance

### 7.1. Index cho truy vấn phổ biến

| Index | Bảng | Cột | Mục đích |
|-------|------|-----|-----------|
| `idx_profiles_role` | profiles | role | Tìm nhanh user theo role |
| `idx_enrollments_learner_status` | course_enrollments | learner_id, status | Tìm enrollment của learner |
| `idx_enrollments_course_active` | course_enrollments | course_id, status | Tìm learner active trong course |
| `idx_study_plans_learner_status` | study_plans | learner_id, status | Tìm nhanh active plan của Learner |
| `idx_study_plans_course` | study_plans | course_id | Tìm plan theo course |
| `idx_sessions_plan_date` | study_plan_sessions | study_plan_id, planned_date | Tìm session theo plan và ngày |
| `idx_tasks_learner_status` | tasks | learner_id, status | Tìm task đang active của Learner |
| `idx_tasks_deadline` | tasks | deadline | Tìm task sắp đến hạn |
| `idx_tasks_course` | tasks | course_id | Tìm task theo course |
| `idx_reminders_learner_pending` | reminders | learner_id, status | Tìm reminder chờ gửi |
| `idx_reminders_remind_at` | reminders | remind_at | Tìm reminder sắp gửi |
| `idx_notes_learner_lesson` | notes | learner_id, lesson_id | Tìm note theo learner và lesson |
| `idx_bookmarks_learner` | bookmarks | learner_id | Tìm bookmark theo learner |
| `idx_bookmarks_learner_target` | bookmarks | learner_id, target_type, target_id | Kiểm tra duplicate bookmark |
| `idx_learning_history_learner_occurred` | learning_history | learner_id, occurred_at | Tìm lịch sử theo Learner + thời gian |
| `idx_learning_history_course` | learning_history | course_id | Tìm lịch sử theo course |
| `idx_feedbacks_learner` | feedbacks | learner_id | Tìm feedback theo learner |
| `idx_feedbacks_manager` | feedbacks | manager_id | Tìm feedback theo manager |
| `idx_conversations_learner_manager` | conversations | learner_id, manager_id | Tìm conversation |
| `idx_messages_conversation_sent` | messages | conversation_id, sent_at | Tìm message theo conversation |
| `idx_notification_recipients_user_unread` | notification_recipients | user_id, read_at | Tìm thông báo chưa đọc |
| `idx_analytics_events_user_occurred` | analytics_events | user_id, occurred_at | Tìm events theo user |
| `idx_analytics_events_name` | analytics_events | event_name | Tìm events theo tên |

### 7.2. Unique Constraints

| Constraint | Bảng | Cột | Mục đích |
|-----------|------|-----|-----------|
| `uq_enrollment_learner_course` | course_enrollments | learner_id, course_id | Không duplicate enrollment |
| `uq_lesson_progress` | lesson_progress | learner_id, lesson_id | Mỗi lesson chỉ completed 1 lần |
| `uq_bookmark` | bookmarks | learner_id, target_type, target_id | Không duplicate bookmark |
| `uq_tag_name` | bookmark_tags | learner_id, name | Không duplicate tag name |
| `uq_conversation` | conversations | learner_id, manager_id, course_id | Mỗi cặp chỉ 1 conversation |
| `uq_notification_recipient` | notification_recipients | notification_id, user_id | Không duplicate recipient |
| `uq_event_id` | analytics_events | event_id | Mỗi event chỉ insert 1 lần |

---

## 8. Trigger tự động

### 8.1. Trigger updated_at

Hệ thống sử dụng trigger để tự động cập nhật cột `updated_at` mỗi khi có UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng cho các bảng:
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_plan_sessions_updated_at
    BEFORE UPDATE ON study_plan_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 8.2. Trigger tự động khóa account

```sql
-- Trigger khóa tài khoản khi đăng nhập thất bại
CREATE OR REPLACE FUNCTION check_account_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.failed_login_attempts >= 5 THEN
        NEW.locked_until = now() + INTERVAL '15 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_profiles_lock
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.failed_login_attempts IS DISTINCT FROM NEW.failed_login_attempts)
    EXECUTE FUNCTION check_account_lock();
```

---

## 9. Dữ liệu không thuộc User DB

### 9.1. Nguyên tắc

Phân hệ Người dùng **KHÔNG** tạo bản chính thức của các dữ liệu thuộc Phân hệ Nội dung.

### 9.2. Danh sách dữ liệu không thuộc User DB

| Dữ liệu | Lý do |
|----------|--------|
| Course | Quản lý bởi Phân hệ Nội dung |
| Chapter | Quản lý bởi Phân hệ Nội dung |
| Lesson | Quản lý bởi Phân hệ Nội dung |
| Material | Quản lý bởi Phân hệ Nội dung |
| Question | Quản lý bởi Phân hệ Nội dung |
| Quiz | Quản lý bởi Phân hệ Nội dung |
| Quiz Attempt | Quản lý bởi Phân hệ Nội dung |
| Official Score | Chấm bởi Phân hệ Nội dung |

### 9.3. Xử lý Reference

- Các ID này chỉ được **tham chiếu** (REFERENCE) trong User DB
- Không tạo khóa ngoại (FOREIGN KEY) đến bảng không thuộc User DB
- Khi query cần gọi Content API để lấy thông tin chi tiết

### 9.4. Open Dependency

**[TODO]** Historical Quiz Attempt `max_score` thuộc Content Module. User DB không tự snapshot thay cho Content. Chờ Content Module cung cấp contract chính thức.

---

## Phụ lục: Thuật ngữ

| Thuật ngữ | Giải thích |
|-----------|------------|
| PK | Primary Key - Khóa chính, duy nhất trong bảng |
| FK | Foreign Key - Khóa ngoại, tham chiếu đến bảng khác |
| REF | Reference - Tham chiếu, không tạo FK (vì dữ liệu thuộc phân hệ khác) |
| UUID | Universally Unique Identifier - Mã định danh duy nhất toàn cầu |
| RLS | Row Level Security - Bảo mật cấp dòng trong PostgreSQL |
| JSONB | JSON Binary - Dữ liệu JSON lưu dạng nhị phân |
| CHECK | Ràng buộc kiểm tra giá trị hợp lệ |

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|--------|
| Database Schema SQL | `docs/design/database-schema.sql` | SQL schema đầy đủ |
| Event Contract | `docs/design/event-contract.md` | Contract event giữa hai phân hệ |
| API Contract | `docs/design/api-contract-user-content.md` | Contract với Content Module |
| System Mechanisms | `docs/specifications/system-mechanisms.md` | Cơ chế hệ thống |

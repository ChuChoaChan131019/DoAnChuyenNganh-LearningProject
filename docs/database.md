# Database

## Tổng quan

- **Engine**: PostgreSQL (Supabase)
- **ORM/Client**: Supabase JS client
- **Connection**: Qua biến môi trường `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`

## Schema — Các bảng chính

### Bảng: profiles

Hồ sơ người dùng — lưu vai trò và trạng thái khóa tài khoản. Liên kết trực tiếp với `auth.users` của Supabase qua `id`.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Khóa chính, liên kết với auth.users.id |
| `role` | `VARCHAR(20)` | No | learner, content_manager, admin |
| `failed_login_attempts` | `INTEGER` | No | Số lần đăng nhập thất bại (khóa sau 5 lần) |
| `locked_until` | `TIMESTAMPTZ` | Yes | Thời điểm hết khóa (NULL = không bị khóa) |
| `created_at` | `TIMESTAMPTZ` | No | UTC, set by DB |
| `updated_at` | `TIMESTAMPTZ` | No | UTC, update by trigger |

### Bảng: course_enrollments

Đăng danh khóa học — quan hệ Learner ↔ Course.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Learner tham gia (→ profiles.id) |
| `course_id` | `UUID` | No | ID khóa học (reference, không FK) |
| `status` | `VARCHAR(10)` | No | active, left |
| `enrolled_at` | `TIMESTAMPTZ` | No | Thời điểm đăng danh |
| `left_at` | `TIMESTAMPTZ` | Yes | Thời điểm rời (NULL = chưa rời) |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Unique constraint: `(learner_id, course_id)` — không tạo duplicate khi re-enroll

### Bảng: study_plans

Kế hoạch học tập của Learner cho một Course.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Chủ sở hữu (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học áp dụng |
| `goal` | `TEXT` | Yes | Mục tiêu học tập |
| `start_date` | `DATE` | No | Ngày bắt đầu |
| `deadline` | `DATE` | No | Ngày kết thúc |
| `session_duration_minutes` | `INTEGER` | No | Thời lượng mỗi buổi (default 60) |
| `status` | `VARCHAR(20)` | No | active, completed, archived |
| `source_type` | `VARCHAR(10)` | No | manual, ai |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(learner_id, status)` WHERE status = 'active'

### Bảng: study_plan_available_days

Ngày trong tuần Learner có thể học.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `study_plan_id` | `UUID FK` | No | Kế hoạch cha (→ study_plans.id) |
| `day_of_week` | `INTEGER` | No | 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7 |

Unique: `(study_plan_id, day_of_week)`

### Bảng: study_plan_sessions

Buổi học trong kế hoạch.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `study_plan_id` | `UUID FK` | No | Kế hoạch cha (→ study_plans.id) |
| `planned_date` | `DATE` | No | Ngày dự kiến |
| `estimated_duration_minutes` | `INTEGER` | No | Thời lượng ước tính (default 60) |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(study_plan_id, planned_date)`

### Bảng: study_plan_items

Bài học trong buổi học.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `session_id` | `UUID FK` | No | Buổi học cha (→ study_plan_sessions.id) |
| `lesson_id` | `UUID` | No | ID bài học (reference, không FK) |
| `order_index` | `INTEGER` | No | Thứ tự trong buổi (0, 1, ...) |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(session_id, order_index)`

### Bảng: lesson_progress

Tiến độ hoàn thành bài học.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Learner đã hoàn thành (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học chứa bài học |
| `lesson_id` | `UUID` | No | ID bài học đã hoàn thành |
| `completed_at` | `TIMESTAMPTZ` | No | Thời điểm hoàn thành |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(learner_id, lesson_id)` — có record = đã hoàn thành

Index: `(learner_id, course_id)`

### Bảng: tasks

Nhiệm vụ — tổng hợp Lesson/Quiz/Exercise thành công việc cần hoàn thành.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Chủ sở hữu (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học chứa task |
| `task_type` | `VARCHAR(20)` | No | lesson, quiz, exercise |
| `reference_id` | `UUID` | No | ID tham chiếu đến Lesson/Quiz/Exercise |
| `deadline` | `TIMESTAMPTZ` | Yes | Thời hạn |
| `status` | `VARCHAR(20)` | No | active, completed, cancelled |
| `completed_at` | `TIMESTAMPTZ` | Yes | Thời điểm hoàn thành |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(learner_id, status)` WHERE status = 'active'
Index: `(deadline)` WHERE status = 'active' AND deadline IS NOT NULL

### Bảng: reminders

Nhắc nhở in-app hoặc email cho Learner.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Learner nhận (→ profiles.id) |
| `task_id` | `UUID FK` | Yes | Task được nhắc (→ tasks.id) |
| `session_id` | `UUID FK` | Yes | Session được nhắc (→ study_plan_sessions.id) |
| `remind_at` | `TIMESTAMPTZ` | No | Thời điểm gửi |
| `is_enabled` | `BOOLEAN` | No | Bật/tắt (default true) |
| `status` | `VARCHAR(20)` | No | pending, sent, cancelled |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(remind_at)` WHERE status = 'pending' AND is_enabled = true

### Bảng: notes

Ghi chú cá nhân — tự do hoặc gắn Lesson.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Chủ sở hữu (→ profiles.id) |
| `lesson_id` | `UUID` | Yes | Bài học liên quan (NULL = ghi chú tự do) |
| `title` | `VARCHAR(255)` | Yes | Tiêu đề |
| `content` | `TEXT` | No | Nội dung Rich Text (HTML/Markdown) |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(learner_id)`
Index: `(lesson_id)` WHERE lesson_id IS NOT NULL

### Bảng: bookmarks

Đánh dấu Lesson/Material cần xem lại.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Chủ sở hữu (→ profiles.id) |
| `target_type` | `VARCHAR(20)` | No | lesson, material |
| `target_id` | `UUID` | No | ID của target |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(learner_id, target_type, target_id)`

### Bảng: bookmark_tags

Thẻ đánh dấu do Learner tự tạo.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Chủ sở hữu (→ profiles.id) |
| `name` | `VARCHAR(50)` | No | Tên thẻ |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(learner_id, name)`

### Bảng: bookmark_tag_links

Liên kết nhiều-nhiều Bookmark ↔ Tag.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `bookmark_id` | `UUID FK` | No | Bookmark (→ bookmarks.id) |
| `tag_id` | `UUID FK` | No | Tag (→ bookmark_tags.id) |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Primary key: `(bookmark_id, tag_id)`

### Bảng: learning_history

Lịch sử học tập — ghi nhận hoạt động của Learner.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Learner thực hiện (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học liên quan |
| `activity_type` | `VARCHAR(50)` | No | lesson_started, quiz_completed, ... |
| `activity_id` | `UUID` | Yes | ID tham chiếu |
| `event_type` | `VARCHAR(50)` | No | Tên event từ Event Contract |
| `occurred_at` | `TIMESTAMPTZ` | No | Thời điểm xảy ra |
| `estimated_duration_seconds` | `INTEGER` | Yes | Thời gian ước tính |
| `source` | `VARCHAR(30)` | No | user_module, content_module |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(learner_id, occurred_at DESC)`
Index: `(course_id)`
Index: `(learner_id, activity_type)`

### Bảng: feedbacks

Phản hồi — Content Manager gửi nhận xét cho Learner.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `manager_id` | `UUID FK` | No | Người gửi (→ profiles.id) |
| `learner_id` | `UUID FK` | No | Người nhận (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học liên quan |
| `content` | `TEXT` | No | Nội dung Rich Text |
| `context_type` | `VARCHAR(20)` | Yes | progress, result, task, general |
| `context_id` | `UUID` | Yes | ID của context |
| `context_snapshot` | `JSONB` | Yes | Trạng thái context tại thời điểm gửi |
| `status` | `VARCHAR(10)` | No | draft, sent |
| `sent_at` | `TIMESTAMPTZ` | Yes | Thời điểm gửi |
| `read_at` | `TIMESTAMPTZ` | Yes | Thời điểm đọc |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(learner_id)`
Index: `(manager_id)`
Index: `(course_id)`

### Bảng: conversations

Cuộc hội thoại 1-1 Learner ↔ Content Manager.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `learner_id` | `UUID FK` | No | Learner (→ profiles.id) |
| `manager_id` | `UUID FK` | No | Content Manager (→ profiles.id) |
| `course_id` | `UUID` | No | Khóa học liên quan |
| `status` | `VARCHAR(20)` | No | active, read_only |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(learner_id, manager_id, course_id)`

Index: `(learner_id)`
Index: `(manager_id)`

### Bảng: messages

Tin nhắn trong cuộc hội thoại — immutable sau khi gửi.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `conversation_id` | `UUID FK` | No | Cuộc hội thoại (→ conversations.id) |
| `sender_id` | `UUID FK` | No | Người gửi (→ profiles.id) |
| `content` | `TEXT` | No | Nội dung |
| `sent_at` | `TIMESTAMPTZ` | No | Thời điểm gửi |
| `read_at` | `TIMESTAMPTZ` | Yes | Thời điểm đọc |

Index: `(conversation_id, sent_at DESC)`
Index: `(conversation_id, sent_at)` WHERE read_at IS NULL

### Bảng: notifications

Thông báo — phục vụ Reminder, Learning, Message, System notification.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `created_by` | `UUID FK` | Yes | Người tạo (→ profiles.id, NULL = system) |
| `notification_type` | `VARCHAR(20)` | No | reminder, learning, message, system |
| `title` | `VARCHAR(255)` | No | Tiêu đề |
| `content` | `TEXT` | No | Nội dung |
| `scope_type` | `VARCHAR(20)` | Yes | all, role, course, individual |
| `scope_value` | `TEXT` | Yes | Giá trị scope |
| `send_email` | `BOOLEAN` | No | Có gửi email không (default false) |
| `status` | `VARCHAR(20)` | No | scheduled, sent, cancelled |
| `scheduled_at` | `TIMESTAMPTZ` | Yes | Thời điểm dự kiến gửi |
| `sent_at` | `TIMESTAMPTZ` | Yes | Thời điểm thực tế gửi |
| `reference_type` | `VARCHAR(20)` | Yes | Loại tham chiếu |
| `reference_id` | `UUID` | Yes | ID tham chiếu |
| `created_at` | `TIMESTAMPTZ` | No | UTC |
| `updated_at` | `TIMESTAMPTZ` | No | UTC |

Index: `(status, scheduled_at)` WHERE status = 'scheduled'
Index: `(notification_type)`

### Bảng: notification_recipients

Người nhận thông báo + trạng thái đọc.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `notification_id` | `UUID FK` | No | Thông báo (→ notifications.id) |
| `user_id` | `UUID FK` | No | Người nhận (→ profiles.id) |
| `read_at` | `TIMESTAMPTZ` | Yes | Thời điểm đọc |
| `email_status` | `VARCHAR(20)` | Yes | pending, sent, failed |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(notification_id, user_id)`
Index: `(user_id, read_at)` WHERE read_at IS NULL

### Bảng: analytics_events

Telemetry events cho Analytics.

| Column | Type | Nullable | Mô tả |
|--------|------|----------|--------|
| `id` | `UUID PK` | No | Auto-gen_random_uuid() |
| `event_id` | `UUID` | No | UUID duy nhất từ Event Contract (chống duplicate) |
| `event_name` | `VARCHAR(50)` | No | Tên event |
| `event_version` | `INTEGER` | No | Phiên bản event schema (default 1) |
| `user_id` | `UUID FK` | Yes | User thực hiện (→ profiles.id) |
| `user_role` | `VARCHAR(20)` | Yes | learner, content_manager, admin |
| `source` | `VARCHAR(30)` | No | user_module, content_module |
| `course_id` | `UUID` | Yes | Khóa học liên quan |
| `occurred_at` | `TIMESTAMPTZ` | No | Thời điểm xảy ra |
| `received_at` | `TIMESTAMPTZ` | No | Thời điểm được ghi nhận |
| `metadata` | `JSONB` | No | Dữ liệu bổ sung (default '{}') |
| `created_at` | `TIMESTAMPTZ` | No | UTC |

Unique: `(event_id)`
Index: `(occurred_at DESC)`
Index: `(user_id, occurred_at DESC)`
Index: `(event_name, occurred_at DESC)`
Index: `(source, occurred_at DESC)`

## Quy tắc làm việc với DB

**Bắt buộc:**
- Tất cả datetime lưu dưới dạng **UTC** (`TIMESTAMPTZ`)
- Không xóa record — dùng soft delete (update status hoặc `deleted_at`)
- Tất cả bảng có `created_at`, `updated_at`
- Dùng `gen_random_uuid()` cho primary key

**Không được:**
- Không dùng `SELECT *` trong production code
- Không query trong vòng lặp (N+1 problem)
- Không sửa trực tiếp DB production mà không có migration

## Trigger

Tự động cập nhật `updated_at` khi có INSERT hoặc UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## RLS Policies

Supabase RLS đã được cấu hình cho các bảng:
- profiles, course_enrollments, study_plans, lesson_progress, tasks, reminders, notes, bookmarks, bookmark_tags, learning_history, feedbacks, conversations, messages, notification_recipients, analytics_events

Chỉ authenticated users có quyền truy cập dữ liệu của chính mình theo RLS policies.

## Migration workflow

```bash
# [TBD] Chưa xác định migration tool
# Đề xuất: Supabase CLI hoặc Prisma

# Ví dụ với Supabase CLI
supabase db push
supabase db diff
```

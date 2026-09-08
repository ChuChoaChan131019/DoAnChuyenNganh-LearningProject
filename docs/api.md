# API Documentation

## Base URL

```
/api/v1
```

## Authentication

Supabase Authentication — dùng Bearer token trong header:

```
Authorization: Bearer <supabase_token>
```

## Response Format

### Success

```json
{
  "data": { ... }
}
```

### Error

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "request_id": "uuid"
}
```

### Pagination

Query params:
- `page` — default 1
- `page_size` — default 20, max 100

Response envelope:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

## API Endpoints

### Auth Module

#### POST /api/v1/auth/register
Đăng ký tài khoản mới.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "learner" // hoặc "content_manager"
}
```

**Response (201):**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "learner" },
    "session": { "access_token": "...", "expires_at": "..." }
  }
}
```

#### POST /api/v1/auth/login
Đăng nhập.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "learner" },
    "session": { "access_token": "...", "expires_at": "..." }
  }
}
```

**Error (401):**
```json
{
  "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
}
```

**Error (423):**
```json
{
  "error": { "code": "ACCOUNT_LOCKED", "message": "Account locked until {time}" }
}
```

#### POST /api/v1/auth/logout
Đăng xuất.

#### GET /api/v1/auth/me
Lấy thông tin user hiện tại.

---

### Profile Module

#### GET /api/v1/profile
Lấy profile của user hiện tại.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "learner",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

#### PATCH /api/v1/profile
Cập nhật profile.

---

### Enrollment Module

#### POST /api/v1/enrollments
Learner tham gia khóa học.

**Request:**
```json
{
  "course_id": "uuid"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "learner_id": "uuid",
    "course_id": "uuid",
    "status": "active",
    "enrolled_at": "2026-01-01T00:00:00Z"
  }
}
```

#### GET /api/v1/enrollments
Lấy danh sách enrollment của user hiện tại.

**Query params:**
- `status` — active, left (optional)
- `page`, `page_size`

#### GET /api/v1/enrollments/:id
Lấy chi tiết một enrollment.

#### PATCH /api/v1/enrollments/:id/leave
Learner rời khóa học.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "left",
    "left_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### Study Plan Module

#### POST /api/v1/study-plans
Tạo kế hoạch học tập mới.

**Request:**
```json
{
  "course_id": "uuid",
  "goal": "Hoàn thành C# cơ bản trong 2 tháng",
  "start_date": "2026-01-15",
  "deadline": "2026-03-15",
  "session_duration_minutes": 60,
  "available_days": [1, 3, 5]
}
```

#### GET /api/v1/study-plans
Lấy danh sách kế hoạch học tập.

**Query params:**
- `status` — active, completed, archived (optional)
- `course_id` — filter by course (optional)

#### GET /api/v1/study-plans/:id
Lấy chi tiết kế hoạch (bao gồm sessions và items).

#### PATCH /api/v1/study-plans/:id
Cập nhật kế hoạch học tập.

#### DELETE /api/v1/study-plans/:id
Xóa kế hoạch học tập (soft delete — chuyển sang archived).

#### POST /api/v1/study-plans/:id/sessions
Tạo session mới trong kế hoạch.

**Request:**
```json
{
  "planned_date": "2026-01-20",
  "estimated_duration_minutes": 60
}
```

#### POST /api/v1/study-plans/sessions/:sessionId/items
Thêm bài học vào session.

**Request:**
```json
{
  "lesson_id": "uuid",
  "order_index": 0
}
```

---

### Task Module

#### GET /api/v1/tasks
Lấy danh sách nhiệm vụ.

**Query params:**
- `status` — active, completed, cancelled (optional)
- `course_id` — filter by course (optional)
- `upcoming` — true/false (tasks sắp đến hạn)

#### GET /api/v1/tasks/:id
Lấy chi tiết nhiệm vụ.

#### PATCH /api/v1/tasks/:id/complete
Đánh dấu nhiệm vụ hoàn thành.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### Reminder Module

#### GET /api/v1/reminders
Lấy danh sách nhắc nhở.

#### POST /api/v1/reminders
Tạo nhắc nhở mới.

**Request:**
```json
{
  "task_id": "uuid",
  "remind_at": "2026-01-14T09:00:00Z"
}
```

#### PATCH /api/v1/reminders/:id
Cập nhật nhắc nhở.

#### DELETE /api/v1/reminders/:id
Xóa nhắc nhở (soft delete — chuyển sang cancelled).

---

### Note Module

#### GET /api/v1/notes
Lấy danh sách ghi chú.

**Query params:**
- `lesson_id` — filter by lesson (optional)

#### POST /api/v1/notes
Tạo ghi chú mới.

**Request:**
```json
{
  "lesson_id": "uuid",
  "title": "Ghi chú bài 1",
  "content": "<p>Nội dung ghi chú...</p>"
}
```

#### GET /api/v1/notes/:id
Lấy chi tiết ghi chú.

#### PATCH /api/v1/notes/:id
Cập nhật ghi chú.

#### DELETE /api/v1/notes/:id
Xóa ghi chú.

---

### Bookmark Module

#### GET /api/v1/bookmarks
Lấy danh sách bookmark.

**Query params:**
- `target_type` — lesson, material (optional)
- `tag_id` — filter by tag (optional)

#### POST /api/v1/bookmarks
Tạo bookmark mới.

**Request:**
```json
{
  "target_type": "lesson",
  "target_id": "uuid",
  "tag_ids": ["uuid1", "uuid2"]
}
```

#### DELETE /api/v1/bookmarks/:id
Xóa bookmark.

#### GET /api/v1/bookmark-tags
Lấy danh sách tag.

#### POST /api/v1/bookmark-tags
Tạo tag mới.

**Request:**
```json
{
  "name": "Quan trọng"
}
```

---

### Feedback Module

#### GET /api/v1/feedbacks
Lấy danh sách feedback.

**Query params:**
- `learner_id` — filter by learner (optional, cho Manager)
- `course_id` — filter by course (optional)

#### POST /api/v1/feedbacks
Tạo feedback mới (Manager gửi cho Learner).

**Request:**
```json
{
  "learner_id": "uuid",
  "course_id": "uuid",
  "content": "<p>Nội dung phản hồi...</p>",
  "context_type": "progress",
  "context_id": "uuid",
  "context_snapshot": { "progress_percentage": 45 }
}
```

#### PATCH /api/v1/feedbacks/:id
Cập nhật feedback (chỉ draft).

#### POST /api/v1/feedbacks/:id/send
Gửi feedback (chuyển từ draft sang sent).

#### DELETE /api/v1/feedbacks/:id
Xóa feedback (chỉ draft).

---

### Message Module

#### GET /api/v1/conversations
Lấy danh sách cuộc hội thoại.

#### POST /api/v1/conversations
Tạo cuộc hội thoại mới.

**Request:**
```json
{
  "manager_id": "uuid",
  "course_id": "uuid"
}
```

#### GET /api/v1/conversations/:id
Lấy chi tiết cuộc hội thoại (bao gồm messages).

**Query params:**
- `page`, `page_size`

#### POST /api/v1/conversations/:id/messages
Gửi tin nhắn.

**Request:**
```json
{
  "content": "Nội dung tin nhắn"
}
```

---

### Notification Module

#### GET /api/v1/notifications
Lấy danh sách thông báo của user hiện tại.

**Query params:**
- `unread_only` — true/false

#### PATCH /api/v1/notifications/:id/read
Đánh dấu đã đọc.

#### POST /api/v1/notifications/send
Gửi thông báo (Manager/Admin).

**Request:**
```json
{
  "notification_type": "learning",
  "title": "Thông báo mới",
  "content": "Nội dung thông báo",
  "scope_type": "course",
  "scope_value": "uuid",
  "send_email": false,
  "scheduled_at": "2026-01-15T09:00:00Z"
}
```

---

### Analytics Module

#### GET /api/v1/analytics/dashboard
Lấy dữ liệu dashboard.

**Query params:**
- `period` — 7d, 30d, 90d (default: 30d)

#### GET /api/v1/analytics/learning-history
Lấy lịch sử học tập.

**Query params:**
- `course_id` — filter by course (optional)
- `activity_type` — filter by type (optional)
- `from`, `to` — date range

---

### Internal API (Content Module gọi)

#### POST /api/v1/internal/events
Nhận event từ Content Module.

**Request:**
```json
{
  "event_id": "uuid",
  "event_name": "quiz_completed",
  "event_version": 1,
  "occurred_at": "2026-01-01T00:00:00Z",
  "actor": {
    "user_id": "uuid",
    "role": "learner"
  },
  "source": "content_module",
  "context": {
    "course_id": "uuid"
  },
  "metadata": {
    "quiz_id": "uuid",
    "score": 85
  }
}
```

**Response (201):**
```json
{
  "data": {
    "status": "processed"
  }
}
```

**Response (200) — duplicate event:**
```json
{
  "data": {
    "status": "already_processed"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|--------|
| INVALID_CREDENTIALS | 401 | Email/password không đúng |
| ACCOUNT_LOCKED | 423 | Tài khoản bị khóa tạm thời |
| UNAUTHORIZED | 401 | Chưa đăng nhập |
| FORBIDDEN | 403 | Không có quyền |
| NOT_FOUND | 404 | Resource không tồn tại |
| VALIDATION_ERROR | 400 | Dữ liệu không hợp lệ |
| DUPLICATE_ENROLLMENT | 409 | Đã enroll rồi |
| INVALID_EVENT_PAYLOAD | 422 | Event payload không hợp lệ |
| INTERNAL_ERROR | 500 | Lỗi server |

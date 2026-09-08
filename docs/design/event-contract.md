# Event Contract - User Module ↔ Content Module

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Event Envelope](#2-event-envelope)
3. [Processing Flow](#3-processing-flow)
4. [Idempotency](#4-idempotency)
5. [Event Naming Convention](#5-event-naming-convention)
6. [Validation](#6-validation)
7. [Storage Mapping](#7-storage-mapping)
8. [Privacy và Security](#8-privacy-và-security)
9. [Error Handling](#9-error-handling)
10. [Learning Events](#10-learning-events)
11. [User Events](#11-user-events)
12. [Content Analytics Events](#12-content-analytics-events)
13. [AI Events](#13-ai-events)
14. [Quick Reference](#14-quick-reference)

---

## 1. Tổng quan

### 1.1. Mục đích

Tài liệu này mô tả contract về event giữa **User Module** và **Content Module** trong hệ thống Hỗ trợ Tự học.

### 1.2. Transport Layer

| Component | Chi tiết |
|-----------|----------|
| Protocol | HTTP |
| Method | POST |
| Endpoint | `/api/v1/internal/events` |
| Content-Type | `application/json` |

**Lưu ý:** Không sử dụng Message Queue trong phạm vi hiện tại.

### 1.3. Event Sources

| Source | Mô tả |
|--------|--------|
| `user_module` | Events phát sinh từ User Module |
| `content_module` | Events phát sinh từ Content Module |

---

## 2. Event Envelope

### 2.1. Envelope Schema

Mỗi event phải tuân theo envelope schema sau:

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_name": "quiz_completed",
  "event_version": "1.0",
  "occurred_at": "2026-09-06T10:30:00Z",
  "actor": {
    "user_id": "learner_001",
    "role": "learner"
  },
  "source": "content_module",
  "context": {
    "course_id": "550e8400-...",
    "chapter_id": "ch_001",
    "quiz_id": "qz_001"
  },
  "metadata": {
    "score": 85,
    "max_score": 100
  }
}
```

### 2.2. Field Definitions

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `event_id` | UUID | Yes | ID duy nhất của event. Dùng để idempotency |
| `event_name` | string | Yes | Tên event theo convention `object_action` |
| `event_version` | string | Yes | Phiên bản event schema (format: `1.0`, `2.0`) |
| `occurred_at` | ISO8601 | Yes | Thời điểm event xảy ra (UTC) |
| `actor` | object | Yes | Người thực hiện action |
| `actor.user_id` | UUID | Yes | ID của user |
| `actor.role` | string | Yes | Vai trò: `learner`, `content_manager`, `admin` |
| `source` | string | Yes | Nguồn: `user_module`, `content_module` |
| `context` | object | No | Ngữ cảnh bổ sung |
| `metadata` | object | No | Dữ liệu bổ sung (event-specific) |

### 2.3. Envelope Validation Schema (Zod)

```typescript
import { z } from 'zod';

const EventEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_name: z.string().min(1).max(100),
  event_version: z.string().regex(/^\d+\.\d+$/),
  occurred_at: z.string().datetime(),
  actor: z.object({
    user_id: z.string().uuid(),
    role: z.enum(['learner', 'content_manager', 'admin'])
  }),
  source: z.enum(['user_module', 'content_module']),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional()
});

type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
```

---

## 3. Processing Flow

### 3.1. Event Processing Sequence

```
┌─────────────────┐
│  Content Module  │
│  tạo event      │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      USER MODULE                                   │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Receive   │───►│  Validate  │───►│ Check ID   │        │
│  │   Request   │    │  Envelope  │    │empotency   │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘        │
│                                               │                │
│                              ┌────────────────┼────────────────┤
│                              │                │                │
│                              ▼                ▼                │
│                       ┌───────────┐    ┌───────────┐         │
│                       │  New ID   │    │  Duplicate │         │
│                       │           │    │  → Return  │         │
│                       └─────┬─────┘    │  Already   │         │
│                             │          │  Processed │         │
│                             ▼          └───────────┘         │
│                      ┌─────────────┐                          │
│                      │   Store to  │                          │
│                      │   Tables    │                          │
│                      └──────┬──────┘                          │
│                             │                                 │
│                             ▼                                 │
│                      ┌─────────────┐                          │
│                      │   Trigger   │                          │
│                      │   Actions   │                          │
│                      └──────┬──────┘                          │
│                             │                                 │
│                             ▼                                 │
│                      ┌─────────────┐                          │
│                      │   Response  │                          │
│                      │   Success   │                          │
│                      └─────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2. Step Details

| Step | Mô tả | Time Limit |
|------|--------|------------|
| 1. Receive Request | Nhận HTTP POST request | - |
| 2. Validate Envelope | Kiểm tra schema envelope | 100ms |
| 3. Check Idempotency | Kiểm tra event_id đã tồn tại | 100ms |
| 4. Store to Tables | Lưu vào analytics_events và/hoặc learning_history | 500ms |
| 5. Trigger Actions | Kích hoạt các side effects | - |
| 6. Response | Trả về kết quả | - |

### 3.3. Side Effects

| Event | Side Effects |
|-------|-------------|
| `lesson_completed` | Cập nhật lesson_progress, kiểm tra Study Plan completion |
| `quiz_completed` | Cập nhật Result cache, kiểm tra adaptive learning |
| `enrollment_started` | Tạo initial tasks |
| `enrollment_left` | Cancel reminders, archive study plan |

---

## 4. Idempotency

### 4.1. Nguyên tắc

- `event_id` là duy nhất toàn cục
- Dùng để ngăn chặn duplicate event processing

### 4.2. Flow

```
1. Nhận event với event_id
2. Kiểm tra event_id trong database:
   a. Nếu CHƯA TỒN TẠI → Xử lý bình thường
   b. Nếu ĐÃ TỒN TẠI → Trả về "already_processed"
3. Lưu event_id sau khi xử lý thành công
```

### 4.3. Response for Duplicate

```json
{
  "data": {
    "event_id": "550e8400-...",
    "status": "already_processed"
  }
}
```

### 4.4. Retry from Producer

Producer có thể retry với cùng `event_id` nếu:
- Request timeout
- Response không nhận được
- Lỗi 5xx

**Duplicate không tạo record mới.**

---

## 5. Event Naming Convention

### 5.1. Format

```
{object}_{action}
```

### 5.2. Objects

| Object | Mô tả |
|--------|--------|
| `lesson` | Bài học |
| `quiz` | Bài kiểm tra |
| `exercise` | Bài luyện tập |
| `course` | Khóa học |
| `bookmark` | Đánh dấu |
| `note` | Ghi chú |
| `feedback` | Phản hồi |
| `message` | Tin nhắn |
| `notification` | Thông báo |
| `study_plan` | Kế hoạch học tập |
| `enrollment` | Đăng ký khóa học |
| `ai` | AI-related actions |

### 5.3. Actions

| Action | Mô tả |
|--------|--------|
| `started` | Bắt đầu |
| `completed` | Hoàn thành |
| `created` | Tạo mới |
| `updated` | Cập nhật |
| `deleted` | Xóa |
| `sent` | Gửi |
| `added` | Thêm |
| `removed` | Xóa |
| `requested` | Yêu cầu |
| `succeeded` | Thành công |
| `failed` | Thất bại |
| `applied` | Áp dụng |
| `accepted` | Chấp nhận |
| `rejected` | Từ chối |
| `enrolled` | Đăng ký |
| `left` | Rời khỏi |
| `reenrolled` | Đăng ký lại |

### 5.4. Examples

| Event Name | Object | Action |
|------------|--------|--------|
| `lesson_started` | lesson | started |
| `quiz_completed` | quiz | completed |
| `bookmark_added` | bookmark | added |
| `ai_learning_plan_applied` | ai_learning_plan | applied |

---

## 6. Validation

### 6.1. Validation Levels

| Level | Mô tả | Khi nào |
|--------|--------|----------|
| Envelope Validation | Kiểm tra schema envelope | Mọi event |
| Event-Specific Validation | Kiểm tra metadata theo event type | Mỗi event type |

### 6.2. Envelope Validation Rules

| Field | Rules |
|-------|-------|
| `event_id` | UUID format, not null, not empty |
| `event_name` | Non-empty string, max 100 chars |
| `event_version` | Format: `X.Y` (e.g., "1.0") |
| `occurred_at` | Valid ISO8601 datetime |
| `actor.user_id` | UUID format |
| `actor.role` | One of: learner, content_manager, admin |
| `source` | One of: user_module, content_module |

### 6.3. Event-Specific Metadata Validation

#### 6.3.1. lesson_started

```typescript
const LessonStartedSchema = z.object({
  lesson_id: z.string().uuid(),
  chapter_id: z.string(),
  course_id: z.string().uuid()
});
```

#### 6.3.2. lesson_completed

```typescript
const LessonCompletedSchema = z.object({
  lesson_id: z.string().uuid(),
  chapter_id: z.string(),
  course_id: z.string().uuid()
});
```

#### 6.3.3. quiz_started

```typescript
const QuizStartedSchema = z.object({
  quiz_id: z.string().uuid(),
  attempt_id: z.string().uuid().optional(),
  quiz_type: z.enum(['exam', 'exercise']),
  chapter_id: z.string(),
  course_id: z.string().uuid()
});
```

#### 6.3.4. quiz_completed

```typescript
const QuizCompletedSchema = z.object({
  quiz_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  quiz_type: z.enum(['exam', 'exercise']),
  chapter_id: z.string(),
  course_id: z.string().uuid(),
  score: z.number().int().min(0),
  max_score: z.number().int().positive(),
  percentage: z.number().min(0).max(100),
  duration_seconds: z.number().int().nonnegative().optional(),
  completed_at: z.string().datetime().optional()
});
```

#### 6.3.5. ai_learning_plan_applied

```typescript
const AiLearningPlanAppliedSchema = z.object({
  plan_id: z.string().uuid(),
  course_id: z.string().uuid(),
  goal: z.string().optional(),
  source: z.enum(['manual', 'ai'])
});
```

### 6.4. Invalid Event Response

```json
{
  "error": {
    "code": "INVALID_EVENT_PAYLOAD",
    "message": "Event metadata validation failed",
    "details": {
      "field": "metadata.score",
      "reason": "must be a non-negative integer"
    }
  },
  "request_id": "req_abc123xyz"
}
```

---

## 7. Storage Mapping

### 7.1. Storage Tables

| Table | Mục đích |
|-------|-----------|
| `analytics_events` | Dữ liệu telemetry/analytics |
| `learning_history` | Lịch sử học tập của Learner |

### 7.2. Event → Storage Mapping

| Event | analytics_events | learning_history |
|-------|-----------------|------------------|
| `lesson_started` | ✓ | ✓ |
| `lesson_completed` | ✓ | ✓ |
| `quiz_started` | ✓ | ✓ |
| `quiz_completed` | ✓ | ✓ |
| `enrollment_started` | ✓ | ✗ |
| `enrollment_left` | ✓ | ✗ |
| `study_plan_created` | ✓ | ✗ |
| `study_plan_updated` | ✓ | ✗ |
| `bookmark_added` | ✓ | ✗ |
| `bookmark_removed` | ✓ | ✗ |
| `note_created` | ✓ | ✗ |
| `feedback_sent` | ✓ | ✗ |
| `message_sent` | ✓ | ✗ |
| `notification_sent` | ✓ | ✗ |
| `notification_read` | ✓ | ✗ |
| `ai_learning_plan_requested` | ✓ | ✗ |
| `ai_learning_plan_applied` | ✓ | ✗ |
| `recommendation_requested` | ✓ | ✗ |
| `recommendation_feedback_submitted` | ✓ | ✗ |
| `adaptive_difficulty_recommended` | ✓ | ✗ |
| `adaptive_difficulty_accepted` | ✓ | ✗ |
| `content_search_used` | ✓ | ✗ |
| `ai_tutor_requested` | ✓ | ✗ |
| `ai_tutor_succeeded` | ✓ | ✗ |
| `ai_tutor_failed` | ✓ | ✗ |

### 7.3. Storage Schema

#### 7.3.1. analytics_events

```typescript
interface AnalyticsEventRecord {
  id: string;           // UUID, auto-generated
  event_id: string;      // From event envelope
  event_name: string;
  event_version: string;
  user_id: string;       // From actor
  user_role: string;     // From actor
  source: string;        // user_module | content_module
  course_id: string | null;
  occurred_at: string;   // From event
  received_at: string;   // Server timestamp
  metadata: object;      // Full event metadata
  created_at: string;    // DB timestamp
}
```

#### 7.3.2. learning_history

```typescript
interface LearningHistoryRecord {
  id: string;           // UUID, auto-generated
  learner_id: string;    // From actor
  course_id: string;
  activity_type: string; // event_name
  activity_id: string;    // From context (e.g., lesson_id, quiz_id)
  event_type: string;   // event_name
  occurred_at: string;   // From event
  estimated_duration_seconds: number | null;
  source: string;        // user_module | content_module
  created_at: string;    // DB timestamp
}
```

---

## 8. Privacy và Security

### 8.1. Prohibited Data

Event payload **KHÔNG ĐƯỢC** chứa các dữ liệu sau:

| Data Type | Lý do |
|----------|--------|
| Password | Bảo mật tài khoản |
| Access Token | Bảo mật phiên làm việc |
| Refresh Token | Bảo mật phiên làm việc |
| Full Message Content | Dữ liệu riêng tư |
| Full Feedback Content | Dữ liệu riêng tư |
| Full Note Content | Dữ liệu riêng tư |
| AI Tutor Conversation | Dữ liệu riêng tư |
| Personal Identifiable Information (PII) | Bảo vệ privacy |

### 8.2. Allowed Data in Event

| Data Type | Ví dụ |
|-----------|--------|
| User ID | `learner_001` |
| Resource IDs | `lesson_id`, `quiz_id`, `course_id` |
| Scores | `score: 85`, `max_score: 100` |
| Timestamps | `occurred_at` |
| Action Types | `started`, `completed` |
| Aggregated Metrics | `duration_seconds` |

### 8.3. Data Minimization

- Chỉ gửi dữ liệu cần thiết cho analytics
- Không gửi toàn bộ content/message/feedback
- Nếu cần reference → chỉ gửi ID

---

## 9. Error Handling

### 9.1. Error Codes

| Code | HTTP Status | Mô tả |
|------|-------------|--------|
| `INVALID_EVENT_PAYLOAD` | 422 | Event payload không hợp lệ |
| `MISSING_REQUIRED_FIELD` | 400 | Thiếu trường bắt buộc |
| `INVALID_FIELD_FORMAT` | 400 | Định dạng trường không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa xác thực |
| `FORBIDDEN` | 403 | Không có quyền |
| `INTERNAL_ERROR` | 500 | Lỗi nội bộ server |

### 9.2. Error Scenarios

#### 9.2.1. Invalid Envelope Schema

**Request:**
```json
{
  "event_id": "not-a-uuid",
  "event_name": "",
  "event_version": "invalid"
}
```

**Response (400):**
```json
{
  "error": {
    "code": "INVALID_EVENT_PAYLOAD",
    "message": "Event envelope validation failed",
    "details": [
      {"field": "event_id", "reason": "must be a valid UUID"},
      {"field": "event_name", "reason": "must be a non-empty string"},
      {"field": "event_version", "reason": "must match format X.Y"}
    ]
  },
  "request_id": "req_abc123xyz"
}
```

#### 9.2.2. Missing Required Field

**Request:**
```json
{
  "event_id": "550e8400-...",
  "event_name": "quiz_completed"
  // Missing: event_version, occurred_at, actor, source
}
```

**Response (400):**
```json
{
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "Required field is missing",
    "details": {
      "field": "event_version",
      "reason": "event_version is required"
    }
  },
  "request_id": "req_abc123xyz"
}
```

#### 9.2.3. Invalid Event-Specific Metadata

**Request:**
```json
{
  "event_id": "550e8400-...",
  "event_name": "quiz_completed",
  "event_version": "1.0",
  "occurred_at": "2026-09-06T10:30:00Z",
  "actor": {
    "user_id": "learner_001",
    "role": "learner"
  },
  "source": "content_module",
  "metadata": {
    "quiz_id": "not-a-uuid",
    "score": -10
  }
}
```

**Response (422):**
```json
{
  "error": {
    "code": "INVALID_EVENT_PAYLOAD",
    "message": "Event metadata validation failed",
    "details": [
      {"field": "metadata.quiz_id", "reason": "must be a valid UUID"},
      {"field": "metadata.score", "reason": "must be >= 0"}
    ]
  },
  "request_id": "req_abc123xyz"
}
```

#### 9.2.4. Unauthorized

**Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "request_id": "req_abc123xyz"
}
```

### 9.3. Error Handling Guidelines

| Scenario | Action |
|----------|--------|
| 4xx errors | Không retry, fix request |
| 5xx errors | Retry với exponential backoff |
| Timeout | Retry với cùng event_id |
| Connection error | Retry với cùng event_id |

---

## 10. Learning Events

### 10.1. lesson_started

**Mô tả:** Learner bắt đầu một bài học.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `lesson_id` | UUID | Yes | ID của bài học |
| `chapter_id` | string | Yes | ID của chapter |
| `course_id` | UUID | Yes | ID của khóa học |

**Storage:** analytics_events + learning_history

---

### 10.2. lesson_completed

**Mô tả:** Learner hoàn thành một bài học.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `lesson_id` | UUID | Yes | ID của bài học |
| `chapter_id` | string | Yes | ID của chapter |
| `course_id` | UUID | Yes | ID của khóa học |

**Storage:** analytics_events + learning_history

**Side Effects:**
- Tạo/cập nhật record trong `lesson_progress`
- Kiểm tra Study Plan completion

---

### 10.3. quiz_started

**Mô tả:** Learner bắt đầu làm bài kiểm tra.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `quiz_id` | UUID | Yes | ID của quiz |
| `attempt_id` | UUID | No | ID của lần thử (nếu có) |
| `quiz_type` | enum | Yes | `exam` hoặc `exercise` |
| `chapter_id` | string | Yes | ID của chapter |
| `course_id` | UUID | Yes | ID của khóa học |

**Lưu ý:** Exercise sử dụng event này với `quiz_type: 'exercise'`

**Storage:** analytics_events + learning_history

---

### 10.4. quiz_completed

**Mô tả:** Learner hoàn thành bài kiểm tra.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `quiz_id` | UUID | Yes | ID của quiz |
| `attempt_id` | UUID | Yes | ID của lần thử |
| `quiz_type` | enum | Yes | `exam` hoặc `exercise` |
| `chapter_id` | string | Yes | ID của chapter |
| `course_id` | UUID | Yes | ID của khóa học |
| `score` | number | Yes | Điểm đạt được |
| `max_score` | number | Yes | Điểm tối đa |
| `percentage` | number | Yes | Phần trăm (0-100) |
| `duration_seconds` | number | No | Thời gian làm bài (giây) |
| `completed_at` | ISO8601 | No | Thời điểm hoàn thành |

**Lưu ý:** Exercise sử dụng event này với `quiz_type: 'exercise'`

**Storage:** analytics_events + learning_history

**Side Effects:**
- Cập nhật Result cache
- Kiểm tra adaptive learning thresholds

---

## 11. User Events

### 11.1. enrollment_started

**Mô tả:** Learner bắt đầu đăng ký khóa học.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `course_id` | UUID | Yes | ID của khóa học |

**Storage:** analytics_events only

**Side Effects:**
- Tạo initial tasks cho Learner

---

### 11.2. enrollment_left

**Mô tả:** Learner rời khóa học.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `course_id` | UUID | Yes | ID của khóa học |

**Storage:** analytics_events only

**Side Effects:**
- Cancel reminders cho Course
- Archive Study Plan
- Cancel pending Tasks

---

### 11.3. study_plan_created

**Mô tả:** Learner tạo kế hoạch học tập mới.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `plan_id` | UUID | Yes | ID của kế hoạch |
| `course_id` | UUID | Yes | ID của khóa học |
| `source` | enum | Yes | `manual` hoặc `ai` |

**Storage:** analytics_events only

---

### 11.4. study_plan_updated

**Mô tả:** Learner cập nhật kế hoạch học tập.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `plan_id` | UUID | Yes | ID của kế hoạch |
| `changes` | object | No | Các thay đổi đã thực hiện |

**Storage:** analytics_events only

---

### 11.5. bookmark_added

**Mô tả:** Learner thêm bookmark.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `target_type` | enum | Yes | `lesson` hoặc `material` |
| `target_id` | UUID | Yes | ID của target |

**Storage:** analytics_events only

---

### 11.6. bookmark_removed

**Mô tả:** Learner xóa bookmark.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `target_type` | enum | Yes | `lesson` hoặc `material` |
| `target_id` | UUID | Yes | ID của target |

**Storage:** analytics_events only

---

### 11.7. feedback_sent

**Mô tả:** Content Manager gửi phản hồi.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `feedback_id` | UUID | Yes | ID của feedback |
| `learner_id` | UUID | Yes | ID của learner nhận |

**Storage:** analytics_events only

---

### 11.8. message_sent

**Mô tả:** Gửi tin nhắn.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `message_id` | UUID | Yes | ID của tin nhắn |
| `conversation_id` | UUID | Yes | ID của cuộc trò chuyện |

**Storage:** analytics_events only

---

### 11.9. notification_sent

**Mô tả:** Gửi thông báo.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `notification_id` | UUID | Yes | ID của thông báo |
| `recipient_count` | number | Yes | Số người nhận |

**Storage:** analytics_events only

---

### 11.10. notification_read

**Mô tả:** Người dùng đọc thông báo.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `notification_id` | UUID | Yes | ID của thông báo |

**Storage:** analytics_events only

---

## 12. Content Analytics Events

### 12.1. content_search_used

**Mô tả:** Người dùng sử dụng chức năng tìm kiếm.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `search_query` | string | Yes | Từ khóa tìm kiếm |
| `result_count` | number | Yes | Số kết quả trả về |

**Storage:** analytics_events only

---

### 12.2. ai_tutor_requested

**Mô tả:** Yêu cầu AI Tutor.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `lesson_id` | UUID | No | ID của bài học liên quan |
| `question_preview` | string | No | Preview câu hỏi (không phải toàn bộ) |

**Storage:** analytics_events only

---

### 12.3. ai_tutor_succeeded

**Mô tả:** AI Tutor trả lời thành công.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `response_time_ms` | number | Yes | Thời gian phản hồi (ms) |

**Storage:** analytics_events only

---

### 12.4. ai_tutor_failed

**Mô tả:** AI Tutor gặp lỗi.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `error_type` | string | Yes | Loại lỗi |
| `error_message` | string | No | Thông báo lỗi (đã sanitize) |

**Storage:** analytics_events only

---

## 13. AI Events

### 13.1. ai_learning_plan_requested

**Mô tả:** Yêu cầu AI tạo kế hoạch học tập.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `course_id` | UUID | Yes | ID của khóa học |
| `goal` | string | Yes | Mục tiêu học tập |
| `schedule_availability` | array | Yes | Lịch rảnh |

**Storage:** analytics_events only

---

### 13.2. ai_learning_plan_succeeded

**Mô tả:** AI tạo kế hoạch thành công.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `plan_id` | UUID | Yes | ID của kế hoạch được tạo |
| `generation_time_ms` | number | Yes | Thời gian tạo (ms) |

**Storage:** analytics_events only

---

### 13.3. ai_learning_plan_failed

**Mô tả:** AI tạo kế hoạch thất bại.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `error_type` | string | Yes | Loại lỗi |
| `error_message` | string | No | Thông báo lỗi |

**Storage:** analytics_events only

---

### 13.4. ai_learning_plan_applied

**Mô tả:** Learner áp dụng kế hoạch AI.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `plan_id` | UUID | Yes | ID của kế hoạch |
| `course_id` | UUID | Yes | ID của khóa học |
| `source` | enum | Yes | `ai` |

**Storage:** analytics_events only

---

### 13.5. recommendation_requested

**Mô tả:** Yêu cầu recommendation.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `course_id` | UUID | Yes | ID của khóa học |
| `context` | object | No | Ngữ cảnh bổ sung |

**Storage:** analytics_events only

---

### 13.6. recommendation_succeeded

**Mô tả:** Recommendation thành công.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `recommendation_count` | number | Yes | Số lượng đề xuất |
| `algorithm` | string | Yes | Thuật toán sử dụng |

**Storage:** analytics_events only

---

### 13.7. recommendation_failed

**Mô tả:** Recommendation thất bại.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `error_type` | string | Yes | Loại lỗi |

**Storage:** analytics_events only

---

### 13.8. recommendation_feedback_submitted

**Mô tả:** Learner gửi phản hồi về recommendation.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `feedback` | enum | Yes | `relevant` hoặc `not_relevant` |
| `recommendation_id` | UUID | Yes | ID của recommendation |

**Storage:** analytics_events only

---

### 13.9. adaptive_difficulty_recommended

**Mô tả:** Hệ thống đề xuất độ khó mới.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `chapter_id` | string | Yes | ID của chapter |
| `current_difficulty` | enum | Yes | `easy`, `medium`, `hard` |
| `recommended_difficulty` | enum | Yes | `easy`, `medium`, `hard` |
| `reason` | string | Yes | Lý do đề xuất |

**Storage:** analytics_events only

---

### 13.10. adaptive_difficulty_accepted

**Mô tả:** Learner chấp nhận đề xuất độ khó.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `chapter_id` | string | Yes | ID của chapter |
| `new_difficulty` | enum | Yes | `easy`, `medium`, `hard` |

**Storage:** analytics_events only

---

### 13.11. adaptive_difficulty_rejected

**Mô tả:** Learner từ chối đề xuất độ khó.

**Metadata:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `chapter_id` | string | Yes | ID của chapter |
| `rejected_difficulty` | enum | Yes | `easy`, `medium`, `hard` |

**Storage:** analytics_events only

---

## 14. Quick Reference

### 14.1. All Events Summary

| Category | Events |
|----------|--------|
| Learning | `lesson_started`, `lesson_completed`, `quiz_started`, `quiz_completed` |
| Enrollment | `enrollment_started`, `enrollment_left` |
| Study Plan | `study_plan_created`, `study_plan_updated` |
| Bookmark | `bookmark_added`, `bookmark_removed` |
| Feedback | `feedback_sent` |
| Message | `message_sent` |
| Notification | `notification_sent`, `notification_read` |
| Content Analytics | `content_search_used`, `ai_tutor_requested`, `ai_tutor_succeeded`, `ai_tutor_failed` |
| AI | `ai_learning_plan_requested`, `ai_learning_plan_succeeded`, `ai_learning_plan_failed`, `ai_learning_plan_applied`, `recommendation_requested`, `recommendation_succeeded`, `recommendation_failed`, `recommendation_feedback_submitted`, `adaptive_difficulty_recommended`, `adaptive_difficulty_accepted`, `adaptive_difficulty_rejected` |

### 14.2. Required Fields per Event

| Event | Required Metadata |
|-------|-------------------|
| `lesson_started` | lesson_id, chapter_id, course_id |
| `lesson_completed` | lesson_id, chapter_id, course_id |
| `quiz_started` | quiz_id, quiz_type, chapter_id, course_id |
| `quiz_completed` | quiz_id, attempt_id, quiz_type, chapter_id, course_id, score, max_score, percentage |
| `enrollment_started` | course_id |
| `enrollment_left` | course_id |
| `study_plan_created` | plan_id, course_id, source |

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ Event_Contract_V1.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|--------|
| API Contract | `docs/design/api-contract-user-content.md` | API contract chung |
| System Mechanisms | `docs/specifications/system-mechanisms.md` | Cơ chế hệ thống |
| Database Design | `docs/design/database-design.md` | Thiết kế database |

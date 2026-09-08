# API Contract - User Module ↔ Content Module

> **Phạm vi:** Phân hệ Người dùng – Hệ thống Hỗ trợ Tự học  
> **Phiên bản:** 1.0  
> **Ngày:** 2026-09-06  
> **Trạng thái:** Active Development

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Authentication](#2-authentication)
3. [Standard Response Format](#3-standard-response-format)
4. [Error Handling](#4-error-handling)
5. [Pagination](#5-pagination)
6. [Rate Limiting](#6-rate-limiting)
7. [Timeout và Retry](#7-timeout-và-retry)
8. [Course API](#8-course-api)
9. [Metadata API](#9-metadata-api)
10. [Quiz API](#10-quiz-api)
11. [Result API](#11-result-api)
12. [Recommendation API](#12-recommendation-api)
13. [Adaptive Learning API](#13-adaptive-learning-api)
14. [Notification API](#14-notification-api)
15. [Event API](#15-event-api)
16. [Contract Change Policy](#16-contract-change-policy)

---

## 1. Tổng quan

### 1.1. Base URL

```
/api/v1
```

### 1.2. Mục đích

Tài liệu này mô tả API contract giữa **User Module** và **Content Module** trong hệ thống Hỗ trợ Tự học.

### 1.3. Nguyên tắc thiết kế

- **Shared Authentication**: Cả hai module sử dụng chung Supabase Authentication
- **RESTful Design**: Sử dụng HTTP methods chuẩn
- **Idempotency**: Các endpoint POST hỗ trợ idempotent qua request ID
- **Error Isolation**: User Module phải cô lập lỗi từ Content Module

### 1.4. Environment URLs

| Environment | Content Module URL |
|-------------|-------------------|
| Development | `http://localhost:3002` |
| Staging | `https://content-api.staging.example.com` |
| Production | `https://content-api.example.com` |

---

## 2. Authentication

### 2.1. Authentication Method

Hệ thống sử dụng **Supabase Authentication** dùng chung giữa User Module và Content Module.

### 2.2. Required Headers

| Header | Mô tả | Bắt buộc |
|--------|--------|-----------|
| `Authorization` | Bearer token từ Supabase | Yes |
| `Content-Type` | `application/json` | Yes (cho POST/PUT/PATCH) |
| `X-Request-ID` | Unique request ID cho idempotency | Recommended |

### 2.3. Token Format

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.4. Token Validation

| Trường hợp | Hành vi |
|-------------|---------|
| Token hợp lệ | Cho phép truy cập |
| Token hết hạn | Trả về 401 Unauthorized |
| Token không hợp lệ | Trả về 401 Unauthorized |
| Không có token | Trả về 401 Unauthorized |

---

## 3. Standard Response Format

### 3.1. Success Response

```json
{
  "data": { ... }
}
```

**Ví dụ:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Introduction to Python",
    "description": "Learn Python fundamentals",
    "status": "published",
    "created_by": "660e8400-e29b-41d4-a716-446655440001",
    "created_at": "2026-09-01T10:00:00Z",
    "updated_at": "2026-09-01T10:00:00Z"
  }
}
```

### 3.2. Success Response with Pagination

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

### 3.3. Array Response

```json
{
  "data": [ ... ]
}
```

---

## 4. Error Handling

### 4.1. Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "request_id": "req_abc123xyz"
}
```

### 4.2. HTTP Status Codes

| Status Code | Mô tả | Khi nào sử dụng |
|-------------|--------|------------------|
| 200 | OK | Thành công |
| 201 | Created | Tạo mới thành công |
| 204 | No Content | Xóa thành công |
| 400 | Bad Request | Request không hợp lệ |
| 401 | Unauthorized | Chưa xác thực |
| 403 | Forbidden | Không có quyền |
| 404 | Not Found | Resource không tìm thấy |
| 409 | Conflict | Conflict resource |
| 422 | Unprocessable Entity | Dữ liệu không hợp lệ |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Lỗi server |
| 502 | Bad Gateway | Content Module không phản hồi |
| 503 | Service Unavailable | Content Module tạm thời không khả dụng |

### 4.3. Error Codes

| Error Code | HTTP Status | Mô tả |
|------------|-------------|--------|
| `INVALID_REQUEST` | 400 | Request không hợp lệ |
| `MISSING_REQUIRED_FIELD` | 400 | Thiếu trường bắt buộc |
| `INVALID_FIELD_FORMAT` | 400 | Định dạng trường không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa xác thực |
| `TOKEN_EXPIRED` | 401 | Token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền truy cập |
| `RESOURCE_NOT_FOUND` | 404 | Resource không tìm thấy |
| `COURSE_NOT_FOUND` | 404 | Course không tồn tại |
| `LESSON_NOT_FOUND` | 404 | Lesson không tồn tại |
| `QUIZ_NOT_FOUND` | 404 | Quiz không tồn tại |
| `ENROLLMENT_REQUIRED` | 409 | Chưa đăng ký Course |
| `ALREADY_ENROLLED` | 409 | Đã đăng ký Course |
| `RATE_LIMIT_EXCEEDED` | 429 | Vượt quá rate limit |
| `INTERNAL_ERROR` | 500 | Lỗi nội bộ server |
| `CONTENT_SERVICE_UNAVAILABLE` | 503 | Content Module không khả dụng |
| `TIMEOUT` | 504 | Request timeout |

### 4.4. Error Response Examples

**400 Bad Request:**

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "course_id",
      "reason": "must be a valid UUID"
    }
  },
  "request_id": "req_abc123xyz"
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course with id '550e8400-...' not found"
  },
  "request_id": "req_abc123xyz"
}
```

**503 Service Unavailable:**

```json
{
  "error": {
    "code": "CONTENT_SERVICE_UNAVAILABLE",
    "message": "Content service is temporarily unavailable"
  },
  "request_id": "req_abc123xyz"
}
```

---

## 5. Pagination

### 5.1. Default Values

| Parameter | Default | Maximum |
|-----------|---------|---------|
| page | 1 | - |
| page_size | 20 | 100 |

### 5.2. Pagination Parameters

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `page` | integer | Số trang (bắt đầu từ 1) |
| `page_size` | integer | Số items mỗi trang |

### 5.3. Pagination Response Fields

| Field | Type | Mô tả |
|-------|------|--------|
| `page` | integer | Trang hiện tại |
| `page_size` | integer | Số items mỗi trang |
| `total_items` | integer | Tổng số items |
| `total_pages` | integer | Tổng số trang |

### 5.4. Pagination Example

**Request:**
```http
GET /api/v1/courses?page=2&page_size=10
```

**Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "page_size": 10,
    "total_items": 45,
    "total_pages": 5
  }
}
```

---

## 6. Rate Limiting

### 6.1. Rate Limit Headers

| Header | Mô tả |
|--------|--------|
| `X-RateLimit-Limit` | Số requests tối đa trong window |
| `X-RateLimit-Remaining` | Số requests còn lại |
| `X-RateLimit-Reset` | Thời điểm reset (Unix timestamp) |

### 6.2. Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public Read | 100/minute | 1 minute |
| Authenticated Read | 200/minute | 1 minute |
| Write Operations | 50/minute | 1 minute |
| Bulk Operations | 10/minute | 1 minute |

### 6.3. Rate Limit Response (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retry_after": 30
    }
  },
  "request_id": "req_abc123xyz"
}
```

**Headers:**
```http
Retry-After: 30
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1725612600
```

---

## 7. Timeout và Retry

### 7.1. Timeout Configuration

| Endpoint Type | Timeout |
|---------------|---------|
| Read Operations | 5 seconds |
| Write Operations | 10 seconds |
| Bulk Operations | 30 seconds |

### 7.2. Retry Policy

| Parameter | Value |
|-----------|-------|
| Max Retries | 3 |
| Initial Delay | 1 second |
| Backoff Multiplier | 2 |
| Max Delay | 30 seconds |

### 7.3. Retry Sequence

```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
```

### 7.4. Retry Conditions

**Retry when:**
- Connection timeout
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

**Do NOT retry when:**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests

### 7.5. Circuit Breaker

| Parameter | Value |
|-----------|-------|
| Failure Threshold | 5 consecutive failures |
| Timeout Duration | 60 seconds |
| Half-Open Requests | 3 |

**States:**
- **Closed**: Normal operation
- **Open**: All requests fail fast
- **Half-Open**: Testing if service recovered

---

## 8. Course API

### 8.1. Get Course

```http
GET /api/v1/courses/{course_id}
```

**Path Parameters:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `course_id` | UUID | ID của Course |

**Response (200 OK):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Introduction to Python",
    "description": "Learn Python fundamentals from scratch",
    "status": "published",
    "created_by": "660e8400-e29b-41d4-a716-446655440001",
    "created_at": "2026-09-01T10:00:00Z",
    "updated_at": "2026-09-05T14:30:00Z"
  }
}
```

**Error Responses:**
- `404 COURSE_NOT_FOUND`: Course không tồn tại
- `403 FORBIDDEN`: Không có quyền truy cập

---

### 8.2. List Courses by Manager

```http
GET /api/v1/courses?created_by={manager_id}
```

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `created_by` | UUID | Yes | ID của Content Manager |
| `page` | integer | No | Số trang (default: 1) |
| `page_size` | integer | No | Items mỗi trang (default: 20, max: 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Introduction to Python",
      "description": "Learn Python fundamentals",
      "status": "published",
      "created_by": "660e8400-...",
      "created_at": "2026-09-01T10:00:00Z",
      "updated_at": "2026-09-05T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 5,
    "total_pages": 1
  }
}
```

---

### 8.3. Get Course Structure

```http
GET /api/v1/courses/{course_id}/structure
```

**Path Parameters:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `course_id` | UUID | ID của Course |

**Response (200 OK):**

```json
{
  "data": {
    "course_id": "550e8400-e29b-41d4-a716-446655440000",
    "course_title": "Introduction to Python",
    "chapters": [
      {
        "id": "ch_001",
        "title": "Getting Started",
        "order_index": 1,
        "lessons": [
          {
            "id": "ls_001",
            "title": "Installing Python",
            "order_index": 1,
            "duration_minutes": 15
          },
          {
            "id": "ls_002",
            "title": "Your First Program",
            "order_index": 2,
            "duration_minutes": 20
          }
        ]
      },
      {
        "id": "ch_002",
        "title": "Variables and Types",
        "order_index": 2,
        "lessons": [
          {
            "id": "ls_003",
            "title": "Understanding Variables",
            "order_index": 1,
            "duration_minutes": 25
          }
        ]
      }
    ]
  }
}
```

---

## 9. Metadata API

### 9.1. Get Lesson

```http
GET /api/v1/lessons/{lesson_id}
```

**Path Parameters:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `lesson_id` | UUID | ID của Lesson |

**Response (200 OK):**

```json
{
  "data": {
    "id": "ls_001",
    "course_id": "550e8400-...",
    "chapter_id": "ch_001",
    "title": "Installing Python",
    "content": "<html content>",
    "duration_minutes": 15,
    "order_index": 1,
    "status": "published"
  }
}
```

---

### 9.2. Get Material

```http
GET /api/v1/materials/{material_id}
```

**Path Parameters:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `material_id` | UUID | ID của Material |

**Response (200 OK):**

```json
{
  "data": {
    "id": "mt_001",
    "lesson_id": "ls_001",
    "title": "Python Installation Guide",
    "type": "pdf",
    "url": "https://cdn.example.com/materials/python-guide.pdf",
    "size_bytes": 1024000
  }
}
```

---

## 10. Quiz API

### 10.1. List Quizzes in Course

```http
GET /api/v1/courses/{course_id}/quizzes
```

**Path Parameters:**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `course_id` | UUID | ID của Course |

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `quiz_type` | string | No | Filter by type: `exam`, `exercise` |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "qz_001",
      "course_id": "550e8400-...",
      "chapter_id": "ch_001",
      "title": "Python Basics Quiz",
      "quiz_type": "exam",
      "total_questions": 10,
      "duration_minutes": 30,
      "passing_score": 70
    },
    {
      "id": "qz_002",
      "course_id": "550e8400-...",
      "chapter_id": "ch_001",
      "title": "Practice: Variables",
      "quiz_type": "exercise",
      "total_questions": 5,
      "duration_minutes": 15,
      "passing_score": null
    }
  ]
}
```

### 10.2. Quiz Type Mapping

**Raw values từ Content Module:**

| Raw Value | Mapped Value | Ghi chú |
|-----------|--------------|---------|
| `exam` | `exam` | Bài kiểm tra chính thức |
| `exercise` | `exercise` | Bài luyện tập |

**Lưu ý:** Integration Layer phải map raw values qua Adapter. Business logic không phụ thuộc vào raw strings.

---

## 11. Result API

### 11.1. Get Latest Quiz Results

```http
GET /api/v1/quiz-results/latest?learner_id={learner_id}&course_id={course_id}
```

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `learner_id` | UUID | Yes | ID của Learner |
| `course_id` | UUID | Yes | ID của Course |

**Response (200 OK):**

```json
{
  "data": {
    "learner_id": "learner_001",
    "course_id": "550e8400-...",
    "results": [
      {
        "quiz_id": "qz_001",
        "quiz_title": "Python Basics Quiz",
        "chapter_id": "ch_001",
        "latest_attempt_id": "att_001",
        "score": 80,
        "max_score": 100,
        "percentage": 80,
        "completed_at": "2026-09-05T14:30:00Z"
      },
      {
        "quiz_id": "qz_002",
        "quiz_title": "Practice: Variables",
        "chapter_id": "ch_002",
        "latest_attempt_id": "att_002",
        "score": 18,
        "max_score": 20,
        "percentage": 90,
        "completed_at": "2026-09-04T10:15:00Z"
      }
    ]
  }
}
```

### 11.2. Get Quiz Attempts History

```http
GET /api/v1/quiz-attempts?learner_id={learner_id}&course_id={course_id}&from={from}&to={to}
```

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `learner_id` | UUID | Yes | ID của Learner |
| `course_id` | UUID | Yes | ID của Course |
| `from` | ISO8601 | No | Ngày bắt đầu |
| `to` | ISO8601 | No | Ngày kết thúc |
| `page` | integer | No | Số trang (default: 1) |
| `page_size` | integer | No | Items mỗi trang (default: 20, max: 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "attempt_id": "att_001",
      "quiz_id": "qz_001",
      "quiz_title": "Python Basics Quiz",
      "course_id": "550e8400-...",
      "chapter_id": "ch_001",
      "quiz_type": "exam",
      "status": "completed",
      "score": 80,
      "max_score": 100,
      "percentage": 80,
      "started_at": "2026-09-05T14:00:00Z",
      "completed_at": "2026-09-05T14:30:00Z"
    },
    {
      "attempt_id": "att_000",
      "quiz_id": "qz_001",
      "quiz_title": "Python Basics Quiz",
      "course_id": "550e8400-...",
      "chapter_id": "ch_001",
      "quiz_type": "exam",
      "status": "completed",
      "score": 65,
      "max_score": 100,
      "percentage": 65,
      "started_at": "2026-09-03T09:00:00Z",
      "completed_at": "2026-09-03T09:25:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 15,
    "total_pages": 1
  }
}
```

### 11.3. Open Dependency - Historical max_score

**[TODO]** Cơ chế lưu snapshot `max_score` lịch sử trong database Nội dung **chưa được chốt**.

**Ảnh hưởng:**
- User Module không tự tạo nguồn `max_score` chính thức
- Tính năng trend và so sánh có thể bị ảnh hưởng

**Yêu cầu API:**
- API phải trả về: `score`, `max_score`, `percentage`

---

## 12. Recommendation API

### 12.1. Get Recommendation Candidates

```http
GET /api/v1/recommendation-candidates?course_id={course_id}
```

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `course_id` | UUID | Yes | ID của Course |

**Query Parameters (Optional):**

| Parameter | Type | Mô tả |
|-----------|------|--------|
| `learner_id` | UUID | ID của Learner để personalize |
| `limit` | integer | Số lượng candidates tối đa (default: 10) |

**Response (200 OK):**

```json
{
  "data": {
    "course_id": "550e8400-...",
    "candidates": [
      {
        "lesson_id": "ls_005",
        "title": "Advanced Functions",
        "chapter_id": "ch_003",
        "type": "lesson",
        "reason": "prerequisite_completed",
        "relevance_score": 0.95
      },
      {
        "lesson_id": "ls_008",
        "title": "Working with Files",
        "chapter_id": "ch_004",
        "type": "lesson",
        "reason": "popular_among_peers",
        "relevance_score": 0.85
      }
    ]
  }
}
```

---

## 13. Adaptive Learning API

### 13.1. Check Practice Availability

```http
GET /api/v1/practice/availability?chapter_id={chapter_id}&difficulty={difficulty}
```

**Query Parameters:**

| Parameter | Type | Bắt buộc | Mô tả |
|-----------|------|-----------|--------|
| `chapter_id` | UUID | Yes | ID của Chapter |
| `difficulty` | string | Yes | Độ khó: `easy`, `medium`, `hard` |

**Response (200 OK):**

```json
{
  "data": {
    "chapter_id": "ch_001",
    "difficulty": "medium",
    "available": true,
    "available_questions": 15,
    "estimated_duration_minutes": 20
  }
}
```

---

### 13.2. Create Practice Session

```http
POST /api/v1/practice-sessions
```

**Request Body:**

```json
{
  "chapter_id": "ch_001",
  "difficulty": "medium",
  "learner_id": "learner_001"
}
```

**Request Fields:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `chapter_id` | UUID | Yes | ID của Chapter |
| `difficulty` | string | Yes | Độ khó: `easy`, `medium`, `hard` |
| `learner_id` | UUID | Yes | ID của Learner |

**Response (201 Created):**

```json
{
  "data": {
    "session_id": "ps_001",
    "chapter_id": "ch_001",
    "difficulty": "medium",
    "learner_id": "learner_001",
    "questions": [
      {
        "question_id": "q_001",
        "content": "What is the output of print(2 + 3)?",
        "options": ["5", "23", "2+3", "Error"],
        "correct_option_index": 0
      }
    ],
    "created_at": "2026-09-06T10:00:00Z",
    "expires_at": "2026-09-06T11:00:00Z"
  }
}
```

---

## 14. Notification API

### 14.1. Send Notification (Internal)

```http
POST /api/v1/internal/notifications
```

**Purpose:** Được Content Module sử dụng khi cần gửi notification qua User Module.

**Request Body:**

```json
{
  "notification_type": "content_update",
  "title": "Course Updated",
  "content": "A new lesson has been added to your course",
  "scope_type": "course",
  "scope_value": "550e8400-...",
  "send_email": true,
  "reference_type": "course",
  "reference_id": "550e8400-..."
}
```

**Request Fields:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `notification_type` | string | Yes | Loại: `content_update`, `deadline_reminder`, `achievement` |
| `title` | string | Yes | Tiêu đề notification |
| `content` | string | Yes | Nội dung notification |
| `scope_type` | string | Yes | Phạm vi: `all`, `course`, `individual` |
| `scope_value` | string | No | Giá trị scope (course_id hoặc user_id) |
| `send_email` | boolean | No | Có gửi email không (default: false) |
| `reference_type` | string | No | Loại reference |
| `reference_id` | string | No | ID reference |

**Response (201 Created):**

```json
{
  "data": {
    "notification_id": "ntf_001",
    "status": "queued"
  }
}
```

---

## 15. Event API

### 15.1. Send Event

```http
POST /api/v1/internal/events
```

**Purpose:** Được Content Module sử dụng để gửi learning events sang User Module.

**Request Body:**

```json
{
  "event_id": "evt_unique_001",
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
    "quiz_id": "qz_001",
    "attempt_id": "att_001"
  },
  "metadata": {
    "score": 85,
    "max_score": 100,
    "percentage": 85,
    "duration_seconds": 1800
  }
}
```

**Request Fields:**

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|--------|
| `event_id` | UUID | Yes | ID duy nhất của event |
| `event_name` | string | Yes | Tên event |
| `event_version` | string | Yes | Phiên bản event schema |
| `occurred_at` | ISO8601 | Yes | Thời điểm event xảy ra |
| `actor` | object | Yes | Người thực hiện |
| `source` | string | Yes | Nguồn: `content_module` |
| `context` | object | No | Ngữ cảnh bổ sung |
| `metadata` | object | No | Dữ liệu bổ sung |

**Response (201 Created):**

```json
{
  "data": {
    "event_id": "evt_unique_001",
    "status": "processed"
  }
}
```

**Idempotency:** Nếu `event_id` đã tồn tại, trả về 200 OK mà không tạo record mới.

---

## 16. Contract Change Policy

### 16.1. Nguyên tắc

Khi Content Module thay đổi raw values hoặc API:

1. Cập nhật tài liệu contract này
2. Cập nhật Adapter/Mapper trong User Module
3. Cập nhật Mock fixtures
4. **Không** thay đổi trực tiếp business feature code

### 16.2. Versioning

| Version | URL Pattern | Trạng thái |
|---------|-------------|------------|
| v1 | `/api/v1/*` | Current |
| v2 | `/api/v2/*` | Planned |

### 16.3. Breaking Changes

Breaking changes bao gồm:
- Xóa endpoint
- Thay đổi response schema
- Thay đổi required parameters
- Thay đổi HTTP method

**Thông báo:** Breaking changes phải được thông báo trước **30 ngày**.

### 16.4. Non-Breaking Changes

Non-breaking changes bao gồm:
- Thêm endpoint mới
- Thêm optional parameters
- Thêm response fields
- Thêm enum values

---

## Phụ lục: Quick Reference

### A.1. All Endpoints Summary

| Method | Endpoint | Mục đích |
|--------|----------|-----------|
| GET | `/courses/{id}` | Lấy thông tin Course |
| GET | `/courses` | Danh sách Course |
| GET | `/courses/{id}/structure` | Cấu trúc Course |
| GET | `/lessons/{id}` | Lấy thông tin Lesson |
| GET | `/materials/{id}` | Lấy thông tin Material |
| GET | `/courses/{id}/quizzes` | Danh sách Quiz |
| GET | `/quiz-results/latest` | Kết quả Quiz mới nhất |
| GET | `/quiz-attempts` | Lịch sử Quiz attempts |
| GET | `/recommendation-candidates` | Candidates cho recommendation |
| GET | `/practice/availability` | Kiểm tra availability practice |
| POST | `/practice-sessions` | Tạo practice session |
| POST | `/internal/notifications` | Gửi notification |
| POST | `/internal/events` | Gửi event |

### A.2. Common Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <unique-id>
```

### A.3. Response Headers

```http
Content-Type: application/json
X-Request-ID: <request-id>
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-RateLimit-Reset: 1725612600
```

---

## Lịch sử tài liệu

| Phiên bản | Ngày | Thay đổi |
|-----------|------|-----------|
| 1.0 | 2026-09-06 | Phiên bản đầu tiên, chuyển đổi từ API_Contract_User_Content_V1.md |

---

## Tài liệu liên quan

| Tài liệu | Đường dẫn | Mô tả |
|-----------|-----------|--------|
| Event Contract | `docs/design/event-contract.md` | Contract chi tiết cho events |
| System Mechanisms | `docs/specifications/system-mechanisms.md` | Cơ chế hệ thống |
| Database Design | `docs/design/database-design.md` | Thiết kế database |

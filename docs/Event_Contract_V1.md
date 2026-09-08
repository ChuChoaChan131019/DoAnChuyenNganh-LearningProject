# EVENT CONTRACT
## USER MODULE ↔ CONTENT MODULE

# 1. TRANSPORT

HTTP endpoint:

POST `/api/v1/internal/events`

Không dùng Message Queue trong phạm vi hiện tại.

# 2. EVENT ENVELOPE

{
  "event_id": "uuid",
  "event_name": "quiz_completed",
  "event_version": 1,
  "occurred_at": "...",
  "actor": {
    "user_id": "...",
    "role": "learner"
  },
  "source": "content_module",
  "context": {
    "course_id": "..."
  },
  "metadata": {}
}

# 3. IDEMPOTENCY [Cập nhật mới]

`event_id` unique.

Nếu Event đã xử lý:
- không insert lại;
- trả `already_processed`.

# 4. NAMING

Format:

`object_action`

Ví dụ:
- lesson_started
- lesson_completed
- quiz_started
- quiz_completed
- bookmark_added
- feedback_sent

# 5. LEARNING EVENTS

## lesson_started

Metadata:
- lesson_id
- chapter_id
- course_id

## lesson_completed

Metadata:
- lesson_id
- chapter_id
- course_id

## quiz_started

Metadata:
- quiz_id
- attempt_id
- quiz_type
- chapter_id
- course_id

## quiz_completed

Metadata:
- quiz_id
- attempt_id
- quiz_type
- chapter_id
- course_id
- duration_seconds

[Cập nhật mới] Exercise không dùng event riêng.

Dùng `quiz_*` + `quiz_type`.

# 6. USER EVENTS

- course_enrolled
- course_left
- course_reenrolled
- study_plan_created
- study_plan_updated
- lesson_completed
- note_created
- bookmark_added
- feedback_sent
- message_sent
- notification_sent

# 7. CONTENT ANALYTICS EVENTS

- content_search_used
- ai_tutor_requested
- ai_tutor_succeeded
- ai_tutor_failed

# 8. USER AI EVENTS

- ai_learning_plan_requested
- ai_learning_plan_succeeded
- ai_learning_plan_failed
- ai_learning_plan_applied
- recommendation_requested
- recommendation_succeeded
- recommendation_failed
- recommendation_feedback_submitted
- adaptive_difficulty_recommended
- adaptive_difficulty_accepted
- adaptive_difficulty_rejected

# 9. ANALYTICS VS LEARNING HISTORY [Cập nhật mới]

Một Event có thể lưu:

- analytics_events;
- learning_history;

nếu thuộc hoạt động học.

Ví dụ:

quiz_completed
→ cả hai.

bookmark_added
→ analytics only.

# 10. PRIVACY

Không Event payload:

- password;
- access token;
- refresh token;
- full message content;
- feedback content;
- note content;
- AI Tutor conversation content.

# 11. VALIDATION

Zod validate:

- required base fields;
- event-specific metadata.

Invalid event:
422 INVALID_EVENT_PAYLOAD.

# 12. RETRY

Producer có thể retry cùng `event_id`.

Duplicate không tạo record mới.
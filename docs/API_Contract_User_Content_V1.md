# API CONTRACT
## USER MODULE ↔ CONTENT MODULE

# 1. NGUYÊN TẮC

Base:
`/api/v1`.

Authentication:
Shared Supabase Auth.

Standard success:

{
  "data": ...
}

Standard error:

{
  "error": {
    "code": "...",
    "message": "..."
  },
  "request_id": "..."
}

# 2. COURSE API

GET `/api/v1/courses/{course_id}`

Response fields:
- id
- title
- description
- status
- created_by
- created_at
- updated_at

GET `/api/v1/courses?created_by={manager_id}`

GET `/api/v1/courses/{course_id}/structure`

Returns:
Course → Chapters → Lessons ordered.

# 3. METADATA

GET `/api/v1/lessons/{lesson_id}`

GET `/api/v1/materials/{material_id}`

# 4. QUIZ

GET `/api/v1/courses/{course_id}/quizzes`

Current raw quiz type [Cập nhật mới]:
- exam
- exercise

User integration must map raw value through Adapter.

# 5. RESULT [Cập nhật mới]

GET `/api/v1/quiz-results/latest?learner_id=&course_id=`

Purpose:
current state.

Fields:
- quiz_id
- latest_attempt_id
- score
- max_score
- percentage
- completed_at

GET `/api/v1/quiz-attempts?learner_id=&course_id=&from=&to=`

Purpose:
history/trend.

Fields:
- attempt_id
- quiz_id
- quiz_title
- course_id
- chapter_id
- quiz_type
- status
- score
- max_score
- percentage
- started_at
- completed_at

## Open Dependency

Historical `max_score` storage mechanism:
**TBD by Content Module.**

Contract must be updated when Content finalizes this mechanism.

# 6. RECOMMENDATION

GET `/api/v1/recommendation-candidates?course_id=`

Content returns candidates only.

User performs ranking.

# 7. ADAPTIVE

GET `/api/v1/practice/availability?chapter_id=&difficulty=`

POST `/api/v1/practice-sessions`

Payload:
- chapter_id
- difficulty

# 8. USER NOTIFICATION API

POST `/api/v1/internal/notifications`

Used by Content when it needs User Notification system.

# 9. EVENT API

POST `/api/v1/internal/events`

Detailed contract:
see `Event_Contract_V1.md`.

# 10. TIMEOUT/PARTIAL FAILURE

User Backend must isolate Content dependency failures.

Dashboard should not fail entirely if one Content call fails.

# 11. PAGINATION

Default:
20.

Maximum:
100.

Fields:
- page
- page_size
- total_items
- total_pages

# 12. CONTRACT CHANGE [Cập nhật mới]

Content raw values may evolve.

Changes must:
1. update this contract;
2. update Adapter/Mapper;
3. update Mock fixture;
4. avoid direct changes across business feature code.
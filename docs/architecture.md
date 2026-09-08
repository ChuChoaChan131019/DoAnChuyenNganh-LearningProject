# Kiến trúc hệ thống

## Tổng quan

Monolith với separation of concerns giữa backend (NestJS) và frontend (Next.js).

Backend xử lý business logic, database access, và tích hợp Content Module. Frontend là Next.js app gọi API từ backend và quản lý UI state.

## Tech Stack chi tiết

### Backend
- **Ngôn ngữ**: TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL via Supabase
- **ORM/Client**: Supabase JS client
- **Auth**: Supabase Authentication
- **AI Integration**: OpenAI / Qwen

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: React hooks (useState, useReducer)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Charts**: Recharts

### Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Sơ đồ component

```
[Browser]
    │
    ▼
[Next.js Frontend] ◄──────────────────────┐
    │                                     │
    │ HTTP API                            │
    ▼                                     │
[NestJS Backend]                          │
    │                                     │
    ├──► [PostgreSQL/Supabase]            │
    │                                     │
    ├──► [ContentGateway] ────────────────┤
    │         │                           │
    │         ├──► [MockContentGateway]   │ Development
    │         │         (JSON fixtures)   │
    │         │                           │
    │         └──► [HttpContentGateway]   │ Production
    │                   (HTTP calls)      │
    │                                     │
    └──► [AI Gateway]                     │
              ├──► OpenAI                │
              └──► Qwen                  │
```

## Luồng dữ liệu chính

### Luồng 1: Authentication
1. User gửi email/password từ frontend
2. Frontend gọi `POST /api/v1/auth/login` đến backend
3. Backend verify với Supabase Auth
4. Backend trả về session/token
5. Frontend lưu vào cookie hoặc memory

### Luồng 2: Enrollment (Learner tham gia Course)
1. Learner chọn Course và click "Tham gia"
2. Frontend gọi `POST /api/v1/enrollments`
3. Backend kiểm tra Course tồn tại qua ContentGateway
4. Backend tạo/update `course_enrollments` record
5. Backend trả về enrollment status

### Luồng 3: Lấy dữ liệu từ Content Module
1. Frontend gọi API đến backend
2. Backend xác định cần dữ liệu từ Content
3. Backend gọi ContentGateway
4. ContentGateway (Mock hoặc Http) trả dữ liệu
5. Backend transform/map data nếu cần
6. Backend trả về cho frontend

### Luồng 4: Event từ Content Module
1. Content Module gửi event qua `POST /api/v1/internal/events`
2. Backend validate event với Zod
3. Backend kiểm tra idempotency (event_id unique)
4. Backend insert vào `analytics_events` và/hoặc `learning_history`
5. Backend trả về acknowledgment

## External services và tích hợp

| Service | Mục đích | Credential location |
|---------|----------|-------------------|
| Supabase | Database + Auth | `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` |
| Content Module | Course, Lesson, Quiz data | Internal HTTP call qua ContentGateway |
| OpenAI | AI Learning Plan, Adaptive Learning | `OPENAI_API_KEY` |
| Qwen | AI Alternative | `QWEN_API_KEY` |

## Điểm cần chú ý cho agent

- **ContentGateway là bắt buộc** — không gọi trực tiếp HTTP endpoint của Content Module
- **Event idempotency** — kiểm tra `event_id` trước khi insert để tránh duplicate
- **RLS Policies** — Supabase RLS đã được cấu hình, không cần implement auth layer riêng cho data access
- **Soft delete** — không dùng DELETE SQL, thay vào đó update status
- **Mock vs Production** — switch ContentGateway implementation qua environment variable

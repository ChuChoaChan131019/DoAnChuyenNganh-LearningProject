# Quy tắc và Conventions

## Coding Style

### Backend (TypeScript/NestJS)

- **Formatter**: ESLint + Prettier
- **Type hints**: Bắt buộc cho tất cả function parameters và return type
- **Interface thay vì type** khi có thể (dễ extend hơn)
- **Async/await** thay vì .then()/.catch()

```typescript
// Đúng
async function getUserById(userId: string): Promise<User | null> {
  const user = await this.userRepository.findOne({ id: userId });
  return user;
}

// Sai
function getUserById(userId: string) {
  return this.userRepository.findOne({ id: userId });
}
```

### Frontend (TypeScript/React)

- **Formatter**: ESLint + Prettier
- **Component**: Functional component với hooks
- **Type hints**: Bắt buộc cho props và state
- **Avoid any**: Dùng unknown thay thế nếu không biết type

```typescript
// Đúng
interface UserCardProps {
  user: User;
  onClick?: () => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  return <div onClick={onClick}>{user.name}</div>;
}

// Sai
export function UserCard(props: any) {
  return <div onClick={props.onClick}>{props.user.name}</div>;
}
```

## Naming Conventions

| Loại | Convention | Ví dụ |
|------|-----------|--------|
| Variable | camelCase | `userName`, `orderCount` |
| Function/Method | camelCase | `getUser()`, `createOrder()` |
| Class | PascalCase | `UserService`, `OrderRepository` |
| Interface | PascalCase | `UserProfile`, `CreateUserDto` |
| Type | PascalCase | `UserRole`, `CourseStatus` |
| Enum | PascalCase + UPPER_SNAKE cho values | `enum UserRole { LEARNER = 'learner' }` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Database table | snake_case, số nhiều | `course_enrollments`, `study_plans` |
| Database column | snake_case | `created_at`, `learner_id` |
| API endpoint | kebab-case | `/api/v1/user-enrollments` |
| File (backend) | kebab-case | `study-plan.service.ts` |
| File (frontend) | PascalCase cho component | `StudyPlanCard.tsx` |
| File (frontend) | camelCase cho hooks/utils | `useStudyPlan.ts` |

## Git Workflow

### Branch naming

```
feature/<ten-nguoi-thuc-hien>/<mô-tả-ngắn>    ← tính năng mới (ví dụ: feature/enrollment-api)
fix/<ten-nguoi-thuc-hien>/<mô-tả-ngắn>       ← bug fix (ví dụ: fix/enrollment-duplicate)
refactor/<ten-nguoi-thuc-hien>/<mô-tả-ngắn>   ← refactor không thêm feature
docs/<ten-nguoi-thuc-hien>/<mô-tả-ngắn>       ← cập nhật tài liệu
```

### Commit message format

```
[type]: [mô tả ngắn gọn trong 50 ký tự]

[body tùy chọn — giải thích WHY]
```

Type được dùng: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

Ví dụ:
```
feat: thêm API enrollment cho Learner

fix: sửa lỗi duplicate enrollment khi re-join course
```

### Pull Request

- Mỗi PR chỉ làm một việc (feature hoặc fix)
- Mô tả rõ: đã làm gì, tại sao
- Gắn issue/task liên quan

## Error Handling

### Backend

```typescript
// Dùng NestJS built-in exception hoặc custom exception
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Validate input với class-validator
async createEnrollment(@Body() dto: CreateEnrollmentDto) {
  if (!dto.courseId) {
    throw new BadRequestException('Course ID is required');
  }
  const existing = await this.enrollmentService.findOne(dto);
  if (existing && existing.status === 'active') {
    throw new BadRequestException('Already enrolled');
  }
  return this.enrollmentService.create(dto);
}
```

### Response format

```typescript
// Success
{
  "data": { ... }
}

// Error
{
  "error": {
    "code": "ENROLLMENT_EXISTS",
    "message": "Already enrolled in this course"
  },
  "request_id": "uuid"
}
```

### Không log:

- Password hoặc credentials
- Full request body của user (nếu không cần thiết)
- Sensitive personal information

### Phải log:

- API errors (5xx)
- Database errors
- External service errors
- Performance issues

## Testing

### Backend

- **Unit test**: Bắt buộc cho service layer
- **Coverage tối thiểu**: 70% cho critical paths
- **Mock external services**: Supabase, ContentGateway, AI services

```bash
# Chạy test
npm run test

# Chạy với coverage
npm run test:cov
```

### Frontend

- **Component test**: Với React Testing Library
- **Integration test**: Với Playwright hoặc Cypress (nếu cần)

```bash
# Chạy test
npm run test

# Watch mode
npm run test:watch
```

## Code Review Checklist

Trước khi commit/push, tự kiểm tra:

- [ ] Type hints đầy đủ? Không có `any` không cần thiết?
- [ ] Không có hardcode value? (URL, ID, magic numbers)
- [ ] Error case được xử lý?
- [ ] Async function có try-catch không?
- [ ] Test được viết (cho business logic mới)?
- [ ] Không break existing test?
- [ ] Commit message đúng format?
- [ ] Sensitive data không bị log?

## Database Conventions

- **Soft delete**: Không dùng DELETE SQL, thay bằng UPDATE status hoặc thêm `deleted_at`
- **Timestamps**: Tất cả bảng phải có `created_at`, `updated_at`
- **UUID**: Dùng `gen_random_uuid()` cho primary key
- **Naming**: snake_case cho mọi thứ

## API Conventions

- **Versioning**: `/api/v1/...`
- **Pagination**: `page`, `page_size` (default 20, max 100)
- **Response envelope**:
  - Success: `{ data: ... }`
  - Error: `{ error: { code, message } }`
- **HTTP methods**:
  - GET: Lấy dữ liệu
  - POST: Tạo mới
  - PUT/PATCH: Cập nhật
  - DELETE: Không dùng (dùng update status)

## Security Conventions

- **Authentication**: Mọi protected endpoint phải có AuthGuard
- **Authorization**: Kiểm tra role ở cả backend và frontend
- **Input validation**: Validate tất cả input với class-validator hoặc Zod
- **SQL Injection**: Không dùng string concatenation, dùng parameterized queries (Supabase client đã hỗ trợ)
- **XSS**: Sanitize output khi render HTML

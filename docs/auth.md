# Authentication & Authorization

## Tổng quan

Hệ thống dùng Supabase Authentication cho việc đăng nhập/đăng ký. Authorization được quản lý qua Role trong bảng `profiles`.

## Authentication

### Phương thức

- **Email/Password** — phương thức chính
- **Không yêu cầu email verification**

### Supabase Auth Integration

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Auth Flow

```
1. User gửi email/password
2. Backend gọi supabase.auth.signInWithPassword()
3. Supabase verify và trả về session
4. Backend tạo/verify profile trong bảng profiles
5. Backend trả về token cho frontend
6. Frontend lưu token và gửi kèm request tiếp theo
```

## Role System

### Các vai trò

| Role | Mô tả | Tự đăng ký được? |
|------|--------|------------------|
| `learner` | Học viên | Có |
| `content_manager` | Quản lý nội dung | Có |
| `admin` | Quản trị hệ thống | Không |

### Role Constraints

- **Learner và Content Manager** — tự đăng ký được
- **Admin** — không cho tự đăng ký, chỉ tạo thủ công
- **Role không thay đổi** — user không thể tự đổi role
- **Backend chặn** — validate role ở backend, không chỉ UI

## Account Lock Mechanism

### Luồng hoạt động

```
1. User đăng nhập thất bại
   → failed_login_attempts += 1

2. Nếu failed_login_attempts >= 5
   → locked_until = now() + 15 minutes

3. Trong thời gian khóa
   → Mọi request login bị từ chối (kể cả password đúng)

4. Login thành công
   → failed_login_attempts = 0
   → locked_until = NULL
```

### Implementation

```typescript
// AuthService
async validateLogin(email: string, password: string): Promise<User> {
  // 1. Lấy profile
  const profile = await this.profileService.findByEmail(email);

  // 2. Kiểm tra lock
  if (profile.locked_until && profile.locked_until > new Date()) {
    throw new LockedException(`Account locked until ${profile.locked_until}`);
  }

  // 3. Verify password với Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 4. Tăng counter
    await this.profileService.incrementFailedAttempts(profile.id);
    throw new UnauthorizedException('Invalid credentials');
  }

  // 5. Reset counter khi thành công
  await this.profileService.resetFailedAttempts(profile.id);

  return data.user;
}
```

## Authorization Guards

### Backend Guards

#### JwtAuthGuard
Bảo vệ endpoint yêu cầu đăng nhập.

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

#### RolesGuard
Bảo vệ endpoint theo role.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/dashboard')
getAdminDashboard() {
  return {};
}
```

#### ContentManagerCourseGuard
Bảo vệ endpoint của Content Manager — chỉ cho phép truy cập Course do mình tạo.

```typescript
@UseGuards(ContentManagerCourseGuard)
@Get('courses/:courseId/learners')
getCourseLearners(@Param('courseId') courseId: string) {
  // Chỉ Manager tạo course mới được truy cập
}
```

### Frontend Authorization

```typescript
// components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  if (!user) {
    router.push('/login');
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    router.push('/unauthorized');
    return null;
  }

  return children;
}
```

## Shared Auth với Content Module

Supabase Auth và Role dùng chung giữa User Module và Content Module.

### Không được làm

- Không tạo hệ thống login thứ hai
- Không tạo bảng role độc lập
- Không implement API kiểm tra role nếu hai phân hệ dùng chung Supabase context

### Cách hoạt động

```
User login → Supabase Auth → Nhận token
                    ↓
            Token chứa user_id
                    ↓
        User Module và Content Module
        đều verify token với Supabase
                    ↓
        Kiểm tra role trong bảng profiles
```

## Protected Routes

### Backend

| Route Pattern | Guards Required |
|---------------|-----------------|
| `/api/v1/auth/*` | None (public) |
| `/api/v1/profile` | JwtAuthGuard |
| `/api/v1/enrollments` | JwtAuthGuard |
| `/api/v1/admin/*` | JwtAuthGuard + RolesGuard('admin') |
| `/api/v1/content-manager/*` | JwtAuthGuard + RolesGuard('content_manager') |
| `/api/v1/internal/*` | Service-to-service auth (API key) |

### Frontend

| Route | Allowed Roles |
|-------|---------------|
| `/login` | Public |
| `/register` | Public |
| `/learner/*` | learner |
| `/content-manager/*` | content_manager |
| `/admin/*` | admin |

## Environment Variables

### Backend

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx           # anon key
SUPABASE_SERVICE_KEY=xxx   # service role key (backend-only)
```

### Frontend

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Security Considerations

- **JWT Token** — lưu trong httpOnly cookie hoặc memory
- **Password** — không log, không trả về trong response
- **Rate limiting** — implement rate limit cho auth endpoints
- **CORS** — chỉ cho phép origin của frontend
- **HTTPS** — bắt buộc trong production

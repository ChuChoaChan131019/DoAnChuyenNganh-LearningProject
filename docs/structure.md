# Cấu trúc thư mục dự án

## Cây thư mục

```
DoAnChuyenNganh-LearningProject/
├── backend/
│   ├── src/
│   │   ├── common/               ← Shared utilities, decorators, guards
│   │   │   ├── decorators/
│   │   │   ├── filters/          ← Exception filters
│   │   │   ├── guards/           ← Auth guards
│   │   │   └── interceptors/
│   │   ├── config/               ← Configuration files
│   │   ├── controllers/          ← Route handlers, nhận request
│   │   ├── dto/                  ← Data Transfer Objects
│   │   │   ├── requests/         ← Input validation
│   │   │   └── responses/        ← Output shape
│   │   ├── entities/              ← TypeORM/Prisma entities hoặc interface
│   │   ├── gateways/             ← ContentGateway implementations
│   │   │   ├── content.gateway.ts
│   │   │   ├── mock-content.gateway.ts
│   │   │   └── http-content.gateway.ts
│   │   ├── modules/               ← NestJS modules theo feature
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── enrollments/
│   │   │   ├── study-plans/
│   │   │   ├── tasks/
│   │   │   ├── reminders/
│   │   │   ├── notes/
│   │   │   ├── bookmarks/
│   │   │   ├── learning-history/
│   │   │   ├── feedbacks/
│   │   │   ├── messages/
│   │   │   ├── notifications/
│   │   │   ├── analytics/
│   │   │   ├── events/           ← Event handling
│   │   │   └── ai/
│   │   ├── services/             ← Business logic (nếu không dùng module)
│   │   └── main.ts              ← App entry point
│   ├── test/                    ← Integration tests
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                 ← Next.js App Router
│   │   │   ├── (auth)/          ← Auth pages (login, register)
│   │   │   ├── (dashboard)/     ← Protected routes
│   │   │   │   ├── admin/
│   │   │   │   ├── content-manager/
│   │   │   │   └── learner/
│   │   │   ├── api/             ← API route handlers (nếu cần)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/              ← Base UI components (Button, Input...)
│   │   │   ├── shared/          ← Shared components (Navbar, Sidebar...)
│   │   │   └── features/        ← Feature-specific components
│   │   │       ├── auth/
│   │   │       ├── dashboard/
│   │   │       ├── enrollment/
│   │   │       ├── study-plan/
│   │   │       └── ...
│   │   ├── lib/
│   │   │   ├── api.ts           ← API client
│   │   │   ├── supabase.ts      ← Supabase client
│   │   │   └── utils.ts
│   │   ├── hooks/               ← Custom React hooks
│   │   ├── types/               ← TypeScript interfaces
│   │   └── stores/              ← State management (nếu cần)
│   ├── public/                  ← Static assets
│   ├── .env.example
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
├── package.json                  ← Root workspaces
├── package-lock.json
└── README.md
```

## Vai trò từng folder

### Backend

| Folder | Chứa gì | Không chứa gì |
|--------|---------|--------------|
| `common/` | Decorators, guards, filters dùng chung | Business logic |
| `config/` | Environment config, constants | Logic xử lý |
| `controllers/` | HTTP handlers, input validation | Business logic trực tiếp |
| `dto/` | Request/Response shapes | Logic |
| `entities/` | Database model interfaces | Logic |
| `gateways/` | External service integrations | Không gọi trực tiếp từ controller |
| `modules/` | Feature modules (controller + service + repository) | Logic không liên quan đến feature |
| `services/` | Business logic (nếu không gộp vào module) | HTTP handling |

### Frontend

| Folder | Chứa gì | Không chứa gì |
|--------|---------|--------------|
| `app/` | Next.js pages và layouts | Logic nghiệp vụ |
| `components/ui/` | Base components (Button, Modal, Card...) | Feature-specific logic |
| `components/shared/` | Components dùng nhiều chỗ (Navbar...) | Feature-specific logic |
| `components/features/` | Components theo feature | UI base components |
| `lib/` | API client, utilities | React components |
| `hooks/` | Custom hooks | Logic phức tạp (đưa vào service) |
| `types/` | TypeScript interfaces | Implementation |
| `stores/` | Global state (nếu cần) | UI components |

## Quy tắc đặt tên file

### Backend (TypeScript/NestJS)
- **File**: `kebab-case.ts` — ví dụ: `study-plan.service.ts`
- **Class**: `PascalCase` — ví dụ: `StudyPlanService`
- **Interface/DTO**: `PascalCase` — ví dụ: `CreateStudyPlanDto`
- **Test file**: `*.spec.ts`

### Frontend (TypeScript/React)
- **Component file**: `PascalCase.tsx` — ví dụ: `StudyPlanCard.tsx`
- **Hook file**: `camelCase.ts` — ví dụ: `useStudyPlan.ts`
- **Utility file**: `camelCase.ts` — ví dụ: `formatDate.ts`
- **Type file**: `kebab-case.ts` — ví dụ: `study-plan.types.ts`

## Tạo file mới ở đâu

### Backend

| Khi cần tạo... | Tạo ở... | Pattern |
|---|---|---|
| API endpoint mới | `modules/<feature>/controllers/` | `<feature>.controller.ts` |
| Business logic | `modules/<feature>/services/` | `<feature>.service.ts` |
| DTO mới | `dto/` | `create-<feature>.dto.ts` |
| Entity/Interface | `entities/` | `<feature>.entity.ts` |
| ContentGateway | `gateways/` | `<name>.gateway.ts` |
| Module mới | `modules/` | `nest g resource <name>` |

### Frontend

| Khi cần tạo... | Tạo ở... | Pattern |
|---|---|---|
| Page mới | `app/(dashboard)/<role>/` | `page.tsx` |
| Shared component | `components/shared/` | `PascalCase.tsx` |
| Feature component | `components/features/<feature>/` | `PascalCase.tsx` |
| Custom hook | `hooks/` | `use<Name>.ts` |
| Type definition | `types/` | `<feature>.types.ts` |
| API function | `lib/api.ts` hoặc `lib/api/` | `use<Feature>Api.ts` |

## File cấu hình quan trọng

| File | Mục đích | Sửa khi nào |
|------|----------|------------|
| `.env` (backend) | Database, Supabase, AI keys | Thêm biến mới |
| `.env.local` (frontend) | Supabase public keys | Thêm biến mới |
| `nest-cli.json` | NestJS config | Thêm module mới |
| `next.config.ts` | Next.js config | Thêm plugin |

## Lưu ý cho agent

- **NestJS resource command** — Dùng `nest g resource <name>` để tạo module đầy đủ (controller + service + dto + entity)
- **Frontend structure** — Tuân theo App Router convention, dùng route groups `(auth)` và `(dashboard)` cho auth và protected routes
- **Shared components** — UI base components đặt trong `components/ui/`, không phụ thuộc business logic

# Cấu trúc dự án và nhiệm vụ từng thành phần

> Cây mã nguồn thực tế của dự án. Các thư mục `node_modules`, `.next` và `dist` là thư mục sinh tự động nên không liệt kê chi tiết.

```text
DoAnChuyenNganh-LearningProject/
├── .agents/                                      -- Cấu hình và tài liệu kỹ năng hỗ trợ AI trong workspace
├── backend/                                      -- Backend NestJS: API, nghiệp vụ và tích hợp dữ liệu
│   ├── src/                                      -- Mã nguồn chính của backend
│   │   ├── main.ts                               -- Điểm khởi động; tạo NestJS app và mở cổng server
│   │   ├── app.module.ts                         -- Module gốc; kết nối các module chức năng
│   │   ├── app.controller.ts                     -- Controller kiểm tra hoặc xử lý endpoint cấp ứng dụng
│   │   ├── app.service.ts                        -- Service cấp ứng dụng
│   │   ├── app.controller.spec.ts                -- Unit test cho AppController
│   │   │
│   │   ├── common/                               -- Thành phần dùng chung, không thuộc riêng một nghiệp vụ
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts            -- Khai báo role được phép truy cập endpoint
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts      -- Chuẩn hóa dữ liệu lỗi HTTP trả về client
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts             -- Kiểm tra request đã xác thực bằng JWT chưa
│   │   │   │   └── roles.guard.ts                 -- Kiểm tra quyền Learner, Content Manager hoặc Admin
│   │   │   └── interceptors/
│   │   │       └── response.interceptor.ts       -- Chuẩn hóa cấu trúc response API
│   │   │
│   │   ├── config/                               -- Cấu hình các dịch vụ bên ngoài
│   │   │   ├── supabase.module.ts                 -- Đăng ký Supabase trong Dependency Injection
│   │   │   └── supabase.service.ts                -- Cung cấp Supabase client cho database và auth
│   │   │
│   │   ├── gateways/                             -- Lớp trung gian giao tiếp với Content Module
│   │   │   ├── content-gateway.module.ts         -- Đăng ký ContentGateway vào NestJS
│   │   │   ├── content.gateway.ts                -- Contract/interface cho các thao tác với nội dung
│   │   │   ├── http-content.gateway.ts           -- Gọi Content Module qua HTTP ở môi trường thật
│   │   │   └── mock-content.gateway.ts            -- Cung cấp dữ liệu giả khi phát triển hoặc kiểm thử
│   │   │
│   │   └── modules/                              -- Các module nghiệp vụ độc lập
│   │       ├── ai/                               -- Tạo hoặc hỗ trợ nội dung học tập bằng AI
│   │       │   ├── ai.module.ts                  -- Khai báo AI module
│   │       │   ├── ai.controller.ts              -- Nhận request liên quan đến AI
│   │       │   └── ai.service.ts                 -- Xử lý nghiệp vụ và gọi dịch vụ AI
│   │       ├── auth/                             -- Đăng ký, đăng nhập và xác thực tài khoản
│   │       │   ├── auth.module.ts                -- Khai báo Auth module
│   │       │   ├── auth.controller.ts            -- Endpoint xác thực
│   │       │   ├── auth.service.ts               -- Logic đăng nhập, đăng ký và session
│   │       │   └── dto/                          -- Dữ liệu đầu vào của auth
│   │       │       ├── index.ts                  -- Gom và export các DTO
│   │       │       ├── login.dto.ts              -- Kiểm tra dữ liệu đăng nhập
│   │       │       └── register.dto.ts           -- Kiểm tra dữ liệu đăng ký
│   │       ├── bookmarks/                        -- Lưu và quản lý nội dung được đánh dấu
│   │       │   ├── bookmarks.module.ts
│   │       │   ├── bookmarks.controller.ts       -- API bookmark
│   │       │   └── bookmarks.service.ts          -- Logic bookmark
│   │       ├── categories/                       -- Quản lý danh mục khóa học
│   │       │   ├── categories.module.ts
│   │       │   ├── categories.controller.ts      -- API danh mục
│   │       │   ├── categories.service.ts         -- Logic danh mục
│   │       │   └── dto/
│   │       │       ├── create-category.dto.ts    -- Dữ liệu tạo danh mục
│   │       │       └── update-category.dto.ts    -- Dữ liệu cập nhật danh mục
│   │       ├── courses/                          -- Quản lý khóa học, chương và bài học
│   │       │   ├── courses.module.ts
│   │       │   ├── courses.controller.ts         -- API quản lý nội dung khóa học
│   │       │   ├── learner-courses.controller.ts -- API khóa học dành cho Learner
│   │       │   ├── courses.service.ts            -- Logic khóa học
│   │       │   └── dto/                          -- DTO khóa học, chương và bài học
│   │       │       ├── create-course.dto.ts
│   │       │       ├── update-course.dto.ts
│   │       │       ├── create-chapter.dto.ts
│   │       │       ├── update-chapter.dto.ts
│   │       │       ├── create-lesson.dto.ts
│   │       │       ├── update-lesson.dto.ts
│   │       │       └── reorder-chapters.dto.ts
│   │       ├── enrollments/                      -- Learner tham gia hoặc rời khóa học
│   │       │   ├── enrollments.module.ts
│   │       │   ├── enrollments.controller.ts     -- API đăng ký khóa học
│   │       │   └── enrollments.service.ts        -- Kiểm tra và xử lý enrollment
│   │       ├── events/                           -- Nhận sự kiện từ Content Module
│   │       │   ├── events.module.ts
│   │       │   ├── events.controller.ts          -- Endpoint nhận event nội bộ
│   │       │   └── events.service.ts             -- Validate, chống trùng và lưu event
│   │       ├── feedbacks/                        -- Phản hồi hoặc đánh giá nội dung
│   │       │   ├── feedbacks.module.ts
│   │       │   ├── feedbacks.controller.ts
│   │       │   ├── feedbacks.service.ts
│   │       │   └── dto/
│   │       │       ├── create-feedback.dto.ts
│   │       │       └── update-feedback.dto.ts
│   │       ├── learning-history/                 -- Lưu lịch sử và tiến độ học tập
│   │       │   ├── learning-history.module.ts
│   │       │   ├── learning-history.controller.ts
│   │       │   └── learning-history.service.ts
│   │       ├── messages/                         -- Quản lý tin nhắn
│   │       │   ├── messages.module.ts
│   │       │   ├── messages.controller.ts
│   │       │   └── messages.service.ts
│   │       ├── notes/                            -- Tạo và quản lý ghi chú học tập
│   │       │   ├── notes.module.ts
│   │       │   ├── notes.controller.ts
│   │       │   └── notes.service.ts
│   │       ├── notifications/                    -- Tạo và đọc thông báo hệ thống
│   │       │   ├── notifications.module.ts
│   │       │   ├── notifications.controller.ts
│   │       │   ├── notifications.service.ts
│   │       │   └── dto/
│   │       │       └── create-notification.dto.ts
│   │       ├── practice/                         -- Chức năng luyện tập
│   │       │   ├── practice.module.ts
│   │       │   ├── practice.controller.ts
│   │       │   └── practice.service.ts
│   │       ├── questions/                        -- Ngân hàng và quản lý câu hỏi
│   │       │   ├── questions.module.ts
│   │       │   ├── questions.controller.ts
│   │       │   ├── questions.service.ts
│   │       │   └── dto/
│   │       │       └── question.dto.ts
│   │       ├── quizzes/                          -- Quản lý quiz và bài kiểm tra
│   │       │   ├── quizzes.module.ts
│   │       │   ├── quizzes.controller.ts
│   │       │   ├── quizzes.service.ts
│   │       │   └── dto/
│   │       │       └── quiz.dto.ts
│   │       ├── reminders/                        -- Nhắc nhở việc học
│   │       │   ├── reminders.module.ts
│   │       │   ├── reminders.controller.ts
│   │       │   └── reminders.service.ts
│   │       ├── study-plans/                      -- Lập và theo dõi kế hoạch học tập
│   │       │   ├── study-plans.module.ts
│   │       │   ├── study-plans.controller.ts
│   │       │   └── study-plans.service.ts
│   │       ├── tasks/                            -- Quản lý công việc học tập
│   │       │   ├── tasks.module.ts
│   │       │   ├── tasks.controller.ts
│   │       │   └── tasks.service.ts
│   │       └── users/                            -- Quản lý hồ sơ và thông tin người dùng
│   │           ├── users.module.ts
│   │           ├── users.controller.ts
│   │           └── users.service.ts
│   ├── test/                                     -- Kiểm thử tích hợp hoặc end-to-end
│   │   └── app.e2e-spec.ts                      -- Kiểm thử luồng API hoàn chỉnh
│   ├── .env                                      -- Biến môi trường thật; không commit lên Git
│   ├── .env.example                              -- Mẫu biến môi trường cho thành viên mới
│   ├── .prettierrc                               -- Quy tắc format code
│   ├── nest-cli.json                             -- Cấu hình NestJS CLI và thư mục source
│   ├── oxlint.json                               -- Quy tắc kiểm tra chất lượng code
│   ├── package.json                              -- Dependency và lệnh chạy backend
│   ├── package-lock.json                         -- Khóa phiên bản dependency backend
│   ├── tsconfig.json                             -- Cấu hình TypeScript khi phát triển
│   ├── tsconfig.build.json                       -- Cấu hình phạm vi và đầu ra khi build
│   ├── vitest.config.ts                          -- Cấu hình unit test Vitest
│   └── vitest.config.e2e.ts                      -- Cấu hình end-to-end test Vitest
│
├── frontend/                                     -- Frontend Next.js: giao diện và tương tác người dùng
│   ├── src/
│   │   ├── middleware.ts                         -- Xử lý request trước khi vào route, hỗ trợ bảo vệ route
│   │   ├── app/                                  -- Các route theo Next.js App Router
│   │   │   ├── layout.tsx                       -- Layout gốc của toàn bộ ứng dụng
│   │   │   ├── page.tsx                          -- Trang mặc định
│   │   │   ├── globals.css                       -- CSS toàn cục
│   │   │   ├── favicon.ico                       -- Biểu tượng website
│   │   │   ├── (auth)/                           -- Nhóm route xác thực, không xuất hiện trong URL
│   │   │   │   ├── layout.tsx                    -- Layout các trang auth
│   │   │   │   ├── login/page.tsx                -- Trang đăng nhập
│   │   │   │   ├── register/page.tsx             -- Trang đăng ký
│   │   │   │   └── forgot-password/page.tsx      -- Trang quên mật khẩu
│   │   │   ├── learner/                          -- Các trang dành cho Learner
│   │   │   │   ├── layout.tsx                    -- Layout chung Learner
│   │   │   │   ├── page.tsx                      -- Trang chính Learner
│   │   │   │   ├── dashboard/page.tsx            -- Tổng quan việc học
│   │   │   │   ├── courses/page.tsx              -- Danh sách khóa học
│   │   │   │   ├── courses/[slug]/page.tsx       -- Chi tiết khóa học
│   │   │   │   ├── courses/[slug]/lessons/[lessonId]/page.tsx -- Chi tiết bài học
│   │   │   │   ├── courses/[slug]/tests/[testId]/page.tsx      -- Chi tiết bài kiểm tra
│   │   │   │   ├── courses/[slug]/tests/[testId]/take/page.tsx -- Màn hình làm bài
│   │   │   │   ├── courses/[slug]/tests/[testId]/results/page.tsx -- Kết quả bài làm
│   │   │   │   ├── practice/page.tsx             -- Luyện tập
│   │   │   │   ├── study-plan/page.tsx           -- Kế hoạch học tập
│   │   │   │   ├── notes/page.tsx                -- Ghi chú
│   │   │   │   ├── bookmarks/page.tsx            -- Nội dung đã đánh dấu
│   │   │   │   ├── analytics/page.tsx             -- Thống kê tiến độ
│   │   │   │   ├── calendar/page.tsx              -- Lịch học
│   │   │   │   ├── search/page.tsx                -- Tìm kiếm nội dung
│   │   │   │   └── ai-tutor/page.tsx              -- Trợ giảng AI
│   │   │   ├── content-manager/                  -- Các trang dành cho Content Manager
│   │   │   │   ├── layout.tsx                    -- Layout chung Content Manager
│   │   │   │   ├── page.tsx                      -- Trang chính Content Manager
│   │   │   │   ├── dashboard/page.tsx            -- Dashboard quản lý nội dung
│   │   │   │   ├── learning-content/             -- Quản lý nội dung khóa học
│   │   │   │   ├── questions/                    -- Ngân hàng và duyệt câu hỏi
│   │   │   │   ├── quizzes/                      -- Xây dựng quiz
│   │   │   │   ├── testsandpractice/             -- Xây dựng bài test và practice
│   │   │   │   ├── ai/                           -- Sinh nội dung và câu hỏi bằng AI
│   │   │   │   ├── feedback/page.tsx             -- Xem phản hồi
│   │   │   │   ├── notifications/page.tsx        -- Quản lý thông báo
│   │   │   │   └── search/page.tsx               -- Tìm kiếm nội dung
│   │   │   └── admin/                            -- Khu vực dành cho Admin
│   │   │       └── test.txt                      -- File kiểm tra tạm thời
│   │   ├── components/                           -- Component React có thể tái sử dụng
│   │   │   ├── learner/                          -- Shell, sidebar, topbar, footer của Learner
│   │   │   ├── content-manager/                  -- Shell và thành phần giao diện Content Manager
│   │   │   └── search/                           -- Component tìm kiếm khóa học và bài học
│   │   ├── config/
│   │   │   └── roles.ts                          -- Danh sách role và cấu hình phân quyền frontend
│   │   ├── contexts/
│   │   │   └── auth-context.tsx                  -- Lưu và cung cấp trạng thái đăng nhập
│   │   ├── lib/                                  -- Hàm gọi API và tiện ích
│   │   │   ├── api.ts                             -- HTTP client và các hàm gọi backend
│   │   │   ├── mock-data.ts                       -- Dữ liệu giả khi UI chưa kết nối backend
│   │   │   ├── theme-context.tsx                  -- Quản lý theme giao diện
│   │   │   ├── utils.ts                           -- Hàm tiện ích dùng chung
│   │   │   └── auth/session.ts                    -- Đọc, lưu và xử lý session
│   │   └── types/                                -- Kiểu dữ liệu TypeScript dùng chung
│   │       ├── index.ts                           -- Export tập trung các type
│   │       ├── auth.ts                            -- Type tài khoản và xác thực
│   │       ├── learning-content.ts                -- Type khóa học, chương, bài học
│   │       ├── analytics.ts                       -- Type thống kê học tập
│   │       ├── practice.ts                        -- Type luyện tập
│   │       ├── question.ts                        -- Type câu hỏi
│   │       ├── quiz.ts                            -- Type quiz
│   │       └── test-and-practice.ts               -- Type bài test và practice
│   ├── public/                                   -- Hình ảnh, icon và tài nguyên tĩnh
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── .env.local                                -- Biến môi trường frontend; không commit lên Git
│   ├── .env.example                               -- Mẫu biến môi trường frontend
│   ├── eslint.config.mjs                          -- Cấu hình ESLint
│   ├── next-env.d.ts                              -- Type declaration do Next.js tạo
│   ├── next.config.ts                              -- Cấu hình Next.js
│   ├── package.json                                -- Dependency và lệnh chạy frontend
│   ├── package-lock.json                           -- Khóa phiên bản dependency frontend
│   ├── postcss.config.mjs                          -- Cấu hình PostCSS/Tailwind CSS
│   └── tsconfig.json                               -- Cấu hình TypeScript frontend
│
├── docs/                                         -- Tài liệu phân tích, thiết kế và đặc tả hệ thống
│   ├── README.md                                  -- Hướng dẫn đọc tài liệu
│   ├── architecture.md                            -- Kiến trúc và luồng dữ liệu
│   ├── structure.md                               -- Quy ước cấu trúc thư mục
│   ├── conventions.md                             -- Quy tắc code, naming và testing
│   ├── api.md                                     -- Mô tả API
│   ├── auth.md                                    -- Thiết kế authentication và authorization
│   ├── database.md                                -- Thiết kế cơ sở dữ liệu
│   ├── Database_Schema_PhanHeNguoiDung.sql        -- Script tạo schema database
│   ├── API_Contract_User_Content_V1.md            -- Hợp đồng API với Content Module
│   ├── Event_Contract_V1.md                       -- Hợp đồng event giữa các module
│   ├── design/                                    -- Thiết kế chi tiết
│   │   ├── api-contract-user-content.md           -- Thiết kế contract API
│   │   ├── database-design.md                     -- Thiết kế database
│   │   └── event-contract.md                      -- Thiết kế event contract
│   └── specifications/                            -- Đặc tả chức năng theo vai trò
│       ├── feature-admin.md                       -- Chức năng Admin
│       ├── feature-content-manager.md            -- Chức năng Content Manager
│       ├── feature-learner.md                    -- Chức năng Learner
│       └── system-mechanisms.md                  -- Cơ chế dùng chung của hệ thống
│
├── .gitignore                                    -- Các file không đưa lên Git
├── AGENT.md                                      -- Quy tắc và hướng dẫn làm việc với repository
├── README.md                                     -- Giới thiệu, cài đặt và cách chạy dự án
├── package.json                                  -- Workspace gốc; chạy đồng thời frontend và backend
├── package-lock.json                             -- Khóa dependency của workspace gốc
└── skills-lock.json                              -- Khóa phiên bản và hash của các AI skill
```

## Luồng hoạt động tổng quát

```text
Người dùng
    ↓
Frontend Next.js
    ↓ gọi HTTP API
Backend NestJS
    ↓
Module nghiệp vụ → Service → Supabase / ContentGateway / AI
    ↓
Backend trả response
    ↓
Frontend cập nhật giao diện
```

## Cách nhớ nhanh khi báo cáo

- `app/`: Các trang người dùng nhìn thấy.
- `components/`: Các thành phần giao diện dùng lại.
- `lib/`: Hàm gọi API và tiện ích.
- `types/`: Kiểu dữ liệu frontend.
- `modules/`: Nghiệp vụ backend theo từng chức năng.
- `controller`: Nhận request.
- `service`: Xử lý nghiệp vụ.
- `dto`: Kiểm tra dữ liệu đầu vào.
- `common/`: Thành phần dùng chung như xác thực và phân quyền.
- `gateways/`: Trung gian kết nối Content Module.
- `docs/`: Tài liệu thiết kế và đặc tả.

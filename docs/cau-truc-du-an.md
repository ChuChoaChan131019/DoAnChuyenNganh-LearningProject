# Cấu trúc dự án và vai trò các thư mục

**Thời điểm đối chiếu:** 21/10/2026. Tài liệu này mô tả các thư mục và tệp đang có trong mã nguồn, không phải cấu trúc dự kiến. Dự án là một kho mã nguồn dùng npm workspaces, gồm giao diện Next.js, máy chủ API NestJS và cơ sở dữ liệu Supabase PostgreSQL. Cấu trúc bảng hiện tại được ghi riêng trong [từ điển dữ liệu](database.md).

## 1. Sơ đồ tổng quan

```text
DoAnChuyenNganh-LearningProject/
├── backend/                       Máy chủ API NestJS
│   ├── src/
│   │   ├── common/                Thành phần dùng chung cho API
│   │   ├── config/                Cấu hình và kết nối Supabase
│   │   └── modules/               Các nhóm chức năng của API
│   └── test/                      Kiểm thử đầu cuối của backend
├── frontend/                      Giao diện Next.js
│   ├── public/                    Tài nguyên tĩnh
│   └── src/
│       ├── app/                   Trang và đường dẫn của website
│       ├── components/            Thành phần giao diện dùng lại
│       ├── config/                Cấu hình vai trò, điều hướng
│       ├── contexts/              Trạng thái dùng chung trong React
│       ├── lib/                   Gọi API và hàm tiện ích
│       └── types/                 Kiểu dữ liệu TypeScript
├── database/migrations/           Các tệp SQL thay đổi cấu trúc database
├── docs/                          Tài liệu của nhóm
├── .agents/skills/                Hướng dẫn cho công cụ hỗ trợ lập trình
├── package.json                   Khai báo npm workspaces và lệnh chạy chung
├── package-lock.json              Khóa phiên bản thư viện của workspace
├── README.md                      Giới thiệu và hướng dẫn chạy dự án
├── AGENT.md                       Tài liệu cũ về phân hệ Người dùng
└── .gitignore                     Danh sách tệp không đưa lên Git
```

Thư mục `node_modules/`, `.next/`, `dist/` và `coverage/` là sản phẩm cài đặt hoặc sinh ra khi chạy/kiểm thử, không phải nơi viết mã nguồn. Các tệp môi trường như `backend/.env` và `frontend/.env.local` chỉ dùng trên máy, không đưa lên Git.

## 2. Backend: nhận yêu cầu và xử lý nghiệp vụ

| Đường dẫn | Vai trò |
| --- | --- |
| `backend/src/main.ts` | Khởi động NestJS, cấu hình CORS, kiểm tra dữ liệu đầu vào, định dạng lỗi và phản hồi API. |
| `backend/src/app.module.ts` | Đăng ký các module chức năng và cấu hình toàn cục. |
| `backend/src/app.controller.ts`, `app.service.ts` | Tuyến gốc và xử lý đơn giản của ứng dụng; không chứa nghiệp vụ học tập chính. |
| `backend/src/config/` | `SupabaseModule` và `SupabaseService` tạo client để backend gọi Supabase Auth và các bảng dữ liệu. |
| `backend/src/common/decorators/` | Khai báo thông tin vai trò cần thiết cho tuyến API. |
| `backend/src/common/guards/` | Kiểm tra token đăng nhập và quyền truy cập API. |
| `backend/src/common/filters/` | Chuyển lỗi thành cấu trúc phản hồi thống nhất. |
| `backend/src/common/interceptors/` | Bọc dữ liệu trả về theo định dạng phản hồi chung. |
| `backend/src/modules/` | Mỗi thư mục con là một nhóm chức năng; thông thường có `*.module.ts`, `*.controller.ts`, `*.service.ts` và `dto/`. |
| `backend/test/` | Kiểm thử đầu cuối. Một số kiểm thử đơn vị nằm cạnh mã nguồn với đuôi `*.spec.ts`. |
| `backend/vitest.config.ts`, `vitest.config.e2e.ts` | Cấu hình chạy kiểm thử. |
| `backend/package.json` | Thư viện và lệnh chạy, kiểm tra, build của backend. |

Các module hiện có trong `backend/src/modules/`:

| Module | Việc đang xử lý |
| --- | --- |
| `auth/` | Đăng ký, đăng nhập, đăng xuất và hồ sơ; `dto/` kiểm tra dữ liệu đăng ký/đăng nhập. |
| `courses/` | Khóa học, chương, bài học; có API quản lý nội dung và API để học sinh xem nội dung. |
| `questions/` | Ngân hàng câu hỏi, phương án trả lời và quản lý câu hỏi. |
| `quizzes/` | Đề kiểm tra, lượt làm bài, nộp bài và kết quả. |
| `practice/` | Luyện **câu hỏi** theo các chế độ hiện có; không phải nơi chạy mã C# của học sinh. |
| `ai/` | Các API liên quan AI, gồm luồng AI Tutor hiện có. |

Trong một module, `controller` nhận yêu cầu HTTP, `service` xử lý nghiệp vụ và gọi dữ liệu, `dto/` định nghĩa dữ liệu đầu vào, còn `module` nối các thành phần với NestJS. Backend hiện **không** có các thư mục gốc `controllers/`, `models/`, `routes/` hay tệp `server.js`; các đường dẫn này trong sơ đồ cũ của README không phản ánh mã hiện tại.

## 3. Frontend: trang và giao diện

| Đường dẫn | Vai trò |
| --- | --- |
| `frontend/src/app/` | Next.js App Router: thư mục con tương ứng với đường dẫn web; `page.tsx` là trang, `layout.tsx` là bố cục bao các trang con. |
| `frontend/src/app/(auth)/` | Trang đăng nhập, đăng ký và bố cục của chúng. Dấu ngoặc cho biết đây là nhóm đường dẫn, không thêm `(auth)` vào URL. |
| `frontend/src/app/learner/` | Trang học sinh: bảng điều khiển, tìm kiếm, khóa học, bài học, làm quiz, luyện câu hỏi và AI Tutor. |
| `frontend/src/app/content-manager/` | Trang người biên soạn: bảng điều khiển, khóa học/chương/bài học, câu hỏi, đề kiểm tra và các màn AI. |
| `frontend/src/app/page.tsx` | Chuyển đường dẫn gốc `/` sang trang đăng nhập. |
| `frontend/src/app/globals.css` | Kiểu CSS dùng chung. |
| `frontend/src/components/auth/` | Thành phần tài khoản dùng lại, như menu người dùng. |
| `frontend/src/components/learner/` | Thanh điều hướng và chân trang của khu vực học sinh. |
| `frontend/src/components/content-manager/` | Khung trang, thanh bên, thanh trên và các thành phần của khu vực biên soạn. |
| `frontend/src/components/search/` | Ô tìm kiếm khóa học và bài học dùng lại ở nhiều trang. |
| `frontend/src/config/roles.ts` | Khai báo vai trò, trang mặc định và các đường dẫn được phép truy cập. |
| `frontend/src/contexts/auth-context.tsx` | Cung cấp trạng thái đăng nhập cho cây giao diện React. |
| `frontend/src/lib/api.ts` | Tập trung các hàm gọi API backend và xử lý lỗi phản hồi. |
| `frontend/src/lib/auth/session.ts` | Đọc, lưu và xóa thông tin phiên đăng nhập phía giao diện. |
| `frontend/src/lib/mock-data.ts` | Dữ liệu mẫu dùng cho một số màn hình; có tệp này không có nghĩa màn hình đã nối API thật. |
| `frontend/src/types/` | Kiểu dữ liệu cho tài khoản, khóa học, câu hỏi, quiz, luyện tập và các màn liên quan. |
| `frontend/src/middleware.ts` | Chuyển hướng khi chưa đăng nhập hoặc truy cập sai vai trò, dựa trên cookie và `config/roles.ts`. |
| `frontend/public/` | Tài nguyên tĩnh được truy cập trực tiếp qua URL; hiện chủ yếu là SVG mẫu của Next.js. |
| `frontend/package.json` | Thư viện và lệnh chạy, kiểm tra, build của frontend. |

Hai đường dẫn cũ dưới `frontend/src/app/content-manager/learning-content/categories/` hiện chỉ chuyển sang trang khóa học. Chúng không phải màn quản lý Category đang hoạt động; bảng `categories` đã bị xóa khỏi Supabase.

## 4. Database, tài liệu và cấu hình gốc

| Đường dẫn | Vai trò |
| --- | --- |
| `database/migrations/` | Lưu SQL thay đổi cấu trúc bảng. Các tệp hiện có ghi lại việc bỏ tầng topic và category; dữ liệu thật nằm trên Supabase, không nằm trong repo. |
| `docs/database.md` | Từ điển các bảng, cột và quan hệ đang có trên Supabase. |
| `docs/dac-ta-chuc-nang-phan-he-noi-dung.md` | Chức năng hiện có và chức năng dự kiến của phân hệ Nội dung. |
| `docs/chi-tiet-phong-thuc-hanh-csharp.md`, `docs/chi-tiet-thao-luan-chia-se-noi-dung.md` | Mô tả chi tiết hai chức năng sẽ triển khai. |
| `docs/phan-cong-cong-viec.md`, `docs/phan-cong-*.md` | Phân công chung và phạm vi của từng thành viên. |
| `docs/quy-tac-commit-push-pr.md` | Quy tắc tạo nhánh, commit, push và mở PR cho nhóm. |
| `docs/cau-truc-du-an.md` | Tài liệu đang đọc: cách tổ chức mã nguồn và nơi tìm từng phần. |
| `.agents/skills/`, `skills-lock.json` | Cấu hình kỹ năng cho công cụ hỗ trợ lập trình; không phải mã chạy của website. |
| `package.json` | Khai báo hai workspace `frontend`, `backend`; `npm run dev` khởi động cả hai. |
| `package-lock.json` | Khóa phiên bản thư viện cài từ workspace gốc. |
| `.gitignore` | Bỏ qua tệp môi trường, thư viện đã cài và sản phẩm build khi làm việc với Git. |

## 5. Luồng dữ liệu và nơi thêm chức năng mới

```text
Trang trong frontend/src/app/
  → hàm gọi trong frontend/src/lib/api.ts
  → controller của backend/src/modules/<chuc-nang>/
  → service cùng module
  → Supabase Auth hoặc bảng trong Supabase PostgreSQL
```

Khi thêm một chức năng, đặt API và nghiệp vụ vào module backend phù hợp; đặt trang trong khu vực `learner` hoặc `content-manager`; chuyển phần giao diện dùng lại vào `components/`; cập nhật hàm gọi ở `lib/api.ts` và kiểu dữ liệu trong `types/`. Nếu cần bảng/cột mới, thêm tệp SQL vào `database/migrations/` và cập nhật `docs/database.md`. Giao diện mẫu trong `app/` không tự chứng minh đã có API hoặc dữ liệu thật.

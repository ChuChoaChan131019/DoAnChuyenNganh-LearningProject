# Kế hoạch triển khai D02 — Danh sách thảo luận và bình luận

**Người phụ trách:** Đỗ Đặng Diệu Linh

**Ngày lập kế hoạch:** 06/11/2026

**Phạm vi:** `FR-45`, `FR-47` và phần bình luận của `FR-48`
**Nguồn đối chiếu:** [phân công của Linh](phan-cong-linh.md), [đặc tả phân hệ Nội dung](dac-ta-chuc-nang-phan-he-noi-dung.md), [mô tả chi tiết Thảo luận](chi-tiet-thao-luan-chia-se-noi-dung.md), [API bài đăng D01](d01-thao-luan-api.md), [từ điển dữ liệu](database.md).

> **Trạng thái triển khai 06/11/2026:** Mã nguồn D02, migration, giao diện bài học/chương, tài liệu API và kiểm thử tự động đã được bổ sung trong workspace. Migration đã được kiểm chứng trên PostgreSQL cô lập bằng PGlite nhưng chưa được áp dụng lên Supabase dùng chung vì workspace không có CLI hoặc thông tin kết nối database.

## 1. Kết quả Linh cần bàn giao

Linh cần hoàn thành một luồng thật, dùng dữ liệu Supabase qua backend NestJS, gồm:

1. Học sinh xem danh sách bài đăng trong đúng chương hoặc bài học đã xuất bản.
2. Tìm bài đăng theo từ khóa trong tiêu đề/nội dung và lọc theo loại `question`, `note`, `resource`.
3. Mở chi tiết một bài đăng và xem các bình luận theo thứ tự thời gian.
4. Học sinh đã đăng nhập tạo bình luận dưới một bài đăng còn hiển thị.
5. Tác giả sửa hoặc xóa mềm bình luận của chính mình.
6. Bài đăng/bình luận `hidden`, `removed` hoặc đã xóa không xuất hiện và không nhận tương tác mới.
7. Giao diện có vị trí để ghép form đăng bài và nút hữu ích của Khoa, nút báo cáo của Trang.

Đây không phải bảng tin tự do, AI Tutor, nhắn tin riêng hoặc bình luận nhiều cấp. Bản đầu chỉ có bình luận trực tiếp dưới bài đăng.

## 2. Ranh giới trách nhiệm

| Hạng mục | Người phụ trách | Linh cần làm gì |
| --- | --- | --- |
| Danh sách, tìm/lọc và chi tiết bài đăng | Linh | Làm API đọc, giao diện danh sách/chi tiết và trạng thái tải/lỗi/rỗng. |
| Tạo, sửa, xóa bài đăng | Khoa | Không làm lại; sử dụng API và thành phần D01 của Khoa khi tích hợp. |
| Tạo, xem, sửa, xóa bình luận | Linh | Làm database, API, giao diện và kiểm thử quyền tác giả. |
| Đánh dấu hữu ích | Khoa | Chừa contract/vị trí hiển thị `helpful_count`, `is_helpful` và nút tương tác. |
| Báo cáo, ẩn/gỡ | Trang | Danh sách và chi tiết của Linh phải tự loại nội dung đã bị Trang ẩn/gỡ. |

Không thêm lại `topics` hoặc `categories`. Mọi bài đăng phải dùng cấu trúc `course → chapter → lesson`; bài gắn bài học vẫn lưu được `chapter_id` do backend D01 xác định.

## 3. Hiện trạng mã nguồn

### Đã có

- `discussion_posts` và migration D01 tại `database/migrations/20261103143449_discussion_posts.sql`.
- `DiscussionModule` đã được đăng ký trong `backend/src/app.module.ts`.
- API D01 đã có tạo, sửa và xóa mềm bài đăng tại `backend/src/modules/discussion/`.
- Backend đã lấy tác giả từ JWT, chỉ nhận vai trò `learner`, không nhận `author_id` từ trình duyệt.
- Bài đăng có trạng thái `visible/hidden/removed`, `deleted_at`, ràng buộc vị trí và trạng thái xuất bản.

### Chưa có

- API `GET` danh sách và chi tiết bài đăng.
- Tìm kiếm, lọc, phân trang bài đăng.
- Bảng và API bình luận.
- Kiểu dữ liệu và API client thảo luận ở frontend.
- Thành phần thảo luận trong trang bài học/chương.
- Kiểm thử toàn luồng frontend–backend với dữ liệu thật.

Vì vậy không nên dựng giao diện bằng dữ liệu mẫu rồi coi là hoàn thành. D02 chỉ đạt khi API, dữ liệu bền vững và giao diện đã nối với nhau.

## 4. Quy tắc nghiệp vụ bắt buộc

1. Mọi endpoint yêu cầu Bearer token và vai trò `learner`.
2. Backend lấy `author_id` từ `req.user.id`; tuyệt đối không nhận ID tác giả trong body.
3. Chỉ đọc thảo luận khi khóa học, chương và bài học liên quan đều đang `published` và học sinh có quyền xem nội dung đó.
4. Danh sách/chi tiết chỉ trả bài và bình luận có `status = 'visible'` và `deleted_at IS NULL`.
5. Không trả `hidden`, `removed` hoặc đã xóa dưới dạng nội dung rỗng; với chi tiết nên trả `404` để tránh lộ sự tồn tại.
6. Chỉ tác giả được sửa/xóa bình luận. API phải lọc đồng thời theo `id`, `author_id`, `status` và `deleted_at`; không chỉ ẩn nút ở frontend.
7. Tạo/sửa bình luận bị chặn nếu bài đăng cha không còn hiển thị hoặc nội dung học tập đã bị thu hồi.
8. Xóa bình luận là xóa mềm bằng `deleted_at`; không xóa vật lý vì báo cáo/kiểm duyệt cần lịch sử.
9. Nội dung bình luận phải được trim, không được rỗng và có giới hạn chiều dài. Đề xuất bản đầu là 1–5.000 ký tự; nhóm cần chốt trước khi viết migration.
10. Khi sửa, cập nhật `updated_at`; giao diện hiển thị nhãn “Đã chỉnh sửa” khi phù hợp.
11. Frontend không gọi Supabase trực tiếp và không chứa `service_role`/secret key. Mọi truy cập dữ liệu đi qua NestJS.
12. Nội dung văn bản hiển thị dưới dạng text an toàn; không dùng `dangerouslySetInnerHTML` cho nội dung học sinh nhập.

## 5. Thiết kế dữ liệu đề xuất

Tạo migration mới, không sửa hoặc chạy lại toàn bộ schema cũ. Tên chính thức phải được tạo theo quy ước migration của nhóm; nội dung dự kiến bổ sung bảng `discussion_comments`:

| Cột | Kiểu/ràng buộc | Mục đích |
| --- | --- | --- |
| `id` | `uuid`, PK, mặc định `gen_random_uuid()` | ID bình luận. |
| `post_id` | `uuid`, FK → `discussion_posts.id`, `ON DELETE RESTRICT` | Bài đăng cha. |
| `author_id` | `uuid`, FK → `profiles.id`, `ON DELETE RESTRICT` | Tác giả từ token. |
| `content` | `text`, `NOT NULL`, kiểm tra sau trim | Nội dung bình luận. |
| `status` | `text`, `visible/hidden/removed`, mặc định `visible` | Dùng chung quy ước kiểm duyệt của Trang. |
| `created_at` | `timestamptz`, mặc định `now()` | Thời điểm tạo. |
| `updated_at` | `timestamptz`, mặc định `now()` | Thời điểm sửa gần nhất. |
| `deleted_at` | `timestamptz`, cho phép `NULL` | Xóa mềm bởi tác giả. |

Chỉ mục tối thiểu:

- `(post_id, created_at, id)` với điều kiện `status = 'visible' AND deleted_at IS NULL` để đọc bình luận theo thời gian.
- `(author_id)` để kiểm tra/quản lý nội dung theo tác giả.
- Các khóa ngoại phải có chỉ mục phù hợp; PostgreSQL không tự tạo chỉ mục cho cột FK.

Quyền truy cập phải thống nhất D01:

- Bật RLS cho `discussion_comments`.
- Thu hồi quyền trực tiếp của `PUBLIC`, `anon`, `authenticated`.
- Chỉ cấp quyền cần thiết cho `service_role`; backend chịu trách nhiệm xác thực và lọc quyền.
- Không thêm `SECURITY DEFINER` chỉ để né lỗi quyền.

Đối với tìm kiếm bài đăng, triển khai theo hai bước:

1. Bản đầu có thể tìm `title` và `content` trong phạm vi một chương/bài học, luôn kèm `limit`.
2. Nếu dữ liệu lớn hoặc truy vấn `ILIKE` chậm, thêm `search_vector` dùng cấu hình `simple` và GIN index trong migration riêng. Không tìm toàn bộ hệ thống nếu không có phạm vi chương/bài học.

## 6. Hợp đồng API cần chốt

Mọi phản hồi thành công vẫn được bọc trong `{ "data": ... }` theo interceptor hiện tại.

### 6.1. Danh sách và chi tiết bài đăng

| Thao tác | Endpoint đề xuất | Ghi chú |
| --- | --- | --- |
| Danh sách/tìm/lọc | `GET /api/v1/discussion/posts` | Bổ sung vào controller D01 hiện có. |
| Chi tiết bài đăng | `GET /api/v1/discussion/posts/:id` | Chỉ trả bài còn hiển thị và nội dung học còn được phép xem. |
| Danh sách bình luận | `GET /api/v1/discussion/posts/:postId/comments` | Sắp xếp cũ → mới. |

Query danh sách bài đăng:

| Query | Quy tắc |
| --- | --- |
| `chapter_id` | UUID chương; bắt buộc nếu không có `lesson_id`. Khi chỉ có trường này, lấy mọi bài có cùng `chapter_id`, gồm bài gắn trực tiếp chương và bài thuộc các bài học trong chương. |
| `lesson_id` | UUID bài học; khi có trường này chỉ lấy bài gắn đúng bài học và backend kiểm tra bài thuộc chương đã xác định. |
| `post_type` | Tùy chọn: `question`, `note`, `resource`. |
| `search` | Tùy chọn; trim, giới hạn độ dài, tìm trong tiêu đề và nội dung. |
| `limit` | Mặc định 20, tối đa 50. |
| `cursor` | Con trỏ từ `(created_at, id)`; dùng keyset pagination thay cho OFFSET. |

Kết quả danh sách nên có:

```json
{
  "items": [
    {
      "id": "uuid",
      "chapter_id": "uuid",
      "lesson_id": "uuid-or-null",
      "post_type": "question",
      "title": "Cách dùng vòng lặp for?",
      "content_preview": "...",
      "author_id": "uuid",
      "is_mine": false,
      "created_at": "2026-11-06T08:00:00Z",
      "updated_at": "2026-11-06T08:00:00Z",
      "comment_count": 3,
      "helpful_count": 0,
      "is_helpful": false
    }
  ],
  "next_cursor": null
}
```

`helpful_count` và `is_helpful` cần chốt với Khoa. Không tự tạo dữ liệu giả; trước D03 có thể để trường tùy chọn hoặc chỉ ghép khi API hữu ích đã sẵn sàng.

### 6.2. Bình luận

| Thao tác | Endpoint đề xuất | Body/kết quả |
| --- | --- | --- |
| Tạo | `POST /api/v1/discussion/posts/:postId/comments` | Body `{ "content": "..." }`; trả `201` và bình luận mới. |
| Sửa bình luận của mình | `PATCH /api/v1/discussion/comments/:id` | Chỉ nhận `{ "content": "..." }`; trả `200`. |
| Xóa mềm bình luận của mình | `DELETE /api/v1/discussion/comments/:id` | Trả `{ id, deleted: true, deleted_at }`. |

Phản hồi bình luận cần có ít nhất `id`, `post_id`, `author_id`, `content`, `status`, `created_at`, `updated_at`, `is_mine`. Không cho PATCH thay `post_id`, `author_id` hoặc `status`.

### 6.3. Mã lỗi cần kiểm soát

- `400`: UUID/query/body sai, nội dung rỗng/quá dài, phạm vi chương–bài học không hợp lệ.
- `401`: thiếu token hoặc token hết hạn.
- `403`: sai vai trò.
- `404`: bài/bình luận không tồn tại, không còn hiển thị hoặc người gọi không có quyền sửa/xóa.
- `429`: vượt giới hạn tần suất khi cơ chế chống spam được nối vào.
- `500`: lỗi database không dự kiến, dùng thông báo chung và không lộ chi tiết SQL.

## 7. Kế hoạch sửa mã theo thứ tự

### Giai đoạn 0 — Chốt contract với Khoa và Trang

- Xác nhận D01 đang dùng `visible/hidden/removed` và xóa mềm bằng `deleted_at`.
- Chốt Khoa sẽ trả/ghép `helpful_count`, `is_helpful` như thế nào cho bài đăng và bình luận.
- Chốt Trang dùng cùng ID bình luận và cùng trạng thái `hidden/removed`.
- Chốt giới hạn bình luận, quy tắc xóa khi bài cha bị ẩn/gỡ và cách hiển thị danh tính tác giả.
- Không hiển thị email học sinh. Schema `profiles` hiện chưa có tên công khai; bản đầu có thể dùng `is_mine` để hiển thị “Bạn” và nhãn “Học sinh”, hoặc bổ sung `display_name` sau khi nhóm thống nhất.

### Giai đoạn 1 — Database và kiểm thử migration

1. Tạo migration thêm `discussion_comments`, constraint, FK, chỉ mục, RLS và grant tối thiểu.
2. Bảo đảm chạy migration trên database trống và chạy lại không làm mất dữ liệu.
3. Thêm test PGlite để kiểm tra constraint, xóa mềm, thứ tự, quyền truy cập và FK.
4. Cập nhật mục thảo luận trong `docs/database.md` sau khi migration đã được kiểm chứng.

### Giai đoạn 2 — Backend danh sách/chi tiết bài đăng

1. Tạo DTO query có validation cho UUID, loại bài, `search`, `limit`, `cursor`.
2. Bổ sung `GET` vào `discussion-posts.controller.ts`.
3. Trong service, kiểm tra phạm vi nội dung đã xuất bản trước khi truy vấn.
4. Luôn lọc `status = visible`, `deleted_at IS NULL`.
5. Áp dụng tìm/lọc tại database, không tải toàn bộ rồi lọc bằng JavaScript.
6. Dùng phân trang con trỏ `(created_at, id)` và thứ tự ổn định.
7. Tránh N+1 khi tính `comment_count`; dùng truy vấn tổng hợp/RPC/view an toàn hoặc truy vấn gộp phù hợp.

### Giai đoạn 3 — Backend bình luận

1. Tạo `DiscussionCommentsController`, service và DTO trong module `discussion`.
2. Tạo bình luận chỉ khi bài cha `visible`, chưa xóa và nội dung học liên quan còn được phép xem.
3. Khi sửa/xóa, lọc quyền tác giả ngay trong câu truy vấn database.
4. Xóa mềm, giữ `updated_at` và không trả bình luận đã xóa cho học sinh.
5. Viết unit test service và database test cho quyền tác giả, trạng thái cha và trạng thái kiểm duyệt.

### Giai đoạn 4 — Frontend API và kiểu dữ liệu

1. Tạo `frontend/src/types/discussion.ts`.
2. Bổ sung `discussionApi` trong `frontend/src/lib/api.ts` cho list, detail, list comments, create/update/delete comment.
3. Dùng API client hiện có để tự gắn Bearer token, refresh token và chuẩn hóa lỗi.
4. Không gọi Supabase trực tiếp trong component.

### Giai đoạn 5 — Giao diện

Tạo các component có thể tái sử dụng trong `frontend/src/components/learner/discussion/`:

- `discussion-section.tsx`: quản lý context chương/bài học, tải và làm mới dữ liệu.
- `discussion-filters.tsx`: ô tìm kiếm và bộ lọc loại bài.
- `discussion-post-list.tsx` và `discussion-post-card.tsx`: danh sách, số bình luận, hữu ích, trạng thái rỗng.
- `discussion-post-detail.tsx`: nội dung bài, liên kết tài liệu HTTPS và danh sách bình luận.
- `comment-form.tsx`: tạo/sửa, giữ nội dung nếu gửi lỗi, khóa nút khi đang gửi.
- `comment-item.tsx`: chỉ hiện Sửa/Xóa khi `is_mine = true`.

Tích hợp theo hai context:

1. Trang bài học `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`: truyền `lessonId` và `currentChapterId`; chỉ hiển thị bài của đúng bài học.
2. Context chương: dùng chung component với `chapter_id` để xem tất cả bài trong chương và lọc tiếp theo bài học. Nếu dự án chưa có trang chương riêng, tạo route chương/thảo luận hoặc liên kết từ trang khóa học; không biến nó thành danh sách bài đăng toàn hệ thống.

Trạng thái giao diện bắt buộc:

- Đang tải, tải thất bại và nút thử lại.
- Không có bài đăng/kết quả tìm kiếm.
- Bình luận đang gửi, gửi thành công, gửi lỗi nhưng không mất nội dung.
- Xác nhận trước khi xóa.
- Sau sửa/xóa, cập nhật state từ phản hồi API hoặc tải lại trang hiện tại.
- Nếu API trả `404` vì nội dung vừa bị ẩn/gỡ, đóng chi tiết, xóa khỏi danh sách và báo nội dung không còn khả dụng.
- Tìm kiếm debounce khoảng 300–500 ms và hủy/bỏ qua phản hồi cũ để tránh kết quả nhảy ngược.

### Giai đoạn 6 — Tích hợp với phần của Khoa và Trang

- Ghép form tạo bài đăng vào đầu khu vực thảo luận nhưng không sửa logic sở hữu D01 của Khoa.
- Ghép nút hữu ích vào card bài đăng và từng bình luận.
- Ghép nút báo cáo vào bài đăng/bình luận.
- Khi Trang ẩn/gỡ nội dung, lần tải/refresh tiếp theo phải loại nội dung đó; nếu đang mở chi tiết thì xử lý `404` đúng cách.

### Giai đoạn 7 — Tài liệu và PR

- Cập nhật `docs/database.md` với bảng bình luận sau khi migration thật đã hoàn tất.
- Tạo tài liệu contract D02, tương tự `docs/d01-thao-luan-api.md`.
- Cập nhật trạng thái D02 trong phân công chung chỉ sau khi đã kiểm thử dữ liệu thật.
- PR ghi rõ migration, endpoint, ảnh giao diện, lệnh test và các phần còn phụ thuộc D03/D04.

## 8. Danh sách tệp dự kiến

### Tạo mới

- `database/migrations/<timestamp>_discussion_comments.sql`
- `backend/src/modules/discussion/discussion-comments.controller.ts`
- `backend/src/modules/discussion/discussion-comments.service.ts`
- `backend/src/modules/discussion/dto/discussion-comment.dto.ts`
- `backend/src/modules/discussion/dto/discussion-query.dto.ts`
- Các test `*.spec.ts` cho query/bình luận và migration.
- `frontend/src/types/discussion.ts`
- `frontend/src/components/learner/discussion/*`
- `docs/d02-thao-luan-api.md`

### Chỉnh sửa

- `backend/src/modules/discussion/discussion.module.ts`
- `backend/src/modules/discussion/discussion-posts.controller.ts`
- `backend/src/modules/discussion/discussion-posts.service.ts`
- `frontend/src/lib/api.ts`
- Trang bài học và route/context chương phù hợp.
- `docs/database.md`

Không chỉnh migration D01 đã lưu nếu thay đổi mới có thể viết bằng migration kế tiếp.

## 9. Ma trận kiểm thử tối thiểu

### Danh sách/tìm/lọc

- Danh sách theo bài học chỉ có bài của đúng `lesson_id`.
- Danh sách theo chương không lẫn bài của chương khác.
- Lọc từng `post_type` đúng dữ liệu.
- Tìm từ khóa trong tiêu đề/nội dung; khoảng trắng và chuỗi rỗng được xử lý đúng.
- Phân trang không lặp/mất dòng khi nhiều bản ghi có cùng `created_at`.
- Không trả bài `hidden`, `removed`, đã xóa hoặc thuộc nội dung chưa xuất bản.
- Không đăng nhập nhận `401`; sai vai trò nhận `403`.

### Bình luận

- Học sinh B bình luận được bài còn hiển thị của A.
- Bình luận rỗng/chỉ khoảng trắng/quá dài bị từ chối.
- Bình luận hiển thị cũ → mới dưới đúng bài.
- B sửa được bình luận của B và `updated_at` thay đổi.
- A không sửa/xóa được bình luận của B bằng cách gọi API trực tiếp.
- Xóa mềm làm bình luận biến mất nhưng bản ghi vẫn còn trong database.
- Không thể tạo/sửa dưới bài đã xóa, `hidden`, `removed` hoặc nội dung học đã thu hồi.
- Khi Trang ẩn/gỡ bình luận, frontend không tiếp tục hiển thị hoặc cho tương tác.

### Giao diện và tích hợp

- Đổi bài học làm danh sách thảo luận đổi đúng context.
- Tìm kiếm nhanh không hiển thị phản hồi cũ sau phản hồi mới.
- Gửi lỗi không làm mất nội dung đang nhập.
- Nút Sửa/Xóa chỉ hiện với `is_mine` nhưng backend vẫn là lớp bảo vệ quyết định.
- Luồng AC-05 chạy được với hai học sinh và một admin trên dữ liệu thật.

Lệnh kiểm tra dự kiến:

```bash
npm test -w backend -- src/modules/discussion
npm run lint -w backend
npm run build -w backend
npm run lint -w frontend
npm run build -w frontend
```

## 10. Điều kiện hoàn thành D02

D02 chỉ được đánh dấu hoàn thành khi tất cả điều sau đạt:

- Có migration bình luận, constraint, chỉ mục và quyền database đã được test.
- Có API list/detail/tìm/lọc bài đăng bằng dữ liệu thật.
- Có API xem/tạo/sửa/xóa mềm bình luận.
- Quyền tác giả được kiểm tra ở backend và có test gọi trực tiếp API/service.
- Giao diện trang bài học/chương đã nối API, không dùng mock data.
- Nội dung `hidden/removed/deleted` biến mất khỏi giao diện học sinh.
- Có trạng thái tải/lỗi/rỗng và không mất nội dung form khi gửi thất bại.
- Backend test, lint/build backend và lint/build frontend đều qua.
- Đã kiểm thử AC-05 phần của Linh và tích hợp sơ bộ với Khoa/Trang.
- Tài liệu API và database đã được cập nhật trong cùng PR.

## 11. Lịch thực hiện bù đề xuất

Theo lịch nhóm, D02 có hạn 05/11/2026; tại ngày lập kế hoạch 06/11/2026 mốc này đã qua. Nên ưu tiên theo lịch bù sau để không chặn D03 và D04:

| Ngày | Kết quả cần có |
| --- | --- |
| 06/11 | Chốt contract D02 với Khoa/Trang; hoàn thành migration và DTO. |
| 07/11 | Hoàn thành API list/detail/tìm/lọc và API bình luận; unit/database test chính. |
| 08/11 | Hoàn thành API client, types và giao diện danh sách/chi tiết/bình luận ở trang bài học. |
| 09/11 | Bổ sung context chương, trạng thái lỗi/rỗng, sửa/xóa và kiểm thử hai tài khoản. |
| 10–11/11 | Ghép hữu ích/báo cáo, xử lý hidden/removed, sửa lỗi tích hợp. |
| 13/11 | Cùng nhóm chạy nghiệm thu D05 toàn luồng AC-05. |

## 12. Thứ tự làm ngắn gọn

Nếu bắt đầu triển khai ngay, làm đúng thứ tự này:

1. Chốt contract với Khoa/Trang.
2. Migration `discussion_comments` và test database.
3. API đọc danh sách/chi tiết bài đăng.
4. API xem/tạo/sửa/xóa bình luận.
5. Types và `discussionApi` frontend.
6. Component dùng chung cho danh sách, chi tiết và bình luận.
7. Gắn vào trang bài học, sau đó bổ sung context chương.
8. Ghép hữu ích/báo cáo và xử lý ẩn/gỡ.
9. Chạy test, lint, build và AC-05 bằng dữ liệu thật.
10. Cập nhật tài liệu và mở PR.

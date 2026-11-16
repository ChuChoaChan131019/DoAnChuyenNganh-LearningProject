# API tạo câu hỏi AI cho Content Manager

## Luồng

Content Manager chọn khóa học; có thể chọn thêm chương và bài học để thu hẹp phạm vi, sau đó gọi API sinh đề xuất. API sinh chỉ đọc nội dung bài học và không ghi ngân hàng. Người biên soạn có thể sửa, bỏ hoặc tạo lại từng đề xuất; chỉ khi bấm lưu thì câu hỏi mới được ghi thành `draft` dùng chung.

Lưu nháp và gửi duyệt là hai thao tác độc lập. Gửi duyệt không tự chuyển câu hỏi thành `approved`, kể cả với `admin`. Quyết định duyệt/trả lại thực hiện tại `/content-manager/questions/review`.

## Endpoint

### `POST /api/v1/ai/questions/generate`

Yêu cầu Bearer token của `content_manager` hoặc `admin`.

```json
{
  "course_id": "uuid",
  "chapter_id": "uuid",
  "lesson_id": "uuid",
  "question_type": "single_choice",
  "difficulty": "medium",
  "count": 5,
  "topic": "interface",
  "instructions": "Có một câu đọc code"
}
```

Từ ngày 17/11/2026, `course_id` bắt buộc; `chapter_id` và `lesson_id` tùy chọn (bỏ trường khi không chọn). Ba tổ hợp được hỗ trợ:

- Chỉ `course_id`: sinh theo khóa học.
- `course_id` + `chapter_id`: sinh theo chương.
- Đủ ba ID: sinh theo bài học. Có `lesson_id` thì phải có `chapter_id`.

Backend kiểm tra quan hệ khóa/chương/bài bằng dữ liệu thật. Quét tối đa 100 chương và 200 bài học, chọn tối đa 10 bài có nội dung hữu ích trong ngân sách 20.000 ký tự; ưu tiên chủ đề và phân bổ giữa các chương. Phạm vi lớn là lựa chọn nguồn trong giới hạn xử lý, không cam kết bao phủ toàn bộ giáo trình trong một lần sinh. Trả cảnh báo khi nguồn bị rút gọn hoặc lượt quét chưa đầy đủ.

Phản hồi `source` có `scope` (`course`, `chapter`, `lesson`), các ID đã chọn, `title` và `lessons` (mỗi phần tử có `lesson_id`, `chapter_id`, `title`, `chapter_title`). Mỗi câu có `course_id`, `chapter_id`, `lesson_id`, `chapter_title`, `lesson_title`. Với phạm vi khóa/chương, model phải chọn `source_lesson_id` trong danh sách nguồn; backend xác minh rồi tự gán vị trí từ DB. Không nhận chương/bài do model tự tạo. Frontend giữ vị trí từng câu khi lưu, và tạo lại một câu theo đúng bài học nguồn của câu đó.

API lưu nháp vẫn yêu cầu đủ ba ID cho từng câu; batch có thể chứa các bài học khác nhau. Thay đổi phạm vi sinh này không cần migration database mới.

`count` nằm trong khoảng 1–10. `topic` tối đa 300 ký tự, `instructions` tối đa 2.000 ký tự. Phản hồi có `questions`, `warnings` và `source`; mỗi câu có `client_id` để dùng khi lưu.

### `POST /api/v1/questions/ai-drafts`

Yêu cầu Bearer token của `content_manager` hoặc `admin`.

```json
{
  "batch_id": "uuid-do-client-tao-mot-lan",
  "questions": [
    {
      "client_id": "uuid-cua-de-xuat",
      "course_id": "uuid",
      "chapter_id": "uuid",
      "lesson_id": "uuid",
      "question_type": "single_choice",
      "difficulty": "medium",
      "content": "...",
      "explanation": "...",
      "options": [
        { "option_text": "...", "is_correct": true, "order_index": 0 },
        { "option_text": "...", "is_correct": false, "order_index": 1 }
      ]
    }
  ]
}
```

Backend tự gán `status=draft`, `is_ai_generated=true` và `generated_for_user_id=null`. `batch_id` được dùng để retry an toàn: cùng batch và cùng payload trả lại các ID cũ; cùng batch nhưng payload khác trả `409`. Cả batch và các option được lưu trong một transaction; lỗi một câu rollback toàn bộ.

## Quy tắc đáp án

- `single_choice`: 2–8 option, đúng chính xác một.
- `multiple_choice`: 3–8 option, ít nhất hai đúng và ít nhất một sai.
- `true_false`: đúng hai option chuẩn `Đúng`/`Sai`, đúng chính xác một.
- `fill_in_blank`: đúng một option chứa đáp án chuẩn. Editor hiển thị option này dưới nhãn “Đáp án chuẩn”; không được bỏ option khi sửa.

Validator được dùng ở luồng sinh, lưu, sửa và duyệt. Chỉ câu `approved`, dùng chung (`generated_for_user_id IS NULL`) mới được cấu hình vào quiz hoặc trả về luyện tập chung.

## Migration và giới hạn vận hành

Áp dụng migration `20261115090000_ai_question_authoring_drafts.sql` trước backend. Migration `20261115093000_ai_question_history.sql` bổ sung `version`, thời điểm gửi duyệt, metadata và lịch sử append-only; áp dụng trước khi bật optimistic version/review history.

Rate limit sinh AI hiện nằm trong bộ nhớ của một instance: tối đa một request đang chạy trên mỗi tài khoản, tối đa hai request toàn tiến trình và ba request mỗi phút mỗi tài khoản. Mỗi provider có timeout 20 giây, tối đa hai lần gọi upstream cho một yêu cầu. Không retry tự động từ frontend.

Các cảnh báo gần trùng/lệch bài chuyên môn vẫn là heuristic; người biên soạn phải kiểm tra nội dung và đáp án trước khi duyệt.


## Khắc phục K01–K07 ngày 16/11/2026

Phần sửa code đã được triển khai trên workspace. Chưa nghiệm thu luồng live và chưa áp dụng migration mới lên Supabase thật.

| Mã | Kết quả và bằng chứng | Giới hạn còn lại |
| --- | --- | --- |
| K01 | Log chỉ ghi provider, HTTP status/mã lỗi, loại lỗi, thời điểm và cooldown. Giữ hai call tối đa, timeout 20 giây/provider; phân biệt quota/auth/rate limit/quá tải và tôn trọng Retry-After. Mock fallback, đầu ra sai, timeout và cooldown đều qua. | Một yêu cầu service thật lúc khoảng 14:36 ngày 16/11/2026 (UTC+7) thất bại: Gemini timeout 20 giây; OpenAI HTTP 429, code `credit_balance_exhausted`. Mã này được phân loại quota, cooldown 5 phút. Ở lần kiểm tra đầu chưa sinh thành công; lần tiếp tục bên dưới đã khôi phục sinh qua service bằng model Gemini được kiểm chứng. Không mua credit. |
| K02 | Browser giả lập mất phản hồi sau thao tác lưu: retry gửi cùng batch ID và toàn bộ payload snapshot; mapping thiếu giữ nguyên đề xuất/pending; lỗi 400 cho sửa rồi tạo batch mới. Không tự retry hoặc tạo batch mới sau lỗi không rõ kết quả/409. | Pending nằm trong phiên màn hình; không cam kết chống trùng qua reload. Có cảnh báo beforeunload, khi bấm liên kết và banner đối soát ngân hàng. |
| K03 | Test nguồn rỗng/markup rỗng/chỉ tiêu đề không gọi provider; code hữu ích được chấp nhận. Kiểm tra đúng count/type/difficulty trước khi nhận kết quả, có fallback trong ngân sách. Giữ code block hoàn chỉnh khi rút nguồn theo chủ đề. Biên count 1/10 và hồi quy Learner mixed qua. | Ngưỡng đủ nguồn là heuristic, không chứng nhận chất lượng chuyên môn. |
| K04 | Migration additive `20261116093000_atomic_question_creation_history.sql` đưa snapshot created vào RPC lưu AI; retry không ghi thêm history. Tạo thủ công dùng RPC atomic mới. PGlite kiểm tra rollback khi history lỗi cho cả AI/thủ công, retry, Promise.all retry, snapshot/version và quyền execute. Service không còn appendHistory sau commit. | Chưa triển khai live. Lần tiếp tục đã kiểm thử thành công bằng hai kết nối PostgreSQL 17 độc lập; xem kết quả bên dưới. Legacy thiếu/lặp cần audit trước triển khai. |
| K05 | Test đủ 12 hướng chuyển loại; giữ đáp án chuẩn, chuẩn hóa Đúng/Sai và số options tối thiểu, không tự tạo thêm cờ đúng cho nhiều đáp án. Browser kiểm tra thêm/xóa đến giới hạn 3–8 và giữ đáp án khi chuyển điền khuyết. | Nội dung/đáp án do người biên soạn xác nhận. |
| K06 | Request version cho chương/bài/sinh; cleanup vô hiệu response cũ. Ref khóa đồng bộ ngăn double click và thao tác chồng; fieldset khóa sửa/nguồn trong lúc sinh/lưu/tạo lại/pending. Browser xác nhận course A trả sau B vẫn giữ B, tạo lại thay đúng đề và giới hạn 10 đề xuất. | Chưa nghiệm thu mạng chậm trên trình duyệt với provider thật. |
| K07 | Hai build qua; lint màn generator/helper qua. Lượt kiểm tra cuối khi tiếp tục chạy toàn bộ suite liên quan: 71/71 test trong 11 file qua (`--no-file-parallelism`). Browser fixture qua 8 nhóm ca. Đã đọc metadata Supabase thật và thấy RPC lưu cùng bảng history. | Chưa chạy đăng nhập → sinh thật → lưu → reload → editor → gửi duyệt → duyệt/trả lại trên môi trường thật. Test guard dùng auth fixture; không coi là JWT live. |

Bốn test tương thích xác nhận Practice và Quiz đều chấm đáp án điền khuyết từ option đúng, có trim và không phân biệt hoa thường. Kiểm tra quyền guard xác nhận token thiếu bị chặn, Learner bị chặn, Content Manager/admin mới đi vào service. API cấu hình quiz trong QuestionsService cũng lọc câu dùng chung đã approved.

Lần chạy nhiều suite PGlite song song cùng frontend build bị timeout ở hook khởi tạo; chạy lại với `--no-file-parallelism` qua. Không tăng timeout để che lỗi nghiệp vụ.

### Triển khai và kiểm tra lại

1. Chạy [script triển khai](../scripts/deploy-ai-question-authoring.mjs) ở chế độ kiểm tra mặc định (không có `--apply`) trên database đích để audit lịch sử bằng truy vấn chỉ đọc. Nếu có nhiều sự kiện created cho cùng câu, migration mới dừng tại unique index; cần đối soát riêng, không xóa lịch sử. Không dựng lại snapshot gốc từ nội dung hiện tại cho câu legacy thiếu history.
2. Áp dụng hai migration ngày 15/11 nếu chưa có, rồi `20261116093000_atomic_question_creation_history.sql`, trước backend mới và frontend. Xác nhận RPC `create_shared_question_with_history(uuid,jsonb)` tồn tại, chỉ service_role có quyền execute, và service_role có các quyền bảng cần thiết cho RPC SECURITY INVOKER. Chưa thực hiện bước này trên live trong phiên sửa code.
3. Sau khi quota/provider khả dụng, dùng tài khoản Content Manager kiểm tra một yêu cầu thật qua API có xác thực và hoàn tất luồng duyệt/lịch sử trên trình duyệt. Tự duyệt của Content Manager/admin vẫn giữ tương thích; chưa có quyết định thay đổi thành hai người khác nhau.
4. Chỉ đánh dấu nghiệm thu hoàn tất sau khi các ca live đạt. Không coi build/mock/PGlite là bằng chứng provider thật đã hoạt động.

Các lệnh tái kiểm tra từ thư mục gốc:

```powershell
npm run test --workspace backend -- --no-file-parallelism src/modules/ai/ai.service.spec.ts src/modules/ai/ai-authoring.service.spec.ts src/modules/ai/ai-authoring.guard.spec.ts src/modules/questions src/modules/practice src/modules/quizzes
npm run build --workspace backend
npm run build --workspace frontend
npm run lint --workspace frontend -- src/app/content-manager/ai/question-generator/page.tsx src/lib/ai-question-drafts.ts
```

[Script browser](../scripts/verify-ai-question-generator.mjs) dùng Playwright/Chromium có sẵn, chặn toàn bộ `/api/v1/**` bằng fixture và không ghi live. Chạy server frontend ở port 3200, rồi `node scripts/verify-ai-question-generator.mjs`; có thể đặt `PLAYWRIGHT_MODULE`, `CHROME_PATH`, `AUTHORING_UI_URL` theo môi trường. Browser fixture mô phỏng lỗi mạng và HTTP 400 có chủ đích.

[Script provider](../scripts/verify-ai-question-provider.mjs) chỉ đọc một bài học từ Supabase và gọi service tối đa một yêu cầu, không lưu câu: `node --env-file=backend/.env scripts/verify-ai-question-provider.mjs`. Chỉ chạy sau khi build backend và khi cần xác nhận provider đã được khôi phục; đây không phải test API có xác thực.

Cấu hình tùy chọn: `AI_QUESTION_MODEL`, `AI_QUESTION_OPENAI_MODEL`, `AI_QUESTION_MIN_SOURCE_CHARS` (mặc định 40 ký tự chữ/số trong phần nội dung, không tính metadata). Cấu hình riêng trên máy đã đặt `AI_QUESTION_MODEL=gemini-3.5-flash-lite` sau khi kiểm chứng sinh thật thành công. `.env` vẫn được gitignore; không đưa file môi trường hoặc khóa bí mật vào mã nguồn.


## Kiểm chứng bổ sung khi tiếp tục triển khai

- Đọc metadata Supabase live lúc 15:26 ngày 16/11/2026 (UTC+7): có `save_ai_question_drafts`, `update_shared_question_with_history`, `transition_shared_question_with_history`; chưa có `create_shared_question_with_history`. Đọc toàn bộ sự kiện created trả 0 dòng, không có bản ghi created trùng. Đây là kiểm tra chỉ đọc, không chứng minh đã áp dụng migration mới.
- Danh sách model của cả Gemini/OpenAI trả HTTP 200. Alias Gemini đang dùng vẫn trả 503 khi sinh; OpenAI trả `429/credit_balance_exhausted`. Thử có kiểm soát `gemini-3.5-flash-lite`, là model có trong danh sách được phép, phát hiện request Gemini chưa truyền schema dù prompt nói có schema.
- Đã sửa adapter: truyền `responseJsonSchema` ràng buộc count/type/difficulty; đọc đủ các text part kết quả, bỏ thought part; không nhận output chưa kết thúc hoàn chỉnh. Parser ghi mã lỗi cấu trúc an toàn, không log văn bản nguồn/câu trả lời. Hai ca hồi quy mới tái hiện thiếu schema và đọc thiếu text part trước khi sửa, sau sửa đã qua. Contract structured output đối chiếu [Gemini API reference](https://aistudio.google.com/api-reference/generate-content).
- Lúc 15:56 ngày 16/11/2026 (UTC+7), một yêu cầu service thực với bài học Supabase thật thành công: `count=1`, `single_choice`, `easy`, nguồn khớp. OpenAI được tắt trong lần xác nhận này bằng `AUTHORING_SMOKE_GEMINI_ONLY=1`; không lưu câu hoặc tạo dữ liệu live. Đã cập nhật model trong cấu hình riêng trên máy; chưa coi đây là nghiệm thu API có đăng nhập.
- [Kiểm thử PostgreSQL thật](../scripts/verify-ai-question-postgres.mjs) đã qua 8 nhóm ca trên cluster PostgreSQL 17 riêng ở loopback, không dùng `culinary_blog_db`: hai phiên độc lập thực sự cùng chờ advisory lock; exact retry trả cùng ID và số dòng câu/options/history là 2/4/2; payload khác bị conflict; lỗi history rollback AI/thủ công; quyền RPC service_role/anon/authenticated; sửa → gửi duyệt → trả lại → sửa → gửi duyệt → duyệt giữ đủ 7 sự kiện; version cũ bị từ chối. Cluster được dừng sau test.

### Cổng triển khai còn thiếu

Phiên làm việc chưa có `DATABASE_URL`, `SUPABASE_DB_URL` hoặc kết nối quản trị Supabase. Khóa Data API hiện tại chỉ gọi được các RPC đã có, không cho chạy DDL tùy ý. Kết nối PostgreSQL tìm thấy trong VS Code là `localhost:5433/culinary_blog_db`, không phải Supabase của LearningProject; không dùng kết nối đó để triển khai.

[Script triển khai](../scripts/deploy-ai-question-authoring.mjs) mặc định chỉ kiểm tra đọc. Nó đối chiếu project của DSN với `SUPABASE_URL`, từ chối localhost/database dự án khác, audit legacy, và chỉ áp dụng migration additive khi có `--apply`. Transaction có lock/statement timeout và kiểm tra quyền RPC trước commit; không xóa hoặc phục dựng lịch sử legacy.

Sau khi cấp DSN riêng trong `backend/.env` (không gửi mật khẩu/token vào chat), với package `pg` có sẵn hoặc `PG_CLIENT_MODULE` trỏ tới package đã cài:

```powershell
node --env-file=backend/.env scripts/deploy-ai-question-authoring.mjs
node --env-file=backend/.env scripts/deploy-ai-question-authoring.mjs --apply
node --env-file=backend/.env scripts/inspect-ai-authoring-deployment.mjs
```

Vẫn chưa đóng kế hoạch cho đến khi migration được áp dụng và kiểm chứng trên đúng Supabase, cùng luồng HTTP có xác thực và trình duyệt từ lưu đến duyệt/lịch sử. Sinh qua service và test database riêng không thay thế các bước này.


## Thông báo giới hạn khi nghiệm thu lúc 23:30 ngày 16/11/2026

Một yêu cầu service thực với cấu hình hiện tại tái hiện: Gemini `gemini-3.5-flash-lite` trả HTTP 503; OpenAI dự phòng trả HTTP 429, code `credit_balance_exhausted`. Thông báo “đã đạt giới hạn” trước đó ưu tiên quota của fallback nên che mất tình trạng quá tải của provider chính. Không coi đây là bằng chứng tài khoản Content Manager vượt mức ba yêu cầu/phút.

Đã sửa tổng hợp lỗi theo từng request và những provider đang cooldown có liên quan. Lỗi quá tải/tạm không sẵn sàng/đầu ra sai được giữ riêng, không bị quota của fallback thay thế. Chỉ khi các lựa chọn còn lại thực sự bị quota/rate limit mới trả thông báo giới hạn tương ứng. Mỗi request vẫn tối đa hai call, timeout/cooldown và giới hạn ba request/phút giữ nguyên.

| Mã API | Ý nghĩa |
| --- | --- |
| `AI_AUTHORING_RATE_LIMIT` | Content Manager đã gửi ba yêu cầu trong một phút; HTTP 429. |
| `AI_AUTHORING_BUSY` | Yêu cầu đang chạy hoặc toàn tiến trình đang bận; HTTP 429. |
| `AI_PROVIDER_OVERLOADED` | Provider tạm quá tải; HTTP 503. |
| `AI_PROVIDER_UNAVAILABLE` | Provider hoặc kết nối tạm không sẵn sàng; HTTP 503. |
| `AI_OUTPUT_INVALID` | Provider trả câu hỏi không hợp lệ; HTTP 503. |
| `AI_PROVIDER_RATE_LIMIT` | Provider giới hạn tần suất; HTTP 503. |
| `AI_PROVIDER_QUOTA` | Các provider khả dụng còn lại bị hạn mức; HTTP 503. |

Ba ca hồi quy mới tái hiện lỗi trước sửa, sau sửa qua; tổng 20 test AI authoring/practice liên quan và backend build qua. Một lần thử có kiểm soát `gemini-2.5-flash-lite` trả HTTP 404; không đổi cấu hình sang model đó, không tiếp tục thử nhiều model. Tại thời điểm kiểm tra này chưa khôi phục được sinh thật; lần thành công trước đó không chứng minh provider luôn khả dụng.


## Khắc phục nút gửi duyệt của câu đã lưu

Khi nghiệm thu câu AI mới ngày 16/11/2026, metadata chỉ đọc cho thấy câu mới nhất ở `draft`, version 1, `submitted_for_review_at=null`. Đọc giao diện phát hiện nhánh `editor?id=...` chỉ có nút cập nhật và giấu nút Gửi duyệt; vì vậy câu AI đã lưu không có đường gửi duyệt tại editor như hướng dẫn.

Đã đưa nút Gửi duyệt ra ngoài nhánh tạo/sửa để cả câu đã lưu và câu mới đều gửi được. Thao tác gửi vẫn lưu nội dung hiện tại rồi gọi submit-review với version vừa lưu; giữ ngay id/version nếu bước submit thất bại để lần retry không dùng version cũ hoặc tạo trùng câu. Các nút lưu/gửi dùng chung khóa thao tác, không cho lưu/gửi chồng nhau; gửi thành công chuyển tới hàng chờ duyệt.

Màn review chỉ hiện Duyệt/Từ chối cho draft đã có thời điểm gửi. Draft chưa gửi ở tab Tất cả có hướng dẫn và liên kết Mở để gửi duyệt. Nhãn phân biệt Bản nháp/Chờ duyệt; các lỗi chưa gửi/version cũ có thông báo tiếng Việt.

Hai ca render giao diện xác nhận Gửi duyệt có mặt ở cả URL editor có id và editor tạo mới. Ca câu đã lưu thất bại trước sửa và qua sau sửa. Cùng năm test QuestionsService liên quan, tổng 7 test qua; lint các file sửa và build frontend qua. Chưa ghi thay đổi trạng thái hoặc duyệt thay người dùng trên Supabase khi sửa UI này; cần tiếp tục nghiệm thu bằng phiên Content Manager đang đăng nhập.

## Kiểm chứng ba phạm vi ngày 17/11/2026

Kiểm chứng sau cập nhật: 91/91 kiểm thử trong 13 file liên quan qua (AI, quyền, phạm vi, nguồn, UI, lưu/duyệt và hồi quy Practice); lint các file frontend thay đổi và build backend/frontend qua. Khoảng 00:12 ngày 17/11/2026 (UTC+7), script `AUTHORING_SMOKE_SCOPE=course AUTHORING_SMOKE_GEMINI_ONLY=1 node --env-file=backend/.env scripts/verify-ai-question-provider.mjs` sinh thành công một câu single_choice/easy qua Gemini thật từ Supabase thật, xác nhận câu thuộc khóa và bài học trong danh sách nguồn. Đây là kiểm chứng service chỉ đọc, không ghi DB; chưa phải nghiệm thu toàn luồng HTTP có đăng nhập và duyệt trên trình duyệt. Phạm vi chương/bài được kiểm bằng kiểm thử tự động; không gọi provider thật thêm cho hai phạm vi này.

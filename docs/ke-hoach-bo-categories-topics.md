# Kế hoạch tinh gọn cấu trúc nội dung C#

Ngày khảo sát: 21/10/2026. Phần thay `topic` bằng `chapter` đã được cập nhật trong code và ba bảng `topics`, `question_topics`, `lesson_topics` đã xóa trên Supabase ngày 21/10/2026. Phần bỏ `category` vẫn là kế hoạch; 75 câu AI cũ chưa có `chapter_id` cần người biên soạn phân loại.

## 1. Kết quả mong muốn

- Cấu trúc nội dung chính là `courses → chapters → lessons`.
- Dùng `chapter` làm đơn vị kiến thức để phân loại câu hỏi, thống kê phần học yếu và làm nút của bản đồ kiến thức. `lesson_id` tiếp tục là liên kết chi tiết, có thể để trống nếu câu hỏi thuộc cả chương.
- Bỏ `categories`, `topics`, `question_topics`, `lesson_topics`, cùng `courses.category_id`; bỏ các API, kiểu dữ liệu và giao diện quản lý chúng.
- Giữ nguyên ID câu hỏi, quiz, kết quả làm bài, khóa học, chương, bài học và tài khoản. Giữ `questions.course_id` trong đợt này để giới hạn phạm vi sửa code.
- Sau khi phân loại xong, mọi câu hỏi được đưa vào ngân hàng câu hỏi/quiz phải có `chapter_id` hợp lệ và thuộc đúng khóa học.

## 2. Hiện trạng tại thời điểm khảo sát trước khi xóa topic

| Dữ liệu | Hiện trạng |
| --- | --- |
| `categories` | 5 dòng; 1 khóa học có `category_id`. |
| `topics` | 1 dòng; không gắn category. |
| `question_topics` | 3 liên kết, thuộc 3 câu hỏi đã có `chapter_id` và `lesson_id`. |
| `lesson_topics` | 0 dòng. |
| `questions` | 78 dòng; 3 câu có `chapter_id`/`lesson_id`, 75 câu còn lại là câu AI tạo và chưa có chương. |
| Phụ thuộc của 75 câu AI | 64 câu xuất hiện trong 87 chi tiết luyện tập; 10 câu nằm trong quiz; 3 câu xuất hiện trong 6 chi tiết làm quiz. |
| Chương/bài hiện tại | 1 chương “Introduction to C#”, 2 bài học. |

Không gán đồng loạt 75 câu AI vào chương hiện có: nội dung câu hỏi cần được đọc để xác định chương phù hợp. Không xóa hoặc tạo lại các câu hỏi này vì lịch sử luyện tập và quiz đang tham chiếu ID của chúng.

## 3. Các bước thực hiện

### Bước 1 — Kiểm kê và chốt cách phân chương

1. Kiểm kê schema và dữ liệu của `categories`, `topics`, `question_topics`, `lesson_topics`, `courses`, `chapters`, `lessons`, `questions`, các bảng quiz và lịch sử luyện tập; ghi lại số lượng để đối chiếu sau migration.
2. Kiểm tra nội dung 75 câu AI, đề xuất chương tương ứng; người biên soạn xác nhận. Tạo thêm chương nếu chương “Introduction to C#” không phản ánh đúng nội dung. Chỉ chuyển `chapter_id`, giữ nguyên `questions.id` và các liên kết với quiz/lịch sử.
3. Lập danh sách câu chưa thể phân loại để người biên soạn xử lý; không dùng chúng trong tính toán “chương yếu”.

### Bước 2 — Chuyển câu hỏi sang chương

1. Trong backend, bỏ `topic_ids` khỏi DTO và thao tác với `question_topics`; cập nhật danh sách/chi tiết câu hỏi để trả về chương thay cho topic. Khi tạo hoặc duyệt câu hỏi, kiểm tra `chapter_id` thuộc `course_id`. Nếu có `lesson_id`, kiểm tra bài học thuộc đúng chương.
2. Trong giao diện biên soạn câu hỏi, bỏ chọn/tạo topic, giữ chọn khóa học → chương → bài học tùy chọn. Yêu cầu chọn chương trước khi câu hỏi được duyệt/xuất bản.
3. Di chuyển 75 câu cũ theo danh sách đã được xác nhận. Kiểm tra lại câu hỏi đã gắn quiz và lịch sử làm bài sau khi cập nhật.

### Bước 3 — Giữ chức năng luyện tập theo điểm yếu

1. Trong `PracticeService`, thay `getWeakTopics` bằng thống kê theo `questions.chapter_id` từ kết quả quiz và luyện tập. Chỉ tính câu hỏi có chương; hiển thị tỷ lệ đúng và số lần làm theo tên chương.
2. Thay bộ lọc `question_topics` trong chế độ `weak` bằng lọc `questions.chapter_id`. Nếu chưa đủ dữ liệu theo chương, hiển thị thông báo rõ ràng hoặc dùng bộ câu hỏi luyện tập chung theo quy tắc đã chọn.
3. Luồng AI tạo câu luyện tập cần nhận chương được chọn, kiểm tra chương thuộc khóa học, dùng nội dung chương làm ngữ cảnh và lưu `chapter_id` cho câu mới. Không tiếp tục tạo câu `approved` chỉ có `course_id`.
4. Đổi nhãn giao diện “chủ đề yếu/Weak topics” thành “chương cần ôn”; sửa kiểu dữ liệu API tương ứng. Các ô nhập “topic” dạng văn bản tự do ở trang gợi ý AI không phụ thuộc bảng `topics`; đánh giá riêng trước khi đổi tên, không xóa máy móc.

### Bước 4 — Bỏ tầng category

1. Bỏ module `/api/v1/categories`, API client, kiểu `Category`, hai trang quản lý category và mục Categories ở sidebar.
2. Bỏ `category_id` khỏi DTO tạo/sửa khóa học; sửa API danh sách/chi tiết/tạo/sửa khóa học để không truy vấn bảng `categories`.
3. Bỏ bộ lọc, cột, trường chọn category khỏi giao diện khóa học. Giữ nguyên khóa học và các chương/bài đã có.
4. Bỏ các mô tả category trong đặc tả chức năng và ERD.

### Bước 5 — Kiểm thử trước khi đổi schema

- Backend và frontend build thành công; kiểm tra các bài test liên quan câu hỏi, khóa học, quiz và luyện tập.
- Tạo/sửa/xem khóa học, chương, bài học và câu hỏi; câu hỏi mới được gắn đúng chương.
- Người học mở quiz, nộp bài, xem kết quả và luyện tập theo chương yếu; AI tạo câu luyện tập có chương.
- Đối chiếu số câu hỏi, quiz và kết quả làm bài với số liệu trước chuyển đổi. Không có câu hỏi được dùng trong quiz mà thiếu chương.

### Bước 6 — Migration database và kiểm tra sau cùng

1. Chỉ chạy sau khi code mới không còn đọc các bảng/cột cũ và dữ liệu cần giữ đã được phân loại. Kiểm tra khóa ngoại, view, trigger và phụ thuộc trong PostgreSQL.
2. Migration có giao dịch đã bỏ `question_topics`, `lesson_topics`, `topics` trên Supabase. Phần `courses.category_id` và `categories` chưa thực hiện, cần migration riêng sau khi sửa các API và giao diện category. Dùng `RESTRICT` để dừng nếu còn phụ thuộc ngoài phạm vi, không dùng `CASCADE`.
3. Kiểm tra 4 bảng đã biến mất; số bảng `public` từ 21 còn 17 nếu không có thay đổi schema khác. `courses`, `chapters`, `lessons`, `questions`, quiz và bảng kết quả vẫn còn đủ dữ liệu.
4. Cân nhắc đặt `questions.chapter_id` thành `NOT NULL` **sau khi** xác nhận toàn bộ câu hỏi cũ và mọi luồng tạo câu mới đều có chương. Không áp ràng buộc khi vẫn còn 75 câu chưa phân loại.

## 4. Điểm cần giữ đúng phạm vi

- Bản đồ kiến thức sau này có thể hiển thị các chương và quan hệ học trước/học sau; chưa cần thêm bảng kiến thức riêng trong đợt này.
- `materials`, `ai_generated_logs` và các bảng AI Tutor không thuộc phạm vi xóa category/topic.
- Tên và nội dung chương mới cần người biên soạn xác nhận; chương hiện có không đủ để tự động gắn 75 câu AI một cách đáng tin cậy.

## 5. Điều kiện nghiệm thu

- Không còn API hoặc giao diện quản lý category/topic dưới dạng bảng độc lập.
- Mọi câu hỏi được dùng trong quiz/ngân hàng câu hỏi có `chapter_id` hợp lệ; bài học được gắn đúng chương.
- Luyện tập chương yếu dựa trên kết quả thật và không đọc `question_topics`.
- Không mất câu hỏi, quiz, lịch sử làm bài hoặc dữ liệu khóa học/chương/bài học.
- Build backend/frontend và các luồng chính ở Bước 5 chạy thành công sau migration.

Tham khảo thao tác schema: [Supabase — deleting data and dropping objects safely](https://supabase.com/docs/guides/database/postgres/data-deletion), [PostgreSQL — `DROP TABLE`](https://www.postgresql.org/docs/current/sql-droptable.html).

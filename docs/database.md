# Từ điển dữ liệu hiện tại — Phân hệ Nội dung

> **Cập nhật D01 ngày 03/11/2026:** Bảng `discussion_posts`, các ràng buộc, chỉ mục và trigger đã được đối chiếu với Supabase. Migration tái tạo cấu trúc nằm ở `database/migrations/20261103143449_discussion_posts.sql`; xem mục 8 và hợp đồng API tại `docs/d01-thao-luan-api.md`.

> **Cập nhật D02 ngày 06/11/2026:** Migration `database/migrations/20261106140000_discussion_comments.sql` bổ sung bình luận, tìm kiếm toàn văn và chỉ mục cho danh sách thảo luận. Hợp đồng API nằm tại `docs/d02-thao-luan-api.md`.

> **Cập nhật C02 ngày 03/11/2026:** Đã đối chiếu ba bảng `code_exercises`, `code_exercise_revisions`, `code_test_cases` và hàm `save_code_exercise_draft` đang có trên Supabase. Migration tái tạo cấu trúc được lưu tại `database/migrations/20261103135132_code_exercises.sql`; xem mục Phòng thực hành C# bên dưới. Các số liệu trong ảnh chụp ngày 21/10 không bao gồm ba bảng này.

> **Cập nhật 30/10/2026 (duyệt bài cá nhân):** Đã áp dụng `database/migrations/20261030_allow_lesson_author_approval.sql`. Tài khoản `content_manager` hoặc `admin` có thể duyệt bài do chính mình tạo. Vẫn yêu cầu tiêu đề, nội dung, đúng phiên bản và ghi lịch sử duyệt.

> **Cập nhật 30/10/2026:** Đã áp dụng `database/migrations/20261030_lesson_direct_approval.sql`. Bài học đi trực tiếp `draft → approved → published`; thao tác gửi duyệt và trạng thái `in_review` không còn dùng. Bài cũ ở `in_review` được chuyển về `draft` và có sự kiện `workflow_migration` trong lịch sử. Các cột `submitted_by`/`submitted_at` và sự kiện `submit` cũ được giữ để đọc lịch sử.

> **Cập nhật 29/10/2026:** Migration `database/migrations/20261029_lesson_review_workflow.sql` đã thêm `created_by`, `updated_by`, `updated_at`, `version`, `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at` và bảng `lesson_review_events` để lưu hành động, phiên bản, người thực hiện, lý do, thời gian và bản chụp nội dung. Hai hàm `save_lesson_content` và `apply_lesson_review_action` cập nhật cùng lịch sử trong một giao dịch. Các số liệu 17 bảng/129 cột và bảng mô tả cũ bên dưới là ảnh chụp ngày 21/10/2026, chưa bao gồm các migration mới.

**Ngày đối chiếu:** 21/10/2026

**Nguồn:** đối chiếu trực tiếp `pg_catalog` của schema `public` trên Supabase ngày 21/10/2026; mô tả cách sử dụng dựa trên backend tại commit `e19dcb3` của nhánh `main`.
**Phạm vi:** 17 bảng, 129 cột đang tồn tại trong schema `public`. Tài liệu mô tả cấu trúc và mục đích của trường; không chứa dữ liệu cá nhân hay khóa kết nối.

**Trạng thái schema hiện tại:** `courses.category_id` cùng các bảng `categories`, `topics`, `question_topics`, `lesson_topics` đã bị xóa khỏi `public`. Cấu trúc nội dung hiện dùng `courses → chapters → lessons`; câu hỏi được liên kết với chương qua `questions.chapter_id`. Các bảng đăng nhập của Supabase Auth nằm ngoài phạm vi 17 bảng này.

## Cách đọc

- **Bắt buộc** phản ánh ràng buộc `NOT NULL` của database, không nhất thiết là trường người dùng phải nhập. Nhiều trường được database tự điền giá trị mặc định.
- **PK** là khóa chính; **FK** là khóa ngoại được khai báo thật trong PostgreSQL. Những liên kết chỉ được code sử dụng nhưng chưa có FK được ghi rõ.
- FK riêng lẻ chỉ kiểm tra bản ghi được tham chiếu có tồn tại. Ví dụ, database chưa có ràng buộc bảo đảm `questions.chapter_id` thuộc đúng `questions.course_id`, hoặc `questions.lesson_id` thuộc đúng chương; backend phải kiểm tra các quan hệ này.
- `auth.users` thuộc schema `auth` của Supabase, không nằm trong 17 bảng `public`. `profiles.id` dùng cùng ID tài khoản, nhưng schema hiện tại không khai báo FK từ `profiles` sang `auth.users`.
- “Chưa thấy backend truy cập trực tiếp” nghĩa là bảng có trong database nhưng không có lời gọi bảng đó trong `backend/src/modules` ở commit nêu trên; không khẳng định dữ liệu trong bảng là vô dụng.

## Tổng quan quan hệ

```text
auth.users ⇢ profiles
courses → chapters → lessons → materials
courses / chapters / lessons → questions → question_options
courses / chapters → quizzes ↔ questions (qua quiz_questions)
quizzes → quiz_attempts → quiz_attempt_details → quiz_attempt_answers
profiles → practice_attempts → practice_attempt_details → questions
courses → ai_tutor_conversations → ai_tutor_messages
```

Dấu `→` trong sơ đồ chỉ quan hệ nghiệp vụ; xem từng bảng bên dưới để biết quan hệ nào có FK thật.

## 1. Tài khoản

### `profiles` — Hồ sơ và vai trò

Backend xác định quyền `learner`, `content_manager`, `admin` qua bảng này. Thông tin đăng nhập như email và mật khẩu do Supabase Auth quản lý.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID hồ sơ; dùng cùng ID người dùng trong Supabase Auth. |
| `role` | `varchar(20)` | Có | Vai trò phân quyền: `learner`, `content_manager` hoặc `admin`; mặc định `learner`. |
| `failed_login_attempts` | `integer` | Có | Số lần đăng nhập thất bại liên tiếp; mặc định 0. |
| `locked_until` | `timestamptz` | Không | Thời điểm hết khóa đăng nhập tạm thời. |
| `created_at` | `timestamptz` | Có | Thời điểm tạo hồ sơ. |
| `updated_at` | `timestamptz` | Có | Thời điểm cập nhật hồ sơ gần nhất. |

## 2. Khóa học và bài học

### `courses` — Khóa học

Đơn vị nội dung cao nhất đang sử dụng. Một khóa học có nhiều chương; học sinh chỉ thấy khóa học đủ điều kiện xuất bản theo API hiện tại.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID khóa học. |
| `title` | `varchar(255)` | Có | Tên khóa học. |
| `slug` | `varchar(255)`, unique | Có | Mã đường dẫn duy nhất của khóa học. |
| `description` | `text` | Không | Giới thiệu và mục tiêu tổng quát của khóa học. |
| `level` | `varchar(50)` | Không | Mức độ: `beginner`, `intermediate`, `advanced`. |
| `thumbnail_url` | `text` | Không | Đường dẫn ảnh đại diện khóa học. |
| `status` | `varchar(20)` | Không | Trạng thái `draft`, `approved`, `published`; mặc định `draft`. |
| `created_by` | `uuid` | Có | ID tài khoản tạo khóa học; backend tra Supabase Auth, database chưa khai báo FK cho trường này. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo khóa học. |
| `updated_at` | `timestamptz` | Không | Thời điểm cập nhật khóa học gần nhất. |

### `chapters` — Chương

Chia khóa học thành các phần có thứ tự. Chương cũng là đơn vị phân loại câu hỏi và là nơi có thể gắn bài đăng thảo luận.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID chương. |
| `title` | `varchar(255)` | Có | Tên chương. |
| `order_index` | `integer` | Có | Vị trí hiển thị trong khóa học. |
| `status` | `varchar(20)` | Không | Trạng thái `draft`, `approved`, `published`; mặc định `draft`. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo chương. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học chứa chương. |
| `description` | `text` | Không | Tóm tắt nội dung chương. |

### `lessons` — Bài học

Nội dung học cụ thể trong một chương; có thể chứa ví dụ code và gắn tài liệu bổ sung.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID bài học. |
| `title` | `varchar(255)` | Có | Tên bài học. |
| `content` | `text` | Không | Nội dung chính của bài học. |
| `estimated_duration_minutes` | `integer` | Không | Số phút học dự kiến; mặc định 0 và không được âm. |
| `is_required` | `boolean` | Không | Đánh dấu bài học bắt buộc trong lộ trình; mặc định `true`. |
| `counts_toward_progress` | `boolean` | Không | Có tính bài học vào tiến độ hay không; mặc định `true`. |
| `code_example` | `text` | Không | Ví dụ mã nguồn minh họa trong bài. |
| `order_index` | `integer` | Có | Vị trí bài học trong chương. |
| `status` | `varchar(20)` | Không | Trạng thái `draft`, `approved`, `published`; mặc định `draft`. |
| `is_ai_generated` | `boolean` | Không | Đánh dấu bài được AI tạo hoặc hỗ trợ tạo; mặc định `false`. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo bài học. |
| `chapter_id` | `uuid`, FK → `chapters.id` | Có | Chương chứa bài học. |

### `materials` — Tài liệu đính kèm

Lưu siêu dữ liệu của tệp/tài nguyên gắn với bài học. Chưa thấy backend hiện tại truy cập trực tiếp bảng này; `file_url` là đường dẫn tài nguyên, không phải nội dung tệp.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID tài liệu. |
| `title` | `varchar(255)` | Có | Tên tài liệu hiển thị cho học sinh. |
| `file_url` | `text` | Có | Đường dẫn tệp hoặc tài nguyên. |
| `file_type` | `varchar(50)` | Có | Loại tệp/tài nguyên. |
| `file_size` | `bigint` | Không | Kích thước tệp, đơn vị byte nếu có lưu. |
| `created_at` | `timestamptz` | Không | Thời điểm thêm tài liệu. |
| `lesson_id` | `uuid`, FK → `lessons.id` | Có | Bài học sở hữu tài liệu. |

## 3. Câu hỏi và nội dung AI

### `questions` — Ngân hàng câu hỏi

Câu hỏi gắn khóa học và có thể gắn chương, bài học. Câu hỏi mới hoặc được duyệt phải có chương hợp lệ theo backend; `chapter_id` vẫn cho phép `NULL` trong database để giữ câu hỏi cũ chưa phân chương.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID câu hỏi. |
| `question_type` | `varchar(30)` | Không | Loại câu: `single_choice`, `multiple_choice`, `true_false`, `fill_in_blank`. |
| `difficulty` | `varchar(20)` | Không | Độ khó `easy`, `medium`, `hard`. |
| `content` | `text` | Có | Nội dung đề bài/câu hỏi. |
| `explanation` | `text` | Không | Giải thích đáp án sau khi làm bài. |
| `status` | `varchar(20)` | Không | `draft`, `approved` hoặc `rejected`; mặc định `draft`. API chỉ đưa câu đã duyệt vào bài làm phù hợp. |
| `is_ai_generated` | `boolean` | Không | Câu hỏi có nguồn gốc AI hay không; mặc định `false`. |
| `generated_for_user_id` | `uuid`, FK → `profiles.id` | Không | Học viên sở hữu câu luyện tập do AI tạo riêng. `NULL` nghĩa là câu thuộc ngân hàng dùng chung. |
| `ai_practice_set_id` | `uuid`, FK → `ai_practice_sets.id` | Không | Bộ luyện tập AI chứa câu hỏi; `NULL` với câu hỏi không thuộc một bộ AI cá nhân. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo câu hỏi. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học của câu hỏi. |
| `chapter_id` | `uuid`, FK → `chapters.id` | Không | Chương kiến thức của câu hỏi; có thể trống ở dữ liệu cũ. |
| `lesson_id` | `uuid`, FK → `lessons.id` | Không | Bài học liên quan chi tiết, nếu câu hỏi thuộc một bài cụ thể. |

Migration `database/migrations/20261105004802_lesson_ai_practice.sql` thêm quyền sở hữu cho câu AI cá nhân và chỉ mục một phần `(generated_for_user_id, created_at desc)` trên các dòng có chủ sở hữu. Các truy vấn ngân hàng câu hỏi và luyện tập chung phải lọc `generated_for_user_id is null`; API luyện tập AI chỉ trả hoặc chấm câu riêng khi trường này trùng người dùng từ token.

Hàm `save_ai_practice_questions(p_user_id, p_lesson_id, p_questions)` kiểm tra hồ sơ learner, quan hệ khóa học–chương–bài học và trạng thái `published`, sau đó lưu toàn bộ câu hỏi cùng phương án trong một giao dịch. Hàm chạy với quyền người gọi, chỉ cấp `EXECUTE` cho `service_role`; frontend không được gọi trực tiếp và không được tự cung cấp `p_user_id`.

### `question_options` — Phương án trả lời

Một câu hỏi có nhiều phương án. Với `fill_in_blank`, backend hiện dùng nội dung phương án đúng để đối chiếu câu trả lời văn bản.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID phương án. |
| `option_text` | `text` | Có | Nội dung phương án hoặc đáp án văn bản. |
| `is_correct` | `boolean` | Không | Đánh dấu phương án đúng; mặc định `false`. |
| `order_index` | `integer` | Không | Thứ tự hiển thị phương án; mặc định 0. |
| `question_id` | `uuid`, FK → `questions.id` | Có | Câu hỏi sở hữu phương án. |

### `ai_generated_logs` — Bản ghi nội dung AI đề xuất

Schema dành để lưu đầu vào, kết quả thô và trạng thái kiểm tra nội dung AI. Chưa thấy backend hiện tại truy cập trực tiếp bảng này; không xem đây là bằng chứng luồng duyệt AI đã hoạt động hoàn chỉnh.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID bản ghi AI. |
| `prompt_input` | `text` | Có | Yêu cầu đầu vào gửi cho AI. |
| `ai_response_raw` | `text` | Có | Phản hồi nguyên bản từ AI để người biên soạn đối chiếu. |
| `entity_type` | `varchar(50)` | Không | Loại nội dung: `lesson`, `question`, `example`, `explanation`. |
| `target_id` | `uuid` | Có | ID nội dung đích liên quan; không có FK vì có thể trỏ nhiều loại nội dung. |
| `status` | `varchar(20)` | Không | `pending_review`, `approved`, `rejected`, `regenerated`; mặc định `pending_review`. |
| `reviewed_by` | `uuid` | Không | ID người đã kiểm tra nội dung; database chưa khai báo FK. |
| `reviewed_at` | `timestamptz` | Không | Thời điểm kiểm tra/duyệt. |
| `review_notes` | `text` | Không | Nhận xét hoặc lý do trả lại nội dung. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo bản ghi AI. |

## 4. Quiz và kết quả làm bài

### `quizzes` — Đề kiểm tra

Đề thuộc khóa học, có thể gắn một chương. Backend dùng `is_active` để quyết định đề có sẵn cho học sinh hay không.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID đề kiểm tra. |
| `title` | `varchar(255)` | Có | Tên đề. |
| `duration_minutes` | `integer` | Không | Thời lượng làm bài, tính bằng phút; mặc định 15. |
| `pass_percentage` | `numeric` | Không | Ngưỡng phần trăm để đạt, từ 0 đến 100; mặc định 50. |
| `shuffle_questions` | `boolean` | Không | Có trộn thứ tự câu hỏi hay không; mặc định `true`. |
| `shuffle_options` | `boolean` | Không | Có trộn thứ tự phương án hay không; mặc định `true`. |
| `is_active` | `boolean` | Không | Đề đang mở cho học sinh hay không; mặc định `true`. |
| `quiz_type` | `varchar(30)` | Không | `exam` hoặc `exercise`; mặc định `exam`. |
| `is_required` | `boolean` | Không | Đề có bắt buộc trong lộ trình hay không; mặc định `true`. |
| `counts_toward_progress` | `boolean` | Không | Có tính kết quả vào tiến độ hay không; mặc định `true`. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo đề. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học chứa đề. |
| `chapter_id` | `uuid`, FK → `chapters.id` | Không | Chương liên quan, nếu đề giới hạn trong một chương. |

### `quiz_questions` — Câu hỏi thuộc đề

Bảng nối nhiều-nhiều giữa đề và ngân hàng câu hỏi. Cặp `quiz_id` + `question_id` là khóa chính; backend chỉ nhận câu hỏi `approved` khi cấu hình đề.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `score_weight` | `double precision` | Không | Trọng số điểm của câu trong đề; mặc định 1.0. |
| `quiz_id` | `uuid`, PK/FK → `quizzes.id` | Có | Đề chứa câu hỏi. |
| `question_id` | `uuid`, PK/FK → `questions.id` | Có | Câu hỏi được đưa vào đề. |

### `quiz_attempts` — Lượt làm đề

Mỗi dòng là một lần học sinh bắt đầu/làm xong một đề; kết quả tổng hợp được lưu sau khi nộp.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID lượt làm đề. |
| `started_at` | `timestamptz` | Không | Thời điểm bắt đầu; mặc định thời điểm tạo. |
| `completed_at` | `timestamptz` | Không | Thời điểm nộp bài; `NULL` nếu đang làm dở. |
| `total_score` | `double precision` | Không | Tổng điểm đạt được theo trọng số câu hỏi, không phải phần trăm. |
| `pass_percentage` | `numeric` | Không | Ngưỡng đạt được lưu cùng lượt làm; mặc định 50. |
| `is_passed` | `boolean` | Không | Kết quả đạt/chưa đạt; mặc định `false`. |
| `user_id` | `uuid` | Có | ID học sinh làm đề; backend đối chiếu tài khoản, database chưa khai báo FK cho trường này. |
| `quiz_id` | `uuid`, FK → `quizzes.id` | Có | Đề được làm. |

### `quiz_attempt_details` — Kết quả từng câu trong lượt làm đề

Mỗi dòng lưu câu hỏi, câu trả lời văn bản và kết quả chấm trong một lượt làm đề.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID chi tiết lượt làm. |
| `answer_text` | `text` | Không | Câu trả lời dạng văn bản, nếu có. |
| `is_correct` | `boolean` | Có | Câu trả lời đúng hay sai. |
| `ai_feedback` | `text` | Không | Phản hồi AI cho câu trả lời nếu được tạo; backend hiện ghi `NULL` khi nộp quiz. |
| `attempt_id` | `uuid`, FK → `quiz_attempts.id` | Có | Lượt làm đề chứa câu trả lời. |
| `question_id` | `uuid`, FK → `questions.id` | Có | Câu hỏi được trả lời. |

### `quiz_attempt_answers` — Phương án đã chọn trong quiz

Lưu từng phương án trắc nghiệm được học sinh chọn cho một câu trả lời. Cặp `detail_id` + `option_id` không được lặp lại.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID dòng phương án được chọn. |
| `detail_id` | `uuid`, FK → `quiz_attempt_details.id` | Có | Chi tiết lượt làm chứa lựa chọn. |
| `option_id` | `uuid`, FK → `question_options.id` | Có | Phương án học sinh đã chọn. |

## 5. Luyện tập câu hỏi

### `ai_practice_sets` — Bộ luyện tập AI cá nhân

Mỗi dòng đại diện cho một lần học viên yêu cầu AI tạo câu hỏi từ một bài học. Bộ được liệt kê theo chương nhưng câu hỏi chỉ lấy context từ `lesson_id`. Backend luôn lọc đồng thời `user_id` và ID bộ/chương; UUID không thay thế kiểm tra quyền sở hữu.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID bộ luyện tập AI. |
| `user_id` | `uuid`, FK → `profiles.id` | Có | Học viên sở hữu bộ; không nhận giá trị này từ frontend. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học suy ra từ bài học. |
| `chapter_id` | `uuid`, FK → `chapters.id` | Có | Chương dùng để liệt kê các bộ. |
| `lesson_id` | `uuid`, FK → `lessons.id` | Có | Bài học duy nhất cung cấp context cho AI. |
| `status` | `text` | Có | `generating`, `ready` hoặc `failed`. |
| `difficulty` | `text` | Có | `easy`, `medium`, `hard` hoặc `mixed`. |
| `requested_count` | `integer` | Có | Số câu yêu cầu, từ 3 đến 10. |
| `generated_count` | `integer` | Có | Số câu đã lưu thành công. |
| `prompt` | `text` | Không | Yêu cầu bổ sung, tối đa 500 ký tự. |
| `error_code` | `text` | Không | Mã lỗi an toàn để hiển thị trạng thái, không chứa lỗi provider thô. |
| `attempt_count` | `integer` | Có | Số lần backend đã thử tạo bộ. |
| `created_at` | `timestamptz` | Có | Thời điểm tạo card. |
| `processing_started_at` | `timestamptz` | Không | Thời điểm bắt đầu lần xử lý gần nhất. |
| `completed_at` | `timestamptz` | Không | Thời điểm bộ chuyển sang `ready` hoặc `failed`. |

Migration `database/migrations/20261105231314_ai_practice_sets.sql` bật RLS, cho authenticated user chỉ đọc metadata bộ của chính họ, không cấp quyền ghi trực tiếp cho frontend và dùng `ON DELETE RESTRICT`. Hàm `save_ai_practice_set_questions(p_user_id, p_set_id, p_questions)` lưu toàn bộ câu hỏi/phương án rồi chuyển bộ sang `ready` trong cùng một transaction; chỉ `service_role` được gọi hàm.

### `practice_attempts` — Lượt luyện tập

Khác với bài thực hành viết code C#: đây là lượt luyện **câu hỏi** theo chế độ nhanh, chương yếu, khóa học hoặc AI.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID lượt luyện tập. |
| `user_id` | `uuid`, FK → `profiles.id` | Có | Học sinh thực hiện lượt luyện tập. |
| `mode` | `varchar(20)` | Có | Chế độ `quick`, `weak`, `course`, `ai`. |
| `course_id` | `uuid`, FK → `courses.id` | Không | Khóa học dùng để giới hạn câu hỏi; nếu xóa khóa học, FK đặt trường này thành `NULL`. |
| `total_questions` | `integer` | Có | Số câu dự kiến trong lượt luyện; mặc định 0. |
| `correct_answers` | `integer` | Có | Số câu trả lời đúng khi hoàn thành; mặc định 0. |
| `score_percentage` | `numeric(5,2)` | Không | Tỷ lệ đúng từ 0 đến 100. |
| `started_at` | `timestamptz` | Có | Thời điểm bắt đầu; mặc định thời điểm tạo. |
| `completed_at` | `timestamptz` | Không | Thời điểm hoàn thành; `NULL` nếu còn làm dở. |

### `practice_attempt_details` — Kết quả từng câu luyện tập

Mỗi dòng gắn một câu hỏi với một lượt luyện tập. Cặp `attempt_id` + `question_id` là duy nhất để backend có thể cập nhật câu trả lời.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID chi tiết câu luyện tập. |
| `attempt_id` | `uuid`, FK → `practice_attempts.id` | Có | Lượt luyện chứa câu hỏi; xóa lượt sẽ xóa chi tiết theo FK. |
| `question_id` | `uuid`, FK → `questions.id` | Có | Câu hỏi được luyện. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học của câu hỏi tại thời điểm lưu câu trả lời. |
| `answer_text` | `text` | Không | Câu trả lời văn bản nếu là dạng điền đáp án. |
| `selected_option_ids` | `jsonb` | Có | Danh sách ID phương án học sinh chọn; mặc định mảng rỗng `[]`. |
| `is_correct` | `boolean` | Có | Kết quả đúng/sai của câu. |
| `created_at` | `timestamptz` | Có | Thời điểm ghi chi tiết câu luyện tập. |

## 6. AI Tutor

### `ai_tutor_conversations` — Cuộc trò chuyện

Nhóm các tin nhắn của một học sinh. Backend hiện gắn cuộc trò chuyện với một khóa học để có ngữ cảnh; khi dùng ngữ cảnh của toàn bộ khóa học, nó lưu ID khóa học đầu tiên trong danh sách.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID cuộc trò chuyện. |
| `title` | `varchar(255)` | Không | Tiêu đề; mặc định “Cuộc trò chuyện mới”. |
| `created_at` | `timestamptz` | Không | Thời điểm bắt đầu cuộc trò chuyện. |
| `user_id` | `uuid` | Có | ID học sinh sở hữu cuộc trò chuyện; backend lọc theo tài khoản, database chưa khai báo FK. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học dùng làm liên kết/ngữ cảnh của cuộc trò chuyện. |

### `ai_tutor_messages` — Tin nhắn trong cuộc trò chuyện

Lưu câu hỏi của học sinh, câu trả lời AI và vai trò người gửi. Backend hiện mã hóa `message_content` trước khi ghi, giải mã khi trả lịch sử cho đúng chủ tài khoản.

| Trường | Kiểu | Bắt buộc | Chức năng |
| --- | --- | --- | --- |
| `id` | `uuid`, PK | Có | ID tin nhắn. |
| `sender_role` | `varchar(20)` | Không | Vai trò gửi: `user`, `assistant`, `system`. |
| `message_content` | `text` | Có | Nội dung tin nhắn; với luồng backend hiện tại là dữ liệu đã mã hóa khi lưu. |
| `is_hint_only` | `boolean` | Không | Cờ đánh dấu phản hồi chỉ là gợi ý; mặc định `false`. |
| `created_at` | `timestamptz` | Không | Thời điểm gửi/lưu tin nhắn. |
| `conversation_id` | `uuid`, FK → `ai_tutor_conversations.id` | Có | Cuộc trò chuyện chứa tin nhắn. |

## 7. Phòng thực hành C# — C02/C06

Migration `database/migrations/20261103135132_code_exercises.sql` bổ sung ba bảng và hàm lưu nháp. Cần có sẵn `public.profiles(id, role)`, `public.lessons(id)` và các role Supabase `anon`, `authenticated`, `service_role`. Migration có thể chạy lại trên schema C02 hiện tại mà không xóa dữ liệu.

| Bảng | Trường và ràng buộc chính |
| --- | --- |
| `code_exercises` | `id` UUID; `lesson_id` FK → `lessons`; `created_by` FK → `profiles`; `published_revision_id`; `archived_at`; `created_at`, `updated_at`. FK ghép bảo đảm phiên bản xuất bản thuộc đúng bài. |
| `code_exercise_revisions` | `id`, `exercise_id`, `revision_no`, `edit_version`; tiêu đề, mục tiêu, mô tả, độ khó `easy/medium/hard`, định dạng đầu vào/đầu ra, mã khởi đầu, `hint_1/2/3`, mã và giải thích lời giải; trạng thái `draft/published/superseded`; thời điểm tạo/cập nhật. Mỗi bài chỉ có tối đa một nháp và một bản xuất bản. |
| `code_test_cases` | `id`, `revision_id`, `input_text`, `expected_output`, `is_public`, `order_index`, `created_at`. Thứ tự phải dương và duy nhất trong từng phiên bản; đầu vào/đầu ra cho phép rỗng và được giữ nguyên xuống dòng. |

`save_code_exercise_draft(p_actor_id, p_payload, p_exercise_id, p_expected_version)` lưu nội dung và toàn bộ bộ kiểm tra trong một giao dịch. Bài mới luôn là nháp. Khi cập nhật nháp, truyền `edit_version` hiện tại; khi tạo bài hoặc tạo nháp mới từ bài đã xuất bản, truyền `0`. Hàm khóa bài/nháp, tăng phiên bản khi lưu, từ chối lưu cũ (`PT409`), sai chủ sở hữu (`42501`), bài/bài học không tồn tại (`P0002`) và bài đã lưu trữ (`PT409`). Sửa bài đã xuất bản tạo phiên bản nháp mới, giữ nguyên nội dung/bộ kiểm tra đang xuất bản. `test_cases` là danh sách thay thế toàn bộ; bỏ trường này tương đương danh sách rỗng.

Ba bảng bật RLS và không cấp quyền cho `anon`/`authenticated`; RPC cũng chỉ cấp `EXECUTE` cho `service_role`. Backend lấy người thực hiện từ token, kiểm tra vai trò `content_manager/admin`, giới hạn người biên soạn với bài của mình. Không gọi RPC từ frontend hoặc tin `p_actor_id` do trình duyệt gửi. Xóa bài qua API là cập nhật `archived_at`, giữ các phiên bản và bộ kiểm tra.

Kiểm thử tự động nằm ở `backend/src/modules/code-exercises/`: test service, validation DTO và PostgreSQL cô lập bằng PGlite. Test database chạy chính tệp migration trên database mới, thử chạy lại khi đã có dữ liệu, kiểm tra lưu nháp, giao dịch rollback, phiên bản, quyền truy cập và bảo toàn bản xuất bản; không cần thông tin kết nối Supabase. Chạy `npm test -w backend -- src/modules/code-exercises` hoặc toàn bộ `npm test -w backend`.

Migration C06 `database/migrations/20261106160000_code_exercise_progress.sql` bổ sung `code_exercise_progress`, lưu một bản mã hiện hành cho mỗi cặp `(learner_id, exercise_id)`. Bảng giữ `saved_code` kể cả chuỗi rỗng, revision nhìn thấy gần nhất, revision đã hoàn thành, trạng thái, số lần chạy, mức gợi ý và `save_version` dùng khóa lạc quan. FK ghép bảo đảm revision thuộc đúng bài; giới hạn mã là 100.000 ký tự. Dữ liệu không bị xóa khi chạy lại migration.

`list_learner_code_exercises(...)` thực hiện tìm kiếm, lọc cây nội dung/độ khó/tiến độ và phân trang con trỏ ngay trong PostgreSQL; chỉ trả bài, revision và cây khóa học đang xuất bản. `save_learner_code_progress(...)` kiểm tra vai trò learner, khóa dòng hiện hành, từ chối version cũ bằng `PT409` rồi lưu nguyên tử. Cả hai RPC là `SECURITY INVOKER`, thu hồi quyền của `PUBLIC`, `anon`, `authenticated` và chỉ cấp `service_role`. API learner không trả test ẩn, gợi ý hoặc lời giải.

## 8. Bài đăng thảo luận — D01

`discussion_posts` gồm `id`, `chapter_id` bắt buộc, `lesson_id` tùy chọn, `author_id`, `post_type` (`question/note/resource`), `title`, `content`, `resource_url`, `status` (`visible/hidden/removed`), `created_at`, `updated_at`, `deleted_at`. Các ID liên kết có FK đến `chapters`, `lessons`, `profiles` với `ON DELETE RESTRICT` để giữ lịch sử. Khi tạo qua API, chỉ gửi một trong `chapter_id`/`lesson_id`; backend xác định chương từ bài học nếu cần.

Tiêu đề sau khi bỏ khoảng trắng đầu/cuối dài 5–160 ký tự, nội dung dài 10–20.000 ký tự. Bài `resource` phải có URL HTTPS tối đa 2.000 ký tự; bài `question/note` không có `resource_url`. Trigger `validate_discussion_post_target` kiểm tra chương/khóa học đã xuất bản và bài học thuộc đúng chương, đã xuất bản khi tạo hoặc đổi vị trí bài đăng. Backend kiểm tra lại toàn bộ trạng thái xuất bản trước khi sửa nội dung.

Bảng bật RLS và không cho `anon`/`authenticated` truy cập trực tiếp; chỉ backend dùng `service_role` và lọc theo tác giả lấy từ token. Sửa/xóa chỉ áp dụng bài `visible` chưa bị xóa; xóa mềm bằng `deleted_at` giữ nội dung cũ. Tác giả vẫn có thể xóa bài đang hiển thị của mình sau khi khóa học bị thu hồi, nhưng không thể sửa hoặc tạo thêm. Các chỉ mục hỗ trợ tra cứu theo chương, bài học và tác giả. Migration có thể chạy lại mà không xóa bài đăng đã có.

Test D01 gồm validation DTO, service và service chạy trên PostgreSQL cô lập bằng PGlite với chính migration đã lưu. Chạy `npm test -w backend -- src/modules/discussion`; không cần Supabase token hoặc database thật.

## 9. Danh sách thảo luận và bình luận — D02

Migration `database/migrations/20261106140000_discussion_comments.sql` tạo bảng `discussion_comments` gồm `id`, `post_id`, `author_id`, `content`, `status`, `created_at`, `updated_at`, `deleted_at`. `post_id` và `author_id` có FK `ON DELETE RESTRICT` tới `discussion_posts` và `profiles` để giữ lịch sử. Nội dung sau trim dài 1–5.000 ký tự; trạng thái dùng chung `visible/hidden/removed`.

Bình luận được đọc theo `(post_id, created_at, id)` và chỉ hiển thị khi `status = 'visible'` cùng `deleted_at IS NULL`. Chỉ mục một phần `idx_discussion_comments_post_visible` hỗ trợ đúng truy vấn này; `author_id` có chỉ mục riêng. Xóa từ API chỉ cập nhật `deleted_at` và `updated_at`.

Migration cũng thêm cột sinh `discussion_posts.search_vector` bằng `to_tsvector('simple', title || content)` và GIN index một phần cho bài còn hiển thị. API luôn giới hạn tìm kiếm trong một chương hoặc bài học và phân trang theo con trỏ `(created_at, id)`.

`discussion_comments` bật RLS, thu hồi toàn bộ quyền của `PUBLIC`, `anon`, `authenticated` và chỉ cấp `SELECT/INSERT/UPDATE` cho `service_role`. Frontend gọi NestJS; backend lấy tác giả từ token và kiểm tra bài cha, trạng thái xuất bản cùng quyền sở hữu trước khi ghi.

Test D02 chạy cả migration D01/D02 trên PGlite, kiểm tra chạy lại migration không mất dữ liệu, tìm kiếm, số bình luận, thứ tự, quyền tác giả, xóa mềm, nội dung bị ẩn/thu hồi và quyền database. Chạy `npm test -w backend -- src/modules/discussion`.

## 10. Đánh dấu hữu ích bài đăng và bình luận — D03

Migration `database/migrations/20261108161402_discussion_helpful_votes.sql` lưu lại hai bảng và hai RPC đã có trên Supabase:

| Bảng | Khóa chính | Liên kết |
| --- | --- | --- |
| `discussion_post_helpful_votes` | `(post_id, user_id)` | FK tới `discussion_posts` và `profiles`, `ON DELETE CASCADE`. |
| `discussion_comment_helpful_votes` | `(comment_id, user_id)` | FK tới `discussion_comments` và `profiles`, `ON DELETE CASCADE`. |

Mỗi dòng có `created_at`; khóa chính ghép chống tính trùng kể cả khi gửi đồng thời. Khóa chính hỗ trợ đếm theo nội dung và có thêm chỉ mục theo `user_id`. API đánh dấu dùng `ON CONFLICT DO NOTHING`, bỏ đánh dấu chỉ xóa cặp nội dung/tài khoản của người gọi. Xóa mềm/ẩn/gỡ nội dung giữ các lượt cũ trong database nhưng không trả chúng trong thống kê hiển thị.

`discussion_post_helpful_stats(p_ids, p_user_id)` và `discussion_comment_helpful_stats(p_ids, p_user_id)` trả `target_id`, `helpful_count` và `is_helpful` cho nội dung còn hiển thị dưới cây khóa học đã xuất bản. Hàm bình luận còn kiểm tra bài đăng cha. Không có lượt nào vẫn trả count 0 và false; nội dung không khả dụng không có dòng trong kết quả. Cả hai hàm là `STABLE`, `SECURITY INVOKER`, có `search_path` rỗng.

Hai bảng bật RLS; `PUBLIC`, `anon`, `authenticated` không được truy cập bảng hay gọi RPC trực tiếp. Backend `service_role` được cấp `SELECT/INSERT/DELETE` và `EXECUTE` RPC; danh tính được lấy từ token tại NestJS. Migration có thể chạy lại mà không xóa lượt đánh dấu đã có.

Test D03 dùng chính các migration D01/D02/D03 trên PGlite và service thật để kiểm tra chống trùng, nhiều tài khoản, bỏ đánh dấu, nội dung ẩn/xóa/thu hồi, quyền database và giữ dữ liệu khi chạy lại migration. Test riêng còn kiểm tra dữ liệu ID, lỗi truy vấn và danh tính/role tại controller. Chạy `npm test -w backend -- src/modules/discussion/discussion-helpful`. Hợp đồng API nằm ở `docs/d03-huu-ich-api.md`.

## Những phần chưa có bảng riêng

- C06 đã có bảng **tiến độ và mã gần nhất của bài viết code** ở mục 7. Chưa có bảng lịch sử **bài nộp code**; `practice_attempts` vẫn chỉ lưu luyện câu hỏi.
- D01/D02/D03 đã có bảng **bài đăng, bình luận và lượt hữu ích** ở mục 8–10; chưa có bảng báo cáo nội dung.
- Chưa có bảng tiến độ đọc bài học riêng trong 17 bảng `public` đang tồn tại. Không suy ra học sinh đã học xong bài chỉ từ bảng `lessons`.

Khi thêm tính năng hoặc migration, cần đọc lại schema Supabase và cập nhật tài liệu này cùng PR tương ứng.

## Course and chapter review

Courses, chapters, and lessons use draft, pproved, and published review states. A learner can access a lesson only when its course, chapter, and lesson are all published. Publishing a chapter requires every lesson in it to be approved or published; publishing a course requires every chapter and lesson to be approved or published. See database/migrations/20261030_course_chapter_review_status.sql.

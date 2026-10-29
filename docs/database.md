# Từ điển dữ liệu hiện tại — Phân hệ Nội dung

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
| `status` | `varchar(20)` | Không | `draft` hoặc `approved`; mặc định `draft`. API chỉ đưa câu đã duyệt vào bài làm phù hợp. |
| `is_ai_generated` | `boolean` | Không | Câu hỏi có nguồn gốc AI hay không; mặc định `false`. |
| `created_at` | `timestamptz` | Không | Thời điểm tạo câu hỏi. |
| `course_id` | `uuid`, FK → `courses.id` | Có | Khóa học của câu hỏi. |
| `chapter_id` | `uuid`, FK → `chapters.id` | Không | Chương kiến thức của câu hỏi; có thể trống ở dữ liệu cũ. |
| `lesson_id` | `uuid`, FK → `lessons.id` | Không | Bài học liên quan chi tiết, nếu câu hỏi thuộc một bài cụ thể. |

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

## Những phần chưa có bảng riêng

- Chưa có bảng lưu **bài thực hành viết code C#**, bộ kiểm tra code, bài nộp code hoặc tiến độ làm code. `practice_attempts` hiện chỉ lưu luyện câu hỏi.
- Chưa có bảng lưu **bài đăng thảo luận**, bình luận, đánh dấu hữu ích hoặc báo cáo nội dung.
- Chưa có bảng tiến độ đọc bài học riêng trong 17 bảng `public` đang tồn tại. Không suy ra học sinh đã học xong bài chỉ từ bảng `lessons`.

Khi thêm tính năng hoặc migration, cần đọc lại schema Supabase và cập nhật tài liệu này cùng PR tương ứng.

## Course and chapter review

Courses, chapters, and lessons use draft, pproved, and published review states. A learner can access a lesson only when its course, chapter, and lesson are all published. Publishing a chapter requires every lesson in it to be approved or published; publishing a course requires every chapter and lesson to be approved or published. See database/migrations/20261030_course_chapter_review_status.sql.

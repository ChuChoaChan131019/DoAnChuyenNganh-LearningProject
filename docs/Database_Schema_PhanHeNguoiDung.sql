-- Database_Schema_PhanHeNguoiDung.sql
-- Phân hệ Người dùng - Hệ thống Hỗ trợ Tự học
-- Phiên bản: V1.0
-- Hệ quản trị: PostgreSQL (Supabase)
-- Ngày tạo: 2026-09-05
-- ============================================================

-- ============================================================
-- 0. BẬT TIỆN ÍCH MỞ RỘNG (Extensions)
-- ============================================================

-- Bật tiện ích uuid-ossp để sử dụng hàm uuid_generate_v4()
-- hoặc dùng gen_random_uuid() của Supabase (tương đương, không cần extension)
-- pgcrypto cần bật để gen_random_uuid() hoạt động
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES)
-- ============================================================

-- Lưu thông tin hồ sơ, vai trò và trạng thái khóa tài khoản
-- Liên kết trực tiếp với auth.users của Supabase qua id
CREATE TABLE profiles (
    -- id: Khóa chính, đồng thời là khóa ngoại trỏ đến auth.users.id
    -- Sử dụng kiểu uuid, giá trị mặc định tự sinh bằng gen_random_uuid()
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- role: Vai trò người dùng trong hệ thống
    -- Chỉ nhận một trong 3 giá trị: learner, content_manager, admin
    -- Không cho phép NULL, mặc định là learner
    role VARCHAR(20) NOT NULL DEFAULT 'learner'
        CHECK (role IN ('learner', 'content_manager', 'admin')),

    -- failed_login_attempts: Đếm số lần đăng nhập thất bại liên tiếp
    -- Dùng để khóa tài khoản khi đạt ngưỡng (5 lần)
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,

    -- locked_until: Thời điểm hết khóa đăng nhập (UTC)
    -- NULL nghĩa là tài khoản không bị khóa
    -- Khi locked_until > now() thì không cho đăng nhập
    locked_until TIMESTAMP WITH TIME ZONE,

    -- created_at: Thời điểm tạo hồ sơ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- updated_at: Thời điểm cập nhật gần nhất
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tạo comment mô tả bảng (chỉ để tham khảo, không bắt buộc)
COMMENT ON TABLE profiles IS 'Hồ sơ người dùng - lưu vai trò và trạng thái khóa tài khoản';
COMMENT ON COLUMN profiles.id IS 'Khóa chính, liên kết với auth.users.id';
COMMENT ON COLUMN profiles.role IS 'learner | content_manager | admin';
COMMENT ON COLUMN profiles.failed_login_attempts IS 'Số lần đăng nhập thất bại liên tiếp (khóa sau 5 lần)';
COMMENT ON COLUMN profiles.locked_until IS 'Thời điểm hết khóa (NULL = không bị khóa)';

-- ============================================================
-- 2. BẢNG GHI DANH KHÓA HỌC (COURSE ENROLLMENTS)
-- ============================================================

-- Quản lý quan hệ giữa Learner và Course
-- Một Learner có thể đăng danh nhiều Course, mỗi quan hệ có trạng thái riêng
CREATE TABLE course_enrollments (
    -- id: Khóa chính tự sinh
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: ID của Learner tham gia khóa học
    -- Là khóa ngoại trỏ đến profiles.id
    -- Khi Learner bị xóa → xóa luôn các enrollment của họ (CASCADE)
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: ID của Course trong Phân hệ Nội dung
    -- Chỉ là tham chiếu (reference), không tạo khóa ngoại vì Course
    -- thuộc sở hữu của Phân hệ Nội dung
    course_id UUID NOT NULL,

    -- status: Trạng thái đăng danh
    -- active = đang học, left = đã rời khóa học
    status VARCHAR(10) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'left')),

    -- enrolled_at: Thời điểm bắt đầu đăng danh
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- left_at: Thời điểm rời khóa học (NULL nếu chưa rời)
    left_at TIMESTAMP WITH TIME ZONE,

    -- created_at: Thời điểm tạo record
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- updated_at: Thời điểm cập nhật gần nhất
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Ràng buộc duy nhất: Mỗi cặp (learner_id, course_id) chỉ có 1 record
    -- Đảm bảo không tạo duplicate enrollment khi Learner re-enroll
    UNIQUE (learner_id, course_id)
);

COMMENT ON TABLE course_enrollments IS 'Đăng danh khóa học - Learner ↔ Course';
COMMENT ON COLUMN course_enrollments.learner_id IS 'Learner tham gia khóa học (FK → profiles.id)';
COMMENT ON COLUMN course_enrollments.course_id IS 'ID khóa học (reference, không FK)';
COMMENT ON COLUMN course_enrollments.status IS 'active | left';
COMMENT ON COLUMN course_enrollments.enrolled_at IS 'Thời điểm đăng danh';
COMMENT ON COLUMN course_enrollments.left_at IS 'Thời điểm rời khóa học (NULL = chưa rời)';

-- ============================================================
-- 3. BẢNG KẾ HOẠCH HỌC TẬP (STUDY PLANS)
-- ============================================================

-- Lưu kế hoạch học tập của Learner cho một Course cụ thể
-- Mỗi Learner chỉ có tối đa 1 Study Plan đang active trên toàn hệ thống
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Chủ sở hữu kế hoạch (FK → profiles.id)
    -- Khi Learner bị xóa → xóa luôn kế hoạch của họ
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: ID khóa học mà kế hoạch này áp dụng
    course_id UUID NOT NULL,

    -- goal: Mục tiêu học tập (ví dụ: "Hoàn thành C# cơ bản trong 2 tháng")
    goal TEXT,

    -- start_date: Ngày bắt đầu kế hoạch
    start_date DATE NOT NULL,

    -- deadline: Ngày kết thúc kế hoạch
    deadline DATE NOT NULL,

    -- session_duration_minutes: Thời lượng mỗi buổi học (phút)
    -- Ví dụ: 60 phút = 1 tiếng mỗi buổi
    session_duration_minutes INTEGER NOT NULL DEFAULT 60,

    -- status: Trạng thái kế hoạch
    -- active = đang áp dụng, completed = đã hoàn thành, archived = đã lưu trữ
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),

    -- source_type: Nguồn tạo kế hoạch
    -- manual = Learner tự tạo, ai = AI đề xuất
    source_type VARCHAR(10) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'ai')),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để tối ưu truy vấn "Learner có active plan không"
CREATE INDEX idx_study_plans_learner_status
    ON study_plans(learner_id, status)
    WHERE status = 'active';

COMMENT ON TABLE study_plans IS 'Kế hoạch học tập của Learner cho một Course';
COMMENT ON COLUMN study_plans.learner_id IS 'Chủ sở hữu kế hoạch';
COMMENT ON COLUMN study_plans.course_id IS 'Khóa học áp dụng kế hoạch';
COMMENT ON COLUMN study_plans.source_type IS 'manual | ai (nguồn tạo kế hoạch)';
COMMENT ON COLUMN study_plans.status IS 'active | completed | archived';

-- ============================================================
-- 4. BẢNG NGÀY HỌC TRONG TUẦN (STUDY PLAN AVAILABLE DAYS)
-- ============================================================

-- Lưu các ngày trong tuần Learner có thể học
-- Ví dụ: Learner chọn học thứ 2, thứ 4, thứ 6 hàng tuần
CREATE TABLE study_plan_available_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- study_plan_id: Kế hoạch cha mà ngày này thuộc về
    study_plan_id UUID NOT NULL
        REFERENCES study_plans(id) ON DELETE CASCADE,

    -- day_of_week: Ngày trong tuần (0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
    day_of_week INTEGER NOT NULL
        CHECK (day_of_week BETWEEN 0 AND 6),

    -- Đảm bảo không có 2 record trùng ngày cho cùng một kế hoạch
    UNIQUE (study_plan_id, day_of_week)
);

COMMENT ON TABLE study_plan_available_days IS 'Ngày trong tuần Learner có thể học';
COMMENT ON COLUMN study_plan_available_days.day_of_week IS '0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7';

-- ============================================================
-- 5. BẢNG BUỔI HỌC (STUDY PLAN SESSIONS)
-- ============================================================

-- Mỗi kế hoạch học tập được chia thành nhiều buổi học (session)
-- Mỗi buổi có ngày dự kiến và thời lượng ước tính
CREATE TABLE study_plan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- study_plan_id: Kế hoạch cha mà buổi học này thuộc về
    study_plan_id UUID NOT NULL
        REFERENCES study_plans(id) ON DELETE CASCADE,

    -- planned_date: Ngày dự kiến cho buổi học này
    planned_date DATE NOT NULL,

    -- estimated_duration_minutes: Thời lượng ước tính của buổi học (phút)
    -- Giá trị mặc định kế thừa từ session_duration_minutes của study_plan
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn nhanh các buổi học theo ngày
CREATE INDEX idx_study_plan_sessions_date
    ON study_plan_sessions(study_plan_id, planned_date);

COMMENT ON TABLE study_plan_sessions IS 'Buổi học trong kế hoạch - mỗi buổi có ngày và thời lượng dự kiến';
COMMENT ON COLUMN study_plan_sessions.planned_date IS 'Ngày dự kiến cho buổi học';
COMMENT ON COLUMN study_plan_sessions.estimated_duration_minutes IS 'Thời lượng ước tính (phút)';

-- ============================================================
-- 6. BẢNG BÀI HỌC TRONG BUỔI HỌC (STUDY PLAN ITEMS)
-- ============================================================

-- Liên kết Lesson cụ thể vào buổi học, giữ thứ tự bằng order_index
-- Mỗi buổi tối đa 2 Lesson (theo yêu cầu)
CREATE TABLE study_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- session_id: Buổi học cha
    session_id UUID NOT NULL
        REFERENCES study_plan_sessions(id) ON DELETE CASCADE,

    -- lesson_id: ID của Lesson trong Phân hệ Nội dung
    lesson_id UUID NOT NULL,

    -- order_index: Thứ tự Lesson trong buổi học (0, 1, ...)
    -- Đảm bảo thứ tự Course → Chapter → Lesson được giữ nguyên
    order_index INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Đảm bảo thứ tự duy nhất trong mỗi buổi học
CREATE INDEX idx_study_plan_items_session_order
    ON study_plan_items(session_id, order_index);

COMMENT ON TABLE study_plan_items IS 'Bài học trong buổi học - liên kết Lesson vào session';
COMMENT ON COLUMN study_plan_items.lesson_id IS 'ID bài học (reference, không FK)';
COMMENT ON COLUMN study_plan_items.order_index IS 'Thứ tự bài học trong buổi (0=bài đầu tiên)';

-- ============================================================
-- 7. BẢNG TIẾN ĐỘ BÀI HỌC (LESSON PROGRESS)
-- ============================================================

-- Lưu trạng thái hoàn thành của Learner với từng Lesson
-- Mô hình thiết kế: Có record = đã hoàn thành, không record = chưa hoàn thành
-- Không cần status riêng vì bản thân sự tồn tại của record đã thể Hiện trạng thái
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Learner đã hoàn thành bài học
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: Khóa học chứa bài học này
    course_id UUID NOT NULL,

    -- lesson_id: ID bài học đã hoàn thành
    lesson_id UUID NOT NULL,

    -- completed_at: Thời điểm hoàn thành bài học
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Ràng buộc duy nhất: Mỗi Learner chỉ có 1 record hoàn thành cho mỗi Lesson
    UNIQUE (learner_id, lesson_id)
);

-- Index để truy vấn nhanh tiến độ theo Learner + Course
CREATE INDEX idx_lesson_progress_learner_course
    ON lesson_progress(learner_id, course_id);

COMMENT ON TABLE lesson_progress IS 'Tiến độ hoàn thành bài học - có record = đã hoàn thành';
COMMENT ON COLUMN lesson_progress.learner_id IS 'Learner đã hoàn thành bài học';
COMMENT ON COLUMN lesson_progress.course_id IS 'Khóa học chứa bài học';
COMMENT ON COLUMN lesson_progress.lesson_id IS 'ID bài học đã hoàn thành';
COMMENT ON COLUMN lesson_progress.completed_at IS 'Thời điểm hoàn thành';

-- ============================================================
-- 8. BẢNG NHIỆM VỤ (TASKS)
-- ============================================================

-- Tổng hợp Lesson trong Study Plan, Quiz và Exercise thành Task
-- Task là đơn vị công việc Learner cần hoàn thành
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Learner sở hữu Task
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: Khóa học chứa Task
    course_id UUID NOT NULL,

    -- task_type: Loại nhiệm vụ
    -- lesson = bài học, quiz = bài kiểm tra, exercise = bài luyện tập
    task_type VARCHAR(20) NOT NULL
        CHECK (task_type IN ('lesson', 'quiz', 'exercise')),

    -- reference_id: ID tham chiếu đến Lesson/Quiz/Exercise gốc
    -- trong Phân hệ Nội dung
    reference_id UUID NOT NULL,

    -- deadline: Thời hạn của Task
    -- Với Lesson: lấy từ planned_date của Study Plan Session
    -- Với Quiz/Exercise: đang chờ Content Module cung cấp nguồn chính thức
    deadline TIMESTAMP WITH TIME ZONE,

    -- status: Trạng thái nhiệm vụ
    -- active = đang chờ, completed = đã hoàn thành, cancelled = đã hủy
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'cancelled')),

    -- completed_at: Thời điểm hoàn thành (NULL nếu chưa hoàn thành)
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn nhanh Task theo Learner và trạng thái
CREATE INDEX idx_tasks_learner_status
    ON tasks(learner_id, status)
    WHERE status = 'active';

-- Index để truy vấn Task sắp đến hạn
CREATE INDEX idx_tasks_deadline
    ON tasks(deadline)
    WHERE status = 'active' AND deadline IS NOT NULL;

COMMENT ON TABLE tasks IS 'Nhiệm vụ - tổng hợp Lesson/Quiz/Exercise thành công việc cần hoàn thành';
COMMENT ON COLUMN tasks.task_type IS 'lesson | quiz | exercise';
COMMENT ON COLUMN tasks.reference_id IS 'ID tham chiếu đến Lesson/Quiz/Exercise gốc';
COMMENT ON COLUMN tasks.deadline IS 'Thời hạn (Lesson: planned_date, Quiz/Exercise: chờ Content contract)';
COMMENT ON COLUMN tasks.status IS 'active | completed | cancelled (hủy khi Learner rời khóa học)';

-- ============================================================
-- 9. BẢNG NHẮC NHỞ (REMINDERS)
-- ============================================================

-- Nhắc nhở Learner về buổi học hoặc Task sắp đến
-- Có thể gắn với Task cụ thể hoặc Session riêng biệt
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Learner nhận nhắc nhở
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- task_id: Nhiệm vụ được nhắc (NULL nếu nhắc Session)
    task_id UUID
        REFERENCES tasks(id) ON DELETE SET NULL,

    -- session_id: Buổi học được nhắc (NULL nếu nhắc Task)
    -- Có thể gắn với Task hoặc Session, không bắt buộc cả hai
    session_id UUID
        REFERENCES study_plan_sessions(id) ON DELETE SET NULL,

    -- remind_at: Thời điểm gửi nhắc nhở
    -- Mặc định = 1 ngày trước deadline
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- is_enabled: Bật/tắt nhắc nhở
    is_enabled BOOLEAN NOT NULL DEFAULT true,

    -- status: Trạng thái nhắc nhở
    -- pending = chờ gửi, sent = đã gửi, cancelled = đã hủy
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để tìm nhanh các reminder đang chờ gửi
CREATE INDEX idx_reminders_pending
    ON reminders(remind_at)
    WHERE status = 'pending' AND is_enabled = true;

COMMENT ON TABLE reminders IS 'Nhắc nhở - in-app hoặc email cho Learner';
COMMENT ON COLUMN reminders.task_id IS 'Task được nhắc (NULL = nhắc Session)';
COMMENT ON COLUMN reminders.session_id IS 'Session được nhắc (NULL = nhắc Task)';
COMMENT ON COLUMN reminders.remind_at IS 'Thời điểm gửi nhắc nhở (mặc định 1 ngày trước deadline)';
COMMENT ON COLUMN reminders.status IS 'pending | sent | cancelled';

-- ============================================================
-- 10. BẢNG GHI CHÚ (NOTES)
-- ============================================================

-- Ghi chú cá nhân của Learner
-- Có thể gắn với Lesson cụ thể hoặc ghi chú tự do
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Chủ sở hữu ghi chú
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- lesson_id: Bài học gắn với ghi chú (NULL = ghi chú tự do)
    lesson_id UUID,

    -- title: Tiêu đề ghi chú (tùy chọn)
    title VARCHAR(255),

    -- content: Nội dung ghi chú (hỗ trợ Rich Text - lưu dạng HTML/markdown)
    content TEXT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để tìm kiếm ghi chú theo Learner
CREATE INDEX idx_notes_learner
    ON notes(learner_id);

-- Index để tìm ghi chú theo Lesson
CREATE INDEX idx_notes_lesson
    ON notes(lesson_id)
    WHERE lesson_id IS NOT NULL;

COMMENT ON TABLE notes IS 'Ghi chú cá nhân - tự do hoặc gắn Lesson';
COMMENT ON COLUMN notes.lesson_id IS 'Bài học liên quan (NULL = ghi chú tự do)';
COMMENT ON COLUMN notes.title IS 'Tiêu đề (tùy chọn)';
COMMENT ON COLUMN notes.content IS 'Nội dung Rich Text (HTML/Markdown)';

-- ============================================================
-- 11. BẢNG ĐÁNH DẤU (BOOKMARKS)
-- ============================================================

-- Bookmark cho phép Learner lưu Lesson hoặc Material cần xem lại
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Chủ sở hữu bookmark
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- target_type: Loại nội dung được đánh dấu
    -- lesson = bài học, material = tài liệu
    target_type VARCHAR(20) NOT NULL
        CHECK (target_type IN ('lesson', 'material')),

    -- target_id: ID của Lesson hoặc Material được đánh dấu
    target_id UUID NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Ràng buộc duy nhất: Mỗi Learner chỉ đánh dấu 1 lần cho mỗi target
    UNIQUE (learner_id, target_type, target_id)
);

-- Index để truy vấn bookmarks theo Learner
CREATE INDEX idx_bookmarks_learner
    ON bookmarks(learner_id);

-- Index để truy vấn bookmarks theo target
CREATE INDEX idx_bookmarks_target
    ON bookmarks(target_type, target_id);

COMMENT ON TABLE bookmarks IS 'Đánh dấu nội dung - Lesson/Material cần xem lại';
COMMENT ON COLUMN bookmarks.target_type IS 'lesson | material';
COMMENT ON COLUMN bookmarks.target_id IS 'ID của Lesson/Material được đánh dấu';

-- ============================================================
-- 12. BẢNG THẺ ĐÁNH DẤU (BOOKMARK TAGS)
-- ============================================================

-- Tags do Learner tự tạo để phân loại bookmarks
CREATE TABLE bookmark_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Chủ sở hữu tag
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- name: Tên thẻ (ví dụ: "Quan trọng", "Cần ôn lại")
    name VARCHAR(50) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Mỗi Learner không có 2 tag trùng tên
    UNIQUE (learner_id, name)
);

-- Index để tìm tags theo Learner
CREATE INDEX idx_bookmark_tags_learner
    ON bookmark_tags(learner_id);

COMMENT ON TABLE bookmark_tags IS 'Thẻ đánh dấu do Learner tự tạo';
COMMENT ON COLUMN bookmark_tags.name IS 'Tên thẻ (tối đa 50 ký tự)';

-- ============================================================
-- 13. BẢNG LIÊN KẾT THẺ-BOOKMARK (BOOKMARK TAG LINKS)
-- ============================================================

-- Liên kết nhiều-nhiều giữa bookmarks và bookmark_tags
-- Mỗi bookmark có thể có nhiều tag, mỗi tag có thể gắn nhiều bookmark
CREATE TABLE bookmark_tag_links (
    -- bookmark_id: Bookmark được gắn tag
    bookmark_id UUID NOT NULL
        REFERENCES bookmarks(id) ON DELETE CASCADE,

    -- tag_id: Tag được gắn vào bookmark
    tag_id UUID NOT NULL
        REFERENCES bookmark_tags(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Khóa chính tổ hợp: đảm bảo mỗi cặp bookmark-tag chỉ có 1 liên kết
    PRIMARY KEY (bookmark_id, tag_id)
);

-- Index để tìm bookmarks theo tag
CREATE INDEX idx_bookmark_tag_links_tag
    ON bookmark_tag_links(tag_id);

COMMENT ON TABLE bookmark_tag_links IS 'Liên kết nhiều-nhiều Bookmark ↔ Tag';

-- ============================================================
-- 14. BẢNG LỊCH SỬ HỌC TẬP (LEARNING HISTORY)
-- ============================================================

-- Lưu lịch sử hoạt động học tập của Learner
-- Nguồn dữ liệu từ cả Learner và Content Module qua Event Contract
CREATE TABLE learning_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Learner thực hiện hoạt động
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: Khóa học liên quan
    course_id UUID NOT NULL,

    -- activity_type: Loại hoạt động
    -- Ví dụ: lesson_started, lesson_completed, quiz_started, quiz_completed
    activity_type VARCHAR(50) NOT NULL,

    -- activity_id: ID tham chiếu đến Lesson/Quiz gốc
    activity_id UUID,

    -- event_type: Tên event từ Event Contract
    -- Ví dụ: lesson_started, quiz_completed
    event_type VARCHAR(50) NOT NULL,

    -- occurred_at: Thời điểm hoạt động xảy ra (từ event.occurred_at)
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- estimated_duration_seconds: Thời gian ước tính Learner đã học (giây)
    estimated_duration_seconds INTEGER,

    -- source: Nguồn gốc event (ví dụ: 'user_module', 'content_module')
    source VARCHAR(30) NOT NULL DEFAULT 'user_module',

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn lịch sử theo Learner và thời gian
CREATE INDEX idx_learning_history_learner_occurred
    ON learning_history(learner_id, occurred_at DESC);

-- Index để truy vấn lịch sử theo Course
CREATE INDEX idx_learning_history_course
    ON learning_history(course_id);

-- Index để truy vấn theo loại hoạt động
CREATE INDEX idx_learning_history_activity_type
    ON learning_history(learner_id, activity_type);

COMMENT ON TABLE learning_history IS 'Lịch sử học tập - ghi nhận hoạt động của Learner';
COMMENT ON COLUMN learning_history.activity_type IS 'Loại hoạt động (lesson_started, quiz_completed, ...)';
COMMENT ON COLUMN learning_history.event_type IS 'Tên event từ Event Contract';
COMMENT ON COLUMN learning_history.occurred_at IS 'Thời điểm hoạt động xảy ra';
COMMENT ON COLUMN learning_history.source IS 'Nguồn gốc: user_module hoặc content_module';

-- ============================================================
-- 15. BẢNG PHẢN HỒI (FEEDBACKS)
-- ============================================================

-- Content Manager gửi phản hồi/nhận xét cho Learner
-- Có thể gắn với context (Progress, Result, Task) hoặc general
CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- manager_id: Content Manager gửi phản hồi
    manager_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- learner_id: Learner nhận phản hồi
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: Khóa học liên quan
    course_id UUID NOT NULL,

    -- content: Nội dung phản hồi (Rich Text)
    content TEXT NOT NULL,

    -- context_type: Loại ngữ cảnh (NULL = general)
    -- progress, result, task
    context_type VARCHAR(20)
        CHECK (context_type IN ('progress', 'result', 'task', 'general', NULL)),

    -- context_id: ID của ngữ cảnh (ví dụ: Task ID nếu context_type = task)
    context_id UUID,

    -- context_snapshot: Lưu trạng thái ngữ cảnh tại thời điểm gửi
    -- Ví dụ: progress %, result score tại thời điểm gửi feedback
    -- Dùng JSONB để lưu linh hoạt
    context_snapshot JSONB,

    -- status: Trạng thái phản hồi
    -- draft = nháp (sửa/xóa được), sent = đã gửi (immutable)
    status VARCHAR(10) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'sent')),

    -- sent_at: Thời điểm gửi (NULL nếu còn draft)
    sent_at TIMESTAMP WITH TIME ZONE,

    -- read_at: Thời điểm Learner đọc (NULL nếu chưa đọc)
    read_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn feedback theo Learner + Manager
CREATE INDEX idx_feedbacks_learner
    ON feedbacks(learner_id);

-- Index để truy vấn feedback theo Manager
CREATE INDEX idx_feedbacks_manager
    ON feedbacks(manager_id);

-- Index để truy vấn feedback theo Course
CREATE INDEX idx_feedbacks_course
    ON feedbacks(course_id);

COMMENT ON TABLE feedbacks IS 'Phản hồi - Content Manager gửi nhận xét cho Learner';
COMMENT ON COLUMN feedbacks.context_type IS 'NULL=general, progress, result, task';
COMMENT ON COLUMN feedbacks.context_snapshot IS 'Trạng thái ngữ cảnh tại thời điểm gửi (JSONB)';
COMMENT ON COLUMN feedbacks.status IS 'draft (sửa/xóa) | sent (immutable)';

-- ============================================================
-- 16. BẢNG CUỘC HỘI THOẠI (CONVERSATIONS)
-- ============================================================

-- Tin nhắn 1-1 giữa Learner và Content Manager trong phạm vi một Course
-- Mỗi cặp (learner_id, manager_id, course_id) chỉ có 1 conversation
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- learner_id: Learner tham gia cuộc hội thoại
    learner_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- manager_id: Content Manager tham gia cuộc hội thoại
    manager_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- course_id: Khóa học liên quan
    course_id UUID NOT NULL,

    -- status: Trạng thái cuộc hội thoại
    -- active = đang hoạt động, read_only = chỉ đọc (khi Enrollment left)
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'read_only')),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Đảm bảo mỗi cặp (learner, manager, course) chỉ có 1 conversation
    UNIQUE (learner_id, manager_id, course_id)
);

-- Index để truy vấn conversation theo Learner
CREATE INDEX idx_conversations_learner
    ON conversations(learner_id);

-- Index để truy vấn conversation theo Manager
CREATE INDEX idx_conversations_manager
    ON conversations(manager_id);

COMMENT ON TABLE conversations IS 'Cuộc hội thoại 1-1 Learner ↔ Content Manager';
COMMENT ON COLUMN conversations.status IS 'active | read_only (khi Learner rời khóa học)';

-- ============================================================
-- 17. BẢNG TIN NHẮN (MESSAGES)
-- ============================================================

-- Tin nhắn trong cuộc hội thoại
-- Tin nhắn sau khi gửi không được sửa hoặc xóa
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- conversation_id: Cuộc hội thoại chứa tin nhắn
    conversation_id UUID NOT NULL
        REFERENCES conversations(id) ON DELETE CASCADE,

    -- sender_id: Người gửi tin nhắn (Learner hoặc Manager)
    sender_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- content: Nội dung tin nhắn
    content TEXT NOT NULL,

    -- sent_at: Thời điểm gửi
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- read_at: Thời điểm người nhận đọc (NULL nếu chưa đọc)
    read_at TIMESTAMP WITH TIME ZONE
);

-- Index để truy vấn tin nhắn theo cuộc hội thoại (theo thời gian)
CREATE INDEX idx_messages_conversation_sent
    ON messages(conversation_id, sent_at DESC);

-- Index để tìm tin nhắn chưa đọc
CREATE INDEX idx_messages_unread
    ON messages(conversation_id, sent_at)
    WHERE read_at IS NULL;

COMMENT ON TABLE messages IS 'Tin nhắn trong cuộc hội thoại - immutable sau khi gửi';
COMMENT ON COLUMN messages.sender_id IS 'Người gửi (Learner hoặc Manager)';
COMMENT ON COLUMN messages.content IS 'Nội dung tin nhắn';
COMMENT ON COLUMN messages.read_at IS 'Thời điểm đọc (NULL = chưa đọc)';

-- ============================================================
-- 18. BẢNG THÔNG BÁO (NOTIFICATIONS)
-- ============================================================

-- Hệ thống thông báo chung phục vụ nhiều mục đích
-- Reminder, Learning Notification, Message Notification, System Notification
-- Tách thành 2 bảng: notifications (nội dung) và notification_recipients (người nhận)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- created_by: User tạo thông báo (NULL nếu là system)
    created_by UUID
        REFERENCES profiles(id) ON DELETE SET NULL,

    -- notification_type: Loại thông báo
    -- reminder, learning, message, system
    notification_type VARCHAR(20) NOT NULL
        CHECK (notification_type IN ('reminder', 'learning', 'message', 'system')),

    -- title: Tiêu đề thông báo
    title VARCHAR(255) NOT NULL,

    -- content: Nội dung thông báo
    content TEXT NOT NULL,

    -- scope_type: Phạm vi gửi
    -- all = tất cả, role = theo vai trò, course = theo khóa học
    scope_type VARCHAR(20)
        CHECK (scope_type IN ('all', 'role', 'course', 'individual', NULL)),

    -- scope_value: Giá trị phạm vi
    -- Ví dụ: scope_type=role, scope_value='learner' gửi cho tất cả Learner
    -- Ví dụ: scope_type=course, scope_value=<course_id> gửi cho khóa học đó
    scope_value TEXT,

    -- send_email: Có gửi email không
    send_email BOOLEAN NOT NULL DEFAULT false,

    -- status: Trạng thái thông báo
    -- scheduled = chờ gửi, sent = đã gửi, cancelled = đã hủy
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'sent', 'cancelled')),

    -- scheduled_at: Thời điểm dự kiến gửi (NULL = gửi ngay)
    scheduled_at TIMESTAMP WITH TIME ZONE,

    -- sent_at: Thời điểm thực tế gửi (NULL nếu chưa gửi)
    sent_at TIMESTAMP WITH TIME ZONE,

    -- reference_type: Loại tham chiếu (ví dụ: task, lesson, feedback)
    reference_type VARCHAR(20),

    -- reference_id: ID tham chiếu
    reference_id UUID,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn notification theo trạng thái + thời gian
CREATE INDEX idx_notifications_status_scheduled
    ON notifications(status, scheduled_at)
    WHERE status = 'scheduled';

-- Index để truy vấn notification theo loại
CREATE INDEX idx_notifications_type
    ON notifications(notification_type);

COMMENT ON TABLE notifications IS 'Thông báo - phục vụ Reminder, Learning, Message, System notification';
COMMENT ON COLUMN notifications.notification_type IS 'reminder | learning | message | system';
COMMENT ON COLUMN notifications.scope_type IS 'all | role | course | individual';
COMMENT ON COLUMN notifications.scope_value IS 'Giá trị scope: role name, course_id, hoặc user_id';
COMMENT ON COLUMN notifications.status IS 'scheduled | sent | cancelled';
COMMENT ON COLUMN notifications.status IS 'scheduled (sửa/hủy được) | sent (immutable) | cancelled';

-- ============================================================
-- 19. BẢNG NGƯỜI NHẬN THÔNG BÁO (NOTIFICATION RECIPIENTS)
-- ============================================================

-- Lưu thông tin người nhận và trạng thái đọc cho mỗi thông báo
-- Mỗi thông báo có thể gửi cho nhiều người
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- notification_id: Thông báo mà người này nhận
    notification_id UUID NOT NULL
        REFERENCES notifications(id) ON DELETE CASCADE,

    -- user_id: Người nhận thông báo
    user_id UUID NOT NULL
        REFERENCES profiles(id) ON DELETE CASCADE,

    -- read_at: Thời điểm đọc (NULL nếu chưa đọc)
    read_at TIMESTAMP WITH TIME ZONE,

    -- email_status: Trạng thái gửi email
    -- pending = chờ gửi, sent = đã gửi, failed = gửi thất bại
    email_status VARCHAR(20) DEFAULT 'pending'
        CHECK (email_status IN ('pending', 'sent', 'failed', NULL)),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Đảm bảo mỗi cặp (notification, user) chỉ có 1 record
    UNIQUE (notification_id, user_id)
);

-- Index để truy vấn thông báo chưa đọc của User
CREATE INDEX idx_notification_recipients_user_unread
    ON notification_recipients(user_id, read_at)
    WHERE read_at IS NULL;

COMMENT ON TABLE notification_recipients IS 'Người nhận thông báo + trạng thái đọc';
COMMENT ON COLUMN notification_recipients.user_id IS 'Người nhận thông báo';
COMMENT ON COLUMN notification_recipients.read_at IS 'Thời điểm đọc (NULL = chưa đọc)';
COMMENT ON COLUMN notification_recipients.email_status IS 'pending | sent | failed';

-- ============================================================
-- 20. BẢNG SỰ KIỆN PHÂN TÍCH (ANALYTICS EVENTS)
-- ============================================================

-- Lưu telemetry events cho Analytics (khác với Learning History)
-- Nguồn từ cả User Module và Content Module qua Event Contract
-- event_id là duy nhất để chống duplicate events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- event_id: ID duy nhất của event (từ Event Contract)
    -- Dùng để idempotency - tránh insert trùng khi event được retry
    event_id UUID NOT NULL UNIQUE,

    -- event_name: Tên event (ví dụ: lesson_completed, quiz_completed)
    event_name VARCHAR(50) NOT NULL,

    -- event_version: Phiên bản event schema
    event_version INTEGER NOT NULL DEFAULT 1,

    -- user_id: User thực hiện hành động
    user_id UUID
        REFERENCES profiles(id) ON DELETE SET NULL,

    -- user_role: Vai trò của user tại thời điểm event
    user_role VARCHAR(20)
        CHECK (user_role IN ('learner', 'content_manager', 'admin', NULL)),

    -- source: Nguồn phát sinh event
    -- user_module hoặc content_module
    source VARCHAR(30) NOT NULL,

    -- course_id: Khóa học liên quan (nếu có)
    course_id UUID,

    -- occurred_at: Thời điểm event xảy ra (từ event.occurred_at)
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- received_at: Thời điểm event được ghi nhận vào hệ thống
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- metadata: Dữ liệu bổ sung của event (JSONB)
    -- Ví dụ: { "lesson_id": "...", "chapter_id": "...", "duration_seconds": 300 }
    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index để truy vấn events theo thời gian
CREATE INDEX idx_analytics_events_occurred
    ON analytics_events(occurred_at DESC);

-- Index để truy vấn events theo user
CREATE INDEX idx_analytics_events_user
    ON analytics_events(user_id, occurred_at DESC);

-- Index để truy vấn events theo event_name (dùng cho Feature Analytics)
CREATE INDEX idx_analytics_events_name
    ON analytics_events(event_name, occurred_at DESC);

-- Index để truy vấn events theo source
CREATE INDEX idx_analytics_events_source
    ON analytics_events(source, occurred_at DESC);

COMMENT ON TABLE analytics_events IS 'Telemetry events cho Analytics - khác với Learning History';
COMMENT ON COLUMN analytics_events.event_id IS 'UUID duy nhất từ Event Contract (chống duplicate)';
COMMENT ON COLUMN analytics_events.event_name IS 'Tên event: lesson_completed, quiz_started, ai_learning_plan_applied, ...';
COMMENT ON COLUMN analytics_events.metadata IS 'Dữ liệu bổ sung (JSONB) - không chứa password/token/message private';

-- ============================================================
-- 21. CÁC HÀM TỰ ĐỘNG CẬP NHẬT (TRIGGERS)
-- ============================================================

-- Tự động cập nhật updated_at khi có INSERT hoặc UPDATE
-- Áp dụng cho tất cả các bảng có cột updated_at

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger cho từng bảng có updated_at
-- profiles
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- course_enrollments
CREATE TRIGGER trigger_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- study_plans
CREATE TRIGGER trigger_study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- study_plan_sessions
CREATE TRIGGER trigger_study_plan_sessions_updated_at
    BEFORE UPDATE ON study_plan_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- tasks
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- reminders
CREATE TRIGGER trigger_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notes
CREATE TRIGGER trigger_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- feedbacks
CREATE TRIGGER trigger_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notifications
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 22. ROW LEVEL SECURITY (RLS) - BẢO MẬT CẤP DÒNG
-- ============================================================

-- Bật RLS cho các bảng quan trọng để đảm bảo dữ liệu cô lập giữa users

-- Bật RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies cho bảng profiles
-- Mỗi user chỉ đọc và sửa profile của chính mình
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Policies cho course_enrollments
CREATE POLICY "Learners can view own enrollments"
    ON course_enrollments FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own enrollments"
    ON course_enrollments FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own enrollments"
    ON course_enrollments FOR UPDATE
    USING (auth.uid() = learner_id);

-- Policies cho study_plans
CREATE POLICY "Learners can view own study plans"
    ON study_plans FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own study plans"
    ON study_plans FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own study plans"
    ON study_plans FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete own study plans"
    ON study_plans FOR DELETE
    USING (auth.uid() = learner_id);

-- Policies cho lesson_progress
CREATE POLICY "Learners can view own progress"
    ON lesson_progress FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own progress"
    ON lesson_progress FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own progress"
    ON lesson_progress FOR UPDATE
    USING (auth.uid() = learner_id);

-- Policies cho tasks
CREATE POLICY "Learners can view own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = learner_id);

-- Policies cho reminders
CREATE POLICY "Learners can view own reminders"
    ON reminders FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own reminders"
    ON reminders FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own reminders"
    ON reminders FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete own reminders"
    ON reminders FOR DELETE
    USING (auth.uid() = learner_id);

-- Policies cho notes
CREATE POLICY "Learners can view own notes"
    ON notes FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete own notes"
    ON notes FOR DELETE
    USING (auth.uid() = learner_id);

-- Policies cho bookmarks
CREATE POLICY "Learners can view own bookmarks"
    ON bookmarks FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own bookmarks"
    ON bookmarks FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own bookmarks"
    ON bookmarks FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete own bookmarks"
    ON bookmarks FOR DELETE
    USING (auth.uid() = learner_id);

-- Policies cho bookmark_tags
CREATE POLICY "Learners can view own tags"
    ON bookmark_tags FOR SELECT
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can insert own tags"
    ON bookmark_tags FOR INSERT
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can update own tags"
    ON bookmark_tags FOR UPDATE
    USING (auth.uid() = learner_id);

CREATE POLICY "Learners can delete own tags"
    ON bookmark_tags FOR DELETE
    USING (auth.uid() = learner_id);

-- Policies cho learning_history
CREATE POLICY "Users can view own learning history"
    ON learning_history FOR SELECT
    USING (auth.uid() = learner_id);

-- Policies cho feedbacks - Learner thấy feedback của mình
CREATE POLICY "Learners can view own feedbacks"
    ON feedbacks FOR SELECT
    USING (auth.uid() = learner_id);

-- Manager thấy feedback mình gửi
CREATE POLICY "Managers can view sent feedbacks"
    ON feedbacks FOR SELECT
    USING (auth.uid() = manager_id);

-- Managers có thể quản lý feedback của mình
CREATE POLICY "Managers can insert feedbacks"
    ON feedbacks FOR INSERT
    WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update own draft feedbacks"
    ON feedbacks FOR UPDATE
    USING (auth.uid() = manager_id AND status = 'draft');

-- Policies cho conversations
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = learner_id OR auth.uid() = manager_id);

CREATE POLICY "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = learner_id OR auth.uid() = manager_id);

CREATE POLICY "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = learner_id OR auth.uid() = manager_id);

-- Policies cho messages - tham gia conversation mới được đọc tin nhắn
CREATE POLICY "Conversation participants can view messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.learner_id = auth.uid() OR conversations.manager_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert messages in own conversations"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.learner_id = auth.uid() OR conversations.manager_id = auth.uid())
            AND conversations.status = 'active'
        )
    );

-- Policies cho notification_recipients
CREATE POLICY "Users can view own notification recipients"
    ON notification_recipients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification read status"
    ON notification_recipients FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies cho analytics_events - chỉ service role được ghi
-- Anonymous và authenticated users chỉ có thể đọc qua API
-- (sẽ được cấu hình thêm ở tầng API)

-- ============================================================
-- 23. INDEX TỔNG HỢP CHO CÁC TRUY VẤN PHỔ BIẾN
-- ============================================================

-- Index cho truy vấn Dashboard Learner
CREATE INDEX idx_lesson_progress_learner_completed
    ON lesson_progress(learner_id, completed_at DESC);

-- Index cho truy vấn Task sắp đến hạn (trong 7 ngày tới)
CREATE INDEX idx_tasks_upcoming_deadline
    ON tasks(learner_id, deadline)
    WHERE status = 'active' AND deadline IS NOT NULL AND deadline >= now();

-- Index cho truy vấn Learning History theo thời gian
CREATE INDEX idx_learning_history_recent
    ON learning_history(learner_id, occurred_at DESC)
    LIMIT 100;

-- Index cho truy vấn notification_recipients theo notification
CREATE INDEX idx_notification_recipients_notification
    ON notification_recipients(notification_id)
    WHERE read_at IS NULL;



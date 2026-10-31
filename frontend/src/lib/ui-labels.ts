const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  approved: "Đã duyệt",
  published: "Đã xuất bản",
  "in review": "Đang chờ duyệt",
  pending: "Đang chờ xử lý",
  rejected: "Đã từ chối",
  archived: "Đã lưu trữ",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const API_ERROR_LABELS: Record<string, string> = {
  "invalid email or password": "Email hoặc mật khẩu không chính xác.",
  "email already registered": "Email này đã được đăng ký.",
  "account is temporarily locked. try again later.": "Tài khoản đang tạm khóa. Vui lòng thử lại sau.",
  "session expired. please sign in again.": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "user profile not found": "Không tìm thấy hồ sơ người dùng.",
  "no published courses found": "Không tìm thấy khóa học đã xuất bản.",
  "message cannot be empty": "Tin nhắn không được để trống.",
  "message is too long": "Tin nhắn quá dài.",
  "chapter not found": "Không tìm thấy chương.",
  "course not found": "Không tìm thấy khóa học.",
  "lesson not found": "Không tìm thấy bài học.",
  "question not found": "Không tìm thấy câu hỏi.",
  "quiz not found": "Không tìm thấy bài kiểm tra.",
  "unable to create question": "Không thể tạo câu hỏi.",
  "unable to create quiz": "Không thể tạo bài kiểm tra.",
  "unable to start quiz attempt": "Không thể bắt đầu bài kiểm tra.",
  "a quiz must contain at least one question": "Bài kiểm tra cần có ít nhất một câu hỏi.",
  "question ids must be unique": "Mã câu hỏi không được trùng nhau.",
  "only approved questions can be added to a quiz": "Chỉ có thể thêm câu hỏi đã duyệt vào bài kiểm tra.",
  "only published quizzes can be attempted": "Chỉ có thể làm bài kiểm tra đã xuất bản.",
  "this quiz is not available to learners": "Bài kiểm tra này hiện không dành cho học viên.",
  "invalid email format": "Định dạng email không hợp lệ.",
  "email is required": "Vui lòng nhập email.",
  "password is required": "Vui lòng nhập mật khẩu.",
  "password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự.",
  "full name is required": "Vui lòng nhập họ và tên.",
};

export function vietnameseStatus(value: string): string {
  const normalized = value.trim().replaceAll("_", " ").toLowerCase();
  return STATUS_LABELS[normalized] ?? value;
}

export function vietnameseDifficulty(value: string): string {
  const normalized = value.trim().toLowerCase();
  return DIFFICULTY_LABELS[normalized] ?? value;
}

export function vietnameseCourseLevel(value: string): string {
  return DIFFICULTY_LABELS[value.trim().toLowerCase()] ?? value;
}

export function vietnameseErrorMessage(message: string): string {
  const trimmed = message.trim();
  const translated = API_ERROR_LABELS[trimmed.toLowerCase()];
  if (translated) return translated;
  if (trimmed && /^[\x00-\x7F]*$/.test(trimmed) && /[A-Za-z]{3,}/.test(trimmed)) {
    return "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.";
  }
  return message;
}

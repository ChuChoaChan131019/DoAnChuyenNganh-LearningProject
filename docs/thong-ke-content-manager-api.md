# Thống kê Content Manager

`GET /api/v1/content-manager/dashboard` yêu cầu Bearer token hợp lệ và vai trò `content_manager` hoặc `admin`. API thống kê nội dung chung của nhóm, không phải thống kê riêng theo tác giả; không thống kê lượt học, điểm hay tiến độ Learner.

Phản hồi thành công là `200` với envelope `{ "data": ... }`. `data` có cấu trúc khớp `frontend/src/types/content-dashboard.ts`:

| Trường | Cách tính |
| --- | --- |
| `overview.totalCourses`, `totalLessons` | Tổng số khóa học và bài học hiện có. |
| `overview.totalQuestions` | Tổng câu hỏi trong ngân hàng chung, có `generated_for_user_id IS NULL`, gồm cả câu nháp/đã duyệt/từ chối. |
| `overview.aiLessons`, `aiQuestions`, `totalAiGenerated` | Số bài học AI, câu hỏi AI dùng chung và tổng hai loại. |
| `status.draft/approved/published` | Tổng theo trạng thái trên ba bảng khóa học, chương, bài học; không cộng câu hỏi. |
| `questionDifficulty.easy/medium/hard` | Đếm câu hỏi dùng chung theo độ khó, không phụ thuộc danh sách câu hỏi tải về frontend. |
| `courseLevels.beginner/intermediate/advanced` | Đếm khóa học theo trình độ; hỗ trợ giá trị database chữ thường và giá trị cũ `Beginner/Intermediate/Advanced`. Khóa phản hồi luôn là chữ thường. |
| `growth` | Sáu tháng lịch, gồm tháng hiện tại, theo thứ tự từ cũ đến mới. Mỗi tháng có `month` dạng `MM/YYYY`, `courses`, `lessons`, `questions`, `aiQuestions`, `manualQuestions`. |

Các khoảng tháng dùng giờ Việt Nam UTC+7: bao gồm đầu tháng và không bao gồm đầu tháng tiếp theo. Ví dụ `2026-10-31T17:00:00Z` thuộc tháng 11/2026. Các tháng không có dữ liệu vẫn được trả về với số 0. Câu hỏi riêng của Learner bị loại khỏi mọi chỉ số câu hỏi. `manualQuestions = questions - aiQuestions`, nên các bản ghi cũ có cờ AI `NULL` được xếp vào thủ công.

Ví dụ một tháng:

```json
{
  "month": "11/2026",
  "courses": 1,
  "lessons": 2,
  "questions": 1501,
  "aiQuestions": 1001,
  "manualQuestions": 500
}
```

Mọi phép đếm dùng `count: exact, head: true` trực tiếp từ database; tổng và biểu đồ không bị giới hạn theo số dòng trả về của API danh sách. Các khung hoạt động gần đây/bản nháp AI trên trang vẫn lấy dữ liệu từ API danh sách riêng, không được dùng làm nguồn tính biểu đồ.

Thiếu/sai token trả `401`, vai trò Learner trả `403`. Khi truy vấn thống kê thất bại, API trả `500`, không biến lỗi thành kết quả 0. Các trường thống kê mới được thêm vào API hiện tại; cần triển khai backend trước hoặc cùng frontend mới. Không cần thay đổi schema.

Chạy test bằng `npm test -w backend -- src/modules/statistics`. Test dùng PostgreSQL cô lập (PGlite) kiểm tra hơn 1.000 câu hỏi, giá trị trình độ chữ thường, dữ liệu riêng của Learner, tháng/năm Việt Nam, dữ liệu rỗng và lỗi truy vấn; test quyền kiểm tra metadata và RolesGuard. Chúng không thay thế kiểm thử JWT thật hay trình duyệt.

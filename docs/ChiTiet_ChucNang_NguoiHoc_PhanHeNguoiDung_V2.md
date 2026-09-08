# CHI TIẾT CHỨC NĂNG LEARNER
## PHÂN HỆ NGƯỜI DÙNG

# L-M01 – DASHBOARD HỌC TẬP

Dashboard tổng hợp:

- Continue Learning.
- Progress.
- Task/Deadline.
- Result gần đây.
- Learning History gần đây.
- Study Plan hôm nay.
- Reminder.
- Bookmark.
- Progress chart.

## Continue Learning

1. Có Active Study Plan:
   - ưu tiên Lesson tiếp theo trong Plan.
2. Không có Active Study Plan:
   - dùng Lesson bắt đầu gần nhất nhưng chưa completed.
3. Không có dữ liệu:
   - hiển thị “Tạo kế hoạch học tập”.

[Cập nhật mới] Learner có thể có nhiều Enrollment Active nhưng chỉ một Active Study Plan; Dashboard ưu tiên Course của Active Study Plan.

# L-M02 – STUDY PLAN

- Một Plan áp dụng cho một Course.
- Chỉ một Plan Active trên toàn hệ thống.
- Learner cung cấp:
  - Course.
  - Goal.
  - Start date.
  - Deadline.
  - Available weekdays.
  - Session duration.
- Tối đa 2 Lesson/session.
- Giữ thứ tự Course → Chapter → Lesson.
- Daily/Weekly dùng cùng dữ liệu.
- Edit chỉ reschedule phần tương lai chưa hoàn thành.
- Nội dung đã completed không bị thay đổi.

## Enrollment prerequisite [Cập nhật mới]

Learner chỉ tạo Study Plan cho Course có Enrollment `active`.

Tạo Study Plan không tự tạo Enrollment.

# L-M03 – PROGRESS

## Công thức [Cập nhật mới]

Course Progress:

`completed lessons / total current lessons × 100%`

Chapter Progress tương tự.

Quiz/Exercise không cộng vào Progress.

## Cơ chế completion

- Learner bấm “Hoàn thành bài học”.
- Nút nằm cuối Lesson.
- Không yêu cầu minimum study time.
- Không yêu cầu pass Quiz.
- Không hỗ trợ reset.

## Data Model [Cập nhật mới]

`lesson_progress` sử dụng mô hình:

- Có record → Lesson đã completed.
- Không có record → chưa completed.

Không cần status `not_started/in_progress/completed`.

Trạng thái bắt đầu Lesson lấy từ Learning History.

# L-M04 – TASK & DEADLINE

## Nguồn Task [Cập nhật mới]

Tạm thời toàn bộ:

- Lesson trong Study Plan.
- Quiz liên quan.
- Exercise liên quan.

đều được coi là Task.

Exercise hiện được Phân hệ Nội dung biểu diễn như một loại Quiz.

Integration layer phải normalize giá trị Quiz type.

## Deadline

Lesson trong Study Plan:
- `planned_date` là cơ sở deadline.

Quiz/Exercise:
- Task phía User phải có deadline.
- [Cập nhật mới] Cơ chế chính thức xác định nguồn deadline của Quiz/Exercise chưa được chốt với Phân hệ Nội dung.
- Khi Content Module có contract chính thức, tài liệu này phải được cập nhật.

## Status [Cập nhật mới]

- `active`.
- `completed`.
- `cancelled`.

Completed:
- Lesson → Learner hoàn thành Lesson.
- Quiz/Exercise → Learner submit attempt.

Overdue:
- status `active`;
- current time > deadline.

Task cancelled không được tính overdue.

Learner vẫn được hoàn thành Task quá hạn nếu Task chưa cancelled.

# L-M05 – CALENDAR & REMINDER

Calendar lấy:

- Study Plan.
- Task.

Views:
- Month.
- Week.
- Day.

Reminder:
- mặc định 1 ngày trước;
- in-app + email;
- Learner chỉnh/tắt được.

Task completed:
- pending reminder bị cancel.

Deadline/Plan thay đổi:
- pending reminder được cập nhật.

[Cập nhật mới] Enrollment chuyển `left`:
- pending Reminder của Course bị cancel.

# L-M06 – NOTE

- Note tự do hoặc gắn Lesson.
- Nhiều Note/Lesson.
- Rich Text.
- Autosave + Save.
- Learner sửa/xóa Note của mình.
- Lesson hidden không xóa Note.

# L-M07 – BOOKMARK

- Target:
  - Lesson.
  - Material.
- Không duplicate Bookmark.
- Nhiều Tag.
- Search/filter.
- Không có Folder.
- Không có Note riêng.
- Hidden content không tự xóa Bookmark.

# L-M08 – LEARNING HISTORY

Learning History ghi:

- Lesson started.
- Lesson completed.
- Quiz started.
- Quiz completed.
- Exercise thông qua Quiz event có quiz type tương ứng.
- estimated study duration.

Learner không sửa/xóa History.

## Event Integration [Cập nhật mới]

Content Module gửi Event:

`POST /api/v1/internal/events`

Event phải có `event_id` duy nhất.

Duplicate cùng `event_id` không tạo History thứ hai.

Exercise không tạo event namespace riêng; dùng:

- `quiz_started`.
- `quiz_completed`.

và phân biệt qua `quiz_type`.

# L-M09 – RESULT

Result không chấm điểm.

Content Module sở hữu:
- Quiz Attempt.
- Answer.
- Correctness.
- Score.

User lấy dữ liệu qua:

- `/api/v1/quiz-results/latest`.
- `/api/v1/quiz-attempts`.

## Vai trò API [Cập nhật mới]

`/quiz-results/latest`
→ trạng thái hiện tại.

`/quiz-attempts`
→ lịch sử và trend.

## Topic

Phiên bản đầu:

`Topic = Chapter`.

## Công thức

`sum score / sum max_score × 100%`

## Trend

- trung bình 3 kết quả gần nhất;
- so với 3 kết quả liền trước.

< 6 completed attempts:
- “Chưa đủ dữ liệu để đánh giá xu hướng.”

## Ngưỡng

- >=80%: Tốt.
- 60–79%: Đạt.
- <60%: Cần cải thiện.

## Open dependency [Cập nhật mới]

API Contract yêu cầu Content trả:

- `score`.
- `max_score`.
- `percentage`.

Cơ chế lưu snapshot `max_score` lịch sử trong database Nội dung **chưa được chốt**.

User Module không tự tạo nguồn `max_score` chính thức.

Tài liệu phải cập nhật khi Phân hệ Nội dung cung cấp cơ chế chính thức.

# L-A01 – AI LEARNING PLAN

Input:
- goal;
- course;
- schedule availability;
- progress;
- result;
- learning history.

AI:
- chỉ đề xuất;
- phải Preview;
- phải validation;
- user confirm mới lưu.

Output sau khi được chấp nhận:
- Study Plan bình thường.

Không tự sửa Plan.

# L-A02 – PERSONALIZED LEARNING

Content:
- trả recommendation candidates hợp lệ.

User:
- Business Rules filter.
- AI ranking.
- fallback rule-based khi AI lỗi.

Recommendation:
- Dashboard.
- trang riêng.

Feedback:
- Phù hợp.
- Không phù hợp.

# L-A03 – ADAPTIVE LEARNING

Difficulty:
- easy.
- medium.
- hard.

Rule:
- <50%: giảm.
- 50–79%: giữ.
- >=80%: tăng.

User quyết định có áp dụng recommendation hay không.

Content kiểm tra availability và tạo practice session.

[Cập nhật mới] Exercise/practice naming từ Content phải qua Adapter; business logic User không phụ thuộc raw string cụ thể.
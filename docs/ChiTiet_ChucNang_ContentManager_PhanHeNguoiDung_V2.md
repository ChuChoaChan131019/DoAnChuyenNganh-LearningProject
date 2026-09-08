# CHI TIẾT CHỨC NĂNG CONTENT MANAGER

# PHẠM VI TRACKING [Cập nhật mới]

Không hard-code entity Class.

Phiên bản hiện tại:

Tracking Context = Course.

Content Manager chỉ quản lý Course do mình tạo.

Nguồn xác định:

`course.created_by`.

Không lưu mapping Manager ↔ Course thứ hai ở User Module.

Learner thuộc Course được xác định bằng:

`course_enrollments.status = active`.

# T-M01 – TEACHER DASHBOARD

Content Manager:

1. đăng nhập;
2. lấy danh sách Course mình tạo;
3. chọn Course;
4. Dashboard tổng hợp:
   - total active Learners;
   - Progress;
   - Result;
   - Task;
   - Support List;
   - recent activity;
   - Feedback;
   - Notification.

Nếu không có Course:
- “Bạn chưa có khóa học nào để theo dõi.”

Nếu Content API một phần lỗi:
- block còn lại vẫn hiển thị;
- block lỗi báo “Tạm thời chưa tải được dữ liệu.”

# T-M02 – PROGRESS

Chỉ active Learners trong Course.

Progress:
`completed Lessons / total current Lessons`.

Quiz không cộng Progress.

Slow progress:
- Study Plan session đã tới planned date;
- còn Lesson chưa completed.

Learner không có Plan:
- “Chưa có kế hoạch”;
- không tự coi là slow.

Manager read-only.

# T-M03 – RESULT ANALYSIS

Chỉ active Learners trong Course.

Điểm chính thức lấy Content API.

Topic phiên bản đầu:
`Chapter`.

Latest state:
`/quiz-results/latest`.

History/trend:
`/quiz-attempts`.

Ngưỡng:
- >=80% Tốt.
- 60–79% Đạt.
- <60% Cần cải thiện.

Learner chưa làm:
- “Chưa có dữ liệu”.
- không tính 0%.

[Cập nhật mới] `max_score` historical snapshot thuộc trách nhiệm Content Module và đang chờ Content xác nhận cơ chế lưu.

# T-M04 – TASK MONITORING

Task source hiện tại [Cập nhật mới]:

- Lesson trong Study Plan.
- Quiz liên quan.
- Exercise liên quan.

View:
- theo Task;
- theo Learner.

Task status:
- active;
- completed;
- cancelled.

Phân loại:
- completed on time;
- incomplete before deadline;
- overdue incomplete;
- completed late.

Cancelled Task không tính completion/overdue hiện hành.

Content Manager:
- không sửa completion;
- không sửa deadline tại màn hình này.

# T-M05 – SUPPORT LIST

Signals:

1. Slow Progress.
2. Result <60% hoặc Topic <60%.
3. >=1 overdue active Task.

Priority:
- 1 signal → Low.
- 2 → Medium.
- 3 → High.

Không dùng inactivity.

Không cho Manager xóa cảnh báo thủ công.

# T-M06 – FEEDBACK

- General hoặc context:
  - Progress.
  - Result.
  - Task.
- Draft sửa/xóa được.
- Sent không sửa/xóa.
- In-app Notification khi gửi.
- Rich Text.
- Read/unread.

# T-M07 – LEARNING NOTIFICATION

Recipient:

- một Learner;
- nhiều Learner;
- toàn active Learner trong Course.

Send:
- now;
- scheduled.

Channel:
- in-app;
- optional email.

[Cập nhật mới] Scheduled recipient phải được re-check theo `course_enrollments.status = active` tại thời điểm gửi.

# T-M08 – MESSAGING

1-1:

Learner ↔ Content Manager.

Conversation identity [Cập nhật mới]:

`learner_id + manager_id + course_id`

Cùng hai người nhưng Course khác:
- Conversation khác.

Enrollment `left`:
- giữ Messages;
- conversation → `read_only`.

Re-enroll:
- quan hệ membership active trở lại; việc cho phép conversation chuyển lại active được xử lý theo trạng thái Enrollment hiện hành.

Message:
- không sửa;
- không xóa;
- không realtime bắt buộc;
- notification khi có message mới.

# T-M09 – REPORT

Default:
- 30 ngày.

Có:
- Progress.
- Result.
- Task.
- Support List.

Output:
- Web.
- PDF.
- Excel.

Không snapshot.

Thiếu nguồn bắt buộc:
- Web partial.
- khóa export.
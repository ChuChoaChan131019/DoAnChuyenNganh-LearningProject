# CHI TIẾT CHỨC NĂNG ADMIN

# A-M01 – ADMIN DASHBOARD

Default:
- 7 ngày.

Hiển thị:
- Total Accounts.
- New Accounts.
- Active Users.
- DAU.
- WAU.
- MAU.
- AI Usage.
- system status.

Active User:
- phải có Meaningful Activity.
- login đơn thuần không mặc định tính Active.

[Cập nhật mới] Nguồn Analytics sử dụng `analytics_events`.

Content Module gửi event vào hệ Analytics chung qua HTTP Event Contract.

# A-M02 – SYSTEM USAGE

Meaningful Activity:
- business action có ý nghĩa;
- không tính page view đơn thuần.

Metrics:
- Active Users.
- Meaningful Activities.
- DAU.
- WAU rolling 7-day.
- MAU rolling 30-day.

Filter:
- role.
- 7/30/90/custom days.

Không drill-down user list.

# A-M03 – FEATURE ANALYTICS

Feature usage dựa trên Meaningful Feature Event.

Ví dụ:
- study_plan_created.
- bookmark_added.
- quiz_completed.
- feedback_sent.
- ai_learning_plan_applied.

Unique Users:
- user duy nhất.

Meaningful Feature Events:
- tổng action.

Funnel:
- chỉ feature có flow rõ.

[Cập nhật mới] Event Catalog là nguồn thống nhất tên event giữa hai phân hệ.

# A-M04 – ERROR/UX MONITORING

Theo dõi:
- backend error;
- external failure;
- critical client error;
- UX failure signal.

Error Group:
- type/name.
- severity.
- count.
- first seen.
- last seen.
- Open/Resolved.

Log không chứa:
- password;
- access token;
- refresh token;
- full Message;
- full Feedback;
- dữ liệu riêng tư không cần thiết.

[Cập nhật mới] Error telemetry không được trộn vào Learning History.

Chi tiết Error Event Contract có thể mở rộng sau nhưng phải giữ nguyên nguyên tắc privacy ở trên.

# A-M05 – SYSTEM NOTIFICATION

Recipient:
- all.
- Learner.
- Content Manager.
- Admin.

Types:
- General.
- Warning.
- Maintenance.

Send:
- now.
- scheduled.

Email:
- optional.

Sent:
- có thể thu hồi khỏi inbox người nhận; bản ghi được giữ lại với trạng thái `cancelled` để audit.

Read metrics:
- total recipients;
- read;
- unread;
- read rate.

## Database model [Cập nhật mới]

`notifications`
→ nội dung Notification.

`notification_recipients`
→ user nhận + read-state.

# A-M06 – SYSTEM REPORT

Default:
- 30 ngày.

Bắt buộc:
- Usage.
- Feature Analytics.
- Error/UX.
- AI Usage.

Output:
- Web.
- PDF.
- Excel.

Không snapshot.

Thiếu một nhóm bắt buộc:
- cảnh báo;
- khóa export.

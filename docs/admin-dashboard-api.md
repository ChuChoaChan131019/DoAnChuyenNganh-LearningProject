# Admin Dashboard API

## Endpoint

`GET /api/v1/admin/dashboard?days=7`

- Cần Bearer token hợp lệ và vai trò `admin` lấy từ `public.profiles`.
- `days` nhận `7`, `30`, `90`; mặc định là `7`. Giá trị khác trả HTTP 400.
- Kết quả nằm trong envelope `{ "data": ... }` do response interceptor chung tạo.
- Thời gian ngày được tính theo `Asia/Ho_Chi_Minh` (UTC+7). Khoảng ngày bao gồm hôm nay.

## Hợp đồng dữ liệu

```json
{
  "rangeDays": 7,
  "generatedAt": "2026-10-02T06:00:00.000Z",
  "accounts": {
    "total": 17,
    "byRole": { "learner": 10, "contentManager": 6, "admin": 1 },
    "newInRange": 2
  },
  "activity": {
    "source": "learning_history",
    "coverage": "learner_learning_activity_only",
    "activeUsers": 1,
    "meaningfulActivities": 1,
    "dau": 1,
    "wau": 1,
    "mau": 1,
    "daily": [{ "date": "2026-10-02", "activities": 1, "activeUsers": 1 }]
  },
  "aiUsage": { "totalCalls": null, "reason": "telemetry_not_available" },
  "systemStatus": { "apiAvailable": true, "uptime30d": null },
  "notifications": { "sent": 0, "scheduled": 0, "cancelled": 3, "readRecipients": 1 },
  "recentRegistrations": [
    { "id": "uuid", "name": "Tên hiển thị", "email": "user@example.com", "role": "learner", "createdAt": "2026-10-02T05:00:00Z" }
  ]
}
```

Các số trong ví dụ chỉ minh họa cấu trúc, không phải giá trị cố định; mảng `daily` được rút gọn trong ví dụ. Response thực tế luôn có đúng `rangeDays` phần tử, bao gồm ngày không có hoạt động với giá trị `0`. `recentRegistrations` tối đa 5 người, mới nhất trước.

## Nguồn và cách tính

| Trường | Nguồn | Quy tắc |
|---|---|---|
| `accounts.total`, `byRole` | `profiles` | Đếm hồ sơ và vai trò hiện tại. |
| `accounts.newInRange` | `profiles.created_at` | Từ đầu ngày đầu tiên của khoảng chọn đến thời điểm gọi API. |
| `activity.*` | `learning_history` | Chỉ đếm các hoạt động học tập có ý nghĩa đã ghi nhận; loại login/page view. `activeUsers` là số Learner duy nhất trong khoảng chọn. DAU là hôm nay; WAU và MAU lần lượt là 7 và 30 ngày gần nhất. |
| `notifications.*` | `notifications`, `notification_recipients` | Chỉ thông báo `system` có `reference_type` bắt đầu bằng `admin-system:`. `readRecipients` là số lượt đã đọc trong toàn bộ lịch sử, kể cả thông báo sau đó bị thu hồi. |
| `recentRegistrations` | `profiles` và Supabase Auth | Thời điểm từ profile; tên và email chỉ để Admin hiển thị. |
| `aiUsage.totalCalls` | Chưa có nguồn lượt gọi AI đáng tin | Trả `null`, không suy diễn từ số tin nhắn AI. |
| `systemStatus` | Request API hiện tại | `apiAvailable=true` nếu truy vấn Dashboard thành công; chưa có hệ thống đo uptime 30 ngày nên trả `null`. |

`analytics_events` hiện chưa được ghi dữ liệu. `learning_history` chỉ bao phủ một phần hoạt động của Learner; vì vậy Active Users, DAU, WAU và MAU hiện **không đại diện cho toàn hệ thống**. Frontend phải giữ chú thích phạm vi này. Khi Event Contract được triển khai đầy đủ, có thể chuyển các chỉ số hoạt động sang `analytics_events` sau khi định nghĩa chống trùng và xác minh dữ liệu. API không cần thay đổi phần đăng ký tài khoản.

Lỗi truy vấn dữ liệu trả HTTP 500 thay vì biến thành số `0`. Dashboard có nút thử lại; dữ liệu thiếu nguồn đo được biểu diễn bằng `null`.

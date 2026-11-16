# Giao diện khu vực admin

Khu vực `/admin` dùng layout riêng với hai mục: **Báo cáo thảo luận** và **Tài khoản**. Trang gốc chuyển đến `/admin/discussion-reports`. `frontend/src/config/roles.ts` cho phép vai trò `admin` vào khu vực này và đặt trang báo cáo làm điểm đến sau đăng nhập.

## Báo cáo thảo luận — Trang

`/admin/discussion-reports` đã nối API D04. Danh sách lọc theo trạng thái, phân trang 20 mục, xem nội dung/ngữ cảnh và xử lý bằng ba quyết định: bỏ qua, ẩn, gỡ. Mỗi quyết định cần lý do 10–1000 ký tự. API backend tiếp tục kiểm tra vai trò `admin`, không dựa vào kiểm tra route của frontend.

## Tài khoản — Trang

`/admin/accounts` hiện là **bản thiết kế giao diện**. Các dòng tài khoản là dữ liệu mẫu, được ghi rõ trên trang. Tìm kiếm/lọc và mở form chỉ minh họa tương tác; nút lưu, vô hiệu hóa và khôi phục chưa hoạt động. Không dùng các dòng mẫu này làm dữ liệu thực tế hoặc gọi Supabase trực tiếp từ frontend.

Trang tiếp tục FR-44: thay nguồn mẫu bằng API admin để danh sách/tìm/lọc/phân trang phản ánh dữ liệu thật; nối form tạo/sửa, thay đổi vai trò, vô hiệu hóa/khôi phục và trạng thái lỗi/thành công. Chốt trước hợp đồng API, cách tạo tài khoản (mật khẩu hay lời mời), trường được phép sửa và quy tắc thay đổi vai trò. Các thao tác đặc quyền chỉ chạy ở backend; Trang kiểm thử phân quyền trước khi nghiệm thu.

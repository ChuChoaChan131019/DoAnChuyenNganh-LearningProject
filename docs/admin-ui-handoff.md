# Giao diện khu vực admin

Khu vực `/admin` dùng layout riêng với hai mục: **Báo cáo thảo luận** và **Tài khoản**. Trang gốc chuyển đến `/admin/discussion-reports`. `frontend/src/config/roles.ts` cho phép vai trò `admin` vào khu vực này và đặt trang báo cáo làm điểm đến sau đăng nhập.

## Báo cáo thảo luận — Trang

`/admin/discussion-reports` đã nối API D04. Danh sách lọc theo trạng thái, phân trang 20 mục, xem nội dung/ngữ cảnh và xử lý bằng ba quyết định: bỏ qua, ẩn, gỡ. Mỗi quyết định cần lý do 10–1000 ký tự. API backend tiếp tục kiểm tra vai trò `admin`, không dựa vào kiểm tra route của frontend.

## Tài khoản — Trang

`/admin/accounts` đã nối dữ liệu thật: tìm tên/email, lọc vai trò/trạng thái, phân trang, xem thống kê, sửa họ tên/email và vô hiệu hóa/khôi phục tài khoản. Form tạo chỉ dành cho **content manager**, gồm họ tên, email và mật khẩu khởi tạo. Vai trò được backend xác định; không có chức năng đổi vai trò hoặc tạo admin/học viên từ trang này.

Xem [API và quy tắc FR-44](fr44-quan-ly-tai-khoan-api.md). Cần áp dụng migration FR-44 trước khi chạy phiên bản backend này. Đăng ký công khai vẫn tạo học viên; tài khoản admin ban đầu được cấp riêng ngoài giao diện quản lý tài khoản.

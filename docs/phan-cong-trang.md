# Chức năng phụ trách — Trần Thị Phương Trang

**Nguồn:** [phân công chung](phan-cong-cong-viec.md) và [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md). Phần việc mới được chốt ngày 22/10/2026; toàn bộ chức năng admin được chuyển cho Trang ngày 16/11/2026.

Tài liệu này ghi **phạm vi Trang phụ trách**, không xác nhận chức năng đã hoàn thành. Phần ở mục 1 lấy từ phân công cũ; phần ở mục 2 là các việc mới đã chốt. Tiến độ hiện tại cần được cập nhật riêng trong phân công chung và PR.

## 1. Chức năng theo phân công cũ

### 1.1. Quản lý khóa học, chương và bài học

- Quản lý giao diện nội dung và cây khóa học → chương → bài học; sắp xếp, tìm và mở nội dung cần chỉnh sửa.
- Tạo, xem, sửa, xóa khóa học, chương và bài học trong phạm vi quyền người biên soạn. Cấu trúc hiện tại không còn Category.
- Soạn nội dung lý thuyết, mục tiêu học tập và ví dụ C# cho bài học; kiểm tra cách bài hiển thị trước khi công bố theo quy trình nội dung.
- Xử lý tài liệu minh họa hoặc tệp đính kèm cho bài học. Đã hỗ trợ PDF, PNG, JPG/JPEG, WebP, C# và ZIP tối đa 6 MiB; tệp nằm trong Supabase Storage riêng tư và học viên chỉ mở/tải bằng URL có chữ ký sau khi API kiểm tra bài học đã xuất bản.

### 1.2. AI hỗ trợ biên soạn và kiểm tra nội dung

- Giao diện yêu cầu AI đề xuất nội dung bài học, xem và chỉnh sửa bản nháp trước khi sử dụng.
- Giao diện hàng chờ kiểm tra nội dung: nhận xét, chấp thuận, trả lại và xuất bản theo quyền được cấp.
- Phần nút tạo nội dung thật, lưu bản nháp, lịch sử sửa và quy trình backend thuộc phạm vi cũ của Trang nhưng cần chốt phạm vi triển khai cùng Linh đối với câu hỏi AI trước khi lên lịch. Trạng thái giao diện trong bảng cũ không đồng nghĩa quy trình backend đã hoàn tất.

## 2. Chức năng mới đã chốt

### 2.1. Báo cáo và kiểm duyệt thảo luận (`FR-50`–`FR-51`)

Trang phụ trách luồng báo cáo và xử lý nội dung trong [Thảo luận và chia sẻ nội dung học tập](chi-tiet-thao-luan-chia-se-noi-dung.md).

- Cho học sinh báo cáo một bài đăng hoặc bình luận kèm lý do; lưu báo cáo để quản trị viên xem xét.
- Tạo hàng chờ cho quản trị viên xem nội dung bị báo cáo, ngữ cảnh chương/bài học, lý do và trạng thái xử lý.
- Cho quản trị viên quyết định bỏ qua, ẩn hoặc gỡ nội dung; ghi người xử lý, thời điểm và lý do.
- Kiểm tra quyền `admin` ở API xử lý báo cáo; nội dung bị ẩn/gỡ không tiếp tục hiển thị hoặc nhận tương tác từ học sinh.

Khoa phụ trách dữ liệu bài đăng và lượt hữu ích; Linh phụ trách danh sách thảo luận và bình luận. Ba phần phải dùng chung quy ước về ID nội dung và trạng thái ẩn/gỡ.

### 2.2. Kiểm tra nội dung và lịch sử duyệt AI (`FR-12`–`FR-14`)

Trang chịu trách nhiệm phần backend còn thiếu của quy trình AI biên tập: kiểm tra nội dung bài học AI trước khi gửi duyệt; lưu bản nháp, phiên bản, người sửa và thời điểm sửa; cho người biên soạn nhận xét, chấp thuận hoặc trả lại. Kết quả kiểm tra là cảnh báo để người biên soạn quyết định, không tự xuất bản nội dung AI. Linh cung cấp kiểm tra riêng cho câu hỏi AI và phối hợp dùng chung trạng thái duyệt.

**Quyết định 18/11/2026:** dùng quy trình tự duyệt `draft → approved → published`; không bắt buộc người khác duyệt và không dùng bước `in_review`/`return`. Phiên bản hiện tại phải qua kiểm tra tự động trước khi duyệt; lỗi chặn duyệt, cảnh báo cho phép người biên soạn xác nhận tiếp tục. Xem [quy trình kiểm tra nội dung AI](quy-trinh-kiem-tra-noi-dung-ai.md).

### 2.3. Quản lý tài khoản và khu vực admin (`FR-44`)

Trang phụ trách toàn bộ giao diện và chức năng trong khu vực `/admin`, gồm trang báo cáo thảo luận ở mục 2.1 và quản lý tài khoản. Với `FR-44`, Trang làm API và giao diện để admin xem/tìm, sửa thông tin, vô hiệu hóa/khôi phục tài khoản và chỉ tạo content manager; không có chức năng đổi vai trò. API kiểm tra quyền `admin`; thao tác đặc quyền chạy ở backend, không đưa khóa quản trị lên trình duyệt. Trang kiểm thử phân quyền và luồng thực tế trước khi nghiệm thu. Xem [trạng thái giao diện admin](admin-ui-handoff.md).

# Chức năng phụ trách — Trần Thị Phương Trang

**Nguồn:** [phân công chung](phan-cong-cong-viec.md) và [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md). Phần việc mới được chốt ngày 22/10/2026.

Tài liệu này ghi **phạm vi Trang phụ trách**, không xác nhận chức năng đã hoàn thành. Phần ở mục 1 lấy từ phân công cũ; phần ở mục 2 là hai việc mới đã chốt. Tiến độ hiện tại cần được cập nhật riêng trong phân công chung và PR.

## 1. Chức năng theo phân công cũ

### 1.1. Quản lý khóa học, chương và bài học

- Quản lý giao diện nội dung và cây khóa học → chương → bài học; sắp xếp, tìm và mở nội dung cần chỉnh sửa.
- Tạo, xem, sửa, xóa khóa học, chương và bài học trong phạm vi quyền người biên soạn. Cấu trúc hiện tại không còn Category.
- Soạn nội dung lý thuyết, mục tiêu học tập và ví dụ C# cho bài học; kiểm tra cách bài hiển thị trước khi công bố theo quy trình nội dung.
- Xử lý tài liệu minh họa hoặc tệp đính kèm cho bài học khi nhóm chốt loại tệp và cách lưu trữ. Hạng mục tải tệp được ghi trong bảng cũ nhưng chưa có luồng hoàn chỉnh được xác nhận.

### 1.2. AI hỗ trợ biên soạn và kiểm tra nội dung

- Giao diện yêu cầu AI đề xuất nội dung bài học, xem và chỉnh sửa bản nháp trước khi sử dụng.
- Giao diện hàng chờ kiểm tra nội dung: nhận xét, chấp thuận, trả lại và xuất bản theo quyền được cấp.
- Phần nút tạo nội dung thật, lưu bản nháp, lịch sử sửa và quy trình backend thuộc phạm vi cũ của Trang nhưng cần chốt phạm vi triển khai cùng Linh đối với câu hỏi AI trước khi lên lịch. Trạng thái giao diện trong bảng cũ không đồng nghĩa quy trình backend đã hoàn tất.

## 2. Chức năng mới đã chốt

### 2.1. Dịch vụ chạy và chấm C# an toàn

Trang phụ trách phần chạy mã và trả kết quả cho [Phòng thực hành C#](chi-tiet-phong-thuc-hanh-csharp.md). Phần này phục vụ xem trước của người biên soạn, chạy thử và nộp bài của học sinh.

- Nhận mã C# cùng dữ liệu đầu vào dạng văn bản; giữ nguyên chuỗi, dấu cách và nhiều dòng theo định dạng của từng bài.
- Biên dịch, chạy chương trình trong môi trường cách ly và giới hạn thời gian, bộ nhớ, CPU, số tiến trình, kích thước đầu vào/đầu ra và tần suất yêu cầu.
- Chạy từng bộ kiểm tra của đúng bài thực hành, so đầu ra thực tế với kết quả mong đợi và trả trạng thái đạt, sai kết quả, lỗi biên dịch, lỗi khi chạy hoặc hết thời gian.
- Bảo vệ bộ kiểm tra ẩn: kết quả gửi cho học sinh không được làm lộ đầu vào hoặc đáp án của bộ ẩn.
- Trả lỗi rõ ràng khi môi trường chạy không khả dụng; không tạo kết quả mô phỏng như thể mã đã chạy.

Khoa cung cấp cấu trúc bài và bộ kiểm tra; Linh dùng kết quả chạy/chấm ở giao diện học sinh và lưu lần nộp, tiến độ. Dịch vụ chạy/chấm chính thức cần được triển khai và nghiệm thu theo tài liệu chức năng.

### 2.2. Báo cáo và kiểm duyệt thảo luận (`FR-50`–`FR-51`)

Trang phụ trách luồng báo cáo và xử lý nội dung trong [Thảo luận và chia sẻ nội dung học tập](chi-tiet-thao-luan-chia-se-noi-dung.md).

- Cho học sinh báo cáo một bài đăng hoặc bình luận kèm lý do; lưu báo cáo để quản trị viên xem xét.
- Tạo hàng chờ cho quản trị viên xem nội dung bị báo cáo, ngữ cảnh chương/bài học, lý do và trạng thái xử lý.
- Cho quản trị viên quyết định bỏ qua, ẩn hoặc gỡ nội dung; ghi người xử lý, thời điểm và lý do.
- Kiểm tra quyền `admin` ở API xử lý báo cáo; nội dung bị ẩn/gỡ không tiếp tục hiển thị hoặc nhận tương tác từ học sinh.

Khoa phụ trách dữ liệu bài đăng và lượt hữu ích; Linh phụ trách danh sách thảo luận và bình luận. Ba phần phải dùng chung quy ước về ID nội dung và trạng thái ẩn/gỡ.

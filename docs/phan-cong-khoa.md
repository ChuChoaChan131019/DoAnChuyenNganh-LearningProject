# Chức năng phụ trách — Lê Anh Khoa

**Nguồn:** [phân công chung](phan-cong-cong-viec.md) và [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md). Phần việc mới được chốt ngày 22/10/2026.

Tài liệu này ghi **phạm vi Khoa phụ trách**, không xác nhận chức năng đã hoàn thành. Phần ở mục 1 lấy từ phân công cũ; phần ở mục 2 là các việc mới đã chốt. Tiến độ hiện tại cần được cập nhật riêng trong phân công chung và PR.

## 1. Chức năng theo phân công cũ

### 1.1. Tìm và học nội dung

- Giao diện tìm kiếm nhanh khóa học/bài học, xem danh sách và mở khóa học cho học sinh.
- Các trang luyện tập nhanh, luyện theo khóa học hoặc chương cần ôn; luồng quiz trong trang luyện tập và hiển thị kết quả.
- Giao diện trải nghiệm học sinh liên quan, cùng các thành phần dùng chung như chân trang đã ghi trong bảng tính cũ.

### 1.2. AI Tutor và bảng điều khiển

- Trang AI Tutor cho học sinh hỏi đáp và xem lịch sử trò chuyện; phần bong bóng chat khi đọc bài và trả lời bám nội dung bài học thuộc phạm vi cũ còn cần triển khai.
- Giao diện bảng điều khiển người biên soạn; đưa số liệu thật vào các chỉ số theo phạm vi bảng cũ sau khi thống nhất nguồn dữ liệu và cách tính.
- Phối hợp với Linh ở luồng luyện câu hỏi/quiz và với Trang ở nội dung bài học. Trạng thái giao diện trong bảng cũ không tự xác nhận API hoặc thống kê đã hoạt động trên dữ liệu thật.

## 2. Chức năng mới đã chốt

### 2.1. Biên soạn bài thực hành C# (`FR-21`–`FR-27`)

Khoa phụ trách phía người biên soạn trong [Phòng thực hành C#](chi-tiet-phong-thuc-hanh-csharp.md).

- Danh sách, tìm/lọc, tạo, xem, sửa, sao chép, xóa hoặc thu hồi bài thực hành; gắn từng bài với bài học phù hợp.
- Nhập tiêu đề, yêu cầu, mục tiêu, độ khó, mã khởi đầu và ví dụ đầu vào/đầu ra; mô tả rõ định dạng cho bài nhận chuỗi, nhiều giá trị hoặc nhiều dòng.
- Tạo các bộ kiểm tra riêng cho từng bài, đánh dấu công khai/ẩn và nhập kết quả mong đợi; cung cấp dữ liệu đúng định dạng cho dịch vụ chấm của Trang.
- Nhập ba mức gợi ý, lời giải tham khảo và giải thích; xem trước giao diện học sinh và chạy thử lời giải trên các bộ kiểm tra.
- Lưu nháp, kiểm tra điều kiện trước xuất bản, xuất bản/thu hồi; giữ phiên bản bài khi đã có học sinh nộp để không làm mất lịch sử.

Trang phụ trách chạy/chấm lời giải và bài nộp; Linh dùng đề đã xuất bản để làm giao diện học sinh và lưu tiến độ. Ba người cùng thống nhất dữ liệu bài và kết quả trước khi nối các luồng.

### 2.2. Bài đăng và đánh dấu hữu ích trong thảo luận (`FR-46`, phần bài đăng của `FR-48`, `FR-49`)

Khoa phụ trách phần bài đăng và lượt hữu ích của [Thảo luận và chia sẻ nội dung học tập](chi-tiet-thao-luan-chia-se-noi-dung.md).

- Cho học sinh đăng câu hỏi, ghi chú hoặc chia sẻ tài liệu/đường dẫn gắn với chương hay bài học; lưu tác giả, loại bài và nội dung liên quan.
- Cho tác giả sửa hoặc xóa bài đăng của mình; kiểm tra quyền tác giả ở API và ngăn tạo bài không gắn với nội dung học tập.
- Cho học sinh đánh dấu hoặc bỏ đánh dấu hữu ích trên bài đăng và bình luận; mỗi tài khoản chỉ được tính một lượt cho mỗi nội dung.
- Cung cấp dữ liệu bài đăng và các thành phần đăng bài/hữu ích để Linh ghép vào trang thảo luận; áp dụng trạng thái ẩn/gỡ do luồng kiểm duyệt của Trang quyết định.

Loại tài liệu được chia sẻ và giới hạn tệp cần được nhóm chốt trước khi triển khai tải tệp trực tiếp. Giao diện chỉ đưa ra hình thức chia sẻ thực sự được hỗ trợ.

### 2.3. Tiến độ học tập tổng hợp và tiếp tục học (`FR-42`–`FR-43`)

Khoa tổng hợp dữ liệu bài học đã học, kết quả quiz/luyện tập và bài thực hành code đã hoàn thành thành tiến độ của từng học sinh; làm chức năng mở lại bài học đang học dở. Linh cung cấp dữ liệu quiz và bài code, Trang cung cấp trạng thái bài học. Phần lưu và mở lại mã bài code vẫn do Linh thực hiện ở Phòng thực hành C#.

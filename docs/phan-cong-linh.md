# Chức năng phụ trách — Đỗ Đặng Diệu Linh

**Nguồn:** [phân công chung](phan-cong-cong-viec.md) và [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md). Phần việc mới được chốt ngày 22/10/2026.

Tài liệu này ghi **phạm vi Linh phụ trách**, không xác nhận chức năng đã hoàn thành. Phần ở mục 1 lấy từ phân công cũ; phần ở mục 2 là hai việc mới đã chốt. Tiến độ hiện tại cần được cập nhật riêng trong phân công chung và PR.

## 1. Chức năng theo phân công cũ

### 1.1. Ngân hàng câu hỏi và quiz

- Giao diện ngân hàng câu hỏi, trình soạn câu hỏi và trang kiểm tra câu hỏi; tìm, tạo, xem, sửa, xóa câu hỏi theo quyền.
- Cấu hình nội dung, đáp án, phương án lựa chọn, độ khó và giải thích của câu hỏi; gắn câu hỏi với chương và bài học khi phù hợp. Dự án hiện không dùng bảng topic riêng.
- Chọn câu hỏi để tạo quiz; cấu hình đề, thời gian và trạng thái công bố; hỗ trợ học sinh làm bài, nộp câu trả lời và xem kết quả.
- Giao diện bộ luyện tập và kết quả câu hỏi. Những màn được đánh dấu hoàn thành trong bảng cũ vẫn cần kiểm tra lại API và dữ liệu thật khi nghiệm thu.

### 1.2. Bài học phía học sinh và câu hỏi AI

- Trang chi tiết bài học cho học sinh, phối hợp với cấu trúc khóa học/chương/bài học do Trang quản lý.
- Giao diện yêu cầu AI đề xuất câu hỏi; phần tạo câu hỏi thật và đưa đề xuất vào luồng kiểm tra nội dung cần phối hợp với Trang.
- Nút yêu cầu AI tạo câu luyện tập theo bài học thuộc phạm vi cũ của Linh; cần thống nhất dữ liệu đầu ra với luồng luyện tập của Khoa.

## 2. Chức năng mới đã chốt

### 2.1. Phòng thực hành C# phía học sinh (`FR-28`–`FR-33`)

Linh phụ trách trải nghiệm học sinh trong [Phòng thực hành C#](chi-tiet-phong-thuc-hanh-csharp.md).

- Hiển thị và tìm/lọc các bài đã xuất bản theo chương, bài học, độ khó và trạng thái làm bài; mở đúng đề cùng bài học liên quan.
- Trình soạn mã C#, lưu mã gần nhất theo tài khoản và bài, khôi phục khi học sinh quay lại.
- Cho học sinh chạy với dữ liệu tự nhập gồm chuỗi, nhiều giá trị hoặc nhiều dòng; hiển thị đầu ra thực tế và lỗi do dịch vụ của Trang trả về.
- Chạy thử bộ kiểm tra công khai, xem kết quả từng bộ; cho mở ba mức gợi ý lần lượt.
- Cho học sinh nộp bài, xem kết quả công khai và trạng thái bộ ẩn mà không lộ đáp án; lưu lần nộp, số lần chạy, gợi ý đã mở và trạng thái hoàn thành.

Khoa cung cấp đề, ví dụ và bộ kiểm tra đã xuất bản; Trang cung cấp dịch vụ chạy/chấm. Linh ghép hai nguồn dữ liệu thành một luồng làm bài và kiểm tra việc lưu tiến độ thực sự theo từng học sinh.

### 2.2. Xem thảo luận và bình luận (`FR-45`, `FR-47`, phần bình luận của `FR-48`)

Linh phụ trách giao diện thảo luận trong trang chương/bài học và luồng bình luận của [Thảo luận và chia sẻ nội dung học tập](chi-tiet-thao-luan-chia-se-noi-dung.md).

- Hiển thị, tìm và lọc bài đăng gắn với chương hoặc bài học mà học sinh có quyền xem; mở bài đăng và các bình luận liên quan.
- Cho học sinh tạo bình luận dưới bài đăng; sửa hoặc xóa bình luận của chính mình, kiểm tra quyền tác giả ở API.
- Ghép form đăng bài và nút hữu ích do Khoa phụ trách, cùng nút báo cáo do Trang phụ trách, vào giao diện học sinh.
- Khi bài đăng hoặc bình luận bị ẩn/gỡ, cập nhật danh sách và chi tiết để học sinh không tiếp tục xem hoặc tương tác với nội dung đó.

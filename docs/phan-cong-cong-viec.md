# Phân chia công việc — Phân hệ Nội dung

**Nguồn đối chiếu:** [Bảng tính phân công của nhóm](https://docs.google.com/spreadsheets/d/13QN-UGyH6Z6yL0FU4zw1-th-UWS-L1Zwk4Ta5fFunu0/edit?usp=sharing), hai tab **Phân công** và **Chức năng**, đọc ngày 21/10/2026; [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md); [chi tiết Phòng thực hành C#](chi-tiet-phong-thuc-hanh-csharp.md); [chi tiết Thảo luận và chia sẻ](chi-tiet-thao-luan-chia-se-noi-dung.md). Phân công hai chức năng mới ở mục 3.1 được nhóm chốt ngày 22/10/2026.

**Cách đọc:** Các mức `100%` và `0%` ở mục 2 được chép theo bảng tính cũ, phản ánh tiến độ nhóm đã đánh dấu vào tháng 8–9/2026. Chúng **không phải kết quả kiểm thử hoặc nghiệm thu mã hiện tại**. Mục 3.1 ghi **người chịu trách nhiệm đã chốt**, không có nghĩa chức năng đã làm xong. Mục 3.2 vẫn là đề xuất hoặc chưa phân công; hạn mới và tiến độ triển khai cần được cập nhật riêng.

**Tài liệu từng thành viên:** [Trang](phan-cong-trang.md) · [Linh](phan-cong-linh.md) · [Khoa](phan-cong-khoa.md).

## 1. Thành viên và phạm vi đã nhận

| Thành viên | Phạm vi chính đã ghi trong bảng tính | Vị trí mã nguồn thường liên quan |
| --- | --- | --- |
| Trần Thị Phương Trang | Quản lý khóa học, chương, bài học; soạn nội dung, tài liệu; AI biên soạn và kiểm duyệt nội dung. | `backend/src/modules/courses/`, `frontend/src/app/content-manager/learning-content/`, `frontend/src/app/content-manager/ai/` |
| Đỗ Đặng Diệu Linh | Ngân hàng câu hỏi, tạo và cấu hình quiz, trang làm quiz; AI tạo câu hỏi. | `backend/src/modules/questions/`, `backend/src/modules/quizzes/`, `frontend/src/app/content-manager/questions/`, `frontend/src/app/content-manager/testsandpractice/` |
| Lê Anh Khoa | Trải nghiệm học sinh: tìm kiếm, xem khóa học, luyện câu hỏi, AI Tutor; bảng điều khiển và thống kê. | `backend/src/modules/practice/`, `backend/src/modules/ai/`, `frontend/src/app/learner/`, `frontend/src/components/search/` |

Các đường dẫn chỉ giúp tìm phần mã có liên quan; chúng không chứng minh một người đã viết toàn bộ tệp trong thư mục đó. Khi giao việc tiếp, mỗi hạng mục cần có một người chịu trách nhiệm chính và người phối hợp được ghi rõ trong PR hoặc bảng tính.

## 2. Công việc đã ghi trong bảng tính

### Trang — nội dung và AI biên tập

| Công việc theo bảng cũ | Trạng thái trong bảng | Ghi chú khi dùng cho dự án hiện tại |
| --- | --- | --- |
| Giao diện quản lý nội dung; cấu trúc khóa học/chương/bài học; phần cây nội dung khi xem khóa học | `100%` | Mục Category trong giao diện cũ đã bị bỏ; cấu trúc hiện tại là khóa học → chương → bài học. |
| Tạo, sửa, xóa khóa học, chương, bài học | `100%` | Cần kiểm tra lại từng luồng với API và dữ liệu thật khi nghiệm thu. |
| Trang soạn bài học, nội dung lý thuyết và ví dụ C# | `100%` | Không suy ra tính năng xem trước/xuất bản hoàn chỉnh chỉ từ trạng thái của trang soạn. |
| Giao diện tạo nội dung AI và hàng chờ duyệt | `100%` | Đây là trạng thái **giao diện** trong bảng; luồng backend tạo bản nháp, nhận xét, lịch sử và duyệt vẫn cần làm. |
| Tải tài liệu đính kèm lên bài học | `0%` | Chưa có luồng tải tệp hoàn chỉnh được xác nhận. |
| Nút AI sinh nội dung bài học và quy trình kiểm duyệt/xuất bản nội dung AI | `0%` | Tiếp tục thuộc phạm vi Trang theo phân công cũ. |

### Linh — câu hỏi và quiz

| Công việc theo bảng cũ | Trạng thái trong bảng | Ghi chú khi dùng cho dự án hiện tại |
| --- | --- | --- |
| Giao diện ngân hàng câu hỏi, trình soạn câu hỏi, trang duyệt; giao diện đề kiểm tra, tạo đề, bộ luyện tập và kết quả | `100%` | Trạng thái này ghi cho các trang giao diện, không bảo đảm mọi trang đã nối API thật. |
| Trang hiển thị chi tiết bài học cho học sinh | `100%` | Phối hợp với cấu trúc khóa học/chương/bài học do Trang phụ trách. |
| Thêm, sửa, xóa và cấu hình câu hỏi, đáp án, độ khó, giải thích | `100%` | Câu hỏi mới hiện gắn chương; không dùng bảng topic cũ. Kiểm tra riêng các thao tác còn thiếu trước nghiệm thu. |
| Tạo quiz từ ngân hàng câu hỏi; cấu hình thời gian, trạng thái; học sinh làm quiz | `100%` | Cần kiểm tra lại luồng làm bài, chấm điểm và kết quả trên dữ liệu thật. |
| Giao diện AI tạo câu hỏi | `100%` | Chỉ là trạng thái giao diện theo bảng cũ. |
| Nút yêu cầu AI tạo câu luyện tập theo bài học | `0%` | Tiếp tục thuộc phạm vi Linh theo phân công cũ; cần thống nhất với luồng luyện tập của Khoa. |

### Khoa — trải nghiệm học tập và AI Tutor

| Công việc theo bảng cũ | Trạng thái trong bảng | Ghi chú khi dùng cho dự án hiện tại |
| --- | --- | --- |
| Giao diện bảng điều khiển người biên soạn, tìm kiếm, xem khóa học, luyện tập, AI Tutor và chân trang | `100%` | Một số màn trong dự án còn dữ liệu mẫu; cần phân biệt giao diện với số liệu thật. |
| Luyện tập nhanh, luyện theo phần học yếu, theo khóa học hoặc yêu cầu AI; tìm kiếm nhanh khóa học/bài học | `100%` | Đơn vị kiến thức hiện là **chương**, thay cho topic trong bảng cũ. |
| Luồng quiz trong trang luyện tập; khung chat AI Tutor ở trang riêng | `100%` | Kiểm tra lại phạm vi API và kết quả hiển thị khi nghiệm thu. |
| Thống kê thật cho bảng điều khiển người biên soạn | `0%` | Bảng cũ ghi rõ **không làm thống kê học sinh** trong hạng mục này. |
| Bong bóng chat nổi khi đọc bài và AI Tutor bám nội dung bài học | `0%` | Đây là phần còn lại của nhóm AI Tutor trong bảng cũ. |

## 3. Phân công các chức năng mới

### 3.1. Đã chốt người phụ trách

Các phần việc dưới đây là trách nhiệm triển khai **toàn luồng liên quan** (dữ liệu, API, giao diện và kiểm thử theo phạm vi được giao), không chỉ dựng màn hình.

| Chức năng | Người phụ trách chính | Phần việc đã chốt |
| --- | --- | --- |
| Phòng thực hành C# — biên soạn (`FR-21`–`FR-27`) | **Khoa** | Danh sách, tạo/xem/sửa/sao chép/xóa bài; gắn bài học; nhập ví dụ, bộ kiểm tra công khai/ẩn, gợi ý và lời giải; xem trước, kiểm tra lời giải tham khảo và xuất bản/thu hồi. Khoa chịu trách nhiệm dữ liệu bài thực hành và bộ kiểm tra. |
| Phòng thực hành C# — chạy và chấm an toàn (phục vụ `FR-26`, `FR-30`, `FR-31` và nộp bài) | **Trang** | Dịch vụ biên dịch/chạy C# trong môi trường cách ly; nhận đầu vào dạng văn bản kể cả chuỗi/nhiều dòng; giới hạn tài nguyên và tần suất; chạy từng bộ kiểm tra, so đầu ra, phân biệt lỗi và bảo vệ bộ kiểm tra ẩn. Cung cấp kết quả cho luồng xem trước, chạy thử và nộp bài. |
| Phòng thực hành C# — học sinh (`FR-28`–`FR-33`) | **Linh** | Danh sách bài đã xuất bản, trình soạn mã, chạy với dữ liệu tự nhập, chạy thử bộ công khai, xem kết quả, mở gợi ý, nộp bài, lưu mã/lần làm/tiến độ và tiếp tục bài đang làm. Linh tích hợp kết quả từ dịch vụ của Trang. |
| Thảo luận — bài đăng và đánh dấu hữu ích (`FR-46`, phần bài đăng của `FR-48`, `FR-49`) | **Khoa** | Tạo câu hỏi, ghi chú và bài chia sẻ gắn với chương/bài học; sửa/xóa bài đăng của chính tác giả; đánh dấu hoặc bỏ đánh dấu hữu ích cho bài đăng và bình luận, mỗi tài khoản được tính một lượt. Khoa chịu trách nhiệm dữ liệu bài đăng và lượt đánh dấu. |
| Thảo luận — xem và bình luận (`FR-45`, `FR-47`, phần bình luận của `FR-48`) | **Linh** | Danh sách và chi tiết thảo luận trong trang chương/bài học; tìm/lọc bài đăng; tạo, xem, sửa và xóa bình luận của chính tác giả. Linh ghép các thành phần đăng bài, hữu ích và báo cáo vào giao diện học sinh. |
| Thảo luận — báo cáo và kiểm duyệt (`FR-50`–`FR-51`) | **Trang** | Học sinh gửi báo cáo kèm lý do; hàng chờ báo cáo cho quản trị viên; xem ngữ cảnh, bỏ qua/ẩn/gỡ nội dung và lưu người xử lý, thời điểm, lý do. Trang chịu trách nhiệm quy tắc hiển thị của nội dung đã bị xử lý và quyền quản trị của luồng này. |

### 3.2. Việc còn cần chốt riêng

| Hạng mục | Người phụ trách hiện ghi nhận | Trạng thái phân công |
| --- | --- | --- |
| Quy trình bản nháp, kiểm tra, nhận xét, duyệt và xuất bản nội dung AI | Trang theo phạm vi cũ; Linh phối hợp phần câu hỏi | Cần chốt phạm vi backend và lịch mới. |
| Tiến độ học tập tổng hợp từ bài học, quiz, luyện tập và bài code | Khoa được đề xuất; Trang và Linh cung cấp dữ liệu liên quan | Chưa chốt người phụ trách chính cho phiên bản cuối. |
| Quản lý tài khoản của quản trị viên | Chưa ghi người phụ trách trong bảng tính cũ | Cần phân công riêng; không gộp với xử lý báo cáo thảo luận. |

## 4. Điểm phối hợp và theo dõi

1. **Dữ liệu học tập:** Dùng cấu trúc khóa học → chương → bài học. Thảo luận gắn với chương hoặc bài học; bài thực hành gắn với bài học. Không xây lại Category hoặc topic.
2. **Phòng thực hành:** Khoa và Trang thống nhất định dạng bài/bộ kiểm tra và quy tắc công khai/ẩn; Trang và Linh thống nhất phản hồi chạy/nộp và cách lưu kết quả. Ba người cùng nghiệm thu từ tạo nháp đến học sinh nộp bài đạt; mã và tiến độ của học sinh được giữ khi đề được sửa.
3. **Thảo luận:** Khoa, Linh và Trang thống nhất bài đăng, bình luận, lượt hữu ích, báo cáo và trạng thái ẩn/gỡ trước khi làm riêng. Mọi thao tác sửa/xóa cần kiểm tra đúng tác giả; thao tác xử lý báo cáo cần quyền `admin` ở API.
4. **Theo dõi tiến độ:** Người phụ trách cập nhật `Chưa làm`, `Đang làm`, `Chờ duyệt`, `Hoàn thành` cùng liên kết PR. Chỉ đánh dấu hoàn thành sau khi kiểm tra luồng thật; các mức `100%` trong bảng cũ không thay thế nghiệm thu.
5. **Lịch và bảng tính:** Mốc tháng 8–9/2026 trong bảng là lịch sử. Khi nhóm điền hạn mới, cập nhật bảng tính theo các phần việc đã chốt ở mục 3.1 và đối chiếu lại với file này.

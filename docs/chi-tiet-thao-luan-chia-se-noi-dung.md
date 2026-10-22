# Mô tả chi tiết chức năng — Thảo luận và chia sẻ nội dung học tập

**Phạm vi:** chức năng dự kiến cho phân hệ Nội dung, tương ứng `FR-45`–`FR-51` trong [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md).

Tài liệu này mô tả cách học sinh trao đổi với nhau ngay tại nội dung đang học và cách quản trị viên xử lý nội dung bị báo cáo. **Chức năng chưa được triển khai** trong dự án. Đây không phải AI Tutor, nhắn tin riêng hay một bảng tin đăng bài tự do.

## 1. Mục tiêu và nơi hiển thị

Khi học một bài C#, học sinh có thể hỏi điều chưa hiểu, chia sẻ ghi chú hoặc nguồn tham khảo để các bạn đang học cùng nội dung xem và trao đổi. Thảo luận phải gắn với **chương hoặc bài học cụ thể**. Trong dự án hiện tại, “chủ đề học tập” được biểu diễn bằng `Chapter`; hệ thống không dùng bảng `topics` riêng. Nếu chọn bài học, chương tương ứng được xác định từ bài học đó.

Tại trang bài học, học sinh thấy các bài đăng của chính bài đó. Tại trang chương, học sinh có thể xem bài đăng gắn trực tiếp với chương và tìm đến thảo luận của các bài học thuộc chương. Một bài đăng luôn dẫn ngược được về nội dung học tập liên quan. Học sinh chỉ xem và tham gia thảo luận của nội dung đã được công bố mà mình có quyền truy cập.

## 2. Các chức năng của học sinh

### 2.1. Xem và tìm thảo luận

Học sinh mở khu vực thảo luận từ chương hoặc bài học, thấy tiêu đề, loại bài đăng, người đăng, thời điểm, số bình luận và số lượt đánh dấu hữu ích. Khi mở một bài đăng, học sinh đọc nội dung, tài liệu chia sẻ nếu có và các bình luận bên dưới. Có thể lọc theo loại bài hoặc tìm theo từ khóa trong phạm vi chương/bài học để tìm câu hỏi đã được trao đổi trước đó. Nội dung bị quản trị viên ẩn hoặc gỡ không xuất hiện trong danh sách học sinh.

### 2.2. Đăng câu hỏi

Học sinh chọn loại **Câu hỏi**, nhập tiêu đề và mô tả điều chưa hiểu, rồi chọn chương hoặc bài học liên quan. Nếu bắt đầu từ trang bài học, hệ thống gợi sẵn bài đó nhưng học sinh vẫn thấy rõ mình đang đăng vào đâu. Trước khi đăng, hệ thống yêu cầu nội dung không được để trống. Sau khi đăng thành công, bài xuất hiện trong khu vực thảo luận tương ứng; nếu gửi thất bại, học sinh nhận thông báo và không mất nội dung vừa soạn.

### 2.3. Chia sẻ ghi chú hoặc tài liệu

Học sinh chọn loại **Ghi chú** để chia sẻ cách hiểu, ví dụ hoặc phần tóm tắt mình tự viết; chọn **Tài liệu** để chia sẻ nguồn học tập có liên quan. Bài chia sẻ cần có lời giới thiệu để người khác biết tài liệu giúp học phần nào. Nguồn có thể là đường dẫn hoặc tệp đính kèm theo loại mà hệ thống cho phép. Danh sách định dạng, giới hạn dung lượng và việc có hỗ trợ tải tệp trực tiếp hay không cần được chốt trước khi triển khai; giao diện chỉ đưa ra những lựa chọn thực sự được hỗ trợ.

### 2.4. Bình luận dưới bài đăng

Học sinh viết bình luận để trả lời câu hỏi, bổ sung ví dụ hoặc hỏi lại người đăng. Bình luận hiển thị theo thứ tự thời gian dưới đúng bài đăng. Nội dung bình luận không được để trống. Nếu bài đăng đã bị ẩn hoặc gỡ, học sinh không thể tiếp tục bình luận vào bài đó. Bản đầu chỉ cần bình luận trực tiếp dưới bài đăng; không yêu cầu luồng nhắn tin riêng giữa hai học sinh.

### 2.5. Sửa và xóa nội dung của mình

Tác giả có thể sửa tiêu đề, nội dung hoặc tài liệu chia sẻ trong bài đăng của mình, cũng như sửa bình luận mình đã viết. Khi sửa, hệ thống ghi nhận thời điểm cập nhật để người đọc biết nội dung đã thay đổi. Tác giả có thể xóa bài đăng hoặc bình luận của mình; thao tác xóa bài cần cảnh báo rằng bình luận bên dưới có thể không còn hiển thị. Học sinh không được sửa hoặc xóa nội dung do người khác tạo, kể cả khi giao diện bị can thiệp để gửi yêu cầu trực tiếp đến API.

### 2.6. Đánh dấu hữu ích

Học sinh đánh dấu bài đăng hoặc bình luận có ích và có thể bỏ đánh dấu nếu đổi ý. Mỗi tài khoản chỉ được tính một lượt cho một bài đăng hoặc bình luận; số lượt hiển thị phải phản ánh dữ liệu thật. Đánh dấu hữu ích giúp người khác tìm nội dung được nhiều người quan tâm, **không có nghĩa kiến thức trong đó đã được kiểm chứng là đúng**.

### 2.7. Báo cáo nội dung không phù hợp

Học sinh có thể báo cáo một bài đăng hoặc bình luận và nêu lý do, ví dụ nội dung không liên quan đến bài học, xúc phạm người khác hoặc chia sẻ liên kết nguy hiểm. Sau khi gửi, hệ thống báo đã nhận báo cáo; không tự kết luận nội dung vi phạm chỉ vì có báo cáo. Một tài khoản không cần gửi lặp cùng một báo cáo chưa xử lý cho cùng một nội dung. Người báo cáo không được xem thông tin riêng của người báo cáo khác.

## 3. Chức năng của quản trị viên

### 3.1. Xem danh sách báo cáo

Quản trị viên mở hàng chờ báo cáo, xem nội dung bị báo cáo, bài học/chương liên quan, lý do, thời điểm và tình trạng xử lý. Có thể lọc báo cáo chưa xử lý để ưu tiên kiểm tra. Quyền xem hàng chờ và xử lý báo cáo chỉ thuộc tài khoản `admin` theo đặc tả hiện tại; người biên soạn không mặc nhiên có quyền kiểm duyệt thảo luận.

### 3.2. Xem xét và ra quyết định

Quản trị viên đọc nội dung trong ngữ cảnh cuộc trao đổi rồi chọn **không vi phạm**, **ẩn** hoặc **gỡ** theo quy định của nhóm. Ẩn hoặc gỡ khiến học sinh không còn thấy nội dung và không thể tiếp tục tương tác với nó; dữ liệu xử lý cần được giữ để tra cứu khi cần. Mỗi quyết định ghi người xử lý, thời điểm và lý do. Báo cáo đã xử lý không còn nằm trong danh sách chờ, nhưng vẫn xem lại được lịch sử.

## 4. Quy tắc chung và trường hợp ngoại lệ

Mọi thao tác tạo, sửa, xóa, đánh dấu hữu ích, báo cáo và xử lý báo cáo đều yêu cầu đăng nhập. Hệ thống kiểm tra quyền ở API, không chỉ ẩn nút trên giao diện. Bài đăng phải gắn với chương hoặc bài học tồn tại; nếu có bài học thì bài học phải thuộc chương đã xác định. Không cho tạo bài đăng không gắn với nội dung học tập.

Khi khóa học hoặc bài học liên quan bị thu hồi, thảo luận của nội dung đó không còn hiển thị với học sinh không có quyền xem. Cách lưu giữ, chuyển hoặc xóa thảo luận khi chương/bài học bị xóa cần được chốt trước khi thay đổi dữ liệu để không làm mất lịch sử ngoài ý muốn.

Văn bản học sinh nhập và liên kết/tệp chia sẻ phải được kiểm tra, giới hạn kích thước và hiển thị an toàn. Hệ thống cần giới hạn tần suất đăng bài, bình luận và báo cáo để tránh spam. Nếu tài liệu không tải được hoặc thao tác thất bại, giao diện phải báo rõ; không hiển thị như thể đã đăng thành công.

## 5. Luồng kiểm tra để nghiệm thu

1. Học sinh A mở một bài học đã xuất bản, đăng câu hỏi và chia sẻ một ghi chú. Học sinh B thấy hai bài đăng tại đúng bài học đó, không thấy chúng như bài đăng độc lập ở bài học khác.
2. Học sinh B bình luận và đánh dấu bình luận hữu ích. Đánh dấu lại không làm tăng lượt; bỏ đánh dấu làm giảm lượt tương ứng.
3. Học sinh A sửa bài đăng hoặc bình luận của mình. Học sinh B không sửa được nội dung của A bằng giao diện hay yêu cầu gửi trực tiếp đến API.
4. Học sinh B báo cáo một bình luận kèm lý do. Quản trị viên thấy báo cáo, xem ngữ cảnh và ẩn hoặc gỡ nội dung; học sinh không còn thấy nội dung đó, còn quản trị viên xem được quyết định đã lưu.
5. Tài khoản không đăng nhập hoặc không có quyền xem bài học không được tạo hay đọc thảo luận của bài học đó.

## 6. Điểm cần chốt khi thiết kế chi tiết

Nhóm cần thống nhất loại tài liệu có thể chia sẻ (chỉ đường dẫn hay cả tệp), giới hạn dung lượng/định dạng, quy tắc ẩn và gỡ, cách xử lý thảo luận khi bài học bị thu hồi hoặc xóa, cùng nội dung được xem là vi phạm. Những quyết định này cần được giải thích rõ trên giao diện cho người đăng và người quản trị.

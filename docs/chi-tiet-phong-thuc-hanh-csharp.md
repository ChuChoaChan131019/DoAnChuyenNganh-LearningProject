# Mô tả chi tiết chức năng — Phòng thực hành C#

**Phạm vi:** chức năng dự kiến cho phân hệ Nội dung, tương ứng `FR-21`–`FR-33` trong [đặc tả chức năng](dac-ta-chuc-nang-phan-he-noi-dung.md).

**Quyết định triển khai đã chốt:** [Trình độ bài tập, đầu vào/đầu ra, bộ kiểm tra, dữ liệu và ranh giới API](quyet-dinh-thiet-ke-phong-thuc-hanh-csharp.md).

Tài liệu này mô tả học sinh và người biên soạn sẽ sử dụng Phòng thực hành như thế nào. Đây là **yêu cầu cho chức năng dự kiến**, không phải danh sách những gì đã làm xong. Chức năng chính thức chưa được triển khai.

## 1. Mục tiêu và phạm vi

Học sinh học xong một bài C# có thể mở bài thực hành liên quan, viết chương trình, thử với dữ liệu của mình, kiểm tra bằng các bộ dữ liệu do người biên soạn chuẩn bị và nộp bài để ghi nhận kết quả. Người biên soạn tạo đề, chuẩn bị dữ liệu kiểm tra, gợi ý và lời giải trước khi công bố.

Giai đoạn đầu chỉ hỗ trợ **chương trình C# dạng console**. Chương trình đọc dữ liệu qua đầu vào chuẩn, chẳng hạn `Console.ReadLine()`, và in kết quả ra đầu ra chuẩn, chẳng hạn `Console.WriteLine()`. Mỗi bài có thể yêu cầu một số, một chuỗi, nhiều giá trị trên một dòng hoặc nhiều dòng. Hệ thống không mặc định mọi bài đều nhận hai số nguyên.

## 2. Các chức năng của người biên soạn

### 2.1. Xem và tìm bài thực hành

Người biên soạn mở danh sách để biết mỗi bài thuộc khóa học, chương và bài học nào, độ khó ra sao và đang là nháp hay đã xuất bản. Có thể tìm theo tên và lọc theo vị trí trong khóa học, độ khó, trạng thái. Từ danh sách, người biên soạn mở bài để xem chi tiết hoặc tiếp tục chỉnh sửa.

### 2.2. Tạo bài và chọn bài học liên quan

Khi tạo bài, người biên soạn nhập tiêu đề, mục tiêu học tập, yêu cầu cần giải, độ khó và chọn bài học liên quan. Chương được xác định từ bài học đã chọn để tránh gắn bài vào sai chương. Bài mới được lưu ở trạng thái **Nháp**; học sinh chưa thấy bài này. Người biên soạn có thể mở lại bản nháp và tiếp tục làm sau.

### 2.3. Mô tả đầu vào và đầu ra

Đề bài phải nói rõ học sinh cần đọc dữ liệu như thế nào, chương trình cần in gì và có cần đúng thứ tự hay định dạng cụ thể không. Người biên soạn nhập ít nhất một ví dụ gồm **đầu vào mẫu** và **đầu ra mẫu**. Các giá trị được ghi dưới dạng văn bản nguyên vẹn, nên có thể chứa tiếng Việt, dấu cách và xuống dòng. Ví dụ, bài tính tổng dãy số có thể ghi `5` ở dòng đầu và `1 2 3 4 5` ở dòng sau. Người biên soạn không cần chọn một kiểu dữ liệu chung cho mọi bài; cách đọc và diễn giải đầu vào được mô tả trong từng đề.

### 2.4. Chuẩn bị mã khởi đầu

Người biên soạn có thể cung cấp một đoạn C# ban đầu, ví dụ phần đọc dữ liệu và chỗ trống để học sinh viết thuật toán. Nếu không có mã khởi đầu, học sinh nhận vùng soạn thảo trống. Mã khởi đầu không được chứa lời giải hoàn chỉnh nếu mục tiêu của bài là để học sinh tự thực hiện phần đó.

### 2.5. Tạo bộ kiểm tra

Mỗi bộ kiểm tra gồm đầu vào gửi cho chương trình và kết quả mong đợi. Người biên soạn thêm nhiều bộ để kiểm tra cả trường hợp thông thường lẫn trường hợp biên, chẳng hạn số âm, chuỗi có dấu cách hoặc dãy nhiều phần tử. Mỗi bộ được đánh dấu **công khai** hoặc **ẩn**. Bộ công khai giúp học sinh hiểu lỗi; bộ ẩn dùng khi nộp bài nhưng không lộ dữ liệu hoặc đáp án. Các bộ kiểm tra thuộc riêng từng bài, nên bài chào theo tên không dùng chung bộ kiểm tra của bài tính tổng.

Trước khi xuất bản, hệ thống kiểm tra bộ dữ liệu có đầu vào và đầu ra mong đợi theo quy tắc của bài; giá trị rỗng vẫn hợp lệ nếu đề bài yêu cầu. Người biên soạn phải chạy lời giải tham khảo qua các bộ kiểm tra để phát hiện đề hoặc đáp án nhập sai. Số bộ tối thiểu và cách so khớp đầu ra được ghi trong [quyết định thiết kế](quyet-dinh-thiet-ke-phong-thuc-hanh-csharp.md); giới hạn tài nguyên cụ thể sẽ được cấu hình và đo khi triển khai.

### 2.6. Soạn gợi ý, lời giải và giải thích

Người biên soạn nhập ba mức gợi ý theo thứ tự: nhắc lại kiến thức liên quan, chỉ cách tiếp cận và gợi ý cụ thể hơn. Đồng thời nhập mã lời giải tham khảo và lời giải thích tại sao chương trình hoạt động. Gợi ý không tự mở toàn bộ; lời giải hoàn chỉnh không xuất hiện ngay khi học sinh vào bài.

### 2.7. Xem trước, xuất bản và cập nhật

Chế độ xem trước cho người biên soạn thấy đề, ví dụ và mã khởi đầu như học sinh sẽ thấy. Họ kiểm tra dữ liệu, lời giải và khả năng chạy C# trước khi xuất bản. Hệ thống từ chối xuất bản nếu thiếu bài học hợp lệ, thiếu nội dung bắt buộc, không có bộ kiểm tra hợp lệ hoặc môi trường chạy không sẵn sàng. Chỉ bài đã xuất bản và có bài học còn được công bố mới hiện với học sinh.

Người biên soạn có thể sửa, sao chép để tạo bài mới hoặc thu hồi bài đã xuất bản. Khi sửa một bài đã có người làm, hệ thống giữ mã và kết quả cũ của học sinh, đồng thời ghi nhận phiên bản đề dùng ở mỗi lần nộp. Nếu xóa bài, cần xử lý theo cách không làm mất lịch sử học tập đã lưu.

## 3. Các chức năng của học sinh

### 3.1. Tìm và mở bài

Học sinh chỉ xem được bài đã xuất bản mà mình có quyền truy cập. Danh sách cho biết tên bài, bài học liên quan, độ khó và trạng thái cá nhân như chưa làm, đang làm hoặc đã hoàn thành. Có thể tìm và lọc theo chương, bài học, độ khó và trạng thái. Khi mở bài, học sinh thấy yêu cầu, mục tiêu, ví dụ đầu vào/đầu ra và liên kết quay lại bài học.

### 3.2. Viết và lưu chương trình

Học sinh sửa mã C# trong vùng soạn thảo, bắt đầu từ mã khởi đầu hoặc mã đã lưu của chính mình. Mã gần nhất được lưu riêng theo **tài khoản và bài thực hành**, để khi đổi trang hoặc đăng nhập lại học sinh có thể làm tiếp. Nếu lưu thất bại, giao diện phải báo rõ để học sinh không tưởng rằng mã đã được giữ lại.

### 3.3. Chạy bằng đầu vào tự nhập

Học sinh nhập dữ liệu bất kỳ vào ô đầu vào rồi bấm chạy. Hệ thống chuyển nguyên văn phần đã nhập, kể cả dấu cách và xuống dòng, đến chương trình C#. Chương trình tự quyết định cách đọc. Sau khi chạy, học sinh thấy **đầu ra thực tế** hoặc lỗi biên dịch/lỗi chạy/hết thời gian. Đây là cách thử ý tưởng bằng dữ liệu tự chọn, nên hệ thống **không chấm đúng sai** khi không có kết quả mong đợi tương ứng và **không đánh dấu hoàn thành**.

Ví dụ: với bài chào theo tên, học sinh nhập `Mai Anh` và có thể thấy `Xin chào, Mai Anh!`. Với bài tính tổng dãy số, học sinh nhập `5` ở dòng đầu, `1 2 3 4 5` ở dòng sau và có thể thấy `15`. Kết quả phụ thuộc mã học sinh đã viết; đây không phải đầu ra giả lập.

### 3.4. Chạy thử bộ kiểm tra công khai

Học sinh bấm kiểm tra để chạy chương trình với các bộ công khai của bài. Giao diện cho biết từng bộ **đạt** hay **chưa đạt**, kèm đầu vào, đầu ra mong đợi và đầu ra thực tế. Nếu code không biên dịch được, hệ thống hiển thị thông báo lỗi để sửa trước khi chạy các bộ. Nếu chương trình gặp lỗi khi chạy, hết thời gian hoặc không in gì, kết quả phải nói đúng tình huống đó. Chạy thử giúp học sinh sửa bài, nhưng chưa phải thao tác nộp và không tự ghi nhận hoàn thành.

### 3.5. Mở gợi ý theo thứ tự

Học sinh tự bấm mở gợi ý mức 1, rồi mới đến mức 2 và mức 3. Hệ thống nhớ mức gợi ý cao nhất đã mở cho đúng học sinh và đúng bài. Khi quay lại, học sinh vẫn thấy những gợi ý mình đã dùng. Việc mở gợi ý không thay đổi kết quả chạy code.

### 3.6. Nộp bài và xem kết quả

Khi bấm **Nộp bài**, hệ thống chạy chương trình với toàn bộ bộ kiểm tra bắt buộc, kể cả bộ ẩn. Bài được đánh dấu hoàn thành chỉ khi một lần nộp đạt điều kiện đã cấu hình; các lần chạy tự nhập hoặc chạy thử không đủ để hoàn thành. Học sinh được xem kết quả từng bộ. Với bộ ẩn, giao diện chỉ cho biết trạng thái và thông tin hỗ trợ không làm lộ đầu vào hay đáp án. Hệ thống lưu mã đã nộp, thời điểm, kết quả, phiên bản đề và trạng thái hoàn thành.

### 3.7. Xem lời giải và làm tiếp

Sau khi hoàn thành, học sinh có thể chủ động mở lời giải tham khảo và phần giải thích. Lời giải không thay thế mã học sinh đã lưu. Nếu bài chưa đạt, học sinh tiếp tục sửa và nộp lại; lịch sử lần làm và số lần chạy được giữ theo tài khoản. Quy tắc mở lời giải cho người chưa giải được bài cần được chốt riêng trước khi triển khai.

## 4. Quy tắc chạy code và xử lý lỗi

Mã do học sinh nhập phải được biên dịch và chạy trong môi trường cách ly, có giới hạn thời gian, bộ nhớ, CPU, số tiến trình, dung lượng đầu vào/đầu ra và số lần yêu cầu. Mã không được truy cập tùy ý vào mạng, tệp của máy chủ, khóa bí mật hoặc dữ liệu của học sinh khác. Mỗi bộ kiểm tra cần được chạy với đúng đầu vào của bộ đó, không dùng lại dữ liệu còn sót từ bộ trước.

Giao diện cần phân biệt **sai kết quả**, **lỗi biên dịch**, **lỗi khi chạy**, **hết thời gian** và **môi trường chạy không khả dụng**. Khi môi trường không khả dụng, hệ thống thông báo rõ và không ghi một kết quả giả như thể mã đã được chạy. Đầu ra quá lớn hoặc gửi yêu cầu liên tục cũng phải có thông báo phù hợp.

## 5. Luồng kiểm tra để nghiệm thu

1. Người biên soạn tạo một bài về biến, một bài về điều kiện và một bài về vòng lặp; mỗi bài có ví dụ, bộ công khai/ẩn, gợi ý và lời giải. Bài nháp không xuất hiện với học sinh.
2. Người biên soạn thử lời giải tham khảo, sửa dữ liệu sai nếu có rồi xuất bản. Học sinh mở được đúng bài đã xuất bản.
3. Học sinh nhập chuỗi, nhiều giá trị và dữ liệu nhiều dòng ở những bài tương ứng; hệ thống chạy code thật và hiển thị đầu ra thực tế.
4. Học sinh thử mã sai, xem phản hồi từng bộ, mở gợi ý, rời trang rồi quay lại. Mã và gợi ý đã dùng vẫn còn.
5. Học sinh nộp bài đạt; hệ thống ghi nhận hoàn thành. Bộ ẩn không lộ đầu vào/đáp án, lịch sử nộp và kết quả cá nhân được giữ lại.

## 6. Điểm còn cần chốt khi triển khai

Cách so khớp đầu ra và số bộ kiểm tra tối thiểu đã được ghi trong [quyết định thiết kế](quyet-dinh-thiet-ke-phong-thuc-hanh-csharp.md). Nhóm vẫn cần đo để đặt giới hạn tài nguyên cụ thể, chốt quy tắc mở lời giải cho người chưa hoàn thành và đặt đường dẫn API theo mã nguồn hiện có.

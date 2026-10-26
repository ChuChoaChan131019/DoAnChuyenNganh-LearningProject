# Quyết định thiết kế — Phòng thực hành C#

**Ngày chốt:** 26/10/2026  
**Trạng thái:** thiết kế đã thống nhất để Khoa, Trang và Linh cùng triển khai; **chưa phải chức năng đã làm xong**.  
**Tài liệu chức năng:** [Mô tả chi tiết Phòng thực hành C#](chi-tiet-phong-thuc-hanh-csharp.md).

## 1. Trình độ và loại bài tập

Phiên bản đầu phục vụ **C# cơ bản**, dưới dạng **chương trình console trên .NET 10**. Học sinh viết một chương trình đọc dữ liệu qua đầu vào chuẩn (`Console.ReadLine()`, hoặc cách đọc tương đương) và in kết quả ra đầu ra chuẩn (`Console.WriteLine()`, hoặc cách in tương đương).

| Mức | Kiến thức | Ví dụ |
| --- | --- | --- |
| Dễ | Biến, kiểu dữ liệu, nhập/xuất, phép toán | Nhập hai số và in tổng. |
| Trung bình | Điều kiện `if/else`, vòng lặp | Kiểm tra số chẵn lẻ; tính tổng từ 1 đến `n`. |
| Khá | Chuỗi, mảng, hàm đơn giản | Đếm nguyên âm; tìm giá trị lớn nhất trong dãy. |

Ba bài mẫu đầu tiên nên lần lượt kiểm tra **biến**, **câu lệnh điều kiện** và **vòng lặp**. Phiên bản này chưa đặt bài tập yêu cầu giao diện, web, cơ sở dữ liệu hoặc thư viện ngoài. Độ khó của bài tập học sinh khác với độ khó xây dựng dịch vụ chạy và chấm code; phần dịch vụ cần được kiểm thử và cô lập riêng.

## 2. Quy ước đầu vào và đầu ra

- Mỗi bài phải mô tả rõ định dạng đầu vào, định dạng đầu ra và ví dụ. Không cố định mọi bài đều nhận hai số nguyên.
- Đầu vào và đầu ra mong đợi của mỗi bộ kiểm tra được lưu dưới dạng **văn bản nguyên bản**. Chúng có thể rỗng, chứa số, chuỗi, nhiều giá trị trên một dòng hoặc nhiều dòng.
- Khi chạy, hệ thống đưa nguyên văn đầu vào của bộ kiểm tra vào `stdin` và thu `stdout` thực tế của chương trình. Chỉ `stdout` được dùng để so đáp án; lỗi biên dịch hoặc lỗi chạy được trả về riêng.
- Ví dụ bài tính tổng dãy số: đầu vào là `5\n1 2 3 4 5\n`, đầu ra mong đợi là `15\n`. Đề bài phải giải thích số `5` biểu thị số phần tử.
- Khi chấm, chuẩn hóa `CRLF`/`CR` thành `LF`, bỏ dấu cách và tab **cuối từng dòng**, và bỏ các dòng trống ở **cuối toàn bộ đầu ra**. Giữ nguyên chữ hoa/thường và khoảng trắng ở giữa dòng; không tự chuyển số hoặc sắp xếp kết quả. Giao diện trình bày quy tắc này để người biên soạn nhập đáp án nhất quán.

## 3. Bộ kiểm tra và ba thao tác chạy

Mỗi bài phải có **ít nhất một bộ công khai và một bộ ẩn** trước khi xuất bản. Mỗi bộ gồm `input`, `expectedOutput`, `isPublic` và thứ tự hiển thị. Các ví dụ trong đề lấy từ bộ công khai. Người biên soạn phải chạy lời giải tham khảo qua tất cả bộ kiểm tra trước khi xuất bản; hệ thống chỉ cho xuất bản khi chúng đạt và dịch vụ chạy sẵn sàng.

| Thao tác của học sinh | Dữ liệu được chạy | Phản hồi | Có thể hoàn thành bài? |
| --- | --- | --- | --- |
| **Chạy với đầu vào tự nhập** | `stdin` do học sinh nhập; không có đáp án đối chiếu | `stdout` thật hoặc lỗi | Không. |
| **Chạy thử** | Các bộ công khai | Đạt/chưa đạt từng bộ, đầu vào, đầu ra mong đợi và thực tế | Không. |
| **Nộp bài** | Tất cả bộ công khai và ẩn của phiên bản đề hiện hành | Kết quả từng bộ; bộ ẩn chỉ lộ trạng thái và thông báo an toàn | Có, khi **mọi bộ** đều đạt trong cùng một lần nộp. |

Hệ thống phân biệt ít nhất: `passed` (đạt), `wrong_answer` (sai kết quả), `compile_error` (lỗi biên dịch), `runtime_error` (lỗi chạy), `time_limit` (hết thời gian) và `runner_unavailable` (không có môi trường chạy). Runner chỉ báo việc biên dịch/chạy thành công hoặc lỗi; backend so `stdout` với đáp án để quyết định `passed` hay `wrong_answer`. Khi chạy thất bại, không ghi kết quả giả là đã chấm. Có thể giới hạn thêm bộ nhớ, dung lượng đầu ra và số lần yêu cầu; giá trị cụ thể sẽ đo và cấu hình khi triển khai dịch vụ.

## 4. Nội dung bài và tiến độ

Một bài thực hành gắn với **một bài học** (`lesson_id`). Chương và khóa học suy ra qua cấu trúc hiện tại `courses → chapters → lessons`, không lưu thêm quan hệ topic/category. Bài gồm tiêu đề, yêu cầu, mục tiêu, độ khó, định dạng đầu vào/đầu ra, mã khởi đầu (nếu có), bộ kiểm tra, ba mức gợi ý theo thứ tự, lời giải tham khảo và giải thích.

Bài mới là **nháp**. Học sinh chỉ thấy phiên bản **đã xuất bản** nếu bài học liên quan cũng được xuất bản. Khi sửa bài đã xuất bản, tạo **phiên bản nháp mới**; phiên bản đang xuất bản vẫn phục vụ học sinh đến khi bản mới được duyệt và xuất bản. Mỗi lần nộp ghi phiên bản đề đã dùng. Mã học sinh đang viết và lịch sử nộp cũ được giữ khi đổi phiên bản; nếu phiên bản mới thay bộ kiểm tra, giao diện báo học sinh cần nộp lại để được tính hoàn thành ở phiên bản mới.

Tiến độ lưu riêng theo **học sinh và bài**: mã gần nhất, số lần chạy, mức gợi ý cao nhất đã mở, trạng thái làm bài và thời điểm cập nhật. Các lần nộp chính thức lưu riêng mã, kết quả, thời điểm và phiên bản đề. Lời giải tham khảo chỉ hiện khi học sinh chủ động mở sau khi hoàn thành; quy tắc cho người chưa hoàn thành sẽ được quyết định sau.

## 5. Dữ liệu dự kiến

Để giữ đề ổn định và không làm mất tiến độ khi sửa, dự kiến dùng **năm bảng mới** sau. Đây là phương án thiết kế; chưa tạo bảng hay thay đổi dữ liệu Supabase.

| Bảng | Trách nhiệm |
| --- | --- |
| `code_exercises` | ID bài ổn định, `lesson_id`, người tạo và phiên bản đang xuất bản. |
| `code_exercise_revisions` | Nội dung đề theo phiên bản, trạng thái nháp/xuất bản, mã khởi đầu, ba gợi ý, lời giải. |
| `code_test_cases` | Bộ công khai/ẩn theo từng phiên bản; đầu vào và đầu ra mong đợi. |
| `code_exercise_progress` | Mã gần nhất, số lần chạy, mức gợi ý, trạng thái của từng học sinh cho từng bài. |
| `code_submissions` | Mỗi lần nộp chính thức, mã, kết quả, phiên bản đề và thời điểm. |

Khi tạo schema thật, cần ràng buộc khóa ngoại/duy nhất phù hợp, lập chỉ mục cho cột liên kết và bảo vệ dữ liệu theo quyền. Backend hiện dùng Supabase client có quyền cao, nên **mọi API** phải kiểm tra vai trò, quyền truy cập bài học và chủ sở hữu tiến độ ở phía server; không được tin `studentId`, đáp án hoặc kết quả chấm do trình duyệt gửi lên. Bộ kiểm tra ẩn và lời giải tham khảo không được trả trong API học sinh trước thời điểm được phép xem.

## 6. Ranh giới giữa ba phần việc và API

| Phụ trách | Phần việc | Dữ liệu trao đổi chính |
| --- | --- | --- |
| **Khoa** | API và giao diện biên soạn: nháp, sửa, sao chép, bộ kiểm tra, gợi ý, kiểm tra lời giải, xuất bản. | Bài và phiên bản đề; chỉ backend biên soạn được đọc bộ ẩn/lời giải. |
| **Trang** | Dịch vụ biên dịch/chạy C# và logic chấm an toàn. | Runner nhận `{ code, stdin }`, trả `{ status, stdout, stderr }`; phần chấm ở backend lấy đáp án từ database rồi so kết quả. |
| **Linh** | API và giao diện học sinh: danh sách, lưu mã, chạy tùy chọn, chạy thử, gợi ý, nộp, xem tiến độ. | Gửi code và đầu vào tự nhập; không gửi đáp án mong đợi để tự quyết định điểm. |

Đường dẫn API và tên DTO cụ thể sẽ đặt theo quy ước NestJS/Next.js hiện có khi triển khai. API học sinh chỉ lấy bài đã xuất bản, tiến độ của chính người đăng nhập và phản hồi đã lược bỏ dữ liệu ẩn. Runner không tự quyết định học sinh đã hoàn thành; backend chấm và lưu kết quả sau khi nhận phản hồi chạy thật.

## 7. Chạy code an toàn và điều kiện triển khai

Code học sinh **không được chạy trong tiến trình NestJS**. Dịch vụ chạy sử dụng container riêng cho từng lượt hoặc cơ chế cách ly tương đương; tắt mạng, không gắn thư mục dự án hay khóa bí mật, chạy với quyền tối thiểu và giới hạn CPU, bộ nhớ, thời gian, số tiến trình, dung lượng đầu ra. Cần giới hạn tần suất yêu cầu và dọn môi trường sau mỗi lần chạy. Đầu vào các bộ được tách biệt, không dùng trạng thái còn sót từ lượt trước. Quyền điều khiển Docker/container chỉ nằm ở dịch vụ tin cậy, không đưa cho code học sinh.

Tại thời điểm chốt tài liệu, máy phát triển có Docker CLI và .NET 10 SDK, nhưng Docker engine chưa chạy; **chưa có chức năng chạy/chấm C# hoạt động trong dự án**. Nếu runner chưa sẵn sàng, giao diện phải báo không khả dụng và không hiển thị kết quả giả. Trước khi nghiệm thu cần chạy thật ít nhất ba bài mẫu, gồm trường hợp đúng, sai, lỗi biên dịch, lỗi khi chạy, hết thời gian và kiểm tra dữ liệu bộ ẩn không bị lộ.

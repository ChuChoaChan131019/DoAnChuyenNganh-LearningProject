# Đặc tả chức năng — Hệ thống hỗ trợ tự học C# (Phân hệ Nội dung)

**Phiên bản:** 0.1 — bản định hướng triển khai
**Ngày:** 21/10/2026
**Phạm vi:** nội dung học tập và trải nghiệm học các nội dung đó trên cùng website

> Tài liệu này mô tả **chức năng cần có khi hoàn thiện đồ án**. Các mục ghi “Cần làm” hoặc “Một phần” chưa được xem là chức năng đã triển khai. Không dùng tài liệu này làm bằng chứng rằng hệ thống đã chạy C# hoặc đã có bản đồ kiến thức.

## 1. Mục đích và phạm vi

Hệ thống giúp học sinh tự học C#, bắt đầu từ C# cơ bản, thông qua khóa học, bài học, câu hỏi, bài thực hành code, bản đồ kiến thức và AI Tutor. Người biên soạn quản lý vòng đời nội dung từ bản nháp đến xuất bản; AI chỉ hỗ trợ tạo đề xuất, quyết định dùng nội dung thuộc về con người.

Phân hệ Nội dung chịu trách nhiệm biên soạn, kiểm tra, phân phối và trình bày nội dung học tập. Website hiện dùng chung đăng ký, đăng nhập, đăng xuất, hồ sơ và phân quyền. Quản lý tài khoản nâng cao, kế hoạch học tập, lịch, ghi chú và bookmark không thuộc phạm vi tài liệu này.

## 2. Hiện trạng dự án làm căn cứ

| Thành phần | Hiện trạng trong mã nguồn | Giới hạn cần ghi nhận |
| --- | --- | --- |
| Công nghệ | Next.js/React ở `frontend`, NestJS ở `backend`, Supabase cho xác thực và dữ liệu. | Chưa có dịch vụ chạy code C# riêng. |
| Tài khoản | API đăng ký, đăng nhập, đăng xuất, xem hồ sơ; vai trò `learner`, `content_manager`, `admin`. | Đăng ký công khai chỉ nhận `learner` hoặc `content_manager`; không có trang quản lý tài khoản admin trong phạm vi hiện tại. |
| Nội dung | Có `categories`, `courses`, `chapters`, `lessons`; người biên soạn có trang quản lý, học sinh có trang xem khóa học và bài học. | Một số màn hình còn dữ liệu mẫu; cần đối chiếu dữ liệu thật trước khi nghiệm thu. |
| Câu hỏi/quiz | Có API ngân hàng câu hỏi, quiz, lượt làm và kết quả; câu hỏi mới được gắn với `chapter_id`. | 75 câu AI cũ chưa có `chapter_id`; chưa thể tính chúng vào thống kê chương cần ôn. |
| AI biên soạn | Có giao diện tạo bài/câu hỏi và hàng chờ duyệt. | Các màn này hiện chủ yếu là giao diện mẫu; chưa có luồng tạo bản nháp, duyệt và lịch sử hoàn chỉnh ở backend. |
| AI Tutor | Có API gửi tin nhắn và xem lịch sử. | Cần kiểm thử mức độ bám sát bài học và cách dẫn nguồn trước khi công bố như một khả năng đã nghiệm thu. |
| Tiến độ | Quiz và luyện câu hỏi có lượt làm; dashboard học sinh hiện hiển thị nhiều số liệu mẫu. | Chưa có tiến độ riêng cho bài thực hành code hoặc trạng thái bản đồ kiến thức. |

Các vị trí mã nguồn chính: [AppModule](../backend/src/app.module.ts), [cấu hình vai trò](../frontend/src/config/roles.ts), [API khóa học](../backend/src/modules/courses/courses.controller.ts), [API câu hỏi](../backend/src/modules/questions/questions.controller.ts), [API quiz](../backend/src/modules/quizzes/quizzes.controller.ts), [API AI](../backend/src/modules/ai/ai.controller.ts).

## 3. Tác nhân và quyền

| Tác nhân | Vai trò kỹ thuật | Quyền trong phạm vi này |
| --- | --- | --- |
| Học sinh | `learner` | Xem nội dung được phép công bố; làm câu hỏi, bài thực hành; xem kết quả và tiến độ của chính mình; hỏi AI Tutor. |
| Người biên soạn | `content_manager` | Tạo và quản lý nội dung; yêu cầu AI đề xuất; xem trước, kiểm tra, nhận xét, duyệt và xuất bản theo quyền được cấp. |
| Quản trị viên | `admin` | Tài khoản có sẵn có thể truy cập chức năng nội dung theo phân quyền hiện tại. Quản lý tài khoản và giao diện admin riêng không nằm trong bản triển khai này. |

“Người duyệt” là **trách nhiệm trong quy trình của người biên soạn**, không phải actor thứ tư. Khi phân công hai người khác nhau, hệ thống phải ghi lại ai biên soạn và ai đưa ra quyết định duyệt. Việc bắt buộc người duyệt khác người tạo cần được quyết định trước khi triển khai quyền duyệt.

## 4. Mô hình nội dung và quy ước trạng thái

- `Category` nhóm các khóa học; `Course` gồm nhiều `Chapter`; mỗi chương gồm nhiều `Lesson`.
- `Chapter` là đơn vị kiến thức dùng để phân loại câu hỏi, luyện tập chương cần ôn và làm nút cho bản đồ kiến thức dự kiến. Không còn bảng `topics` riêng.
- Câu hỏi mới thuộc một khóa học và một chương của khóa học đó; có thể gắn thêm bài học trong chương. Bài thực hành code dự kiến gắn với một bài học đã tồn tại, từ đó xác định chương tương ứng.
- Vòng đời nội dung mục tiêu: **Nháp → Chờ kiểm tra → Đã duyệt → Đã xuất bản**. Trả lại để sửa đưa nội dung về Nháp kèm nhận xét; thu hồi đưa nội dung đã xuất bản ra khỏi danh sách học sinh.
- Mã trạng thái và quy tắc áp dụng cho từng loại nội dung phải được chuẩn hóa khi triển khai. Hiện mã nguồn chưa thực thi đầy đủ các bước duyệt này cho mọi loại nội dung.

## 5. Yêu cầu chức năng

**Ký hiệu trạng thái:** `Có` = đã có luồng/API chính trong mã; `Một phần` = chỉ có một phần hoặc có giao diện mẫu; `Cần làm` = chưa có luồng tương ứng. Trạng thái là kết quả khảo sát mã, không thay thế kiểm thử nghiệm thu.

### 5.1. Tài khoản và truy cập

| ID | Tác nhân | Yêu cầu | Hiện trạng |
| --- | --- | --- | --- |
| FR-01 | Người dùng | Đăng ký bằng vai trò được phép; đăng nhập, đăng xuất và xem hồ sơ của mình. | Có |
| FR-02 | Hệ thống | Điều hướng và kiểm tra quyền truy cập theo vai trò ở giao diện **và** API; trả lỗi khi truy cập sai quyền. | Có |
| FR-03 | Hệ thống | Gắn mọi kết quả học tập với đúng tài khoản; người khác không đọc hoặc sửa được tiến độ cá nhân. | Một phần |

### 5.2. Khóa học và bài học

| ID | Tác nhân | Yêu cầu | Hiện trạng |
| --- | --- | --- | --- |
| FR-04 | Người biên soạn | Tạo, tìm, sửa và xóa danh mục/khóa học; đặt mức độ và thứ tự trình bày. | Một phần |
| FR-05 | Người biên soạn | Tạo, sửa, xóa, sắp xếp chương và bài học trong khóa học. | Có |
| FR-06 | Người biên soạn | Soạn mục tiêu, nội dung, ví dụ C# và tài liệu minh họa cho bài học; lưu nháp. | Một phần |
| FR-07 | Người biên soạn | Xem trước bài học theo cách học sinh sẽ thấy trước khi xuất bản. | Một phần |
| FR-08 | Học sinh | Tìm khóa học/bài học; mở nội dung đã xuất bản và chuyển giữa các bài trong chương. | Một phần |
| FR-09 | Hệ thống | Không trả nội dung nháp, chờ duyệt hoặc đã thu hồi qua API dành cho học sinh. | Một phần |

### 5.3. AI hỗ trợ soạn, kiểm tra và xuất bản

| ID | Tác nhân | Yêu cầu | Hiện trạng |
| --- | --- | --- | --- |
| FR-10 | Người biên soạn | Chọn khóa học/bài học và yêu cầu AI tạo **bản nháp** nội dung hoặc câu hỏi theo mục tiêu học tập. | Cần làm; có giao diện mẫu |
| FR-11 | Người biên soạn | Xem, sửa, lưu hoặc bỏ từng đề xuất do AI tạo; đề xuất không tự xuất bản. | Cần làm; có giao diện mẫu |
| FR-12 | Hệ thống | Trước khi gửi duyệt, phát hiện trường bắt buộc bị thiếu, câu hỏi thiếu đáp án, câu gần trùng và câu không phù hợp với bài học được chọn; nêu rõ lý do để người biên soạn xử lý. | Cần làm |
| FR-13 | Người biên soạn | Gửi nội dung để kiểm tra; người được phân công có thể sửa, nhận xét, chấp thuận hoặc trả lại. | Cần làm; có giao diện hàng chờ mẫu |
| FR-14 | Hệ thống | Lưu phiên bản nội dung, người sửa, thời điểm, nhận xét và quyết định duyệt để tra cứu lịch sử. | Cần làm |
| FR-15 | Người biên soạn | Xuất bản hoặc thu hồi nội dung sau khi đạt điều kiện kiểm tra; học sinh chỉ nhận bản đã xuất bản. | Một phần |

### 5.4. Câu hỏi và kiểm tra

| ID | Tác nhân | Yêu cầu | Hiện trạng |
| --- | --- | --- | --- |
| FR-16 | Người biên soạn | Tạo, tìm, sửa câu hỏi; gắn chương, bài học tùy chọn, đáp án và giải thích. | Một phần; thao tác xóa thật chưa có |
| FR-17 | Người biên soạn | Chọn câu hỏi đã duyệt để tạo quiz/bài kiểm tra; chỉ công bố bộ câu hỏi hợp lệ. | Một phần |
| FR-18 | Học sinh | Làm quiz hoặc câu luyện tập được công bố và nộp câu trả lời. | Có |
| FR-19 | Hệ thống | Chấm tự động câu có đáp án xác định; lưu lần làm, điểm và câu trả lời theo học sinh. | Có |
| FR-20 | Học sinh | Xem đúng/sai, điểm và giải thích theo quy tắc hiển thị sau khi nộp. | Một phần |

### 5.5. Phòng thực hành code C#

Các yêu cầu `FR-21` đến `FR-33` đều **Cần làm**. Bản đầu chỉ hỗ trợ chương trình C# dạng console: nhận dữ liệu từ chuẩn vào và ghi kết quả ra chuẩn ra. Phiên bản .NET dùng để biên dịch/chạy phải được cố định trong cấu hình môi trường khi triển khai.

| ID | Tác nhân | Yêu cầu |
| --- | --- | --- |
| FR-21 | Người biên soạn | Xem danh sách; tìm/lọc theo khóa học, chương, bài học, độ khó và trạng thái. |
| FR-22 | Người biên soạn | Tạo, xem, sửa, sao chép, thu hồi hoặc xóa bài thực hành theo quyền. |
| FR-23 | Người biên soạn | Nhập tiêu đề, yêu cầu, mục tiêu, độ khó, chương, bài học, mã C# khởi đầu và ví dụ đầu vào/đầu ra. |
| FR-24 | Người biên soạn | Tạo các bộ kiểm tra gồm đầu vào, đầu ra mong đợi và cờ công khai/ẩn; đặt điều kiện đạt. |
| FR-25 | Người biên soạn | Nhập ba mức gợi ý theo thứ tự, lời giải tham khảo và phần giải thích. |
| FR-26 | Người biên soạn | Xem trước bài như học sinh; chạy kiểm tra lời giải tham khảo trên các bộ kiểm tra trước khi xuất bản. |
| FR-27 | Hệ thống | Chỉ cho xuất bản bài có bài học hợp lệ, yêu cầu đầy đủ, ít nhất một bộ kiểm tra hợp lệ và môi trường chạy C# khả dụng. |
| FR-28 | Học sinh | Xem, tìm/lọc và mở bài thực hành đã xuất bản theo chương, bài học, độ khó và trạng thái hoàn thành của mình. |
| FR-29 | Học sinh | Viết code, lưu bản gần nhất và tiếp tục sau khi rời trang. |
| FR-30 | Học sinh | Chạy thử; nhận trạng thái từng bộ kiểm tra: đạt, sai kết quả, lỗi biên dịch, lỗi khi chạy hoặc hết thời gian. |
| FR-31 | Học sinh | Xem đầu vào, kết quả mong đợi và thực tế của bộ kiểm tra công khai; bộ ẩn chỉ hiện trạng thái và thông tin không làm lộ đáp án. |
| FR-32 | Học sinh | Mở gợi ý lần lượt; chủ động xem lời giải và giải thích sau khi hoàn thành bài. |
| FR-33 | Hệ thống | Lưu riêng từng học sinh/bài: mã gần nhất, số lần chạy, gợi ý đã mở, kết quả các lần nộp và trạng thái hoàn thành. |

### 5.6. Bản đồ kiến thức C#

Các yêu cầu `FR-34` đến `FR-39` đều **Cần làm**. Dự kiến dùng `chapters` làm nút kiến thức; hiện chưa có quan hệ tiên quyết hay bản đồ hiển thị cho học sinh.

| ID | Tác nhân | Yêu cầu |
| --- | --- | --- |
| FR-34 | Người biên soạn | Tạo, sửa, ẩn các chương kiến thức C# như biến, kiểu dữ liệu, điều kiện, vòng lặp và hàm. |
| FR-35 | Người biên soạn | Tạo quan hệ “cần học trước” giữa các chương; hệ thống từ chối quan hệ tạo vòng lặp hoặc trỏ đến chương không tồn tại. |
| FR-36 | Người biên soạn | Gắn bài học, câu hỏi và bài thực hành với chương tương ứng. |
| FR-37 | Học sinh | Xem bản đồ gồm nút và quan hệ tiên quyết; chọn nút để xem nội dung liên quan đã xuất bản. |
| FR-38 | Học sinh | Xem trạng thái cá nhân: Chưa học, Đang học, Cần ôn tập hoặc Đã nắm vững. |
| FR-39 | Hệ thống | Tính trạng thái từ dữ liệu học tập thật theo quy tắc có thể giải thích; không dùng số liệu mẫu để kết luận học sinh đã nắm vững. |

### 5.7. AI Tutor và tiến độ

| ID | Tác nhân | Yêu cầu | Hiện trạng |
| --- | --- | --- | --- |
| FR-40 | Học sinh | Hỏi AI Tutor về C#, xem lịch sử và tiếp tục cuộc trò chuyện của mình. | Một phần |
| FR-41 | Hệ thống | Trả lời dựa trên nội dung học phù hợp; khi có thể, dẫn đến bài học liên quan và báo rõ khi không đủ căn cứ. | Một phần |
| FR-42 | Học sinh | Xem tiến độ từ bài học, quiz/câu hỏi và bài thực hành đã hoàn thành. | Một phần |
| FR-43 | Học sinh | Mở lại bài đang học hoặc bài thực hành đang làm dở với dữ liệu đã lưu. | Cần làm |

## 6. Quy tắc nghiệp vụ

1. Quyền phải được kiểm tra ở API; việc ẩn nút trên giao diện không thay thế kiểm tra quyền.
2. Học sinh chỉ nhận khóa học, bài học, quiz và bài thực hành đủ điều kiện công bố. Câu hỏi chỉ được sử dụng trong quiz công bố sau khi đạt trạng thái được duyệt.
3. Nội dung AI tạo phải lưu thành nháp và được người biên soạn quyết định. Kết quả kiểm tra tự động là cảnh báo hỗ trợ, không phải bằng chứng nội dung đúng về mặt chuyên môn.
4. Mỗi lần gửi duyệt, trả lại, duyệt, xuất bản hoặc thu hồi phải có người thực hiện, thời điểm và phiên bản nội dung liên quan.
5. Bài thực hành phải liên kết với một bài học tồn tại; bài học đó phải được công bố thì học sinh mới mở được bài thực hành.
6. Bài thực hành hoàn thành khi một lần **nộp** đạt toàn bộ bộ kiểm tra bắt buộc. “Chạy thử” không tự đánh dấu hoàn thành.
7. Các bộ kiểm tra ẩn và lời giải tham khảo không được gửi trong API đề bài cho học sinh. Lời giải chỉ mở theo quy tắc `FR-32`.
8. Khi sửa bài thực hành đã có lượt làm, giữ mã và lịch sử của học sinh; lưu phiên bản bài dùng cho mỗi lần nộp. Không tự xóa trạng thái hoàn thành cũ khi cập nhật đề.
9. Bản đồ kiến thức chỉ dẫn đến nội dung học sinh có quyền xem. Trạng thái kiến thức phải có quy tắc tính cụ thể trước khi triển khai.
10. Nếu không có môi trường chạy C# an toàn, nút Chạy/Nộp phải báo rõ chức năng chưa khả dụng; không trả kết quả mô phỏng như thể code đã thực thi.

## 7. Yêu cầu an toàn và chất lượng

- Mã C# do học sinh gửi **không được biên dịch hoặc chạy trong tiến trình NestJS hay trên máy chủ ứng dụng không cách ly**. Dịch vụ chạy phải tách biệt, giới hạn CPU, bộ nhớ, thời gian, kích thước mã, đầu vào và đầu ra; không cho truy cập tùy ý vào mạng, hệ thống tệp, khóa bí mật hoặc dữ liệu người khác.
- Tách lỗi biên dịch, lỗi khi chạy, sai kết quả, hết thời gian và lỗi hạ tầng để học sinh biết cần sửa gì. Không công bố chi tiết nội bộ của hạ tầng chạy.
- Chống gửi yêu cầu chạy liên tục bằng giới hạn tần suất và số tác vụ đồng thời theo tài khoản. Lưu log chẩn đoán cần thiết mà không đưa mã hoặc thông tin nhạy cảm của người khác vào phản hồi.
- API danh sách cần tìm kiếm, lọc và phân trang khi dữ liệu tăng. Lưu bản nháp và tiến độ không được làm mất dữ liệu khi người dùng đổi trang hoặc gặp lỗi mạng.
- Giao diện cần dùng được bằng bàn phím; trạng thái tải, lỗi và thành công phải rõ ràng. Nội dung tiếng Việt/C# phải hiển thị nhất quán trên máy tính và màn hình nhỏ.

## 8. Luồng nghiệm thu tối thiểu

| Mã | Luồng | Điều kiện đạt |
| --- | --- | --- |
| AC-01 | Người biên soạn tạo một bài học và câu hỏi bằng tay; yêu cầu AI đề xuất bản nháp; sửa, gửi kiểm tra, nhận xét, duyệt rồi xuất bản. | Có bản nháp thật, lịch sử thay đổi, lý do kiểm tra và nội dung chưa xuất bản không xuất hiện ở phía học sinh. |
| AC-02 | Học sinh tìm và học một bài C# đã xuất bản, làm câu hỏi/quiz và xem kết quả. | Dữ liệu bài và kết quả lấy từ API thật, gắn đúng tài khoản. |
| AC-03 | Người biên soạn tạo bài thực hành C# về **biến**, **điều kiện** và **vòng lặp**; mỗi bài có bài học liên quan, bộ kiểm tra, gợi ý và lời giải. | Lưu nháp, sửa, xem trước, kiểm tra dữ liệu, xuất bản thành công; học sinh không thấy bản nháp. |
| AC-04 | Học sinh nhập mã sai, chạy thử, sửa mã, mở gợi ý, rời trang rồi quay lại và nộp bài đạt. | Phân biệt lỗi biên dịch/sai kết quả/hết thời gian; giữ mã, số lần chạy, mức gợi ý; chỉ nộp đạt mới đánh dấu hoàn thành. |
| AC-05 | Người biên soạn tạo kiến thức “Biến → Điều kiện → Vòng lặp” và gắn bài học/câu hỏi/bài code. | Bản đồ hiện đúng hướng tiên quyết, không tạo vòng, chỉ mở nội dung đã xuất bản và hiển thị trạng thái cá nhân từ dữ liệu thật. |
| AC-06 | Học sinh hỏi AI Tutor về một bài C# đã học. | Có phản hồi, lịch sử riêng và liên kết bài học khi tìm thấy nội dung phù hợp; không khẳng định có nguồn khi không tìm thấy. |

## 9. Dữ liệu cần bổ sung khi triển khai

Đây là **nhóm dữ liệu dự kiến**, không phải tên bảng đã tồn tại. Thiết kế chi tiết và migration phải đối chiếu schema Supabase thật trước khi viết:

| Nhóm | Dữ liệu tối thiểu |
| --- | --- |
| Quy trình biên soạn | Bản nháp/phiên bản nội dung, nhận xét, người tạo/người duyệt, quyết định, thời điểm và trạng thái xuất bản. |
| Bài thực hành | Bài học liên kết, đề bài, mục tiêu, độ khó, mã khởi đầu, trạng thái, phiên bản; bộ kiểm tra công khai/ẩn; gợi ý và lời giải. |
| Lượt làm code | Học sinh, bài thực hành, phiên bản đề, mã đã lưu, kết quả chạy/nộp, số lần chạy, gợi ý đã mở, thời điểm và trạng thái hoàn thành. |
| Bản đồ kiến thức | Nút kiến thức, cạnh tiên quyết, liên kết đến bài học/câu hỏi/bài code và trạng thái cá nhân có thể tính lại. |

## 10. Quyết định cần chốt trước khi triển khai

1. Ai trong nhóm `content_manager` được quyền duyệt và có cho phép tự duyệt nội dung mình tạo hay không?
2. Bộ kiểm tra nào được công khai; so khớp đầu ra có bỏ qua khoảng trắng cuối dòng hay không; giới hạn thời gian/bộ nhớ của môi trường chạy C# là bao nhiêu?
3. Quy tắc cho phép mở lời giải khi học sinh không giải được bài và cách ghi nhận bài đã xem lời giải.
4. Công thức xác định “Cần ôn tập” và “Đã nắm vững” trên bản đồ kiến thức từ quiz và bài code.
5. Cách xử lý bài thực hành/kiến thức đã công bố khi bài học liên kết bị thu hồi hoặc xóa.

Chỉ chuyển mục từ “Cần làm” sang “Có” sau khi đã có API, giao diện, dữ liệu bền vững và kiểm thử luồng tương ứng.

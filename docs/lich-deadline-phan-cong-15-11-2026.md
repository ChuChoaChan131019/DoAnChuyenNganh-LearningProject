# Lịch deadline đề xuất — hoàn thành chậm nhất 15/11/2026

**Nguồn:** [bảng tính phân công của nhóm](https://docs.google.com/spreadsheets/d/13QN-UGyH6Z6yL0FU4zw1-th-UWS-L1Zwk4Ta5fFunu0/edit?gid=0#gid=0), bản đọc ngày 26/10/2026.
**Mốc nhóm chọn:** hoàn thành hai chức năng mới và kiểm thử trước hoặc trong ngày **15/11/2026**.
**Trạng thái:** lịch đề xuất để nhập vào Google Sheet; các ô trong bảng tính trực tuyến **chưa được sửa** vì phiên làm việc chưa có kết nối ghi Google Sheets. Không đánh dấu thêm công việc nào là đã hoàn thành.

## 1. Tab “phân công chức năng mới”

Giữ `C01` ở dòng 2 như hiện tại: sheet đã ghi hoàn thành ngày 25/10 và deadline 26/10. Cập nhật cột `G` cho các dòng sau. Đổi tên `H1` từ **Phụ thuộc** thành **Cần xong trước khi nghiệm thu**, rồi thêm `I1` là **Có thể bắt đầu khi**. Cột `I` cho biết phần nào được làm trước bằng hợp đồng API hoặc dữ liệu mẫu; chỉ nghiệm thu sau khi các việc ở cột `H` xong và đã nối dữ liệu thật.

| Dòng | Mã | Người phụ trách | Deadline mới (G) | Cần xong trước khi nghiệm thu (H) | Có thể bắt đầu khi (I)                                                                  |
| ----- | --- | ------------------- | ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| 3     | C02 | Khoa                | 30/10/2026        | C01                                   | C01 đã chốt cấu trúc bài và API.                                                      |
| 4     | D01 | Khoa                | 02/11/2026        | —                                    | Có thể bắt đầu ngay.                                                                    |
| 5     | C03 | Trang               | 06/11/2026        | C01                                   | C01 đã chốt `{code, stdin}` và phản hồi runner.                                      |
| 6     | D02 | Linh                | 05/11/2026        | D01                                   | Đã thống nhất dữ liệu/API thảo luận với Khoa; dựng giao diện trước.             |
| 7     | D03 | Khoa                | 07/11/2026        | D01, D02                              | D01 có bài đăng; làm lượt hữu ích bài đăng trước, bình luận sau D02.         |
| 8     | C04 | Khoa                | 09/11/2026        | C02, C03                              | C01 đã chốt trường dữ liệu; dựng form trước khi nối API/chạy lời giải.         |
| 9     | C05 | Trang               | 09/11/2026        | C02, C03                              | C01 đã chốt quy tắc so kết quả; viết logic chấm trước khi nối runner.             |
| 10    | C06 | Linh                | 10/11/2026        | **C02**                         | C01 đã chốt giao diện dữ liệu; dựng danh sách/trình code trước khi nối lưu mã. |
| 11    | D04 | Trang               | 11/11/2026        | D01, D02                              | D01 có bài đăng; làm báo cáo bài đăng trước, bình luận sau D02.                |
| 12    | C07 | Linh                | 12/11/2026        | C05, C06                              | C01 đã chốt dạng phản hồi; dựng màn kết quả/gợi ý trước khi nối chạy thật.  |

Để copy **chỉ ngày deadline**, chọn ô `G3` trong Google Sheet rồi dán nguyên khối 10 dòng sau; mỗi dòng sẽ vào một ô đến `G12`:

```text
30/10/2026
02/11/2026
06/11/2026
05/11/2026
07/11/2026
09/11/2026
09/11/2026
10/11/2026
11/11/2026
12/11/2026
```

Thêm hai dòng đang thiếu vào cuối tab. Chỉ thêm ngày khi đã tạo dòng, không điền ngày hoàn thành hoặc phần trăm hoàn thành trước khi kiểm thử thật.

| Dòng mới | Mã | Chức năng           | Công việc cụ thể                                                                                                                                              | Phụ trách       | Deadline (G) | Cần xong trước khi nghiệm thu (H) | Có thể bắt đầu khi (I)                                       |
| ---------- | --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------ | ------------------------------------- | ----------------------------------------------------------------- |
| 13         | D05 | Thảo luận           | Kiểm thử toàn luồng đăng bài, bình luận, hữu ích, báo cáo, ẩn/gỡ và phân quyền; sửa lỗi tích hợp.                                           | Khoa, Linh, Trang | 13/11/2026   | D01–D04                              | D01 có dữ liệu thật; kiểm thử dần từng API.               |
| 14         | C08 | Phòng thực hành C# | Kiểm thử toàn luồng với ít nhất ba bài C# về biến, điều kiện và vòng lặp; sửa lỗi tích hợp; xác nhận mã và tiến độ còn khi quay lại. | Khoa, Trang, Linh | 15/11/2026   | C01–C07                              | C02 và C03 có bản chạy được; kiểm thử dần từng luồng. |

## 2. Tab “Phân công” — các việc cũ chưa hoàn thành

Tại thời điểm đọc sheet, các dòng dưới đây đang `0%`, chưa có ngày hoàn thành và **trống deadline**. Điền ngày vào cột `E`; giữ trạng thái và ngày hoàn thành trống cho đến khi nghiệm thu.

| Ô cần điền | Người phụ trách | Việc cụ thể                                                     | Deadline mới |
| -------------- | ------------------- | ------------------------------------------------------------------ | ------------- |
| `E13`        | Trang               | Upload tài liệu PDF, ảnh và code mẫu cho bài học.           | 29/10/2026    |
| `E15`        | Trang               | Kết nối AI để đề xuất nội dung lý thuyết và ví dụ C#. | 31/10/2026    |
| `E17`        | Trang               | Danh sách bài học do AI sinh đang chờ duyệt.                 | 03/11/2026    |
| `E18`        | Trang               | Phê duyệt nội dung AI và xuất bản bài học.                 | 11/11/2026    |
| `E34`        | Linh                | Nút nhờ AI tạo câu hỏi luyện tập theo bài học.            | 31/10/2026    |
| `E48`        | Khoa                | Thống kê thật cho dashboard người biên soạn.                | 04/11/2026    |
| `E52`        | Khoa                | Bong bóng AI Tutor trong trang học.                              | 06/11/2026    |
| `E53`        | Khoa                | AI Tutor bám nội dung bài học đang xem.                       | 12/11/2026    |

Các ô ở tab này không liền nhau, nên dán riêng từng ngày vào đúng ô `E13`, `E15`, `E17`, `E18`, `E34`, `E48`, `E52`, `E53` theo bảng trên.

Các dòng 11, 14, 16, 33, 47 và 50 của tab này là **tiêu đề nhóm việc**, không phải đầu việc riêng; không cần điền deadline cho chúng. Những dòng đã đánh dấu hoàn thành giữ nguyên dữ liệu cũ.

## 3. Tab “phân công các chức năng lần 2” — phân công bổ sung

Tab này đang có tiêu đề ở dòng 1 và tám việc cũ ở dòng 2–9. Các dòng dưới đây là **đề xuất thêm từ dòng 10**, dùng đúng bốn cột hiện có `A:D`. Ngày hạn được chọn để giữ mốc toàn nhóm 15/11; vì lịch hiện rất dày, cần xác nhận lại với từng người trước khi coi đó là cam kết.

**Sửa `D5` từ 05/11 thành 11/11/2026:** Trang cần hoàn tất kiểm tra và lưu lịch sử ở dòng 12 trước khi duyệt/xuất bản nội dung AI ở dòng 5. Nếu cũng cập nhật tab “Phân công” cũ, ngày tương ứng là `E18`.

| Dòng mới | Phụ trách (A) | Công việc còn lại (B) | Tiến độ (C) | Deadline đề xuất (D) |
| --- | --- | --- | --- | --- |
| 10 | Linh | Quản lý tài khoản quản trị viên: xem/tìm, tạo, cập nhật, vô hiệu hóa/khôi phục và gán vai trò; API kiểm tra quyền admin. Trang rà soát phân quyền. | 0% | 15/11/2026 |
| 11 | Khoa | Tổng hợp tiến độ bài học, quiz/luyện tập và bài code; cho học sinh mở lại bài học đang học dở. | 0% | 14/11/2026 |
| 12 | Trang | Kiểm tra nội dung bài học AI; bổ sung backend lưu nháp, lịch sử phiên bản, nhận xét, chấp thuận/trả lại cho luồng duyệt. | 0% | 10/11/2026 |
| 13 | Linh | Kiểm tra câu hỏi AI thiếu đáp án, gần trùng hoặc không khớp bài học; trả cảnh báo để biên soạn viên sửa. | 0% | 08/11/2026 |

Chọn ô `A10` trong tab này rồi dán nguyên khối dưới đây; các cột được ngăn bằng tab:

```text
Linh	Quản lý tài khoản quản trị viên: xem/tìm, tạo, cập nhật, vô hiệu hóa/khôi phục và gán vai trò; API kiểm tra quyền admin. Trang rà soát phân quyền.	0%	15/11/2026
Khoa	Tổng hợp tiến độ bài học, quiz/luyện tập và bài code; cho học sinh mở lại bài học đang học dở.	0%	14/11/2026
Trang	Kiểm tra nội dung bài học AI; bổ sung backend lưu nháp, lịch sử phiên bản, nhận xét, chấp thuận/trả lại cho luồng duyệt.	0%	10/11/2026
Linh	Kiểm tra câu hỏi AI thiếu đáp án, gần trùng hoặc không khớp bài học; trả cảnh báo để biên soạn viên sửa.	0%	08/11/2026
```

### Thứ tự thực hiện của từng người trong tab này

Thêm cột `E` với tiêu đề **Thứ tự của người phụ trách**. Đây là thứ tự **trong tab này**; các việc C/D của Phòng thực hành và Thảo luận vẫn cần theo dõi ở tab “phân công chức năng mới”.

| Dòng | Phụ trách | Thứ tự | Việc |
| --- | --- | --- | --- |
| 2 | Trang | 1 | Upload tài liệu. |
| 3 | Trang | 2 | Kết nối AI đề xuất nội dung. |
| 4 | Trang | 3 | Danh sách bài học AI chờ duyệt. |
| 12 | Trang | 4 | Kiểm tra nội dung AI, lưu nháp và lịch sử duyệt. |
| 5 | Trang | 5 | Phê duyệt và xuất bản sau khi đã kiểm tra. |
| 6 | Linh | 1 | Nút AI tạo câu luyện tập. |
| 13 | Linh | 2 | Kiểm tra câu hỏi AI. |
| 10 | Linh | 3 | Quản lý tài khoản quản trị viên. |
| 7 | Khoa | 1 | Thống kê dashboard người biên soạn. |
| 8 | Khoa | 2 | Bong bóng AI Tutor. |
| 9 | Khoa | 3 | AI Tutor bám bài học. |
| 11 | Khoa | 4 | Tiến độ tổng hợp và tiếp tục học. |

Để nhập đúng thứ tự **mà không di chuyển các dòng hiện có**, chọn ô `E1` rồi dán nguyên khối sau; 12 giá trị lần lượt tương ứng dòng 2–13:

```text
Thứ tự của người phụ trách
Trang 1
Trang 2
Trang 3
Trang 5
Linh 1
Khoa 1
Khoa 2
Khoa 3
Linh 3
Khoa 4
Trang 4
Linh 2
```

## 4. Trình tự và điểm kiểm tra

1. **30–31/10:** dữ liệu/API bài thực hành của Khoa sẵn sàng để Trang và Linh tích hợp; Linh hoàn tất việc AI luyện tập cũ.
2. **05–06/11:** Trang có hàng chờ AI và bản đầu runner C#; Linh có API/giao diện thảo luận cơ bản.
3. **09–12/11:** ba phần biên soạn, chạy/chấm và học sinh làm bài được nối với nhau; Trang hoàn tất kiểm tra/lịch sử AI trước khi duyệt, cùng chức năng báo cáo thảo luận.
4. **13/11:** kiểm thử thảo luận; **15/11:** kiểm thử phòng thực hành và hoàn tất sửa lỗi. Ngày 15/11/2026 là Chủ nhật, nên nhóm cần thống nhất có làm và nghiệm thu cuối tuần hay chuyển mốc nội bộ lên ngày 13/11.

Lịch này rất gấp vì mỗi thành viên còn việc cũ song song. Nếu mốc C03 (runner cách ly) trễ, C04/C05/C07 và C08 đều bị ảnh hưởng; nhóm cần báo sớm ngay khi một mốc phụ thuộc có nguy cơ trễ. Các deadline là **ngày hoàn thành dự kiến**, không chứng minh chức năng đã hoạt động.

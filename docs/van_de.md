Vấn đề 1: Lộ đáp án của quiz trong khóa học/bài học

- Lỗi gì: Người học có thể biết đáp án đúng trước khi nộp bài, dù giao diện không hiển thị đáp án.
- Lỗi xảy ra thế nào: Khi mở quiz, API gửi câu hỏi và các lựa chọn về trình duyệt, nhưng mỗi lựa chọn lại kèm thông tin cho biết nó đúng hay sai. Người học có thể xem dữ liệu đó bằng công cụ của trình duyệt.
- Cách sửa đã chốt: Trong lúc làm bài, API chỉ gửi nội dung câu hỏi và lựa chọn, không gửi dấu hiệu đáp án đúng hoặc lời giải. Sau khi nộp thành công, người học được xem đáp án và lời giải trên trang kết quả của chính bài nộp đó. Trang kết quả hiện cũng đang lấy đáp án từ API câu hỏi, nên cần chuyển sang lấy dữ liệu xem lại bài từ kết quả đã lưu; nếu chỉ bỏ đáp án khỏi API hiện tại thì trang kết quả sẽ bị hỏng.



Vấn đề 2: Nộp quiz lỗi nhưng giao diện vẫn báo như đã xong

- Lỗi gì: Người học có thể bị chuyển sang trang kết quả dù bài làm chưa được lưu.
- Lỗi xảy ra thế nào: Khi không tạo được lượt làm thật, giao diện vẫn cho làm bằng một lượt tạm. Khi bấm Nộp bài, nếu API báo lỗi, giao diện chỉ ghi lỗi vào console rồi vẫn mở trang kết quả. Người học vì thế không biết mình cần nộp lại.
- Cách sửa đã chốt: Chỉ cho bắt đầu khi máy chủ tạo được lượt làm hợp lệ. Chỉ mở trang kết quả sau khi máy chủ xác nhận đã lưu bài nộp. Nếu mất mạng hoặc lưu thất bại, giữ nguyên các câu trả lời, hiện thông báo lỗi và cho Thử nộp lại. Khi thử lại, hệ thống cần kiểm tra lượt làm cũ để tránh lưu hai lần nếu lần nộp trước thực ra đã thành công nhưng phản hồi bị mất.


Vấn đề 3: Trang kết quả quiz hiển thị điểm không khớp

- Lỗi gì: Điểm phần trăm và trạng thái đạt/trượt người học nhìn thấy có thể khác kết quả máy chủ đã chấm.
- Lỗi xảy ra thế nào: Máy chủ tính điểm theo trọng số của từng câu, còn trang kết quả tự lấy số câu đúng chia cho tổng số câu. Ví dụ: đề có câu 3 điểm và câu 1 điểm; làm đúng câu 3 điểm thì điểm chính thức là 75%, nhưng trang có thể hiện 50%. Trang hiện còn đọc câu trả lời lưu trên trình duyệt, nên khi làm lại có nguy cơ xem nhầm câu trả lời của lượt trước.
- Cách sửa đã chốt: Sau khi nộp, trang kết quả lấy điểm, phần trăm, đạt/trượt và chi tiết từng câu từ đúng lượt làm mà máy chủ đã lưu. Không tự tính lại điểm chính thức trên trình duyệt. Có thể hiện thêm “đúng bao nhiêu câu” để người học tham khảo. API kết quả cũng cần trả đúng _phần trăm_, thay vì trả điểm thô vào trường phần trăm như hiện nay.

Vấn đề 4: Giới hạn thời gian làm quiz chưa có hiệu lực chắc chắn

- Lỗi gì: Người học có thể làm hoặc nộp quiz sau thời gian quy định.
- Lỗi xảy ra thế nào: Đồng hồ hiện do trình duyệt tự đếm và có thể bắt đầu lại khi mở lại trang. API nộp bài chưa kiểm tra đã hết giờ hay chưa, nên đồng hồ trên màn hình không thực sự quyết định hạn nộp.
- Cách sửa đã chốt: Khi bắt đầu lượt làm, máy chủ lưu thời điểm bắt đầu và hạn nộp của lượt đó. Giao diện hiển thị thời gian còn lại theo hạn này, nên mở lại trang không được cộng thêm giờ. Hết giờ, giao diện tự nộp các câu đã trả lời; máy chủ cũng phải kiểm tra hạn và không chấp nhận bài nộp trễ. Với quiz không giới hạn thời gian thì bỏ qua kiểm tra hạn. Nếu người học đóng trang trước khi hết giờ, lượt làm vẫn giữ nguyên hạn cũ.

- các lỗi nhỏ khác:
1. Nút “Xóa câu hỏi” chưa xóa thật. Nó chỉ giấu câu hỏi trên trình duyệt của người bấm; người khác vẫn thấy câu hỏi đó. Đổi máy hoặc xóa dữ liệu trình duyệt thì nó hiện lại. Phần “Đã xóa” cũng chỉ dựa vào dữ liệu lưu trên máy. Cần sửa: Làm xóa mềm trên hệ thống. Khi bấm xóa, câu hỏi chuyển sang mục “Đã xóa” cho mọi người, có thể khôi phục; bỏ cách lưu danh sách đã xóa trong trình duyệt. Câu hỏi đã nằm trong bài kiểm tra hoặc lịch sử làm bài phải được giữ lại để không làm sai bài kiểm tra và kết quả cũ. Câu hỏi đã xóa không được chọn cho bài kiểm tra mới. Nếu muốn gỡ nó khỏi một bài kiểm tra đang dùng, phải sửa bài kiểm tra đó riêng.
2. Nút “Tạo bằng trí tuệ nhân tạo” ở ngân hàng câu hỏi bấm không có tác dụng.
3. Danh sách bài kiểm tra có thể báo nhầm là chưa có bài nào khi tải lỗi. Trang đang tự đổi lỗi API thành danh sách rỗng; nếu không lấy được số câu hỏi của một bài, nó cũng hiện là 0 câu. cần sửa: Bỏ đoạn tự biến lỗi tải dữ liệu thành danh sách rỗng. Khi API lỗi, hiện “Không tải được bài kiểm tra” và nút Thử lại. Nếu chỉ tải số câu hỏi của một bài bị lỗi, hiện “Chưa tải được” thay vì 0 câu; chỉ hiện 0 khi đã tải thành công và bài thực sự không có câu hỏi

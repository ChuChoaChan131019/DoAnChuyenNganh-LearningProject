# Hướng dẫn test lại các lỗi Quiz và Ngân hàng câu hỏi

Áp dụng cho các thay đổi (nguồn lỗi: `docs/van_de.md`), nhánh `fix/quiz-integrity`.

## 0. Hiện trạng kiểm thử

| Phần | Cách kiểm | Kết quả |
| --- | --- | --- |
| Backend (API + database) | Unit test, test PostgreSQL (PGlite) và script E2E gọi backend đang chạy với Supabase thật | 49/49 bài E2E đạt |
| Giao diện | Làm tay theo mục 3 của tài liệu này | Cần người test |

Những gì đã được kiểm qua API (không cần làm lại, chỉ làm nếu muốn đối chiếu): mục 2.

## 1. Chuẩn bị

1. Migration `database/migrations/20261125090000_quiz_attempt_integrity.sql` đã chạy trên Supabase.
2. Chạy `npm run dev` (frontend cổng 3000, backend cổng 3001).
3. Mở hai trình duyệt (hoặc một cửa sổ thường và một cửa sổ ẩn danh): một đăng nhập **học viên**, một đăng nhập **content manager**.
4. Chuẩn bị một đề test:
   - Cách nhanh: dùng đề `[TEST] quiz integrity …` có sẵn.
     1. Content manager → **Ngân hàng câu hỏi** → **Đã xóa** → **Khôi phục** hai câu "Câu A 3 điểm" và "Câu B 1 điểm" có cùng số đuôi (đây cũng là bước test nút Khôi phục).
     2. **Bài kiểm tra** → mở đề `[TEST] quiz integrity …` cùng số đuôi → đổi trạng thái **Đã xuất bản** → **Lưu**.
   - Hoặc tự tạo: thời lượng **1 phút**, ngưỡng đạt **50%**, câu A trọng số **3**, câu B trọng số **1**, rồi xuất bản.
5. Đường dẫn làm bài của học viên: `/learner/courses/{slug}/tests/{testId}/take`.

> Đề chỉ dài 1 phút: thao tác nhanh. Hết giờ giữa chừng thì bấm **Làm lại bài kiểm tra** để có lượt mới.

## 2. Phần đã kiểm qua API (đối chiếu trên giao diện nếu muốn)

### 2.1 Vấn đề 1 – Không lộ đáp án khi đang làm bài

1. Học viên mở trang làm bài → F12 → **Network**, lọc `quizzes`.
2. Xem Response của `POST …/attempts` và `GET …/questions` (nếu có).
   - **Mong đợi:** không có `is_correct`, không có `explanation`.
3. Nộp bài → trang kết quả.
   - **Mong đợi:** request `GET /quiz-attempts/{id}/review` có đáp án đúng và lời giải; trang hiện đúng/sai và giải thích.

### 2.2 Vấn đề 2 – Nộp lại không bị lưu hai lần

1. Sau khi nộp thành công, ở Network bấm chuột phải request `POST …/submit` → **Copy → Copy as fetch** → dán vào Console và chạy.
   - **Mong đợi:** phản hồi có `already_submitted: true`, điểm giống lần đầu.
2. Kiểm tra trong Supabase:
   ```sql
   select count(*) from quiz_attempt_details where attempt_id = '<attemptId>';
   ```
   - **Mong đợi:** bằng số câu của đề (2), không phải 4.

### 2.3 Vấn đề 3 – Điểm theo trọng số

1. Trả lời **đúng câu A** (3 điểm), **sai câu B**, nộp bài.
   - **Mong đợi:** **75%**, **Đạt**, ô Điểm **3/4**, ô Câu đúng **1/2**. (Trước khi sửa trang hiện 50%.)
2. **Làm lại bài kiểm tra**, trả lời khác đi, nộp.
   - **Mong đợi:** trang kết quả hiện câu trả lời của lượt mới, không lẫn lượt cũ.
3. Mở trang kết quả **không có** `?attemptId=` trên URL.
   - **Mong đợi:** hiện kết quả lượt gần nhất.

### 2.4 Vấn đề 4 – Máy chủ từ chối bài nộp trễ

1. Vào làm bài, rồi chạy trong Supabase:
   ```sql
   update quiz_attempts set expires_at = now() - interval '5 minutes'
   where completed_at is null and quiz_id = '<testId>';
   ```
2. Bấm **Submit Quiz** (đồng hồ trên màn hình vẫn còn giờ).
   - **Mong đợi:** hiện **"Đã quá hạn nộp bài"**; request trả **409** mã `QUIZ_ATTEMPT_EXPIRED`.
3. Đề không giới hạn thời gian (để trống thời lượng):
   - **Mong đợi:** không có đồng hồ, nộp lúc nào cũng được.

### 2.5 Xóa mềm câu hỏi

1. **Ngân hàng câu hỏi** → bấm thùng rác ở một câu → xác nhận.
   - **Mong đợi:** câu biến khỏi danh sách.
2. Ở trình duyệt/tài khoản content manager khác mở cùng trang.
   - **Mong đợi:** câu cũng không còn; bấm **Đã xóa** thì thấy câu đó.
3. **Khôi phục**.
   - **Mong đợi:** câu quay lại danh sách ở cả hai nơi.
4. Xóa một câu **đang nằm trong một đề**:
   - Builder của đề đó: câu vẫn còn, có nhãn vàng "Đã xóa khỏi ngân hàng câu hỏi"; **Lưu** vẫn thành công.
   - Học viên làm đề đó: câu vẫn hiện và vẫn được chấm.
   - Builder của đề khác: câu không có trong danh sách để thêm.
5. Lịch sử:
   ```sql
   select action from question_history where question_id = '<id>' order by version;
   ```
   - **Mong đợi:** có `deleted` và `restored`.

## 3. Phần giao diện cần test tay

### 3.1 Khung "Thử nộp lại" khi mất mạng (Vấn đề 2)

1. Vào làm bài, chọn đáp án cả 2 câu.
2. F12 → **Network** → đổi "No throttling" thành **Offline**.
3. Sang câu cuối → bấm **Submit Quiz**.
   - **Mong đợi:**
     - vẫn ở trang làm bài, không chuyển sang trang kết quả;
     - có khung đỏ **"Chưa nộp được bài…"** và nút **Thử nộp lại**;
     - 2 câu đã chọn vẫn còn.
4. Đổi lại **No throttling** → bấm **Thử nộp lại**.
   - **Mong đợi:** sang trang kết quả, URL có `?attemptId=…`, điểm đúng.

### 3.2 Không tạo được lượt làm (Vấn đề 2)

1. Tắt backend (Ctrl+C ở terminal backend) → mở trang làm bài.
   - **Mong đợi:** "Không bắt đầu được bài kiểm tra" + nút **Thử lại**; không hiện câu hỏi.
2. Bật lại backend (`npm run dev:backend`) → **Thử lại**.
   - **Mong đợi:** vào làm bài bình thường.

### 3.3 Đồng hồ chạy tiếp sau F5 (Vấn đề 4)

1. **Làm lại bài kiểm tra**, chọn 1 đáp án, đợi đồng hồ còn khoảng 0:40.
2. Bấm **F5**.
   - **Mong đợi:** đồng hồ khoảng 0:38, không quay về 01:00; đáp án đã chọn vẫn còn.

### 3.4 Tự nộp khi hết giờ (Vấn đề 4)

1. Chọn 1 đáp án rồi không bấm gì, đợi đồng hồ về **00:00**.
   - **Mong đợi:**
     - hiện khung vàng "Hết giờ — đang nộp các câu đã trả lời...";
     - tự chuyển sang trang kết quả; câu đã chọn được chấm, câu bỏ trống ghi "Chưa trả lời".
2. (Tùy chọn) Làm lại, chọn 1 câu rồi **đóng tab**. Đợi khoảng 2 phút (1 phút làm bài + 30 giây ân hạn) rồi mở trang kết quả của đề.
   - **Mong đợi:** khung vàng "Hết giờ — bài chưa được nộp…", 0%, Chưa đạt.
3. Mở lại trang làm bài.
   - **Mong đợi:** lượt mới, đồng hồ đầy 01:00.

### 3.5 Nút "Tạo bằng trí tuệ nhân tạo" (lỗi nhỏ 2)

1. Content manager → **Ngân hàng câu hỏi** → bấm **Tạo bằng trí tuệ nhân tạo**.
   - **Mong đợi:** chuyển tới `/content-manager/ai/question-generator`.

### 3.6 Danh sách bài kiểm tra khi tải lỗi (lỗi nhỏ 3)

**a) Lỗi tải cả danh sách**
1. Tắt backend → tải lại trang **Bài kiểm tra** (`/content-manager/testsandpractice/tests`).
   - **Mong đợi:** "Không tải được bài kiểm tra" + nút **Thử lại**, **không** phải "Chưa có bài test nào".
2. Bật lại backend → **Thử lại**.
   - **Mong đợi:** danh sách hiện ra.

**b) Lỗi tải số câu hỏi của một bài**
1. F12 → **Network**, gõ `questions` vào ô lọc, tải lại trang.
2. Chuột phải một request `…/quizzes/<id>/questions` → **Block request URL** → tải lại trang.
   - **Mong đợi:** riêng bài đó hiện **"Chưa tải được"** ở cột Câu hỏi; bài khác vẫn hiện số.
3. Chuột phải request đó → **Unblock** → tải lại.
   - **Mong đợi:** bài đó hiện lại số câu. Đề thật sự không có câu nào hiện **0**.

## 4. Sau khi test

- Mở lại đề `[TEST]` → đổi sang **Đã lưu trữ** để học viên khác không thấy.
- Có thể chuyển lại các câu `[TEST]` vào mục "Đã xóa".
- Dữ liệu test còn trong Supabase: tài khoản `quiztest-…@example.com`, các đề `[TEST]` (đã lưu trữ), câu hỏi `[TEST]`, các lượt làm bài test. Không xóa tự động vì dự án quy định không xóa record.

## 5. Ghi nhận kết quả

| Mục | Đạt / Không đạt | Ghi chú (ảnh chụp, lỗi Console) |
| --- | --- | --- |
| 3.1 Thử nộp lại khi mất mạng | | |
| 3.2 Không tạo được lượt làm | | |
| 3.3 Đồng hồ sau F5 | | |
| 3.4 Tự nộp khi hết giờ | | |
| 3.5 Nút Tạo bằng AI | | |
| 3.6a Lỗi tải danh sách | | |
| 3.6b Lỗi tải số câu hỏi | | |

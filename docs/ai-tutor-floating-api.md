# AI Tutor trong màn hình học tập

`POST /api/v1/ai/tutor/context-message` yêu cầu đăng nhập với vai trò Learner.

## Request

- `mode`: `lesson`, `practice` hoặc `quiz`.
- `message`: câu hỏi, tối đa 2.000 ký tự.
- Phạm vi tài liệu: `lessonId`, `chapterId`, `courseId` hoặc `courseSlug`. Khi gửi nhiều định danh, chúng phải cùng một phạm vi. Bài học, chương và khóa học phải đã xuất bản.
- `history`: tối đa 6 tin nhắn `user`/`assistant`, mỗi tin tối đa 2.000 ký tự. Widget giữ câu trả lời đầy đủ để hiển thị, chỉ rút gọn bản sao gửi lại API.
- `quizId`, `questionId`: định danh hoạt động/câu hỏi trên giao diện, dùng để phân biệt phiên chat. Đây không phải bằng chứng cấp quyền đọc tài liệu.
- `questionText`: đề bài và lựa chọn đang hiển thị, tối đa 8.000 ký tự; không chứa cờ đáp án đúng hoặc lời giải. Đây là ngữ cảnh do client cung cấp, không được coi là tài liệu nguồn.

## Truy xuất và trả lời

Backend truy xuất nội dung và ví dụ code trong bài học đã xuất bản, chia đoạn rồi xếp hạng theo từ khóa. Việc so khớp bỏ dấu, không phân biệt hoa thường và không khớp `for` bên trong `format`. Những từ bị cắt ở mép đoạn không được tính thành từ khóa mới.

Với câu hỏi tiếp nối không nêu chủ đề, backend dùng đề bài hiện tại hoặc câu hỏi cụ thể gần nhất của học viên để truy xuất. Nội dung trả lời trước của AI không được dùng làm tài liệu nguồn. Câu hỏi có chủ đề mới vẫn được tìm theo chủ đề mới.

Response theo envelope chung của API, phần `data` chứa `answer` và `sources` (`lessonId`, `title`). Khi không có nội dung phù hợp, API trả thông báo thiếu tài liệu và danh sách nguồn rỗng. Khi không có nhà cung cấp AI khả dụng, API trả 503.

Prompt yêu cầu bám tài liệu, từ chối nội dung không đủ căn cứ và chỉ gợi ý khi làm bài. Đây là ràng buộc bằng prompt; cần đánh giá thêm bằng mô hình thật trước khi khẳng định chất lượng câu trả lời trong thực tế.

## Cấu hình nhà cung cấp AI

Thêm vào `backend/.env` (không commit key):

```dotenv
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=Qwen/Qwen2.5-72B-Instruct
GEMINI_TUTOR_MODEL=gemini-3.1-flash-lite
AI_TUTOR_PROVIDERS=huggingface,gemini,openai
AI_TUTOR_PROVIDER_TIMEOUT_MS=15000
AI_TUTOR_TOTAL_TIMEOUT_MS=30000
```

`GEMINI_API_KEY` và `OPENAI_API_KEY` tiếp tục được hỗ trợ. Có thể đổi model bằng `GEMINI_TUTOR_MODEL` và `OPENAI_TUTOR_MODEL`. Khởi động lại backend khi sửa `.env`.

Gemini mặc định dùng `gemini-3.1-flash-lite`, model đã trả lời được trong kiểm tra thật. Có thể ưu tiên Gemini bằng `AI_TUTOR_PROVIDERS=gemini,huggingface,openai` như cấu hình môi trường dùng để chụp giao diện.

Mặc định chat nổi ưu tiên Hugging Face, sau đó Gemini và OpenAI; chỉ gọi những nhà cung cấp có key. Giữ cùng tài liệu truy xuất và prompt khi chuyển nhà cung cấp. Gemini gửi quy tắc trong `systemInstruction`, tách biệt với hội thoại.

Backend thử nhà cung cấp dự phòng trước khi thử lại lỗi tạm thời. Mỗi bên được thử lại tối đa một lần, có khoảng chờ và tôn trọng `Retry-After`, trong ngân sách tổng mặc định 30 giây cho các lần gọi AI. Mỗi lần gọi tối đa 15 giây; thời gian đọc database không nằm trong ngân sách AI.

Lỗi xác thực, hết credit và cấu hình model không được thử lại trong cùng yêu cầu, đồng thời tạm bỏ qua nhà cung cấp đó trong 5 phút. Lỗi tạm thời được tạm bỏ qua trong 30 giây, hoặc lâu hơn theo `Retry-After`. Trạng thái này chỉ lưu trong bộ nhớ tiến trình; đổi key/model hoặc khởi động lại backend cho phép thử lại ngay. Bổ sung credit cần chờ hết thời gian tạm bỏ qua hoặc khởi động lại backend.

Hugging Face cần token có quyền gọi Inference Providers và credit/hạn mức khả dụng. Đọc được danh sách model không chứng minh tài khoản có quyền hoặc credit để sinh câu trả lời. Khi tất cả nhà cung cấp thất bại, API trả 503 với nguyên nhân đã rút gọn, không đưa key hoặc response body upstream vào log/giao diện.

## Widget

Chỉ hiển thị với Learner trên trang có ngữ cảnh học tập. Khi đổi bài học, chương, khóa học, bài kiểm tra hoặc câu hỏi, lịch sử trong cửa sổ được tạo mới. Đóng/mở bong bóng trong cùng một ngữ cảnh giữ lại hội thoại hiện tại.

Tin nhắn AI hiển thị Markdown: chữ đậm/nghiêng, danh sách, tiêu đề, bảng, code nội dòng và khối code có nút sao chép. Code và bảng rộng cuộn ngang trong khung. Tin nhắn học viên giữ dạng văn bản; nội dung gốc gửi lại API không thay đổi. Renderer bỏ qua HTML và ảnh trong câu trả lời, đồng thời dùng bộ lọc URL mặc định của `react-markdown`.

## Kiểm chứng

Test hồi quy: `npm test --workspace backend -- src/modules/ai/context-tutor.service.spec.ts`.

Các test kiểm tra truy xuất, dữ liệu prompt, phạm vi đã xuất bản, request không hợp lệ và lịch sử dài. Test chuyển nhà cung cấp, retry, cooldown, lỗi quota và timeout nằm trong `backend/src/modules/ai/tutor-ai-provider.spec.ts`.

Mô phỏng upstream HTTP được lưu tại `postman/simulations/tutor-providers/tutor-providers.sim.yaml`; chạy bằng `postman simulation run postman/simulations/tutor-providers/tutor-providers.sim.yaml --proxy`. Chỉ dùng key giả khi đưa chương trình thử nghiệm qua proxy. Các mock mô phỏng Hugging Face 402, Gemini 503 rồi hồi phục và OpenAI hết credit; kết quả kiểm chứng và giới hạn được ghi trong file context cạnh simulation. Không đăng nhập Postman trong phiên kiểm tra nên không tìm mock của nhà cung cấp trong workspace; các mock cục bộ được viết dựa trên tài liệu và phản hồi lỗi thật đã quan sát.

Các test cô lập và mô phỏng HTTP không chứng minh độ chính xác của câu trả lời từ model thật. Lần gọi Hugging Face thật ngày 09/11/2026 trả 402, vì vậy chất lượng trả lời và toàn luồng trên trình duyệt vẫn cần được kiểm tra khi tài khoản có credit.

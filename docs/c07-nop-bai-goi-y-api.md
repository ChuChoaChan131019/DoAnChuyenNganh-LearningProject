# C07 — Chạy, gợi ý, nộp bài và lưu hoàn thành (phía học sinh)

Tất cả API dưới đây thuộc `api/v1/learner/code-exercises/:exerciseId`, chỉ dành cho vai trò `learner` và chỉ với bài đã xuất bản.

| API | Chức năng | Ghi dữ liệu |
|---|---|---|
| `POST /run` | Chạy mã với `stdin` tự nhập, trả đầu ra thực tế hoặc lỗi (C03). Không chấm, không hoàn thành. | Tăng `run_count` |
| `POST /check-public` | Chạy các bộ kiểm tra công khai, trả kết quả từng bộ (C05). Không hoàn thành. | Tăng `run_count` |
| `POST /hints/:level` | Mở gợi ý mức 1, 2, 3 theo thứ tự; mở nhảy cấp bị từ chối (409). Mở lại mức đã mở được phép. | `highest_hint_level` |
| `POST /submit` | Chấm toàn bộ bộ kiểm tra gồm bộ ẩn, lưu lần nộp, đánh dấu hoàn thành nếu đạt hết. Body `{code, revision_id}`. | `code_exercise_submissions`, `code_exercise_progress` |
| `GET /` (chi tiết) | Trả thêm `progress.run_count`, `progress.highest_hint_level`, `hints.opened` (chỉ gợi ý đã mở) và `last_submission`. | — |

`POST /grade` (chấm toàn bộ không lưu) vẫn còn nhưng giao diện không dùng nữa.

## Quy tắc

- Chỉ chạy tự nhập hoặc chạy thử **không** làm bài hoàn thành; chỉ lần nộp đạt mọi bộ kiểm tra mới đặt `completed_revision_id`.
- Một lần nộp sai sau khi đã hoàn thành không làm mất trạng thái hoàn thành.
- Nếu đề có phiên bản xuất bản mới trong lúc chấm, lần nộp bị từ chối (409) và không lưu.
- Kết quả lưu trong `results` đã loại đầu vào, đáp án và đầu ra của bộ ẩn.
- Lỗi ghi `run_count` chỉ ghi log, không làm mất kết quả chạy của học sinh.
- Mã nguồn: migration `database/migrations/20261122090000_code_exercise_submissions.sql`; backend `backend/src/modules/code-exercises/` (`learner-code-exercises.*`, `code-exercise-grading.service.ts`); giao diện `frontend/src/app/learner/code-exercises/[exerciseId]/page.tsx`.

# Quy ước làm việc với Git

Quy ước này áp dụng cho các nhánh tính năng và sửa lỗi. Mọi pull request (PR) đều hướng vào `main`; không push trực tiếp lên `main`.

## Tạo nhánh

Tạo một nhánh cho mỗi việc, bắt đầu từ `main` mới nhất. Dùng tiền tố ngắn, quen thuộc và tên mô tả ngắn bằng tiếng Anh, chữ thường, nối từ bằng dấu gạch ngang:

| Loại việc | Tiền tố | Ví dụ |
| --- | --- | --- |
| Thêm tính năng | `feature/` | `feature/course-review` |
| Sửa lỗi | `fix/` | `fix/quiz-score` |
| Tài liệu | `docs/` | `docs/git-workflow` |
| Sắp xếp lại mã | `refactor/` | `refactor/course-api` |

Tên nhánh cần ngắn, nói đúng nội dung; tránh tên chung chung như `update`, `new` hoặc `fix1`. Nếu nhánh đã tồn tại trên GitHub, chuyển sang nhánh đó để làm tiếp.

```bash
git status
git switch main
git pull --ff-only origin main
git switch -c feature/course-review
```

Nếu đang có thay đổi chưa commit, xác định chúng thuộc công việc nào trước khi đổi nhánh. Không xóa hoặc ghi đè thay đổi có sẵn.

## Commit

- Chỉ stage các tệp thuộc công việc hiện tại bằng `git add <đường-dẫn>`; xem `git diff --cached --stat` và `git diff --cached` trước khi commit.
- Không commit file kế hoạch cá nhân, `.env`, thông tin đăng nhập, khóa API, `node_modules`, `.next`, `dist` hoặc tệp sinh tự động.
- Mỗi commit nên hoàn thành một thay đổi liên quan. Có thể để nhiều loại tệp cùng commit nếu chúng phục vụ cùng một thay đổi.
- Dùng định dạng `loại(phạm-vi): mô tả ngắn`. Giữ loại commit theo Conventional Commits; viết phần mô tả bằng tiếng Việt, bắt đầu bằng động từ và nói rõ kết quả.

| Loại | Dùng khi |
| --- | --- |
| `feat` | Thêm chức năng |
| `fix` | Sửa lỗi |
| `refactor` | Sắp xếp lại mã mà không đổi chức năng |
| `docs` | Chỉ sửa tài liệu |
| `test` | Thêm hoặc sửa kiểm thử |
| `chore` | Công việc bảo trì khác |

Ví dụ:

```text
feat(review): thêm duyệt khóa học và chương
fix(quiz): sửa cách tính điểm khi nộp bài
docs(git): đơn giản hóa quy ước làm việc
```

Trước khi commit, chạy `git diff --cached --check`. Với thay đổi mã, chạy các kiểm tra phù hợp bên dưới và xử lý lỗi do thay đổi của mình gây ra.

## Kiểm tra và push

Chạy kiểm tra phù hợp với phần đã sửa:

| Phạm vi | Kiểm tra |
| --- | --- |
| Backend | `npm run lint -w backend`, `npm run test -w backend`, `npm run build -w backend` |
| Frontend | `npm run lint -w frontend`, `npm run build -w frontend`; mở thử các trang đã sửa |
| Cả hai | Chạy kiểm tra backend và frontend, sau đó thử luồng chính từ giao diện tới API |
| Chỉ tài liệu | `git diff --check` và đọc lại nội dung |

Nếu kiểm tra thất bại vì lỗi có sẵn hoặc môi trường, ghi rõ lệnh và kết quả trong PR; không báo là đã qua.

Trước khi push, xem lại `git status` và danh sách commit so với `origin/main`:

```bash
git log origin/main..HEAD --oneline
git diff --check
git push -u origin HEAD
```

Không dùng `git push --force` lên `main` hoặc nhánh người khác đang sử dụng. Chỉ đưa file kế hoạch vào Git khi công việc yêu cầu công khai và chủ sở hữu muốn chia sẻ; kế hoạch cá nhân thì giữ ở máy cá nhân.

## Mở pull request

Tạo PR từ nhánh công việc vào `main`. Đặt tiêu đề ngắn bằng tiếng Việt, nêu kết quả chính. Trong phần mô tả, ghi mục đích, thay đổi, kiểm tra đã chạy, ảnh hưởng dữ liệu và ảnh giao diện nếu có. Nêu rõ phần còn thiếu hoặc chưa kiểm chứng; mục nào không áp dụng thì ghi `Không có`.

Trước khi tạo PR, xem danh sách tệp thay đổi trên GitHub để loại tệp ngoài phạm vi và thông tin nhạy cảm. Chỉ gộp PR sau khi người duyệt đã xem và các kiểm tra cần thiết đã đạt.

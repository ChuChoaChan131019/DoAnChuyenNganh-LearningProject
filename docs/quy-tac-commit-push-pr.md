# Quy tắc tạo nhánh, commit, push và mở PR

Tài liệu này là quy ước làm việc của nhóm cho kho mã nguồn `DoAnChuyenNganh-LearningProject`. Nhánh đích của mọi PR là `main`. Tên nhánh, nội dung commit, tiêu đề và toàn bộ mô tả PR phải bằng tiếng Việt. Riêng lệnh, tên tệp, tên thư mục và các từ khóa kỹ thuật bắt buộc có thể giữ nguyên dạng của công cụ.

## 1. Tạo và đặt tên nhánh

Mỗi công việc tạo một nhánh riêng từ `main` mới nhất. Tên nhánh viết tiếng Việt **không dấu**, chữ thường, dùng dấu gạch ngang giữa các từ, theo dạng `<loai>/<viec-can-lam>`. Không đặt tên chung chung như `new`, `update`, `fix1` hoặc dùng tên cá nhân thay cho nội dung công việc.

| Loại công việc | Tiền tố nhánh | Ví dụ |
| --- | --- | --- |
| Thêm chức năng | `tinh-nang/` | `tinh-nang/bai-thuc-hanh-csharp` |
| Sửa lỗi | `sua-loi/` | `sua-loi/tinh-diem-quiz` |
| Cập nhật tài liệu | `tai-lieu/` | `tai-lieu/tu-dien-co-so-du-lieu` |
| Sắp xếp lại mã | `tai-cau-truc/` | `tai-cau-truc/cau-hoi-theo-chuong` |

Trước khi tạo nhánh, chạy `git status`. Nếu máy có thay đổi chưa commit, xác định chúng thuộc việc nào và giữ chúng trên nhánh phù hợp; không xóa, ghi đè hoặc đưa nhầm chúng vào PR mới. Khi cây làm việc sạch, tạo nhánh bằng các lệnh:

```bash
git switch main
git pull --ff-only origin main
git switch -c tinh-nang/bai-thuc-hanh-csharp
git branch --show-current
```

Nếu nhánh đã có trên GitHub và mình chỉ tham gia làm tiếp, lấy nhánh đó về thay vì tạo một nhánh mới trùng tên. Một PR chỉ tập trung vào một việc hoặc một nhóm thay đổi liên quan chặt chẽ. Không dùng `reset --hard` hoặc `clean -fd` để xử lý thay đổi đang có trên máy.

## 2. Quy tắc commit

- Chỉ chọn tệp thuộc công việc đang làm bằng `git add <duong-dan>`; kiểm tra `git diff --cached --stat` và `git diff --cached` trước khi commit. Không mặc định dùng `git add .` khi máy đang có tài liệu hoặc thay đổi khác chưa hoàn thiện.
- Không commit `.env`, mật khẩu, khóa API, URL kết nối cơ sở dữ liệu có mật khẩu, `node_modules`, `.next`, `dist` hoặc tệp tạm. Nếu nghi ngờ đã lộ bí mật, xử lý bí mật đó trước khi push.
- Commit nhỏ, có nội dung hoàn chỉnh. Không trộn sửa giao diện, migration và tài liệu không liên quan vào cùng một commit.
- Dùng dạng `loai(pham-vi): mo ta ngan`. Các từ khóa kỹ thuật `feat`, `fix`, `refactor`, `docs`, `test`, `chore` giữ theo quy ước commit đang dùng trong repo; **phần mô tả sau dấu hai chấm phải bằng tiếng Việt** và nói rõ thay đổi đã làm.

Ví dụ:

```text
feat(content): thêm quản lý bài thực hành C#
fix(quiz): sửa cách tính điểm khi nộp bài
docs(database): cập nhật bảng và quan hệ trên Supabase
```

Trước khi commit, chạy `git diff --cached --check`. Nếu thay đổi code, chạy kiểm tra liên quan ở mục 4 và sửa lỗi do thay đổi của mình gây ra.

## 3. Quy tắc push

1. Kiểm tra lại `git status` và các commit sẽ push bằng `git log origin/main..HEAD --oneline`.
2. Push nhánh làm việc bằng `git push -u origin HEAD`. Không push trực tiếp lên `main` theo quy ước nhóm.
3. Không dùng `git push --force` trên `main` hoặc nhánh đang được người khác dùng. Nếu cần sửa lịch sử một nhánh đã push, trao đổi với người cùng làm nhánh trước.
4. Chỉ push tài liệu đang viết dở khi chủ tài liệu muốn đưa chúng vào PR. Có thể để file ở local và stage chọn lọc các file đã sẵn sàng.

## 4. Kiểm tra trước khi tạo PR

Chạy kiểm tra phù hợp với phần đã sửa; không cần chạy toàn bộ nếu PR chỉ đổi tài liệu. Các lệnh hiện có trong repo:

| Phạm vi thay đổi | Lệnh kiểm tra |
| --- | --- |
| Tài liệu, chuyển đổi cấu trúc cơ sở dữ liệu | `git diff --check`; đối chiếu tệp chuyển đổi với cấu trúc Supabase và xác nhận dữ liệu cần giữ vẫn còn. |
| Máy chủ (`backend`) | `npm run lint -w backend`, `npm run test -w backend`, `npm run build -w backend`. |
| Giao diện (`frontend`) | `npm run lint -w frontend`, `npm run build -w frontend`; mở thử các trang đã sửa. |
| Cả hai | Chạy kiểm tra của cả máy chủ và giao diện, rồi thử luồng chính từ giao diện tới API. |

Nếu một lệnh không chạy được vì môi trường hoặc lỗi có sẵn, ghi rõ lệnh, lỗi và phần chưa kiểm chứng trong PR. Không ghi “đã kiểm tra” nếu chưa thực sự chạy.

Với thay đổi cơ sở dữ liệu, lưu tệp chuyển đổi trong `database/migrations/`, mô tả thứ tự triển khai mã nguồn và cấu trúc bảng, nêu tác động tới dữ liệu cũ. Không đưa mật khẩu hay dữ liệu cá nhân vào tệp chuyển đổi hoặc ảnh chụp màn hình.

## 5. Quy tắc mở PR

- Nhánh đích là `main`; nhánh nguồn là nhánh làm việc. Xem lại toàn bộ phần **Các tệp thay đổi** trên GitHub để phát hiện tệp thừa, thay đổi ngoài phạm vi và bí mật.
- **Tiêu đề và toàn bộ phần mô tả PR viết bằng tiếng Việt**, kể cả tên mục, nội dung kiểm tra và ghi chú. Tiêu đề nói rõ kết quả, ví dụ: `Thêm bài thực hành C# cho người biên soạn và học sinh`.
- Mô tả phải đủ các mục ở mẫu bên dưới. Điền nội dung thực tế vào từng mục; mục nào không áp dụng thì ghi `Không có`. Không để dấu `...`, không dán danh sách commit thay cho phần giải thích.
- Gắn ảnh màn hình hoặc video ngắn nếu giao diện thay đổi và người duyệt cần xem kết quả trực quan.
- Chỉ đưa vào PR những chức năng đã làm thật. Nếu còn giao diện mẫu, dữ liệu mẫu hoặc chức năng chưa nối API, ghi rõ.
- Đọc và xử lý nhận xét của người duyệt. Khi `main` thay đổi gây xung đột, cập nhật nhánh, giải quyết từng tệp, chạy lại kiểm tra liên quan rồi push thêm commit lên cùng PR.
- Chỉ gộp PR sau khi người duyệt đã xem và các kiểm tra cần thiết đã đạt. Nếu PR còn xung đột hoặc thiếu tệp chuyển đổi cơ sở dữ liệu cần thiết, xử lý trước khi gộp.

Sau khi push, vào kho mã nguồn trên GitHub, mở mục **Pull requests** → **New pull request**, chọn `main` làm nhánh đích và nhánh vừa push làm nhánh nguồn. Đọc phần so sánh, điền tiêu đề và mô tả theo mẫu dưới đây, rồi chọn **Create pull request**. Nếu dùng công cụ `gh`, lưu nguyên văn mô tả tiếng Việt vào một tệp Markdown và dùng `--body-file` để giữ đúng xuống dòng; kiểm tra lại nội dung PR sau khi tạo.

### Mẫu mô tả PR bắt buộc

```md
## Mục đích
Nêu vấn đề hiện tại, người dùng bị ảnh hưởng và kết quả mong muốn.

## Nội dung thay đổi
- Nêu chức năng hoặc phần mã đã sửa và tác dụng của từng thay đổi chính.
- Nêu giao diện, API hoặc tài liệu liên quan nếu có.

## Cách kiểm tra và kết quả
- Ghi từng lệnh đã chạy cùng kết quả đạt hoặc lỗi cụ thể.
- Ghi các luồng đã thử trên giao diện hoặc API và kết quả quan sát được.
- Nếu chưa chạy kiểm tra nào, nêu rõ lý do và phần chưa được xác nhận.

## Ảnh hưởng đến cơ sở dữ liệu và dữ liệu cũ
- Tệp chuyển đổi cấu trúc: nêu đường dẫn và thứ tự áp dụng, hoặc ghi Không có.
- Dữ liệu cũ: nêu dữ liệu nào được giữ, chuyển đổi hoặc xóa, hoặc ghi Không bị ảnh hưởng.

## Ảnh giao diện
Gắn ảnh trước và sau khi sửa nếu có thay đổi giao diện; nếu không thì ghi Không áp dụng.

## Giới hạn và việc cần làm tiếp
Ghi rõ chức năng còn là bản mẫu, phần chưa nối API, kiểm tra chưa chạy hoặc việc cần làm sau khi gộp; nếu không có thì ghi Không có.
```

Ví dụ mô tả đã điền đầy đủ cho một PR chỉ thay đổi tài liệu:

```md
## Mục đích
Nhóm cần một quy ước thống nhất để tạo nhánh, ghi nhận thay đổi và gửi mã lên GitHub.

## Nội dung thay đổi
- Thêm tài liệu quy tắc tạo nhánh, commit, push và mở PR.
- Bổ sung mẫu mô tả PR bằng tiếng Việt để người duyệt biết mục đích, cách kiểm tra và ảnh hưởng dữ liệu.

## Cách kiểm tra và kết quả
- Đã đọc lại nội dung tài liệu và kiểm tra các lệnh được nêu có trong dự án.
- Đã chạy `git diff --check`: không có lỗi định dạng.

## Ảnh hưởng đến cơ sở dữ liệu và dữ liệu cũ
- Tệp chuyển đổi cấu trúc: Không có.
- Dữ liệu cũ: Không bị ảnh hưởng.

## Ảnh giao diện
Không áp dụng.

## Giới hạn và việc cần làm tiếp
Không có.
```

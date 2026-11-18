# C03 — Biên dịch/chạy C# cách ly

`POST /api/v1/learner/code-exercises/:exerciseId/run` dành cho Learner đã đăng nhập. Backend kiểm tra bài thực hành có thể truy cập trước khi tạo container. Body gồm `code` và `stdin` tùy chọn; dữ liệu đầu vào được truyền nguyên văn, không ghép thành lệnh shell. Không đọc bộ kiểm tra ẩn hoặc đánh dấu hoàn thành bài.

## Môi trường và giới hạn

- Docker engine Linux và image `mcr.microsoft.com/dotnet/sdk:10.0` đã tải sẵn. Runner không tự pull image khi nhận yêu cầu.
- Container riêng từng lượt; user `65534:65534`, không có capabilities, `no-new-privileges`, tắt mạng, root filesystem và source mount chỉ đọc. Không mount dự án hoặc Docker socket.
- CPU: 1; RAM: 512 MiB, không thêm swap; tối đa 64 PID; tmpfs `/tmp` 128 MiB, `/workspace` 256 MiB.
- Mã nguồn tối đa 64 KiB UTF-8; stdin tối đa 16 KiB UTF-8. DTO còn giới hạn 64.000/16.000 ký tự tương ứng.
- Output stdout + stderr tối đa 32 KiB dữ liệu nhận; thông báo trạng thái có thể được bổ sung riêng khi chương trình không xuất lỗi.
- Biên dịch tối đa 20 giây; thực thi tối đa 3 giây; host giới hạn toàn lượt 30 giây. Tối đa hai lượt đồng thời trong mỗi tiến trình backend; chưa phải rate limit theo tài khoản hay hạn mức toàn cụm.

Response theo envelope chung, trường `data` chứa `status`, `stdout`, `stderr`, `exit_code`, `elapsed_ms`. Trạng thái gồm `success`, `compile_error`, `runtime_error`, `time_limit`, `resource_limit`, `output_limit`. `exit_code` là mã wrapper, không phải mã thoát gốc của chương trình C#.

## Xử lý lỗi và dọn môi trường

OOM-kill được nhận diện qua bộ đếm cgroup v2/v1. CLR cũng có thể báo hết bộ nhớ trước khi kernel OOM-kill; runner dùng chẩn đoán OOM trong stderr để tinh chỉnh các trạng thái đã thất bại. Text của chương trình không biến một lượt thất bại thành thành công và không làm đổi trạng thái của lượt thoát thành công.

Stdout và stderr dùng hai bộ giải mã UTF-8 độc lập để giữ ký tự nhiều byte qua ranh giới chunk. Khi output bị cắt ở giới hạn byte, bỏ ký tự cuối nếu còn thiếu byte.

Thư mục source được xóa với retry cho lỗi khóa file tạm thời; slot luôn được trả lại trong `finally` dù việc xóa thất bại. Cleanup thất bại được log ở backend và trả 503, không báo dọn thành công. Lỗi Docker không khả dụng cũng trả 503; hết slot trả 429.

## Kiểm chứng

Test đơn vị/DTO, không cần Docker:

```powershell
npm test --workspace backend -- src/modules/code-exercises/csharp-runner.service.spec.ts src/modules/code-exercises/dto/run-csharp.dto.spec.ts
```

Test Docker thật, chạy riêng sau khi Docker và image sẵn sàng:

```powershell
$env:RUN_CSHARP_DOCKER_TESTS = '1'
npm test --workspace backend -- src/modules/code-exercises/csharp-runner.integration.spec.ts
Remove-Item Env:RUN_CSHARP_DOCKER_TESTS
```

Các ca Docker gồm stdin nhiều dòng, UTF-8 bị chia byte, compile/runtime error, vòng lặp vô hạn, OOM managed/native, output flood, chặn mạng/ghi root, filesystem mới và giới hạn đồng thời. Bộ test này mặc định được bỏ qua để test thường không phụ thuộc Docker.

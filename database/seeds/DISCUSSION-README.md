# Dữ liệu thảo luận C#

Bộ seed thảo luận cho khóa `lap-trinh-csharp-co-ban` gồm 12 bài đăng, 24 bình
luận, vote hữu ích cho bài/bình luận và 2 báo cáo đang chờ Content Manager xử lý.

Chạy từ thư mục gốc:

```bash
npm run data:import:discussion
```

Importer dùng ID cố định, chạy trong transaction và `on conflict do nothing`,
nên chạy lại không nhân bản dữ liệu. Bài đăng đều gắn với chương/bài đã
published và dùng các profile learner có sẵn trong database.


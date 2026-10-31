import {
  Activity,
  BookOpen,
  FileQuestion,
  FileText,
  PenLine,
  Rocket,
  Sparkles,
} from "lucide-react";

const stats = [
  {
    label: "Tổng số khóa học",
    value: "24",
    delta: "+3 this month",
    icon: BookOpen,
  },
  {
    label: "Tổng số bài học",
    value: "126",
    delta: "+18 this month",
    icon: FileText,
  },
  {
    label: "Tổng số câu hỏi",
    value: "965",
    delta: "+153 this month",
    icon: FileQuestion,
  },
  {
    label: "Published",
    value: "62",
    delta: "+7 this month",
    icon: Rocket,
  },
  {
    label: "Bản nháp",
    value: "26",
    delta: "",
    icon: PenLine,
  },
  {
    label: "Tạo tự động",
    value: "268",
    delta: "27.8% of bank",
    icon: Sparkles,
  },
];

export default function ContentManagerPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bảng điều khiển nội dung
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng quan nội dung C# mà nhóm đang xây dựng.
          </p>
        </div>

        <div className="flex gap-2">
          <button className="rounded-xl border px-4 py-2 text-sm">
            Tạo bằng trí tuệ nhân tạo
          </button>

          <button className="rounded-xl bg-primary px-4 py-2 text-sm text-white">
            + Tạo khóa học
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>

                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <p className="mt-5 text-3xl font-bold">{stat.value}</p>

              {stat.delta && (
                <p className="mt-1 text-xs text-success">{stat.delta}</p>
              )}
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="min-h-[320px] rounded-2xl border bg-card p-5 xl:col-span-2">
          <h2 className="font-semibold">Tăng trưởng nội dung</h2>
          <p className="text-sm text-muted-foreground">
            Số bài học và câu hỏi được tạo mỗi tháng
          </p>

          <div className="mt-8 flex h-56 items-end gap-3">
            {[30, 42, 50, 62, 70, 82, 94].map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-lg bg-brand"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="min-h-[320px] rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Trạng thái nội dung</h2>
          <p className="text-sm text-muted-foreground">
            Phân bố theo quy trình
          </p>

          <div className="mx-auto mt-10 h-40 w-40 rounded-full border-[28px] border-warning border-r-primary border-b-brand" />

          <div className="mt-6 flex justify-center gap-3 text-xs">
            <span>Đã xuất bản</span>
            <span>Đã duyệt</span>
            <span>Bản nháp</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">Hoạt động gần đây</h2>
            <p className="text-sm text-muted-foreground">
              Các cập nhật mới nhất trong chương trình học
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Save,
  Upload,
} from "lucide-react";
import { ApiClientError, courseApi } from "@/lib/api";
import type { CourseLevel } from "@/types/learning-content";

const steps = ["Thông tin khóa học", "Chương", "Bài học", "Tài liệu", "Câu hỏi", "Kiểm tra và xuất bản"];
const levels: { value: CourseLevel; label: string }[] = [
  { value: "Beginner", label: "Cơ bản" },
  { value: "Intermediate", label: "Trung cấp" },
  { value: "Advanced", label: "Nâng cao" },
];

export default function CreateCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("Beginner");
  const [thumbnailName, setThumbnailName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(
      value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();

    if (trimmedTitle.length < 3) {
      setError("Tên khóa học phải có ít nhất 3 ký tự.");
      return;
    }
    if (!trimmedSlug) {
      setError("Đường dẫn định danh không hợp lệ.");
      return;
    }
    setIsSaving(true);
    try {
      await courseApi.create({
        title: trimmedTitle,
        slug: trimmedSlug,
        description: description.trim(),
        level,
      });
      router.push("/content-manager/learning-content/courses");
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.status === 401
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng xuất rồi đăng nhập lại trước khi lưu khóa học."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Không thể tạo khóa học. Vui lòng thử lại.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <Link
        href="/content-manager/learning-content/courses"
        className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách khóa học
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">Tạo khóa học mới</h1>
          <p className="mt-1 text-sm text-[#637981]">Thực hiện theo các bước. Nội dung chỉ được xuất bản sau khi đã kiểm duyệt.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            form="create-course-form"
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 text-sm font-semibold text-[#002C3E] shadow-sm hover:bg-[#f8fbf9] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Lưu bản nháp
          </button>
          <button
            type="submit"
            form="create-course-form"
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540] disabled:opacity-60"
          >
            {isSaving ? "Đang lưu..." : "Tiếp tục"}
          </button>
        </div>
      </header>

      <nav className="grid gap-2 rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-[0_8px_18px_rgba(0,44,62,0.04)] md:grid-cols-6">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${index === 0 ? "bg-[#ffd9d6] text-[#F7444E]" : "text-[#526f78]"}`}
          >
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${index === 0 ? "bg-[#F7444E] text-white" : "bg-[#e2f0f1] text-[#527983]"}`}>
              {index === 0 ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="truncate">{step}</span>
          </div>
        ))}
      </nav>

      {error && <p className="rounded-xl border border-[#F7444E]/30 bg-[#fff1f0] px-4 py-3 text-sm text-[#F7444E]" role="alert">{error}</p>}

      <form id="create-course-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="border-b border-[#dfe6df] px-5 py-4">
            <h2 className="font-semibold text-[#002C3E]">Thông tin khóa học</h2>
          </div>
          <div className="space-y-5 p-5">
            <label className="block text-sm font-medium text-[#002C3E]">
              Tên khóa học
              <input
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Ví dụ: Lập trình hướng đối tượng với C#"
                autoFocus
                className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
              />
            </label>

            <label className="block text-sm font-medium text-[#002C3E]">
              Đường dẫn định danh
              <input
                value={slug}
                readOnly
                className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] bg-[#f5f7f3] px-3 font-mono text-sm text-[#637981] outline-none"
              />
            </label>

            <label className="block text-sm font-medium text-[#002C3E]">
              Mô tả
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả kiến thức và sản phẩm học viên sẽ tạo được..."
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-[#dfe6df] px-3 py-3 text-sm leading-6 text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-[#002C3E]">Trình độ</legend>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {levels.map((option) => (
                  <label key={option.value} className={`flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${level === option.value ? "border-[#F7444E] bg-[#ffd9d6] text-[#002C3E]" : "border-[#dfe6df] text-[#526f78]"}`}>
                    <input type="radio" name="level" value={option.value} checked={level === option.value} onChange={() => setLevel(option.value)} className="accent-[#F7444E]" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-medium text-[#002C3E]">
              Ảnh đại diện
              <span className="mt-2 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe6df] bg-[#fbfcf9] px-4 text-center hover:bg-[#f5f7f3]">
                <ImagePlus className="h-8 w-8 text-[#F7444E]" />
                <span className="mt-3 text-sm text-[#002C3E]">Thả ảnh vào đây hoặc bấm để tải lên</span>
                <span className="mt-1 text-xs text-[#71878c]">Nên dùng ảnh PNG hoặc JPG, kích thước 1280×720 · tối đa 2 MB</span>
                <span className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#dfe6df] bg-white px-3 py-2 text-xs font-semibold text-[#002C3E] shadow-sm">
                  <Upload className="h-3.5 w-3.5" />
                  {thumbnailName || "Chọn tệp"}
                </span>
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => setThumbnailName(event.target.files?.[0]?.name ?? "")} />
              </span>
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">Xuất bản</h2></div>
            <div className="p-5">
              <p className="text-sm text-[#526f78]">Trạng thái</p>
              <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[#dfe6df] bg-[#f5f7f3] px-3 text-sm text-[#526f78]">
                Bản nháp
                <span className="h-2 w-2 rounded-full bg-[#71878c]" />
              </div>
              <p className="mt-4 rounded-xl bg-[#ffe9c6] px-3 py-3 text-xs leading-5 text-[#7c5a28]">Chỉ có thể xuất bản khóa học khi mỗi chương có ít nhất một bài học đã duyệt.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">Bước tiếp theo</h2></div>
            <ol className="space-y-3 p-5 text-sm text-[#637981]">
              {["Thêm chương để xây dựng cấu trúc chương trình học", "Soạn bài học hoặc tạo nội dung tự động", "Đính kèm tài liệu học tập", "Liên kết câu hỏi từ ngân hàng", "Gửi kiểm duyệt rồi xuất bản"].map((item, index) => (
                <li key={item} className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e2f0f1] text-xs font-semibold text-[#527983]">{index + 1}</span><span>{item}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FilePenLine, Plus, Trash2 } from "lucide-react";

import { authorCodeExerciseApi } from "@/lib/api";
import type { CodeExerciseListItem } from "@/types/code-exercise-authoring";

const difficultyLabels = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

export default function CodeExercisesPage() {
  const router = useRouter();

  const [items, setItems] = useState<CodeExerciseListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (keyword = "") => {
    setLoading(true);
    setError("");

    try {
      const data = await authorCodeExerciseApi.list(keyword);
      setItems(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tải danh sách bài thực hành.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // loading đã là true lúc khởi tạo; chỉ cập nhật state khi API trả về.
    void authorCodeExerciseApi.list().then(
      (data) => {
        if (active) {
          setItems(data);
          setLoading(false);
        }
      },
      (e: unknown) => {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Không thể tải danh sách bài thực hành.",
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const copyExercise = async (id: string) => {
    setBusyId(id);
    setError("");

    try {
      const result = await authorCodeExerciseApi.copy(id);
      router.push(`/content-manager/code-exercises/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể sao chép bài.");
    } finally {
      setBusyId(null);
    }
  };

  const archiveExercise = async (id: string) => {
    if (!window.confirm("Bạn muốn lưu trữ bài thực hành này?")) {
      return;
    }

    setBusyId(id);
    setError("");

    try {
      await authorCodeExerciseApi.archive(id);
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu trữ bài.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#002C3E]">
            Biên soạn bài thực hành C#
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo, chỉnh sửa, kiểm tra và xuất bản bài thực hành.
          </p>
        </div>

        <Link
          href="/content-manager/code-exercises/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Tạo bài mới
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load(search);
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm bài thực hành theo tiêu đề..."
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
        >
          Tìm kiếm
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-500">
          Đang tải bài thực hành...
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có bài thực hành phù hợp.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#002C3E]">{item.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {difficultyLabels[item.difficulty]}
                    {" · "}
                    Phiên bản {item.revision_no}
                  </p>
                </div>

                <span
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${
                    item.has_draft
                      ? "bg-amber-50 text-amber-700"
                      : item.is_published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.has_draft
                    ? "Có bản nháp"
                    : item.is_published
                      ? "Đã xuất bản"
                      : "Nháp"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/content-manager/code-exercises/${item.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <FilePenLine className="h-4 w-4" />
                  {item.has_draft ? "Sửa nháp" : "Xem / sửa"}
                </Link>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void copyExercise(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  Sao chép
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void archiveExercise(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Lưu trữ
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

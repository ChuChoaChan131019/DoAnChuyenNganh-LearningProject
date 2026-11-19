"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { authorCodeExerciseApi, courseApi, questionApi } from "@/lib/api";

import type {
  ChapterOption,
  CourseOption,
  LessonOption,
} from "@/types/question";

import type {
  CodeExercisePayload,
  CodeExerciseCheckResult,
  AuthorTestCase,
} from "@/types/code-exercise-authoring";

const emptyPayload = (): CodeExercisePayload => ({
  lesson_id: "",
  title: "",
  difficulty: "easy",
  objective: "",
  description: "",
  input_format: "",
  output_format: "",
  starter_code: "",
  hint_1: "",
  hint_2: "",
  hint_3: "",
  solution_code: "",
  solution_explanation: "",
  test_cases: [
    { input: "", expected_output: "", is_public: true },
    { input: "", expected_output: "", is_public: false },
  ],
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#0f3741] outline-none focus:border-[#78bcc4]";

const areaClass =
  "min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-[#78bcc4]";

type TextField =
  | "objective"
  | "description"
  | "input_format"
  | "output_format"
  | "starter_code"
  | "hint_1"
  | "hint_2"
  | "hint_3"
  | "solution_code"
  | "solution_explanation";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="border-b border-slate-100 pb-3 text-base font-black text-[#002C3E]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CodeExerciseEditor({ exerciseId }: { exerciseId?: string }) {
  const router = useRouter();

  const [id, setId] = useState<string | null>(exerciseId ?? null);
  const [form, setForm] = useState<CodeExercisePayload>(emptyPayload);
  const [courseId, setCourseId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);

  const [editVersion, setEditVersion] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [dirty, setDirty] = useState(!exerciseId);

  const [preview, setPreview] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [validation, setValidation] = useState<CodeExerciseCheckResult | null>(
    null,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 1. Nạp danh sách khóa học và bài đang sửa.
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const [courseList, detail] = await Promise.all([
          courseApi.list(),
          exerciseId
            ? authorCodeExerciseApi.detail(exerciseId)
            : Promise.resolve(null),
        ]);

        if (!active) return;

        setCourses(
          courseList.map((course) => ({
            id: String(course.id),
            title: course.title,
            slug: course.slug,
          })),
        );

        if (detail) {
          const revision = detail.revision;

          // Tìm khóa học/chương từ bài học.
          const lessonInfo = await courseApi.lesson(detail.lesson_id);

          if (!active) return;

          setCourseId(lessonInfo.course.id);
          setChapterId(lessonInfo.chapter.id);

          setForm({
            lesson_id: detail.lesson_id,
            title: revision.title ?? "",
            difficulty: revision.difficulty,
            objective: revision.objective ?? "",
            description: revision.description ?? "",
            input_format: revision.input_format ?? "",
            output_format: revision.output_format ?? "",
            starter_code: revision.starter_code ?? "",
            hint_1: revision.hint_1 ?? "",
            hint_2: revision.hint_2 ?? "",
            hint_3: revision.hint_3 ?? "",
            solution_code: revision.solution_code ?? "",
            solution_explanation: revision.solution_explanation ?? "",
            test_cases: revision.test_cases.map((test) => ({
              input: test.input,
              expected_output: test.expected_output,
              is_public: test.is_public,
            })),
          });

          // Nếu đang sửa bản published mà chưa có
          // draft, updateDraft dùng edit_version = 0
          // để tạo revision mới.
          setEditVersion(
            revision.status === "draft" ? revision.edit_version : 0,
          );
          setHasDraft(revision.status === "draft");
          setDirty(false);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Không thể tải dữ liệu biên soạn.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [exerciseId]);

  // 2. Nạp chương khi chọn khóa học.
  useEffect(() => {
    let active = true;

    if (!courseId) return;

    void questionApi
      .listChapters(courseId)
      .then((data) => {
        if (active) setChapters(data);
      })
      .catch(() => {
        if (active) setError("Không tải được chương học.");
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  // 3. Nạp bài học khi chọn chương.
  useEffect(() => {
    let active = true;

    if (!courseId || !chapterId) return;

    void questionApi
      .listLessons(courseId, chapterId)
      .then((data) => {
        if (active) setLessons(data);
      })
      .catch(() => {
        if (active) setError("Không tải được danh sách bài học.");
      });

    return () => {
      active = false;
    };
  }, [courseId, chapterId]);

  const changeField = <K extends keyof CodeExercisePayload>(
    key: K,
    value: CodeExercisePayload[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setDirty(true);
    setValidation(null);
    setSuccess("");
  };

  const changeTest = (index: number, changes: Partial<AuthorTestCase>) => {
    const updated = form.test_cases.map((test, i) =>
      i === index ? { ...test, ...changes } : test,
    );

    changeField("test_cases", updated);
  };

  const addTest = () => {
    changeField("test_cases", [
      ...form.test_cases,
      {
        input: "",
        expected_output: "",
        is_public: true,
      },
    ]);
  };

  const removeTest = (index: number) => {
    changeField(
      "test_cases",
      form.test_cases.filter((_, i) => i !== index),
    );
  };

  // 4. Lưu nháp: tận dụng API C02.
  const saveDraft = async () => {
    if (saving || checking || publishing) return;

    if (!form.lesson_id || form.title.trim().length < 3) {
      setError("Hãy chọn bài học và nhập tiêu đề ít nhất 3 ký tự.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = id
        ? await authorCodeExerciseApi.update(id, form, editVersion)
        : await authorCodeExerciseApi.create(form);

      setId(result.id);
      setEditVersion(result.edit_version);
      setHasDraft(true);
      setDirty(false);
      setValidation(null);
      setSuccess("Đã lưu bản nháp thành công.");

      if (!id) {
        router.replace(`/content-manager/code-exercises/${result.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu bản nháp.");
    } finally {
      setSaving(false);
    }
  };

  // 5. Kiểm tra lời giải tham khảo bằng C03.
  const checkSolution = async () => {
    if (!id || !hasDraft || dirty) {
      setError("Hãy lưu bản nháp mới nhất trước khi kiểm tra.");
      return;
    }

    setChecking(true);
    setError("");
    setValidation(null);

    try {
      const result = await authorCodeExerciseApi.validate(id, editVersion);

      setValidation(result);

      if (result.can_publish) {
        setSuccess("Lời giải đã vượt qua tất cả bộ kiểm tra.");
      } else {
        setError(
          result.errors[0] ?? "Có bộ kiểm tra chưa đạt. Xem kết quả bên dưới.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể kiểm tra lời giải.");
    } finally {
      setChecking(false);
    }
  };

  // 6. Xuất bản: Backend tự kiểm tra lại.
  const publishDraft = async () => {
    if (!id || !hasDraft || dirty || !validation?.can_publish) {
      setError("Hãy lưu nháp và kiểm tra thành công trước khi xuất bản.");
      return;
    }

    if (!window.confirm("Xuất bản phiên bản bài thực hành này?")) {
      return;
    }

    setPublishing(true);
    setError("");

    try {
      await authorCodeExerciseApi.publish(id, editVersion);

      router.push("/content-manager/code-exercises");
    } catch (e) {
      setValidation(null);
      setError(
        e instanceof Error ? e.message : "Không thể xuất bản bài thực hành.",
      );
    } finally {
      setPublishing(false);
    }
  };

  const textArea = (name: TextField, label: string, rows = 4, mono = false) => (
    <label key={name} className="block space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <textarea
        value={form[name]}
        rows={rows}
        onChange={(event) => changeField(name, event.target.value)}
        className={`${areaClass} ${mono ? "font-mono" : ""}`}
      />
    </label>
  );

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        Đang tải giao diện biên soạn...
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link
        href="/content-manager/code-exercises"
        className="inline-flex items-center gap-2 text-sm text-slate-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Danh sách bài thực hành
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#002C3E]">
            {id ? "Chỉnh sửa bài thực hành C#" : "Tạo bài thực hành C#"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {hasDraft
              ? `Bản nháp · edit_version ${editVersion}`
              : id
                ? "Lưu để tạo bản nháp mới từ phiên bản đã xuất bản."
                : "Bài mới sẽ được lưu dưới trạng thái nháp."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
          >
            <Eye className="h-4 w-4" />
            {preview ? "Quay lại soạn thảo" : "Xem trước"}
          </button>

          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={saving || checking || publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#145a68] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu nháp"}
          </button>

          <button
            type="button"
            onClick={() => void checkSolution()}
            disabled={
              !id || !hasDraft || dirty || saving || checking || publishing
            }
            className="inline-flex items-center gap-2 rounded-xl border border-[#78bcc4] bg-white px-4 py-2 text-sm font-bold text-[#145a68] disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {checking ? "Đang kiểm tra..." : "Kiểm tra lời giải"}
          </button>

          <button
            type="button"
            onClick={() => void publishDraft()}
            disabled={
              !id ||
              !hasDraft ||
              dirty ||
              !validation?.can_publish ||
              checking ||
              saving ||
              publishing
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {publishing ? "Đang xuất bản..." : "Xuất bản"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </p>
      )}

      {preview ? (
        // XEM TRƯỚC NỘI DUNG HỌC VIÊN
        <div className="space-y-5">
          <Section title="Xem trước đề bài">
            <h2 className="text-xl font-black text-[#002C3E]">
              {form.title || "Chưa có tiêu đề"}
            </h2>

            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {form.objective}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {form.description}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold">Đầu vào</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {form.input_format}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold">Đầu ra</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {form.output_format}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Ví dụ công khai">
            {form.test_cases
              .filter((test) => test.is_public)
              .map((test, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <h3 className="text-sm font-bold">Ví dụ {index + 1}</h3>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-bold">Input</p>
                      <pre className="min-h-16 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs">
                        {test.input}
                      </pre>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-bold">Expected output</p>
                      <pre className="min-h-16 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs">
                        {test.expected_output}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
          </Section>

          <Section title="Mã khởi đầu">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#101b20] p-4 font-mono text-xs text-slate-100">
              {form.starter_code || "// Chưa có mã khởi đầu"}
            </pre>
          </Section>

          <p className="text-xs text-slate-500">
            Bản xem trước không hiển thị test ẩn và lời giải. Đây là mô phỏng
            giao diện, không phải API của học viên.
          </p>
        </div>
      ) : (
        // BIÊN SOẠN
        <fieldset
          disabled={saving || publishing}
          className="min-w-0 space-y-5 disabled:opacity-70"
        >
          <Section title="1. Chọn bài học liên quan">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-bold">Khóa học</span>

                <select
                  value={courseId}
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    setChapterId("");
                    setChapters([]);
                    setLessons([]);
                    changeField("lesson_id", "");
                  }}
                  className={inputClass}
                >
                  <option value="">Chọn khóa học</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Chương</span>

                <select
                  value={chapterId}
                  onChange={(event) => {
                    setChapterId(event.target.value);
                    setLessons([]);
                    changeField("lesson_id", "");
                  }}
                  disabled={!courseId}
                  className={inputClass}
                >
                  <option value="">Chọn chương</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold">Bài học</span>

                <select
                  value={form.lesson_id}
                  onChange={(event) =>
                    changeField("lesson_id", event.target.value)
                  }
                  disabled={!chapterId}
                  className={inputClass}
                >
                  <option value="">Chọn bài học</option>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section title="2. Nội dung đề thực hành">
            <label className="block space-y-2">
              <span className="text-sm font-bold">Tiêu đề bài</span>
              <input
                value={form.title}
                onChange={(event) => changeField("title", event.target.value)}
                maxLength={160}
                placeholder="Ví dụ: Tính tổng hai số nguyên"
                className={inputClass}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-bold">Độ khó</span>
              <select
                value={form.difficulty}
                onChange={(event) =>
                  changeField(
                    "difficulty",
                    event.target.value as CodeExercisePayload["difficulty"],
                  )
                }
                className={inputClass}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </label>

            {textArea("objective", "Mục tiêu học tập", 3)}
            {textArea("description", "Mô tả bài toán", 7)}
            {textArea("input_format", "Định dạng đầu vào", 3)}
            {textArea("output_format", "Định dạng đầu ra", 3)}
            {textArea("starter_code", "Mã C# khởi đầu (tùy chọn)", 8, true)}
          </Section>

          <Section title="3. Bộ kiểm tra công khai và ẩn">
            <p className="text-xs leading-6 text-slate-500">
              Cần ít nhất một test công khai và một test ẩn. Input và output có
              thể chứa nhiều dòng. Chuỗi rỗng vẫn được phép nếu phù hợp bài
              toán.
            </p>

            {form.test_cases.map((test, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#002C3E]">
                    Bộ kiểm tra {index + 1}
                  </h3>

                  <button
                    type="button"
                    onClick={() => removeTest(index)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                </div>

                <label className="mb-3 block space-y-2">
                  <span className="text-sm font-bold">Loại bộ kiểm tra</span>

                  <select
                    value={test.is_public ? "public" : "hidden"}
                    onChange={(event) =>
                      changeTest(index, {
                        is_public: event.target.value === "public",
                      })
                    }
                    className={inputClass}
                  >
                    <option value="public">Công khai</option>
                    <option value="hidden">Ẩn</option>
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold">Input</span>

                    <textarea
                      value={test.input}
                      rows={5}
                      spellCheck={false}
                      onChange={(event) =>
                        changeTest(index, {
                          input: event.target.value,
                        })
                      }
                      className={`${areaClass} font-mono`}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-bold">Expected output</span>

                    <textarea
                      value={test.expected_output}
                      rows={5}
                      spellCheck={false}
                      onChange={(event) =>
                        changeTest(index, {
                          expected_output: event.target.value,
                        })
                      }
                      className={`${areaClass} font-mono`}
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTest}
              disabled={form.test_cases.length >= 20}
              className="inline-flex items-center gap-2 rounded-xl border border-[#78bcc4] px-4 py-2 text-sm font-bold text-[#145a68] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Thêm bộ kiểm tra
            </button>
          </Section>

          <Section title="4. Ba mức gợi ý">
            {textArea("hint_1", "Gợi ý 1 – Kiến thức liên quan", 3)}
            {textArea("hint_2", "Gợi ý 2 – Cách tiếp cận", 3)}
            {textArea("hint_3", "Gợi ý 3 – Hướng dẫn chi tiết hơn", 3)}
          </Section>

          <Section title="5. Lời giải tham khảo">
            {textArea("solution_code", "Mã lời giải C#", 12, true)}
            {textArea("solution_explanation", "Giải thích cách hoạt động", 6)}
          </Section>
        </fieldset>
      )}

      {/* Kết quả kiểm tra từ backend C03 */}
      {validation && (
        <Section title="6. Kết quả kiểm tra lời giải">
          <p
            className={`text-sm font-bold ${
              validation.can_publish ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {validation.can_publish
              ? "Tất cả bộ kiểm tra đã đạt."
              : "Lời giải chưa đáp ứng điều kiện xuất bản."}
          </p>

          {validation.errors.map((message, index) => (
            <p key={index} className="text-sm text-rose-700">
              {message}
            </p>
          ))}

          {validation.cases.map((test) => (
            <div
              key={test.index}
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="text-sm font-bold">
                Test {test.index}
                {" · "}
                {test.is_public ? "Công khai" : "Ẩn"}
                {" · "}
                <span
                  className={
                    test.status === "passed"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }
                >
                  {test.status}
                </span>
              </p>

              {test.status !== "passed" && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-bold">Kết quả mong đợi</p>
                    <pre className="whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs">
                      {test.expected_output}
                    </pre>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-bold">Kết quả thực tế</p>
                    <pre className="whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs">
                      {test.actual_output}
                    </pre>
                  </div>
                </div>
              )}

              {test.stderr && (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                  {test.stderr}
                </pre>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

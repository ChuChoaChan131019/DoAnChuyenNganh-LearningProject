"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CodeEditor } from "@/components/learner/code-exercises/code-editor";
import { PublicExamples } from "@/components/learner/code-exercises/public-examples";
import {
  SaveStatus,
  type EditorSaveState,
} from "@/components/learner/code-exercises/save-status";
import { ApiClientError, codeExerciseApi } from "@/lib/api";
import type { LearnerCodeExerciseDetail } from "@/types/code-exercise";
import type {
  CsharpRunResponse,
  CodeGradeResponse,
  SubmitCodeResponse,
} from "@/types/code-exercise";

const difficultyLabel = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
} as const;

export default function CodeExerciseDetailPage() {
  const params = useParams<{ exerciseId: string }>();
  const exerciseId = Array.isArray(params.exerciseId)
    ? params.exerciseId[0]
    : params.exerciseId;
  const [exercise, setExercise] = useState<LearnerCodeExerciseDetail | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<CsharpRunResponse | null>(null);
  const [runError, setRunError] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<CodeGradeResponse | null>(
    null,
  );
  const [gradeError, setGradeError] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitCodeResponse | null>(
    null,
  );
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState("");
  const codeRef = useRef("");
  const savedCodeRef = useRef("");
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const persistRef = useRef<() => Promise<void>>(async () => undefined);

  const loadExercise = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    setError("");
    try {
      const detail = await codeExerciseApi.detail(exerciseId);
      const initialCode = detail.progress.has_saved_code
        ? detail.progress.saved_code
        : detail.starter_code;
      setStdin(detail.public_examples[0]?.input ?? "");
      setRunResult(null);
      setRunError("");
      setGradeResult(null);
      setSubmitResult(null);
      setExercise(detail);
      setCode(initialCode);
      codeRef.current = initialCode;
      savedCodeRef.current = initialCode;
      versionRef.current = detail.progress.save_version;
      setSavedAt(detail.progress.updated_at);
      setSaveState(detail.progress.has_saved_code ? "saved" : "idle");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể mở bài thực hành.",
      );
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    // The request updates state asynchronously after the route identifier changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExercise();
  }, [loadExercise]);

  const persist = useCallback(async () => {
    if (
      !exerciseId ||
      codeRef.current === savedCodeRef.current ||
      saveState === "conflict"
    )
      return;
    if (savingRef.current) {
      queuedRef.current = true;
      return;
    }
    savingRef.current = true;
    const snapshot = codeRef.current;
    setSaveState("saving");
    try {
      const result = await codeExerciseApi.saveCode(
        exerciseId,
        snapshot,
        versionRef.current,
      );
      versionRef.current = result.save_version;
      savedCodeRef.current = snapshot;
      setSavedAt(result.updated_at);
      setSaveState(codeRef.current === snapshot ? "saved" : "dirty");
    } catch (requestError) {
      if (
        requestError instanceof ApiClientError &&
        requestError.status === 409
      ) {
        queuedRef.current = false;
        setSaveState("conflict");
      } else {
        setSaveState("error");
      }
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => void persistRef.current(), 0);
      }
    }
  }, [exerciseId, saveState]);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!exercise || code === savedCodeRef.current || saveState !== "dirty")
      return;
    const timer = window.setTimeout(() => void persistRef.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [code, exercise, saveState]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (codeRef.current === savedCodeRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, []);

  const changeCode = (nextCode: string) => {
    setCode(nextCode);
    codeRef.current = nextCode;

    // Mã thay đổi thì kết quả chấm cũ hết hiệu lực.
    setGradeResult(null);
    setSubmitResult(null);
    setGradeError("");

    if (saveState !== "conflict") {
      setSaveState(nextCode === savedCodeRef.current ? "saved" : "dirty");
    }
  };

  // Máy chủ đã đếm lượt chạy; cập nhật số hiển thị trên giao diện.
  const bumpRunCount = () =>
    setExercise((current) =>
      current
        ? {
            ...current,
            progress: {
              ...current.progress,
              run_count: current.progress.run_count + 1,
            },
          }
        : current,
    );

  const gradeErrorMessage = (requestError: unknown, fallback: string) => {
    if (requestError instanceof ApiClientError && requestError.status === 503) {
      return "Dịch vụ chạy C# đang tạm ngừng. Vui lòng thử lại sau.";
    }
    if (requestError instanceof ApiClientError && requestError.status === 429) {
      return "Hệ thống đang xử lý nhiều lượt chạy. Hãy thử lại sau.";
    }
    return requestError instanceof Error ? requestError.message : fallback;
  };

  const handleRunCode = async () => {
    if (!exerciseId || running || !code.trim()) {
      return;
    }

    setRunning(true);
    setRunError("");
    setRunResult(null);

    try {
      const result = await codeExerciseApi.runCode(exerciseId, code, stdin);

      setRunResult(result);
      bumpRunCount();
    } catch (requestError) {
      setRunError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể chạy mã C#.",
      );
    } finally {
      setRunning(false);
    }
  };

  const canGrade = () =>
    Boolean(
      exerciseId &&
        exercise &&
        !grading &&
        !running &&
        code.trim() &&
        saveState !== "conflict",
    );

  // C05: chạy thử bộ kiểm tra công khai (không ghi nhận hoàn thành).
  const handleCheckPublic = async () => {
    if (!canGrade() || !exercise) return;
    setGrading(true);
    setGradeError("");
    setGradeResult(null);
    setSubmitResult(null);
    const revisionId = exercise.published_revision.id;

    try {
      const result = await codeExerciseApi.checkPublic(
        exerciseId,
        code,
        revisionId,
      );
      if (
        result.exercise_id !== exerciseId ||
        result.revision_id !== revisionId
      ) {
        throw new Error("Đề bài đã thay đổi. Hãy tải lại đề trước khi chấm mã.");
      }
      setGradeResult(result);
      bumpRunCount();
    } catch (requestError) {
      setGradeError(
        gradeErrorMessage(requestError, "Không thể chấm bài thực hành."),
      );
    } finally {
      setGrading(false);
    }
  };

  // C07: nộp bài, chấm cả test ẩn, lưu lần nộp và trạng thái hoàn thành.
  const handleSubmit = async () => {
    if (!canGrade() || !exercise) return;
    setGrading(true);
    setGradeError("");
    setGradeResult(null);
    setSubmitResult(null);
    const revisionId = exercise.published_revision.id;

    try {
      // Lưu mã mới nhất trước để lần nộp và mã đã lưu luôn trùng nhau.
      await persistRef.current();
      const result = await codeExerciseApi.submit(exerciseId, code, revisionId);
      if (
        result.exercise_id !== exerciseId ||
        result.revision_id !== revisionId
      ) {
        throw new Error("Đề bài đã thay đổi. Hãy tải lại đề trước khi nộp.");
      }
      setSubmitResult(result);
      setExercise((current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                status:
                  result.submission.status === "completed"
                    ? "completed"
                    : current.progress.status,
                requires_resubmission:
                  result.submission.status === "completed"
                    ? false
                    : current.progress.requires_resubmission,
              },
              last_submission: {
                id: result.submission.submission_id,
                revision_id: result.revision_id,
                total_cases: result.total_cases,
                passed_cases: result.passed_cases,
                all_passed: result.all_passed,
                submitted_at: result.submission.submitted_at,
              },
            }
          : current,
      );
    } catch (requestError) {
      setGradeError(gradeErrorMessage(requestError, "Không thể nộp bài."));
    } finally {
      setGrading(false);
    }
  };

  // C07: mở gợi ý kế tiếp; máy chủ ghi nhớ mức cao nhất theo học sinh.
  const handleOpenHint = async () => {
    if (!exercise || hintLoading) return;
    const level = exercise.hints.opened.length + 1;
    if (level > exercise.hints.total) return;
    setHintLoading(true);
    setHintError("");
    try {
      const result = await codeExerciseApi.openHint(exerciseId, level);
      setExercise((current) =>
        current
          ? {
              ...current,
              progress: {
                ...current.progress,
                highest_hint_level: result.highest_hint_level,
              },
              hints: {
                ...current.hints,
                opened: [
                  ...current.hints.opened.filter(
                    (item) => item.level !== result.level,
                  ),
                  { level: result.level, hint: result.hint },
                ].sort((a, b) => a.level - b.level),
              },
            }
          : current,
      );
    } catch (requestError) {
      setHintError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể mở gợi ý.",
      );
    } finally {
      setHintLoading(false);
    }
  };

  const shown = submitResult ?? gradeResult;

  if (loading)
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-[#145a68]">
        <Loader2 className="h-6 w-6 animate-spin" /> Đang tải đề bài và mã đã
        lưu...
      </div>
    );
  if (error || !exercise)
    return (
      <div className="mx-auto max-w-xl rounded-[18px] border border-rose-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-9 w-9 text-rose-500" />
        <h1 className="mt-4 text-xl font-bold text-[#0f3741]">
          Không thể mở bài thực hành
        </h1>
        <p className="mt-2 text-sm text-rose-700">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/learner/code-exercises"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
          >
            Về danh sách
          </Link>
          <button
            type="button"
            onClick={() => void loadExercise()}
            className="rounded-xl bg-[#f7444e] px-4 py-2 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1460px] pb-10">
      <Link
        href="/learner/code-exercises"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#145a68]"
      >
        <ArrowLeft className="h-4 w-4" /> Danh sách bài thực hành
      </Link>
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-[#eef6f5] px-2.5 py-1 text-[#145a68]">
              {difficultyLabel[exercise.difficulty]}
            </span>
            {exercise.progress.status === "completed" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Đã hoàn thành
              </span>
            )}
            {exercise.progress.requires_resubmission && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                Có phiên bản đề mới
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#0f3741]">
            {exercise.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {exercise.course.title} · {exercise.chapter.title} ·{" "}
            {exercise.lesson.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus state={saveState} updatedAt={savedAt} />
          {saveState === "conflict" ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Tải mã mới nhất
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void persist()}
              disabled={saveState !== "dirty" && saveState !== "error"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Lưu mã
            </button>
          )}
        </div>
      </div>

      {saveState === "conflict" && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Một phiên khác đã lưu mã mới hơn. Hãy sao chép phần mã cần giữ nếu
          cần, sau đó tải phiên bản mới nhất để tránh ghi đè.
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.78fr)_minmax(560px,1.4fr)]">
        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className="rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#145a68]">
              <BookOpen className="h-4 w-4" /> Đề bài
            </div>
            {exercise.objective && (
              <p className="mt-4 rounded-xl bg-[#f4f8f6] p-3 text-sm font-semibold leading-6 text-[#0f3741]">
                {exercise.objective}
              </p>
            )}
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
              {exercise.description}
            </div>
            {(exercise.input_format || exercise.output_format) && (
              <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                {exercise.input_format && (
                  <Format
                    title="Định dạng đầu vào"
                    value={exercise.input_format}
                  />
                )}
                {exercise.output_format && (
                  <Format
                    title="Định dạng đầu ra"
                    value={exercise.output_format}
                  />
                )}
              </div>
            )}
          </section>
          <PublicExamples examples={exercise.public_examples} />

          {/* C07: gợi ý mở lần lượt */}
          <section className="rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#145a68]">
                <Lightbulb className="h-4 w-4" /> Gợi ý
              </h2>
              <span className="text-xs text-slate-500">
                Đã mở {exercise.hints.opened.length}/{exercise.hints.total}
              </span>
            </div>
            <ol className="mt-4 space-y-3">
              {exercise.hints.opened.map((item) => (
                <li
                  key={item.level}
                  className="rounded-xl bg-[#f4f8f6] p-3 text-sm leading-6 text-slate-700"
                >
                  <p className="text-xs font-bold text-[#145a68]">
                    Gợi ý mức {item.level}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{item.hint}</p>
                </li>
              ))}
            </ol>
            {exercise.hints.opened.length < exercise.hints.total && (
              <button
                type="button"
                onClick={() => void handleOpenHint()}
                disabled={hintLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#78bcc4] bg-[#f1f8f8] px-4 py-2 text-sm font-bold text-[#145a68] disabled:opacity-50"
              >
                {hintLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Mở gợi ý mức {exercise.hints.opened.length + 1}
              </button>
            )}
            {hintError && (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {hintError}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Gợi ý mở lần lượt từ mức 1 và được nhớ theo tài khoản của bạn.
            </p>
          </section>
        </aside>
        <main className="min-w-0 space-y-4">
          {/* Trình soạn thảo C# hiện có */}
          <CodeEditor
            value={code}
            onChange={changeCode}
            disabled={saveState === "conflict" || grading || running}
          />

          {/* Khu vực nhập dữ liệu */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-[#0f3741]">
                Dữ liệu đầu vào (stdin)
              </h2>

              <span className="text-xs text-slate-400">Hỗ trợ nhiều dòng</span>
            </div>

            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              rows={5}
              maxLength={16000}
              placeholder={"Ví dụ:\n10\n20"}
              spellCheck={false}
              aria-label="Dữ liệu đầu vào chương trình"
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-800 outline-none focus:border-[#78bcc4]"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Giới hạn chạy 3 giây, RAM 512 MB.
              </p>

              <button
                type="button"
                onClick={() => void handleRunCode()}
                disabled={
                  running || grading || !code.trim() || saveState === "conflict"
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e33b45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}

                {running ? "Đang chạy..." : "Chạy mã"}
              </button>
            </div>
          </section>

          {/* Kết quả chạy chương trình */}
          <section className="overflow-hidden rounded-2xl border border-slate-700 bg-[#101b20] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-[#17272e] px-4 py-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-white">
                <Terminal className="h-4 w-4 text-[#72c6c4]" />
                Kết quả chương trình
              </h2>

              {runResult && (
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${
                    runResult.status === "success"
                      ? "bg-emerald-950 text-emerald-300"
                      : "bg-rose-950 text-rose-300"
                  }`}
                >
                  {runResult.status === "success"
                    ? "Chạy thành công"
                    : runResult.status === "compile_error"
                      ? "Lỗi biên dịch"
                      : runResult.status === "runtime_error"
                        ? "Lỗi khi chạy"
                        : runResult.status === "time_limit"
                          ? "Quá thời gian"
                          : runResult.status === "output_limit"
                            ? "Quá giới hạn output"
                            : "Quá giới hạn tài nguyên"}
                </span>
              )}
            </div>

            <div className="min-h-40 space-y-4 p-4 font-mono text-sm">
              {running && (
                <p className="flex items-center gap-2 text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang biên dịch và thực thi C#...
                </p>
              )}

              {!running && !runResult && !runError && (
                <p className="text-slate-400">
                  Nhấn &quot;Chạy mã&quot; để xem kết quả.
                </p>
              )}

              {runResult?.stdout && (
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-400">
                    Standard output
                  </p>

                  <pre className="whitespace-pre-wrap break-words text-emerald-300">
                    {runResult.stdout}
                  </pre>
                </div>
              )}

              {runResult?.stderr && (
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-400">
                    Standard error / Compiler
                  </p>

                  <pre className="whitespace-pre-wrap break-words text-rose-300">
                    {runResult.stderr}
                  </pre>
                </div>
              )}

              {runError && (
                <p role="alert" className="whitespace-pre-wrap text-rose-300">
                  {runError}
                </p>
              )}

              {runResult && (
                <p className="border-t border-slate-700 pt-3 text-xs text-slate-400">
                  Thời gian xử lý: {runResult.elapsed_ms} ms
                  {" · "}
                  Trạng thái: {runResult.status}
                </p>
              )}
            </div>
          </section>

          {/* C05: CHẠY THỬ VÀ CHẤM BỘ KIỂM TRA */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-base font-black text-[#0f3741]">
                Kiểm tra và chấm mã C#
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Chạy thử chỉ dùng bộ kiểm tra công khai và không tính hoàn thành.
                Nộp bài chấm cả test ẩn (không tiết lộ dữ liệu ẩn); bài chỉ hoàn
                thành khi mọi bộ kiểm tra đều đạt.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCheckPublic()}
                disabled={!canGrade()}
                className="rounded-xl border border-[#78bcc4] bg-[#f1f8f8] px-4 py-2.5 text-sm font-bold text-[#145a68] disabled:opacity-50"
              >
                Chạy thử test công khai
              </button>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canGrade()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#145a68] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Nộp bài
              </button>
            </div>

            {grading && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-amber-700"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang biên dịch và chấm từng bộ kiểm tra...
              </p>
            )}

            {gradeError && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
              >
                {gradeError}
              </p>
            )}

            {shown && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-[#0f3741]">
                    {submitResult ? "Kết quả nộp bài" : "Kết quả chạy thử"}
                  </p>

                  <p
                    className={`mt-1 text-lg font-black ${
                      shown.all_passed
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {shown.passed_cases}/{shown.total_cases} test
                    đạt
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {shown.all_passed
                      ? "Các bộ kiểm tra trong lượt này đều đạt."
                      : "Một hoặc nhiều bộ kiểm tra chưa đạt."}
                  </p>
                </div>

                {shown.cases.map((test) => (
                  <div
                    key={test.index}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#0f3741]">
                        Test {test.index}
                        {" · "}
                        {test.is_public ? "Công khai" : "Ẩn"}
                      </p>

                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${
                          test.status === "passed"
                            ? "bg-emerald-50 text-emerald-700"
                            : test.status === "not_run"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {test.message}
                      </span>
                    </div>

                    {/* KHÔNG hiển thị input/output của test ẩn */}
                    {test.is_public && (
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <p className="mb-1 text-xs font-bold text-slate-500">
                            Input
                          </p>
                          <pre className="min-h-20 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3 text-xs">
                            {test.input ?? ""}
                          </pre>
                        </div>

                        <div>
                          <p className="mb-1 text-xs font-bold text-slate-500">
                            Expected output
                          </p>
                          <pre className="min-h-20 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3 text-xs">
                            {test.expected_output ?? ""}
                          </pre>
                        </div>

                        <div>
                          <p className="mb-1 text-xs font-bold text-slate-500">
                            Actual output
                          </p>
                          <pre className="min-h-20 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-3 text-xs">
                            {test.actual_output ?? ""}
                          </pre>
                        </div>

                        {test.stderr && (
                          <pre className="whitespace-pre-wrap break-words rounded-lg bg-rose-50 p-3 text-xs text-rose-700 md:col-span-3">
                            {test.stderr}
                          </pre>
                        )}
                      </div>
                    )}

                    {!test.is_public && (
                      <p className="mt-2 text-xs text-slate-500">
                        Đây là bộ kiểm tra ẩn. Hệ thống chỉ hiển thị trạng thái,
                        không cung cấp dữ liệu đầu vào hoặc đáp án.
                      </p>
                    )}
                  </div>
                ))}

                <p
                  className={`text-xs ${submitResult ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {submitResult
                    ? submitResult.submission.status === "completed"
                      ? "Lần nộp đã được lưu và bài thực hành được ghi nhận hoàn thành."
                      : "Lần nộp đã được lưu nhưng bài chưa hoàn thành. Hãy sửa mã và nộp lại."
                    : "Chạy thử chưa được ghi nhận là lần nộp và chưa cập nhật trạng thái hoàn thành."}
                </p>
              </div>
            )}
          </section>

          <p className="text-xs leading-5 text-slate-500">
            Mã được tự động lưu sau khi ngừng nhập. Chạy mã và chạy thử chỉ giúp
            kiểm tra kết quả; bài chỉ hoàn thành khi nộp bài đạt mọi bộ kiểm tra.
            Đã chạy {exercise.progress.run_count} lần
            {exercise.last_submission
              ? ` · Lần nộp gần nhất: ${exercise.last_submission.passed_cases}/${exercise.last_submission.total_cases} test đạt`
              : ""}.
          </p>
        </main>
      </div>
    </div>
  );
}

function Format({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import type { Chapter, ContentStatus } from "@/types/learning-content";
import { courseApi } from "@/lib/api";

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
  "In review": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Draft: "border-border bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [expanded, setExpanded] = useState<Array<string | number>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseOptions, setCourseOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterDescription, setChapterDescription] = useState("");
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [lessonChapterId, setLessonChapterId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDuration, setLessonDuration] = useState("0");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    courseApi.list().then((courses) => {
      if (!active) return;
      const options = courses.map((course) => ({ id: String(course.id), title: course.title }));
      setCourseOptions(options);
      if (options.length > 0) {
        setSelectedCourse(options[0].title);
        setSelectedCourseId(options[0].id);
      } else {
        setIsLoading(false);
      }
    }).catch((error) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : "Unable to load courses.");
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    let active = true;
    setIsLoading(true);
    setLoadError("");
    courseApi.chapters(selectedCourseId).then((loadedChapters) => {
      if (!active) return;
      setChapters(loadedChapters);
      setExpanded(loadedChapters.map((chapter) => chapter.id));
      setIsLoading(false);
    }).catch((error) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : "Unable to load chapters.");
      setChapters([]);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [selectedCourseId]);

  const handleCourseChange = (courseId: string) => {
    const course = courseOptions.find((option) => option.id === courseId);
    setSelectedCourseId(courseId);
    setSelectedCourse(course?.title ?? "");
  };

  const saveChapter = async () => {
    if (!selectedCourseId) {
      setFormError("No course is available to save this chapter.");
      return;
    }
    if (!chapterTitle.trim()) {
      setFormError("Chapter title is required.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const saved = editingChapter
        ? await courseApi.updateChapter(selectedCourseId, String(editingChapter.id), {
            title: chapterTitle.trim(),
            description: chapterDescription.trim() || undefined,
          })
        : await courseApi.createChapter(selectedCourseId, {
            title: chapterTitle.trim(),
            description: chapterDescription.trim() || undefined,
          });
      const chapter: Chapter = {
        id: saved.id,
        title: saved.title,
        summary: saved.description || "No description added.",
        lessons: editingChapter?.lessons ?? [],
      };
      setChapters((current) => editingChapter
        ? current.map((item) => item.id === editingChapter.id ? chapter : item)
        : [...current, chapter],
      );
      if (!editingChapter) {
        setExpanded((current) => [...current, saved.id]);
      }
      setEditingChapter(null);
      setChapterTitle("");
      setChapterDescription("");
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save chapter.");
    } finally {
      setIsSaving(false);
    }
  };

  const openAddChapter = () => {
    setEditingChapter(null);
    setChapterTitle("");
    setChapterDescription("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterTitle(chapter.title);
    setChapterDescription(chapter.summary);
    setFormError("");
    setIsModalOpen(true);
  };

  const deleteChapter = async (chapter: Chapter) => {
    if (!selectedCourseId || !window.confirm(`Delete chapter "${chapter.title}"?`)) return;
    try {
      await courseApi.removeChapter(selectedCourseId, String(chapter.id));
      setChapters((current) => current.filter((item) => item.id !== chapter.id));
      setExpanded((current) => current.filter((id) => id !== chapter.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete chapter.");
    }
  };

  const reorderChapter = async (targetChapterId: string) => {
    if (!selectedCourseId || !draggedChapterId || draggedChapterId === targetChapterId) return;
    const previous = chapters;
    const draggedIndex = chapters.findIndex((chapter) => String(chapter.id) === draggedChapterId);
    const targetIndex = chapters.findIndex((chapter) => String(chapter.id) === targetChapterId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const next = [...chapters];
    const [draggedChapter] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, draggedChapter);
    setChapters(next);
    setDraggedChapterId(null);

    try {
      await courseApi.reorderChapters(selectedCourseId, next.map((chapter) => String(chapter.id)));
    } catch (error) {
      setChapters(previous);
      window.alert(error instanceof Error ? error.message : "Unable to save chapter order.");
    }
  };

  const reorderLesson = async (chapter: Chapter, targetLessonId: string) => {
    if (!selectedCourseId || !draggedLessonId || draggedLessonId === targetLessonId) return;
    const previous = chapters;
    const draggedIndex = chapter.lessons.findIndex((lesson) => lesson.id === draggedLessonId);
    const targetIndex = chapter.lessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (draggedIndex < 0 || targetIndex < 0 || !chapter.id) return;

    const nextLessons = [...chapter.lessons];
    const [draggedLesson] = nextLessons.splice(draggedIndex, 1);
    nextLessons.splice(targetIndex, 0, draggedLesson);
    setChapters((current) => current.map((item) =>
      item.id === chapter.id ? { ...item, lessons: nextLessons } : item,
    ));
    setDraggedLessonId(null);

    try {
      await courseApi.reorderLessons(
        selectedCourseId,
        String(chapter.id),
        nextLessons.map((lesson) => String(lesson.id)),
      );
    } catch (error) {
      setChapters(previous);
      window.alert(error instanceof Error ? error.message : "Unable to save lesson order.");
    }
  };

  const addLesson = async () => {
    if (!selectedCourseId || !lessonChapterId) {
      setFormError("No chapter is selected.");
      return;
    }
    if (!lessonTitle.trim()) {
      setFormError("Lesson title is required.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const created = await courseApi.createLesson(selectedCourseId, lessonChapterId, {
        title: lessonTitle.trim(),
        estimated_duration_minutes: Number(lessonDuration) || 0,
      });
      setChapters((current) => current.map((chapter) =>
        chapter.id === lessonChapterId
          ? { ...chapter, lessons: [...chapter.lessons, created] }
          : chapter,
      ));
      setLessonTitle("");
      setLessonDuration("0");
      setLessonChapterId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create lesson.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1328px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Chapter management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag chapters to reorder the curriculum. Expand a chapter to manage
            its lessons.
          </p>
        </div>
        <label className="relative flex h-10 min-w-[290px] items-center">
          <span className="sr-only">Select course</span>
          <select
            value={selectedCourseId ?? ""}
            onChange={(event) => handleCourseChange(event.target.value)}
            disabled={courseOptions.length === 0}
            className="h-full w-full appearance-none rounded-xl border border-border bg-card px-3 pr-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id} className="bg-card text-foreground">{course.title}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
        </label>
      </header>
      <section className="space-y-4">
        {isLoading && (
          <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            Loading chapters...
          </div>
        )}
        {!isLoading && loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 px-5 py-12 text-center text-sm text-rose-700 dark:text-rose-300">
            {loadError}
          </div>
        )}
        {!isLoading && !loadError && chapters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            No chapters found for this course.
          </div>
        )}
        {!isLoading && !loadError && chapters.map((chapter, index) => {
          const isExpanded = expanded.includes(chapter.id);
          return (
            <article
              key={chapter.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void reorderChapter(String(chapter.id))}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span
                  draggable
                  onDragStart={() => setDraggedChapterId(String(chapter.id))}
                  onDragEnd={() => setDraggedChapterId(null)}
                  title="Drag to reorder chapter"
                  className="cursor-grab touch-none active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 dark:bg-rose-950/50 font-mono text-xs font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground">
                    {chapter.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {chapter.lessons.length} lessons · {chapter.summary}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    aria-label={`Edit ${chapter.title}`}
                    onClick={() => openEditChapter(chapter)}
                    className="rounded-lg p-2 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${chapter.title}`}
                    onClick={() => void deleteChapter(chapter)}
                    className="rounded-lg p-2 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${chapter.title}`}
                    onClick={() =>
                      setExpanded((current) =>
                        isExpanded
                          ? current.filter((id) => id !== chapter.id)
                          : [...current, chapter.id],
                      )
                    }
                    className="rounded-lg p-2 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="bg-muted/30">
                  {chapter.lessons.length === 0 && (
                    <p className="border-b border-border px-14 py-4 text-sm text-muted-foreground">
                      No lessons
                    </p>
                  )}
                  {chapter.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id ?? lesson.code + lesson.title}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => void reorderLesson(chapter, String(lesson.id))}
                      className="flex min-h-[46px] items-center gap-3 border-b border-border px-5 pl-14 text-sm"
                    >
                      <span
                        draggable={Boolean(lesson.id)}
                        onDragStart={() => lesson.id && setDraggedLessonId(lesson.id)}
                        onDragEnd={() => setDraggedLessonId(null)}
                        title="Drag to reorder lesson"
                        className="cursor-grab touch-none active:cursor-grabbing"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </span>
                      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                        {`L${String(lessonIndex + 1).padStart(2, "0")}`}
                      </span>
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {lesson.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                          <Clock3 className="h-3.5 w-3.5" />
                          {lesson.duration}
                        </span>
                        {lesson.ai && (
                          <span className="rounded-full border border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40 px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                            ✣ AI
                          </span>
                        )}
                        <StatusBadge status={lesson.status} />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormError("");
                      setLessonChapterId(String(chapter.id));
                    }}
                    className="flex items-center gap-2 px-9 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add lesson
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <button
        type="button"
        onClick={openAddChapter}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-3 text-sm font-medium text-foreground hover:border-primary hover:bg-muted/50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add chapter
      </button>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs px-4" role="dialog" aria-modal="true" aria-labelledby="add-chapter-title">
          <form
            onSubmit={(event) => { event.preventDefault(); void saveChapter(); }}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 id="add-chapter-title" className="text-xl font-bold text-foreground">{editingChapter ? "Edit chapter" : "Add chapter"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{editingChapter ? "Update this chapter." : `Create a draft chapter for ${selectedCourse}.`}</p>
            <label className="mt-5 block text-sm font-medium text-foreground">
              Chapter title
              <input
                value={chapterTitle}
                onChange={(event) => setChapterTitle(event.target.value)}
                maxLength={160}
                autoFocus
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Object-oriented programming"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-foreground">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
              <textarea
                value={chapterDescription}
                onChange={(event) => setChapterDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="What will learners study in this chapter?"
              />
            </label>
            {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setEditingChapter(null); setIsModalOpen(false); }} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Saving..." : editingChapter ? "Save changes" : "Create chapter"}
              </button>
            </div>
          </form>
        </div>
      )}
      {lessonChapterId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs px-4" role="dialog" aria-modal="true" aria-labelledby="add-lesson-title">
          <form
            onSubmit={(event) => { event.preventDefault(); void addLesson(); }}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 id="add-lesson-title" className="text-xl font-bold text-foreground">Add lesson</h2>
            <label className="mt-5 block text-sm font-medium text-foreground">
              Lesson title
              <input
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                maxLength={160}
                autoFocus
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Defining a class"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-foreground">
              Duration in minutes
              <input
                type="number"
                min="0"
                max="1440"
                value={lessonDuration}
                onChange={(event) => setLessonDuration(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setLessonChapterId(null)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Saving..." : "Create lesson"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

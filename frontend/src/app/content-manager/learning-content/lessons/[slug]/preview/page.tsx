"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileCode2, FileImage, FileText } from "lucide-react";
import { courseApi, materialApi, type Material } from "@/lib/api";

type Lesson = Awaited<ReturnType<typeof courseApi.lesson>>;
type Event = Awaited<ReturnType<typeof courseApi.reviewHistory>>[number];

export default function LessonPreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [history, setHistory] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([courseApi.lesson(slug), materialApi.byLesson(slug), courseApi.reviewHistory(slug)])
      .then(([lessonData, materialData, events]) => {
        if (!active) return;
        setLesson(lessonData); setMaterials(materialData); setHistory(events);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load preview."); });
    return () => { active = false; };
  }, [slug]);

  async function openMaterial(id: string) {
    const tab = window.open("about:blank", "_blank");
    try {
      const { url } = await materialApi.access(id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (cause) {
      tab?.close();
      setError(cause instanceof Error ? cause.message : "Unable to open material.");
    }
  }

  return <div className="mx-auto max-w-[1100px] space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/content-manager/ai/review-queue" className="inline-flex items-center gap-2 text-sm text-[#526f78] hover:text-[#002C3E]"><ArrowLeft className="h-4 w-4" /> Review queue</Link>
      <Link href={`/content-manager/learning-content/lessons/${slug}`} className="rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-semibold text-[#002C3E]">Open editor</Link>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {!lesson && !error && <p className="rounded-xl bg-white p-5 text-sm text-[#637981]">Loading saved lesson preview...</p>}
    {lesson && <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">Preview of saved version {lesson.version} · {lesson.status === "published" ? "Published" : "Not published"}</div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-5">
          <header className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#14919B]">{lesson.course.title} / {lesson.chapter.title}</p>
            <h1 className="mt-3 text-3xl font-bold text-[#002C3E]">{lesson.title}</h1>
            <p className="mt-2 text-sm text-[#637981]">{lesson.estimated_duration_minutes} min · {lesson.is_ai_generated ? "AI generated" : "Manually written"}</p>
          </header>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#002C3E]">Lesson content</h2>
            <div className="whitespace-pre-wrap break-words text-[16px] leading-8 text-[#16485a]">{lesson.content || "No lesson content yet."}</div>
          </section>
          {lesson.code_example && <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-bold text-[#002C3E]">C# example</h2><pre className="overflow-x-auto rounded-xl bg-[#061d26] p-5 text-sm leading-7 text-[#d8e9e8]"><code>{lesson.code_example}</code></pre></section>}
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-bold text-[#002C3E]">Exercises</h2>{lesson.exercises.length ? <ol className="space-y-3">{lesson.exercises.map((item) => <li key={item.id} className="rounded-xl bg-[#f4f5f0] p-3 text-sm text-[#16485a]">{item.content}</li>)}</ol> : <p className="text-sm text-[#637981]">No exercises yet.</p>}</section>
        </article>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#002C3E]">Materials</h2><ul className="mt-4 space-y-2">{materials.map((item) => <li key={item.id}><button type="button" onClick={() => void openMaterial(item.id)} className="flex w-full items-center gap-2 rounded-xl border border-[#dfe6df] px-3 py-2 text-left text-sm text-[#16485a] hover:border-[#78BCC4]">{item.file_type === "Image" ? <FileImage className="h-4 w-4" /> : item.file_type === "Code Sample" ? <FileCode2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}<span className="min-w-0 flex-1 truncate">{item.title}</span><ExternalLink className="h-3.5 w-3.5" /></button></li>)}{!materials.length && <li className="text-sm text-[#637981]">No files attached.</li>}</ul></section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-bold text-[#002C3E]">Review history</h2><ol className="mt-4 space-y-3">{history.map((item) => <li key={item.id} className="border-l-2 border-[#78BCC4] pl-3 text-sm text-[#16485a]"><strong className="capitalize">{item.action}</strong> · v{item.version}<p className="text-xs text-[#637981]">{new Date(item.created_at).toLocaleString()} · {item.actor_email}</p>{item.reason && <p className="mt-1">{item.reason}</p>}</li>)}{!history.length && <li className="text-sm text-[#637981]">No decisions yet.</li>}</ol></section>
        </aside>
      </div>
    </>}
  </div>;
}

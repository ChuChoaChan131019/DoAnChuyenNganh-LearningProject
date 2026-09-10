"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, History, Pencil, Plus, Rocket, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiClientError, courseApi } from "@/lib/api";
import type { ContentStatus, CourseDetail } from "@/types/learning-content";

type Tab = "Overview" | "Chapters" | "Lessons" | "Resources" | "Questions" | "Tests" | "AI Tools" | "History";
const tabs: Tab[] = ["Overview", "Chapters", "Lessons", "Resources", "Questions", "Tests", "AI Tools", "History"];
const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "In review": "border-amber-200 bg-amber-50 text-amber-700",
};

const courseGradients = [
  "from-[#d9eef0] to-[#fbe8e4]",
  "from-[#d6eff0] to-[#e5f2ef]",
  "from-[#d8eee9] to-[#e5f2ed]",
  "from-[#fbe4d4] to-[#f7eee0]",
  "from-[#f6dfe0] to-[#e7f1ed]",
  "from-[#e2e9e7] to-[#f5e4df]",
];

const courseGradientBySlug: Record<string, string> = {
  "advanced-csharp": "from-[#d9eef0] to-[#fbe8e4]",
  "advanced-c-delegates-events-async": "from-[#d9eef0] to-[#fbe8e4]",
  "oop-in-csharp": "from-[#d6eff0] to-[#e5f2ef]",
  "csharp-interview-prep": "from-[#d8eee9] to-[#e5f2ed]",
  "exception-handling": "from-[#fbe4d4] to-[#f7eee0]",
  "csharp-fundamentals": "from-[#f6dfe0] to-[#e7f1ed]",
  "collections-and-linq": "from-[#e2e9e7] to-[#f5e4df]",
};

function getCourseGradient(course: CourseDetail) {
  if (courseGradientBySlug[course.slug]) return courseGradientBySlug[course.slug];
  const hash = String(course.id)
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return courseGradients[hash % courseGradients.length];
}

function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{status}</span>;
}

function EmptyTab({ title, description, action }: { title: string; description: string; action: string }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><BookOpen className="h-12 w-12 rounded-full bg-[#ffe0df] p-3 text-[#F7444E]" /><h2 className="mt-4 font-semibold text-[#002C3E]">{title}</h2><p className="mt-1 max-w-sm text-sm text-[#637981]">{description}</p><button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />{action}</button></div>;
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    courseApi.detail(slug).then((data) => { if (mounted) setCourse(data); }).catch((requestError) => { if (mounted) setError(requestError instanceof ApiClientError ? requestError.message : "Unable to load course."); }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [slug]);

  if (isLoading) return <p className="mx-auto max-w-[1240px] py-16 text-center text-sm text-[#637981]">Loading course...</p>;
  if (error || !course) return <div className="mx-auto max-w-[1240px] py-16 text-center"><p className="text-sm text-[#F7444E]">{error || "Course not found."}</p><Link href="/content-manager/learning-content/courses" className="mt-4 inline-flex text-sm font-semibold text-[#002C3E]">Back to courses</Link></div>;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <Link href="/content-manager/learning-content/courses" className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"><ArrowLeft className="h-4 w-4" />All courses</Link>
      <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]">
        <div className={`h-[148px] bg-gradient-to-br ${getCourseGradient(course)}`} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">{course.level}</span><StatusBadge status={course.status} /><span className="font-mono text-xs text-[#637981]">/{course.slug}</span></div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">{course.title}</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#637981]">{course.description || "No description yet."}</p></div><div className="flex items-center gap-2"><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] px-4 py-2 text-sm font-medium text-[#002C3E]"><Pencil className="h-4 w-4" />Edit</button><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] px-4 py-2 text-sm font-medium text-[#002C3E]"><Sparkles className="h-4 w-4" />AI tools</button><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"><Rocket className="h-4 w-4" />Publish</button></div></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#dfe6df] pt-5 sm:grid-cols-5">{[["Author", course.author], ["Created", course.created], ["Last updated", course.updated], ["Chapters", String(course.chapters)], ["Questions", String(course.questions)]].map(([label, value]) => <div key={label}><p className="text-xs text-[#637981]">{label}</p><p className="text-sm font-semibold text-[#002C3E]">{value}</p></div>)}</div>
        </div>
      </section>
      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-[#eef0e8] p-1">{tabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm ${activeTab === tab ? "bg-white font-medium text-[#002C3E] shadow-sm" : "text-[#637981]"}`}>{tab}</button>)}</nav>
      {activeTab === "Overview" && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]"><section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm"><div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">Content completeness</h2></div><div className="space-y-5 p-5"><div className="flex justify-between text-sm text-[#637981]"><span>Lessons written</span><span>{course.lessons > 0 ? "100%" : "0%"}</span></div><div className="flex justify-between text-sm text-[#637981]"><span>Questions linked</span><span>{course.questions > 0 ? "100%" : "0%"}</span></div><div className="flex justify-between text-sm text-[#637981]"><span>Chapters created</span><span>{course.chapters > 0 ? "100%" : "0%"}</span></div></div></section><section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm"><div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">At a glance</h2></div><div className="grid grid-cols-2 gap-4 p-5">{([ [course.chapters, "Chapters", BookOpen], [course.lessons, "Lessons", FileText], [course.questions, "Questions", CheckCircle2], [0, "Tests", History] ] as Array<[number, string, LucideIcon]>).map(([value, label, Icon]) => <div key={label} className="rounded-2xl bg-[#f3f5f0] p-4"><Icon className="h-4 w-4 text-[#F7444E]" /><p className="mt-2 text-2xl font-bold text-[#002C3E]">{value}</p><p className="text-xs text-[#637981]">{label}</p></div>)}</div></section></div>}
      {activeTab === "Chapters" && <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">Chapters</h2><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add chapter</button></div>{course.chapterList.length === 0 ? <p className="p-8 text-sm text-[#637981]">No chapters in this course yet.</p> : course.chapterList.map((chapter, index) => <div key={chapter.id} className="flex items-center gap-3 border-b border-[#dfe6df] px-5 py-4 last:border-0"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffe0df] font-mono text-xs text-[#F7444E]">{String(index + 1).padStart(2, "0")}</span><span className="flex-1 text-sm font-medium text-[#002C3E]">{chapter.title}</span><span className="text-xs text-[#637981]">{chapter.lessons} lessons</span><StatusBadge status={chapter.status} /></div>)}</section>}
      {activeTab === "Lessons" && <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-semibold text-[#002C3E]">All lessons</h2><p className="mt-1 text-sm text-[#637981]">{course.lessons ? `${course.lessons} lessons across every chapter of this course.` : "No lessons in this course yet."}</p></section>}
      {activeTab === "Resources" && <EmptyTab title="No resources yet" description="Attach files, videos and articles to make this course richer." action="Add resource" />}
      {activeTab === "Questions" && <EmptyTab title={course.questions ? `${course.questions} linked questions` : "No linked questions"} description="Questions linked to this course from the question bank." action="Open bank" />}
      {activeTab === "Tests" && <EmptyTab title="No tests yet" description="Create an assessment for learners in this course." action="Create test" />}
      {activeTab === "AI Tools" && <EmptyTab title="AI course tools" description="Use AI to draft lessons and generate questions for this course." action="Open tools" />}
      {activeTab === "History" && <EmptyTab title="No history yet" description="Course activity history will appear here." action="Back to overview" />}
    </div>
  );
}

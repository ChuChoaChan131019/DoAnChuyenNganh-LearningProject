"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download, ExternalLink } from "lucide-react";
import { materialApi, type Material } from "@/lib/api";
import { formatMaterialSize, MaterialIcon } from "@/components/content-manager/lesson-materials";

export default function LearnerLessonMaterials({ lessonId }: { lessonId: string }) {
  const [items, setItems] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    materialApi.learnerByLesson(lessonId).then((materials) => {
      if (active) setItems(materials);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load materials');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId]);

  async function open(id: string, download: boolean) {
    const tab = window.open('about:blank', '_blank');
    try {
      const { url } = await materialApi.learnerAccess(id, download);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (cause) {
      tab?.close();
      setError(cause instanceof Error ? cause.message : 'Unable to open material');
    }
  }

  return <details className="group rounded-[18px] border border-[#dfe6df] bg-white p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-slate-600 [&::-webkit-details-marker]:hidden">Lesson materials <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
    <div className="mt-3 space-y-2">
      {loading && <p className="text-xs text-slate-500">Loading…</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-xs text-slate-500">No materials for this lesson.</p>}
      {items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#f8f7f5] p-2.5">
        <span className="text-[#F7444E]"><MaterialIcon type={item.file_type} /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{item.title}</p><p className="text-[10px] text-slate-500">{item.file_type} · {formatMaterialSize(item.file_size)}</p></div>
        <button type="button" title="Open" aria-label={`Open ${item.title}`} onClick={() => void open(item.id, false)} className="rounded p-1 text-slate-500 hover:bg-white"><ExternalLink className="h-4 w-4" /></button>
        <button type="button" title="Download" aria-label={`Download ${item.title}`} onClick={() => void open(item.id, true)} className="rounded p-1 text-slate-500 hover:bg-white"><Download className="h-4 w-4" /></button>
      </div>)}
    </div>
  </details>;
}

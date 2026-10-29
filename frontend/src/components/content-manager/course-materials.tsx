"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { materialApi, type Material } from "@/lib/api";
import { formatMaterialSize, MaterialIcon } from "./lesson-materials";

export default function CourseMaterials({ courseId }: { courseId: string | number }) {
  const [items, setItems] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    materialApi.list().then((all) => { if (active) setItems(all.filter((item) => item.course_id === String(courseId))); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load materials'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId]);

  return <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
    <h2 className="font-semibold text-[#002C3E]">Lesson materials</h2>
    <p className="mt-1 text-sm text-[#637981]">Open a lesson to upload or manage its files.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    {loading ? <p className="mt-5 text-sm text-[#637981]">Loading…</p> : items.length === 0 ? <p className="mt-5 text-sm text-[#637981]">No files in this course yet.</p> :
      <ul className="mt-5 divide-y divide-[#dfe6df]">{items.map((item) => <li key={item.id}>
        <Link href={`/content-manager/learning-content/lessons/${item.lesson_id}`} className="flex items-center gap-3 py-3 hover:text-[#F7444E]">
          <span className="text-[#F7444E]"><MaterialIcon type={item.file_type} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="text-xs text-[#637981]">{item.lesson_title}</span></span>
          <span className="text-xs text-[#637981]">{formatMaterialSize(item.file_size)}</span>
        </Link>
      </li>)}</ul>}
  </section>;
}

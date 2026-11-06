'use client';

import Link from 'next/link';
import { ArrowRight, Code2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { codeExerciseApi } from '@/lib/api';
import type { CodeExerciseListItem } from '@/types/code-exercise';

export function LessonCodeExercises({ lessonId }: { lessonId: string }) {
  const [items, setItems] = useState<CodeExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    codeExerciseApi.list({ lesson_id: lessonId, limit: 20 })
      .then((response) => { if (active) setItems(response.items); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId]);

  if (!loading && !items.length) return null;
  return (
    <section className="rounded-[18px] border border-[#bcd9d6] bg-[#f4f8f6] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f3741] text-white"><Code2 className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#0f3741]">Thực hành C# cho bài học này</h2>
          <p className="mt-1 text-sm text-slate-600">Viết mã và hệ thống sẽ khôi phục phần bạn đã lưu khi quay lại.</p>
        </div>
      </div>
      {loading ? <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải bài thực hành...</div> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{items.map((item) => <Link key={item.id} href={`/learner/code-exercises/${item.id}`} className="group flex items-center justify-between gap-3 rounded-xl border border-[#d7e5e2] bg-white px-4 py-3 text-sm font-bold text-[#145a68] hover:border-[#78bcc4]"><span className="truncate">{item.title}</span><ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" /></Link>)}</div>}
    </section>
  );
}

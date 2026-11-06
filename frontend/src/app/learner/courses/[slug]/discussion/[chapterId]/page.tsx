'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { DiscussionSection } from '@/components/learner/discussion/discussion-section';
import { courseApi } from '@/lib/api';

export default function LearnerChapterDiscussionPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const chapterId = Array.isArray(params?.chapterId)
    ? params.chapterId[0]
    : params?.chapterId;
  const hasValidParams = Boolean(slug && chapterId);
  const [chapterTitle, setChapterTitle] = useState('Thảo luận chương');
  const [loading, setLoading] = useState(hasValidParams);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !chapterId) return;

    let active = true;
    courseApi.learnerLessons(slug)
      .then((response) => {
        if (!active) return;
        const chapter = response.chapters.find((item) => item.id === chapterId);
        if (!chapter) {
          setError('Không tìm thấy chương đã xuất bản.');
        } else {
          setChapterTitle(chapter.title);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải thông tin chương.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, chapterId]);

  if (!hasValidParams) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" role="alert">
        <p className="font-semibold">Đường dẫn chương không hợp lệ.</p>
        <Link href="/learner/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách khóa học
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500" role="status">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang tải chương…
      </div>
    );
  }

  if (error || !slug || !chapterId) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" role="alert">
        <p className="font-semibold">{error ?? 'Đường dẫn không hợp lệ.'}</p>
        <Link href={`/learner/courses/${slug ?? ''}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">
          <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 pb-10">
      <Link href={`/learner/courses/${slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Quay lại khóa học
      </Link>

      <DiscussionSection
        key={chapterId}
        chapterId={chapterId}
        title={`Thảo luận chương: ${chapterTitle}`}
        description="Tìm trong các bài đăng gắn trực tiếp với chương và các bài học thuộc chương này."
      />
    </div>
  );
}

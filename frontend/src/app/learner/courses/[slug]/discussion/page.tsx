'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { DiscussionSection } from '@/components/learner/discussion/discussion-section';
import { courseApi } from '@/lib/api';
import type { DiscussionChapterOption } from '@/types/discussion';

export default function LearnerCourseDiscussionPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const [course, setCourse] = useState<{ id: string; title: string } | null>(null);
  const [chapters, setChapters] = useState<DiscussionChapterOption[]>([]);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let active = true;
    courseApi.learnerLessons(slug)
      .then((response) => {
        if (!active) return;
        setCourse(response.course);
        setChapters(response.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          lessons: chapter.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
          })),
        })));
        setError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải thông tin khóa học.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (!slug) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" role="alert">
        <p className="font-semibold">Đường dẫn khóa học không hợp lệ.</p>
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
        Đang tải thảo luận khóa học…
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800" role="alert">
        <p className="font-semibold">{error ?? 'Không tìm thấy khóa học đã xuất bản.'}</p>
        <Link href={`/learner/courses/${slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">
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
        courseId={course.id}
        chapters={chapters}
        title={`Tất cả thảo luận: ${course.title}`}
        description="Xem, tìm kiếm và lọc bài đăng từ tất cả chương và bài học trong khóa học."
      />
    </div>
  );
}

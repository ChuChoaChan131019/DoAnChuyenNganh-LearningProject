'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Check, ChevronDown, FileText, Search } from 'lucide-react';
import { ApiClientError, courseApi } from '@/lib/api';
import type { Course } from '@/types/learning-content';

type SearchKind = 'all' | 'courses' | 'chapters' | 'lessons' | 'questions' | 'resources';

type LessonResult = {
  id: string;
  title: string;
  status: string;
  courseTitle: string;
  courseSlug: string;
  chapterTitle: string;
};

export function CourseLessonSearch({ learner = false }: { learner?: boolean }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<SearchKind>('all');
  const [level, setLevel] = useState('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<LessonResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const courseRequest = learner ? courseApi.learnerList() : courseApi.list();
    courseRequest
      .then(async (loadedCourses) => {
        const availableCourses = learner
          ? loadedCourses.filter((course) => isPublishedStatus(course.status))
          : loadedCourses;
        const lessonGroups = await Promise.all(availableCourses.map(async (course) => {
          const chapterGroups = learner
            ? (await courseApi.learnerLessons(course.slug)).chapters
            : await courseApi.chapters(String(course.id));

          return chapterGroups.flatMap((chapter) => chapter.lessons
            .filter((lesson) => !learner || isPublishedStatus(lesson.status))
            .map((lesson) => ({
              id: String(lesson.id),
              title: lesson.title,
              status: String(lesson.status),
              courseTitle: course.title,
              courseSlug: course.slug,
              chapterTitle: chapter.title,
            })));
        }));

        if (active) {
          setCourses(availableCourses);
          setLessons(lessonGroups.flat());
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to load searchable content.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [learner]);

  const visibleCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesQuery = !term || [course.title, course.description, course.slug]
        .some((value) => value?.toLowerCase().includes(term));
      const matchesLevel = level === 'all' || course.level.toLowerCase() === level;
      return matchesQuery && matchesLevel;
    });
  }, [courses, level, query]);

  const visibleLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    return lessons.filter((lesson) => !term || [lesson.title, lesson.courseTitle, lesson.chapterTitle]
      .some((value) => value.toLowerCase().includes(term)));
  }, [lessons, query]);

  const showCourses = kind === 'all' || kind === 'courses';
  const showChapters = kind === 'all' || kind === 'chapters';
  const showLessons = kind === 'all' || kind === 'lessons';
  const showQuestions = kind === 'all' || kind === 'questions';
  const showResources = kind === 'all' || kind === 'resources';
  const resultCount = (showCourses ? visibleCourses.length : 0) + (showLessons ? visibleLessons.length : 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#002c3e]">Search</h1>
        <p className="mt-2 text-sm text-slate-500">One search across courses, chapters, lessons, resources and questions.</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search courses or lessons</span>
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Try "polymorphism", "LINQ", "async"...'
            className="h-11 w-full rounded-xl border border-rose-300 px-10 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </label>
        <FilterDropdown
          value={kind}
          onChange={(value) => setKind(value as SearchKind)}
          options={[
            ['all', 'All content types'],
            ['courses', 'Courses'],
            ['chapters', 'Chapters'],
            ['lessons', 'Lessons'],
            ['questions', 'Questions'],
            ['resources', 'Resources'],
          ]}
        />
        <FilterDropdown
          value={level}
          onChange={setLevel}
          options={[
            ['all', 'Any level'],
            ['beginner', 'Beginner'],
            ['intermediate', 'Intermediate'],
            ['advanced', 'Advanced'],
          ]}
        />
      </section>

      {loading && <p className="text-sm text-slate-500">Loading content...</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!loading && !error && resultCount === 0 && !showChapters && !showQuestions && !showResources && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No courses or lessons match your search.</div>}

      {!loading && !error && (resultCount > 0 || showChapters || showQuestions || showResources) && (
        <div className="space-y-6">
          {showCourses && <ResultSection title={`Courses · ${visibleCourses.length}`} emptyMessage="No courses match your search.">
            {visibleCourses.map((course) => <Link key={course.id} href={learner ? `/learner/courses/${course.slug}` : `/content-manager/learning-content/courses/${course.slug}`} className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50">
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-700"><BookOpen className="h-4 w-4 shrink-0 text-[#f7444e]" /><span className="truncate">{course.title}</span></span>
              {!learner && <StatusBadge status={course.status} />}
            </Link>)}
          </ResultSection>}
          {showChapters && <ResultSection title="Chapters" emptyMessage="No chapters available yet." />}
          {showLessons && <ResultSection title={`Lessons · ${visibleLessons.length}`} emptyMessage="No lessons match your search.">
            {visibleLessons.map((lesson) => <Link key={lesson.id} href={learner ? `/learner/courses/${lesson.courseSlug}/lessons/${lesson.id}` : `/content-manager/learning-content/lessons/${lesson.id}`} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50">
              <FileText className="h-4 w-4 shrink-0 text-[#78bcc4]" />
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-700"><span className="block truncate">{lesson.title}</span><span className="mt-1 block truncate text-xs font-normal text-slate-400">{lesson.courseTitle} · {lesson.chapterTitle}</span></span>
              {!learner && <StatusBadge status={lesson.status} />}
            </Link>)}
          </ResultSection>}
          {showQuestions && <ResultSection title="Questions" emptyMessage="No questions available yet." />}
          {showResources && <ResultSection title="Resources" emptyMessage="No resources available yet." />}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, emptyMessage, children }: { title: string; emptyMessage?: string; children?: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm"><h2 className="border-b border-[#dfe6df] px-6 py-5 text-sm font-bold text-slate-800">{title}</h2><div className="divide-y divide-[#dfe6df]">{children || <p className="px-6 py-4 text-sm text-slate-400">{emptyMessage}</p>}</div></section>;
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.replace('_', ' ').toLowerCase();
  const label = normalizedStatus.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const styles = normalizedStatus === 'published'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : normalizedStatus === 'approved'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : normalizedStatus === 'in review'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-100 text-slate-600';

  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}>{label}</span>;
}

function isPublishedStatus(status: string) {
  return status.toLowerCase().replace('_', ' ') === 'published';
}

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] ?? options[0][1];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto sm:min-w-[160px]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between gap-4 rounded-xl border bg-white px-3.5 text-sm text-slate-700 shadow-sm outline-none transition ${isOpen ? 'border-[#f7444e] ring-2 ring-[#f7444e]/10' : 'border-slate-200 hover:border-[#78bcc4]'}`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-full min-w-[190px] overflow-hidden rounded-2xl border border-[#dfe6df] bg-white p-1.5 shadow-[0_8px_20px_rgba(0,44,62,0.14)]" role="listbox">
          {options.map(([optionValue, optionLabel]) => {
            const isSelected = optionValue === value;
            return (
              <button
                key={optionValue}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(optionValue);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${isSelected ? 'bg-[#c8eff3] text-[#002c3e]' : 'text-[#163e4b] hover:bg-[#f3fbfb]'}`}
              >
                <span>{optionLabel}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

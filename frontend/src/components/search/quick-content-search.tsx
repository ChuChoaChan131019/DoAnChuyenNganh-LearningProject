'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Loader2, Search } from 'lucide-react';
import { ApiClientError, courseApi } from '@/lib/api';
import type { Course } from '@/types/learning-content';

type QuickResult = {
  kind: 'course' | 'lesson';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

type QuickContentSearchProps = {
  learner?: boolean;
};

export function QuickContentSearch({ learner = false }: QuickContentSearchProps) {
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [results, setResults] = useState<QuickResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadCourses = learner ? courseApi.learnerList() : courseApi.list();
    loadCourses
      .then((loadedCourses) => {
        if (active) {
          setCourses(learner
            ? loadedCourses.filter((course) => isPublishedStatus(course.status))
            : loadedCourses);
          setError('');
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to load searchable content.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [learner]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return;

    let active = true;
    const matchingCourses = courses.filter((course) =>
      [course.title, course.description, course.slug].some((value) => value?.toLowerCase().includes(term)),
    );

    Promise.all(courses.map(async (course) => {
      const chapterGroups = learner
        ? (await courseApi.learnerLessons(course.slug)).chapters
        : await courseApi.chapters(String(course.id));

      return chapterGroups.flatMap((chapter) => chapter.lessons
        .filter((lesson) => (!learner || isPublishedStatus(lesson.status)) && [lesson.title, chapter.title].some((value) => value.toLowerCase().includes(term)))
        .map((lesson) => ({
          kind: 'lesson' as const,
          id: String(lesson.id),
          title: lesson.title,
          subtitle: `${course.title} · ${chapter.title}`,
          href: learner
            ? `/learner/courses/${course.slug}/lessons/${lesson.id}`
            : `/content-manager/learning-content/lessons/${lesson.id}`,
        })));
    })).then((lessonGroups) => {
      if (!active) return;
      setError('');
      const courseResults = matchingCourses.map((course) => ({
        kind: 'course' as const,
        id: String(course.id),
        title: course.title,
        href: learner
          ? `/learner/courses/${course.slug}`
          : `/content-manager/learning-content/courses/${course.slug}`,
      }));
      setResults([...courseResults, ...lessonGroups.flat()].slice(0, 8));
    }).catch((requestError: unknown) => {
      if (active) {
        setResults([]);
        setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to search lessons.');
      }
    });

    return () => {
      active = false;
    };
  }, [courses, learner, query]);

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search courses or lessons..."
        aria-label="Search courses or lessons"
        className="h-10 w-full rounded-xl border border-gray-200 bg-[#78BCC4]/10 pl-9 pr-10 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-teal-600 focus:bg-white focus:outline-none"
      />
      {isLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          {error && <p className="px-3 py-2 text-xs text-rose-500">{error}</p>}
          {!error && !isLoading && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No courses or lessons found.</p>}
          {results.map((result) => {
            const Icon = result.kind === 'course' ? BookOpen : FileText;
            return (
              <Link key={`${result.kind}-${result.id}`} href={result.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#eaf4f3]">
                <Icon className="h-4 w-4 shrink-0 text-[#F7444E]" />
                <span className="min-w-0 text-sm text-[#002C3E]">
                  <span className="block truncate font-medium">{result.title}</span>
                  {result.subtitle && <span className="block truncate text-xs text-[#637981]">{result.subtitle}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isPublishedStatus(status: string) {
  return status.toLowerCase().replace('_', ' ') === 'published';
}

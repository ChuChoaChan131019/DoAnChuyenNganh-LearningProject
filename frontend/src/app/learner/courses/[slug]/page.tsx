'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, FileText } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { courseApi, quizApi } from '@/lib/api';

const COURSE_MAP: Record<string, any> = {
  'csharp-fundamentals': {
    id: 1,
    slug: 'csharp-fundamentals',
    title: 'C# Fundamentals',
    level: 'Beginner',
    description:
      'Start from zero: install the .NET SDK, write your first program, and master variables, data types, operators and control flow.',
    lastUpdated: 'Updated 2026-08-02',
    lessons: 24,
    questions: 148,
    hours: 5,
    gradient: 'from-[#f8d9d8] via-[#f7e6e1] to-[#edf1ee]',
    chapters: [
      {
        title: 'Introduction to C#',
        description: 'What C# is, the .NET platform, tooling and your first program.',
        lessons: [
          { id: 'what-is-csharp', title: 'What is C#?', duration: '8 min', completed: true },
          { id: 'installing-dotnet', title: 'Installing .NET', duration: '10 min', completed: true },
          { id: 'your-first-csharp-program', title: 'Your First C# Program', duration: '12 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Variables and Data Types',
        description: 'Value types, reference types, conversion and constants.',
        lessons: [
          { id: 'variables-overview', title: 'Variables Overview & Syntax', duration: '11 min', completed: true },
          { id: 'primitive-data-types', title: 'Primitive Data Types', duration: '14 min', completed: true },
          { id: 'type-conversion', title: 'Type Conversion & Casting', duration: '9 min', completed: true },
          { id: 'nullable-types', title: 'Nullable Value Types in C#', duration: '12 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Control Flow',
        description: 'Branching and looping constructs used every day.',
        lessons: [
          { id: 'if-else-switch', title: 'if / else and switch', duration: '13 min', completed: true },
          { id: 'loops', title: 'for, while and foreach', duration: '15 min', completed: true },
          { id: 'break-continue', title: 'break, continue and goto', duration: '7 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Methods',
        description: 'Reusability, parameters, return values and clean design.',
        lessons: [
          { id: 'what-are-methods', title: 'What are methods?', duration: '8 min', completed: false },
          { id: 'parameters-and-returns', title: 'Parameters and return values', duration: '12 min', completed: false },
          { id: 'method-overloads', title: 'Method overloads', duration: '10 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'C# Language Cheat Sheet', type: 'PDF · 1.2 MB' },
      { name: 'Installing the .NET SDK (walkthrough)', type: 'Video · 84 MB' },
    ],
    tests: [
      {
        id: 'final-assessment',
        title: 'C# Fundamentals — Final Assessment',
        description: '6 questions in this attempt',
        duration: '60 minutes, timed',
        difficulty: 'Medium',
        questions: 6,
      },
      {
        id: 'variables-quiz',
        title: 'Variables & Data Types Quiz',
        description: '15 questions in this attempt',
        duration: '20 minutes, timed',
        difficulty: 'Easy',
        questions: 15,
      },
    ],
  },
  'object-oriented-programming-in-csharp': {
    id: 2,
    slug: 'object-oriented-programming-in-csharp',
    title: 'Object-Oriented Programming in C#',
    level: 'Intermediate',
    description:
      'Model real problems with classes and objects. Learn encapsulation, inheritance, polymorphism, and design clean solutions.',
    lastUpdated: 'Updated 2026-08-11',
    lessons: 31,
    questions: 206,
    hours: 6,
    gradient: 'from-[#dfeef7] via-[#edf3f7] to-[#edf7f2]',
    chapters: [
      {
        title: 'Classes and Objects',
        description: 'Model real-world entities using classes and instances.',
        lessons: [
          { id: 'classes-and-objects', title: 'Classes and Objects', duration: '9 min', completed: true },
          { id: 'constructors', title: 'Constructors', duration: '11 min', completed: true },
          { id: 'properties', title: 'Properties', duration: '8 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Encapsulation',
        description: 'Protect data and expose safe, intentional APIs.',
        lessons: [
          { id: 'access-modifiers', title: 'Access modifiers', duration: '12 min', completed: true },
          { id: 'fields-and-methods', title: 'Fields and methods', duration: '10 min', completed: true },
          { id: 'readonly-and-static', title: 'Readonly and static', duration: '9 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Inheritance',
        description: 'Reuse behavior through hierarchies and base classes.',
        lessons: [
          { id: 'base-classes', title: 'Base classes', duration: '14 min', completed: false },
          { id: 'derived-classes', title: 'Derived classes', duration: '12 min', completed: false },
          { id: 'virtual-methods', title: 'Virtual methods', duration: '11 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Polymorphism',
        description: 'Design flexible code with overriding and interfaces.',
        lessons: [
          { id: 'method-overriding', title: 'Method overriding', duration: '18 min', completed: false },
          { id: 'interfaces', title: 'Interfaces', duration: '15 min', completed: false },
          { id: 'abstract-classes', title: 'Abstract classes', duration: '13 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'OOP Practice Sheet', type: 'PDF · 2.1 MB' },
      { name: 'Class Design Checklist', type: 'Document · 68 KB' },
    ],
    tests: [
      {
        id: 'oop-quick-check',
        title: 'OOP Quick Check',
        description: '5 questions in this attempt',
        duration: '25 minutes, timed',
        difficulty: 'Medium',
        questions: 5,
      },
    ],
  },
};

export default function LearnerCourseDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const [databaseCourse, setDatabaseCourse] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);
  const [databaseChapters, setDatabaseChapters] = useState<Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; duration: number }>;
  }> | null>(null);
  const [databaseQuizzes, setDatabaseQuizzes] = useState<Array<{
    id: string;
    title: string;
    description?: string | null;
    duration_minutes: number | null;
    total_questions: number;
    quiz_type: string;
  }> | null>(null);

  useEffect(() => {
    if (!slug) return;

    courseApi.learnerLessons(slug)
      .then((response) => {
        setDatabaseCourse(response.course);
        setDatabaseChapters(response.chapters);
        return quizApi.list({ course_id: response.course.id, status: 'published' });
      })
      .then((quizzes) => {
        setDatabaseQuizzes(quizzes.map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          duration_minutes: quiz.duration_minutes,
          total_questions: quiz.total_questions,
          quiz_type: quiz.quiz_type,
        })));
      })
      .catch(() => {
        setDatabaseCourse(null);
        setDatabaseChapters(null);
        setDatabaseQuizzes(null);
      });
  }, [slug]);

  const fallbackCourse = slug ? COURSE_MAP[slug] : null;
  const baseCourse = fallbackCourse ?? (databaseCourse ? {
    id: databaseCourse.id,
    slug: databaseCourse.slug,
    title: databaseCourse.title,
    level: 'Beginner',
    description: 'Learning content loaded from Supabase.',
    lastUpdated: 'Updated today',
    lessons: 0,
    questions: 0,
    hours: 0,
    chapters: [],
    instructor: 'Learning team',
    instructorRole: 'Course instructor',
    resources: [],
    tests: [],
  } : null);
  const course = baseCourse && databaseChapters
    ? {
        ...baseCourse,
        lessons: databaseChapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0),
        chapters: databaseChapters.map((chapter) => {
          const fallbackChapter = baseCourse.chapters.find(
            (item: any) => item.title === chapter.title,
          );

          return {
            title: chapter.title,
            description: fallbackChapter?.description ?? '',
            completed: false,
            lessons: chapter.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              duration: `${lesson.duration} min`,
              completed: false,
            })),
          };
        }),
      }
    : fallbackCourse;
  const tests = databaseQuizzes ?? course?.tests ?? [];

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Course not found</h1>
        <p className="mt-2 text-slate-500">This learning path does not exist yet.</p>
        <Link
          href="/learner/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  const completedLessonCount = course.chapters.reduce(
    (sum: number, chapter: any) =>
      sum + (chapter.lessons?.filter((lesson: any) => lesson.completed).length || 0),
    0
  );
  const totalLessonCount = course.chapters.reduce(
    (sum: number, chapter: any) => sum + (chapter.lessons?.length || 0),
    0
  );
  const progressPercent = totalLessonCount
    ? Math.round((completedLessonCount / totalLessonCount) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-[1240px] pb-10">
      <Link
        href="/learner/courses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All courses
      </Link>

      <div className="space-y-5">
        {/* Banner Top */}
        <div className="overflow-hidden rounded-[18px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="relative h-[190px] bg-[#f3dfe0]">
            <div className="absolute inset-0 bg-[#f3dfe0]" />
            <div className="absolute bottom-4 right-5 flex h-[72px] w-[72px] items-center justify-center rounded-[12px] border border-slate-200 bg-white/70 shadow-sm">
              <BookOpen className="h-9 w-9 text-slate-400" />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#f7d0d0] bg-[#fbe7e9] px-2.5 py-1 text-[11px] font-bold text-[#f7444e]">
                {course.level}
              </span>
              <span className="text-[13px] text-[#5d6b73]">
                Updated {course.lastUpdated.split('Updated ')[1]}
              </span>
            </div>

            <h1 className="mt-4 text-[38px] font-black leading-[1.05] tracking-[-0.06em] text-[#0f3741]">
              {course.title}
            </h1>

            <p className="mt-3 max-w-[980px] text-[18px] leading-8 text-slate-600">
              {course.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span>{course.lessons} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span>{course.questions} practice questions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <Clock3 className="h-3.5 w-3.5" />
                </span>
                <span>~{course.hours} hours</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e1e6e3] pt-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f4d0d0]">
                <div
                  className="h-full rounded-full bg-[#f7444e]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="min-w-[44px] text-right text-[18px] font-bold text-slate-700">
                {progressPercent}%
              </span>
              <Link
                href="/learner/practice"
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#f4b7b7] bg-[#fff3f2] px-4 py-3 text-sm font-bold text-[#f7444e] transition hover:bg-[#ffe9e7]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Practice questions
              </Link>
            </div>
          </div>
        </div>

        {/* 2 Cột: Curriculum & Side panels */}
        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-bold tracking-tight text-slate-800">Curriculum</h2>
              <div className="text-sm text-slate-500">
                {course.chapters.length} chapters • {course.lessons} lessons
              </div>
            </div>

            <div className="space-y-4">
              {course.chapters.map((chapter: any, index: number) => (
                <div
                  key={chapter.title}
                  className="overflow-hidden rounded-[16px] border border-slate-200 bg-[#fafafa]"
                >
                  <div className="flex items-start justify-between gap-4 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef5f5] text-sm font-bold text-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-[20px] font-semibold tracking-[-0.02em] text-slate-800">
                          {chapter.title}
                        </div>
                        <div className="mt-1 text-[14px] text-slate-500">
                          {chapter.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {chapter.completed ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#dff5ea] text-[#2b9e6a]">
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f2f5f4] text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400" />
                        </span>
                      )}
                      <span className="text-[14px] text-slate-400">
                        {chapter.lessons?.reduce(
                          (sum: number, lesson: any) =>
                            sum + Number.parseInt(lesson.duration, 10) || 0,
                          0
                        ) || 0}{' '}
                        min
                      </span>
                    </div>
                  </div>

                  {/* DANH SÁCH BÀI HỌC — ĐỒNG BỘ ĐƯỜNG DẪN VỚI THƯ MỤC LESSON */}
                  <div className="border-t border-slate-200 bg-white">
                    {chapter.lessons?.map((lesson: any, lessonIndex: number) => {
                      const lessonSlug =
                        lesson.id ||
                        lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                      return (
                        <Link
                          key={`${chapter.title}-${lesson.title}`}
                          href={`/learner/courses/${slug}/lessons/${lessonSlug}`}
                          className={`group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-rose-50/50 ${
                            lessonIndex !== 0 ? 'border-t border-slate-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                                lesson.completed
                                  ? 'bg-[#dff5ea] text-[#2b9e6a]'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[16px] font-medium text-slate-700 transition group-hover:font-semibold group-hover:text-[#f7444e]">
                              {lesson.title}
                            </span>
                          </div>
                          <span className="text-[14px] font-medium text-slate-400 group-hover:text-slate-600">
                            {lesson.duration}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Instructor, Tests, Resources */}
          <div className="space-y-5">
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800">Instructor</h3>
              <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeff5] text-base font-bold text-slate-700">
                  DL
                </div>
                <div>
                  <div className="text-[15px] font-bold text-slate-800">{course.instructor}</div>
                  <div className="text-xs text-slate-500">{course.instructorRole}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[22px] font-bold tracking-tight text-slate-800">Tests</h3>
                <span className="text-sm text-slate-500">{course.questions} available</span>
              </div>

              <div className="space-y-3">
                {tests.map((test: any) => (
                  <div
                    key={test.id}
                    className="rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-3"
                  >
                    <div className="text-[15px] font-semibold text-slate-800">{test.title}</div>
                    <div className="mt-1 text-[13px] text-slate-500">
                      {test.description || `${test.total_questions} questions`} • {test.duration || (test.duration_minutes === null ? 'Unlimited time' : `${test.duration_minutes} minutes`)}{test.difficulty ? ` • ${test.difficulty}` : ''}
                    </div>
                    <Link
                      href={`/learner/courses/${slug}/tests/${test.id}`}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] bg-[#F7444E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e33b3b]"
                    >
                      Start test
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800">Resources</h3>
              <div className="mt-4 space-y-3">
                {course.resources.map((resource: any) => (
                  <div
                    key={resource.name}
                    className="flex items-center gap-3 rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-slate-800">
                        {resource.name}
                      </div>
                      <div className="text-xs text-slate-500">{resource.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
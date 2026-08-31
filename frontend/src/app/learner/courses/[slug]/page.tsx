'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Layers,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Sparkles,
  Download,
} from 'lucide-react';


const STYLES = {
  container: 'mx-auto max-w-[1216px] space-y-6',

  // Navigation Link
  backLink:
    'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900',

  // Common Card Box
  card: 'rounded-[16px] border border-[#dfe6df] bg-[#FFFAFC]/50 shadow-[0_8px_18px_rgba(0,44,62,0.04)]',

  // Hero Card Styles
  heroGradient: (gradient: string) =>
    `relative h-32 bg-gradient-to-r ${gradient} p-6`,
  heroWatermark:
    'absolute -bottom-6 right-6 h-32 w-32 text-slate-400/20 stroke-[1.25]',
  heroLevelBadge: (colorClass: string) =>
    `inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${colorClass}`,
  heroTitle: 'text-2xl font-bold tracking-tight text-[#0f3741] sm:text-3xl',
  heroDescription: 'mt-2 text-sm leading-relaxed text-slate-600 max-w-4xl',
  heroProgressTrack: 'h-2 flex-1 overflow-hidden rounded-full bg-rose-100/60',
  heroProgressBar:
    'h-full bg-[#f7444e] rounded-full transition-all duration-500',
  primaryBtn:
    'inline-flex items-center justify-center rounded-full bg-[#f7444e] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-600 active:scale-[0.98]',

  // Main Grid Layout
  mainGrid: 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start',

  // Curriculum Left Column
  curriculumHeader: 'border-b border-[#dfe6df] px-6 py-4',
  chapterToggleBtn:
    'w-full flex items-start justify-between p-5 text-left transition hover:bg-slate-50/70',
  chapterIndexCircle:
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 mt-0.5',
  lessonContainer: 'bg-slate-50/30 px-5 pb-3',
  lessonList: 'space-y-1 rounded-xl bg-[#FFFAFC]/50 p-1 border border-slate-100',
  lessonItem:
    'group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50',
  aiTag:
    'inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200/50',

  // Sidebar Right Column
  sidebarSectionTitle: 'text-sm font-bold text-[#0f3741]',
  instructorAvatar:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800',
  testItemCard: 'rounded-xl border border-slate-100 bg-[#FFFAFC]/50 p-3.5 shadow-xs',
  resourceItemCard:
    'group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:border-slate-200 hover:bg-slate-50',
};

// ============================================================================
// DYNAMIC MOCK DATABASE (Khóa học và Chương trình theo Slug)
// ============================================================================
interface LessonItem {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isAiGenerated?: boolean;
}

interface ChapterItem {
  id: number;
  title: string;
  summary: string;
  lessons: LessonItem[];
}

interface CourseDetail {
  slug: string;
  title: string;
  description: string;
  level: string;
  levelColor: string;
  updatedDate: string;
  totalLessons: number;
  totalQuestions: number;
  estimatedHours: number;
  progress: number;
  gradient: string;
  instructor: {
    name: string;
    initials: string;
    role: string;
  };
  chapters: ChapterItem[];
  tests: {
    id: string;
    title: string;
    questionsCount: number;
    durationMinutes: number;
    avgScore: number;
  }[];
  resources: {
    id: string;
    title: string;
    type: 'PDF' | 'Video' | 'Article';
    size: string;
    url: string;
  }[];
}

const COURSES_DATABASE: Record<string, CourseDetail> = {
  'csharp-fundamentals': {
    slug: 'csharp-fundamentals',
    title: 'C# Fundamentals',
    description:
      'Start from zero: install the .NET SDK, write your first program, and master variables, data types, operators and control flow.',
    level: 'Beginner',
    levelColor: 'bg-rose-100/50 text-rose-500',
    updatedDate: '2026-08-02',
    totalLessons: 24,
    totalQuestions: 148,
    estimatedHours: 5,
    progress: 100,
    gradient: 'from-rose-100/80 to-teal-50/80',
    instructor: {
      name: 'Dr. Lan Nguyen',
      initials: 'DL',
      role: 'Content author · C# instructor',
    },
    chapters: [
      {
        id: 1,
        title: 'Introduction to C#',
        summary: 'What C# is, the .NET platform, tooling and your first program.',
        lessons: [
          { id: 'l-1', title: 'What is C#?', duration: '8 min', isCompleted: true },
          { id: 'l-2', title: 'Installing .NET', duration: '10 min', isCompleted: true },
          { id: 'l-3', title: 'Your First C# Program', duration: '12 min', isCompleted: true },
        ],
      },
      {
        id: 2,
        title: 'Variables and Data Types',
        summary: 'Value types, reference types, conversion and constants.',
        lessons: [
          { id: 'l-4', title: 'Variables', duration: '11 min', isCompleted: true },
          { id: 'l-5', title: 'Data Types', duration: '14 min', isCompleted: true },
          { id: 'l-6', title: 'Type Conversion', duration: '9 min', isCompleted: true, isAiGenerated: true },
        ],
      },
      {
        id: 3,
        title: 'Control Flow',
        summary: 'Branching and looping constructs used every day.',
        lessons: [
          { id: 'l-7', title: 'if / else and switch', duration: '13 min', isCompleted: true },
          { id: 'l-8', title: 'for, while and foreach', duration: '15 min', isCompleted: true, isAiGenerated: true },
          { id: 'l-9', title: 'break, continue and goto', duration: '7 min', isCompleted: true },
        ],
      },
      {
        id: 4,
        title: 'Methods',
        summary: 'Parameters, return values, overloading and expression bodies.',
        lessons: [
          { id: 'l-10', title: 'Declaring Methods', duration: '12 min', isCompleted: true },
          { id: 'l-11', title: 'Parameters: ref, out, params', duration: '16 min', isCompleted: true, isAiGenerated: true },
        ],
      },
    ],
    tests: [
      { id: 't-1', title: 'C# Fundamentals — Final Assessment', questionsCount: 40, durationMinutes: 60, avgScore: 78 },
      { id: 't-2', title: 'Variables & Data Types Quiz', questionsCount: 15, durationMinutes: 20, avgScore: 86 },
    ],
    resources: [
      { id: 'r-1', title: 'C# Language Cheat Sheet', type: 'PDF', size: '1.2 MB', url: '#' },
      { id: 'r-2', title: 'Installing the .NET SDK (walkthrough)', type: 'Video', size: '84 MB', url: '#' },
    ],
  },
  'oop-in-csharp': {
    slug: 'oop-in-csharp',
    title: 'Object-Oriented Programming in C#',
    description:
      'Model real problems with classes and objects. Encapsulation, inheritance, polymorphism, abstract classes and interfaces.',
    level: 'Intermediate',
    levelColor: 'bg-sky-100/50 text-sky-500',
    updatedDate: '2026-08-10',
    totalLessons: 31,
    totalQuestions: 206,
    estimatedHours: 6,
    progress: 62,
    gradient: 'from-sky-100/80 to-teal-50/80',
    instructor: {
      name: 'Prof. Minh Tran',
      initials: 'MT',
      role: 'Software Architect · Senior Lecturer',
    },
    chapters: [
      {
        id: 1,
        title: 'Classes and Objects',
        summary: 'Constructors, fields, properties, and the this keyword.',
        lessons: [
          { id: 'l-201', title: 'Class Syntax & Instantiation', duration: '10 min', isCompleted: true },
          { id: 'l-202', title: 'Auto-Properties and Backing Fields', duration: '12 min', isCompleted: true },
        ],
      },
      {
        id: 2,
        title: 'The 4 Pillars of OOP',
        summary: 'Encapsulation, Inheritance, Polymorphism, and Abstraction in depth.',
        lessons: [
          { id: 'l-203', title: 'Encapsulation & Access Modifiers', duration: '15 min', isCompleted: true },
          { id: 'l-204', title: 'Inheritance & base keyword', duration: '18 min', isCompleted: false },
          { id: 'l-205', title: 'Polymorphism & Virtual Methods', duration: '20 min', isCompleted: false, isAiGenerated: true },
        ],
      },
    ],
    tests: [
      { id: 't-3', title: 'OOP Pillars Checkpoint', questionsCount: 25, durationMinutes: 35, avgScore: 71 },
      { id: 't-4', title: 'Inheritance & Polymorphism Deep Dive', questionsCount: 30, durationMinutes: 45, avgScore: 0 },
    ],
    resources: [
      { id: 'r-3', title: 'OOP Design Patterns in C# Guide', type: 'PDF', size: '3.4 MB', url: '#' },
    ],
  },
  'collections-and-linq': {
    slug: 'collections-and-linq',
    title: 'Collections and LINQ',
    description:
      'Work with arrays, List<T>, Dictionary<K,V>, generics and query data elegantly using LINQ.',
    level: 'Intermediate',
    levelColor: 'bg-sky-100/50 text-sky-500',
    updatedDate: '2026-07-28',
    totalLessons: 18,
    totalQuestions: 96,
    estimatedHours: 4,
    progress: 28,
    gradient: 'from-sky-100/80 to-rose-50/80',
    instructor: {
      name: 'Dr. Lan Nguyen',
      initials: 'DL',
      role: 'Content author · C# instructor',
    },
    chapters: [
      {
        id: 1,
        title: 'Generic Collections',
        summary: 'List<T>, Dictionary<TKey, TValue>, HashSet<T> and Queue/Stack.',
        lessons: [
          { id: 'l-301', title: 'Arrays vs Generic Lists', duration: '10 min', isCompleted: true },
          { id: 'l-302', title: 'Hash-based Collections', duration: '14 min', isCompleted: false },
        ],
      },
      {
        id: 2,
        title: 'LINQ Query Expressions & Method Syntax',
        summary: 'Filtering, projections, joins, grouping and aggregations.',
        lessons: [
          { id: 'l-303', title: 'Select, Where and OrderBy', duration: '16 min', isCompleted: false, isAiGenerated: true },
          { id: 'l-304', title: 'GroupBy and Complex Joins', duration: '22 min', isCompleted: false },
        ],
      },
    ],
    tests: [
      { id: 't-5', title: 'LINQ Practice Set', questionsCount: 20, durationMinutes: 25, avgScore: 74 },
    ],
    resources: [
      { id: 'r-4', title: 'LINQ 101 Standard Operators Reference', type: 'PDF', size: '2.1 MB', url: '#' },
    ],
  },
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function DynamicCourseDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : (params?.slug as string);

  // Lấy dữ liệu khóa học tương ứng hoặc fallback về khóa học đầu tiên nếu slug chưa có
  const course = useMemo(() => {
    return COURSES_DATABASE[slug] || COURSES_DATABASE['csharp-fundamentals'];
  }, [slug]);

  // Quản lý trạng thái mở/đóng từng chapter
  const [openChapters, setOpenChapters] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
  });

  const toggleChapter = (id: number) => {
    setOpenChapters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalLessonsInCurriculum = course.chapters.reduce(
    (acc, chap) => acc + chap.lessons.length,
    0
  );

  return (
    <div className={STYLES.container}>
      {/* 1. Back Link */}
      <div>
        <Link href="/learner/courses" className={STYLES.backLink}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All courses</span>
        </Link>
      </div>

      {/* 2. Hero Header Banner */}
      <div className={`overflow-hidden ${STYLES.card}`}>
        <div className={STYLES.heroGradient(course.gradient)}>
          <BookOpen aria-hidden="true" className={STYLES.heroWatermark} />
        </div>

        <div className="p-6 pt-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={STYLES.heroLevelBadge(course.levelColor)}>
              {course.level}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Updated {course.updatedDate}
            </span>
          </div>

          <div className="mt-3">
            <h1 className={STYLES.heroTitle}>{course.title}</h1>
            <p className={STYLES.heroDescription}>{course.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span>{course.totalLessons} lessons</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span>{course.totalQuestions} practice questions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>≈ {course.estimatedHours} hours</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex-1 max-w-lg flex items-center gap-3">
              <div className={STYLES.heroProgressTrack}>
                <div
                  className={STYLES.heroProgressBar}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {course.progress}%
              </span>
            </div>

            <Link
              href={`/learner/practice?course=${encodeURIComponent(
                course.title
              )}`}
              className={STYLES.primaryBtn}
            >
              Practice questions
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className={STYLES.mainGrid}>
        {/* ==================================================== */}
        {/* LEFT COLUMN: CURRICULUM */}
        {/* ==================================================== */}
        <div className={`lg:col-span-2 overflow-hidden ${STYLES.card}`}>
          <div className={STYLES.curriculumHeader}>
            <h2 className="text-base font-bold text-[#0f3741]">Curriculum</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {course.chapters.length} chapters · {totalLessonsInCurriculum}{' '}
              lessons available now
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {course.chapters.map((chapter) => {
              const isOpen = openChapters[chapter.id];
              return (
                <div key={chapter.id} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter.id)}
                    className={STYLES.chapterToggleBtn}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className={STYLES.chapterIndexCircle}>
                        {chapter.id}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#0f3741]">
                          {chapter.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {chapter.summary}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-slate-400">
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className={STYLES.lessonContainer}>
                      <div className={STYLES.lessonList}>
                        {chapter.lessons.map((lesson) => (
                          <Link
                            key={lesson.id}
                            href={`/learner/courses/${course.slug}/lessons/${lesson.id}`}
                            className={STYLES.lessonItem}
                          >
                            <div className="flex items-center gap-3">
                              {lesson.isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                              )}
                              <span className="text-xs font-medium text-slate-800 group-hover:text-[#f7444e] transition-colors">
                                {lesson.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {lesson.isAiGenerated && (
                                <span className={STYLES.aiTag}>
                                  <Sparkles className="h-2.5 w-2.5 text-teal-600" />
                                  AI generated
                                </span>
                              )}
                              <span className="text-[11px] font-medium text-slate-400">
                                {lesson.duration}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: SIDEBAR PANELS */}
        {/* ==================================================== */}
        <div className="space-y-6">
          {/* Instructor */}
          <div className={`p-5 ${STYLES.card}`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Instructor
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <div className={STYLES.instructorAvatar}>
                {course.instructor.initials}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {course.instructor.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {course.instructor.role}
                </p>
              </div>
            </div>
          </div>

          {/* Tests */}
          <div className={`p-5 ${STYLES.card}`}>
            <div className="flex items-center justify-between">
              <h2 className={STYLES.sidebarSectionTitle}>Tests</h2>
              <span className="text-xs text-slate-400 font-medium">
                {course.tests.length} available
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {course.tests.map((test) => (
                <div key={test.id} className={STYLES.testItemCard}>
                  <h3 className="text-xs font-bold text-slate-800">
                    {test.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400 font-medium">
                    {test.questionsCount} questions · {test.durationMinutes} min
                    · avg {test.avgScore}%
                  </p>
                  <Link
                    href={`/learner/tests/${test.id}`}
                    className="mt-3 block w-full rounded-full bg-[#f7444e] py-2 text-center text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-600 active:scale-[0.98]"
                  >
                    Start test
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className={`p-5 ${STYLES.card}`}>
            <h2 className={STYLES.sidebarSectionTitle}>Resources</h2>
            <div className="mt-3 space-y-2">
              {course.resources.map((res) => (
                <a
                  key={res.id}
                  href={res.url}
                  download
                  className={STYLES.resourceItemCard}
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#f7444e]" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700 group-hover:text-[#0f3741] transition-colors">
                        {res.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {res.type} · {res.size}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
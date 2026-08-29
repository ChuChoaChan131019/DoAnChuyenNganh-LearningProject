'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, Clock3, FileText, GraduationCap, PlayCircle, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';

const COURSE_MAP: Record<string, any> = {
  'csharp-fundamentals': {
    id: 1,
    title: 'C# Fundamentals',
    level: 'Beginner',
    description: 'Start from zero: install the .NET SDK, write your first program, and master variables, data types, operators and control flow.',
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
          { title: 'What is C#?', duration: '8 min', completed: true },
          { title: 'Installing .NET', duration: '10 min', completed: true },
          { title: 'Your First C# Program', duration: '12 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Variables and Data Types',
        description: 'Value types, reference types, conversion and constants.',
        lessons: [
          { title: 'Variables', duration: '11 min', completed: true },
          { title: 'Data Types', duration: '14 min', completed: true },
          { title: 'Type Conversion', duration: '9 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Control Flow',
        description: 'Branching and looping constructs used every day.',
        lessons: [
          { title: 'if / else and switch', duration: '13 min', completed: true },
          { title: 'for, while and foreach', duration: '15 min', completed: true },
          { title: 'break, continue and goto', duration: '7 min', completed: true },
        ],
        completed: true,
      },
      {
        title: 'Methods',
        description: 'Reusability, parameters, return values and clean design.',
        lessons: [
          { title: 'What are methods?', duration: '8 min', completed: false },
          { title: 'Parameters and return values', duration: '12 min', completed: false },
          { title: 'Method overloads', duration: '10 min', completed: false },
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
    title: 'Object-Oriented Programming in C#',
    level: 'Intermediate',
    description: 'Model real problems with classes and objects. Learn encapsulation, inheritance, polymorphism, and design clean solutions.',
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
          { title: 'Classes and Objects', duration: '9 min', completed: true },
          { title: 'Constructors', duration: '11 min', completed: true },
          { title: 'Properties', duration: '8 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Encapsulation',
        description: 'Protect data and expose safe, intentional APIs.',
        lessons: [
          { title: 'Access modifiers', duration: '12 min', completed: true },
          { title: 'Fields and methods', duration: '10 min', completed: true },
          { title: 'Readonly and static', duration: '9 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Inheritance',
        description: 'Reuse behavior through hierarchies and base classes.',
        lessons: [
          { title: 'Base classes', duration: '14 min', completed: false },
          { title: 'Derived classes', duration: '12 min', completed: false },
          { title: 'Virtual methods', duration: '11 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Polymorphism',
        description: 'Design flexible code with overriding and interfaces.',
        lessons: [
          { title: 'Method overriding', duration: '18 min', completed: false },
          { title: 'Interfaces', duration: '15 min', completed: false },
          { title: 'Abstract classes', duration: '13 min', completed: false },
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
  'collections-and-linq': {
    id: 3,
    title: 'Collections and LINQ',
    level: 'Intermediate',
    description: 'Work with arrays, List<T>, Dictionary<K,V>, generics and query data elegantly using LINQ.',
    lastUpdated: 'Updated 2026-08-08',
    lessons: 18,
    questions: 96,
    hours: 4,
    gradient: 'from-[#e9edf8] via-[#f4eefc] to-[#eefaf7]',
    chapters: [
      {
        title: 'Arrays and Lists',
        description: 'Work with indexed collections and dynamic data stores.',
        lessons: [
          { title: 'Arrays', duration: '10 min', completed: true },
          { title: 'List<T>', duration: '12 min', completed: true },
          { title: 'Collection initialization', duration: '8 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Dictionary and HashSet',
        description: 'Choose the right collection structure for key-based access.',
        lessons: [
          { title: 'Dictionary<K,V>', duration: '15 min', completed: false },
          { title: 'HashSet<T>', duration: '9 min', completed: false },
          { title: 'Performance tradeoffs', duration: '11 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'LINQ Essentials',
        description: 'Query collections with clarity and expressive code.',
        lessons: [
          { title: 'Where and Select', duration: '17 min', completed: false },
          { title: 'OrderBy and GroupBy', duration: '14 min', completed: false },
          { title: 'Aggregate operations', duration: '13 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Querying Data',
        description: 'Shape and transform result sets with confidence.',
        lessons: [
          { title: 'Joining collections', duration: '12 min', completed: false },
          { title: 'Projection patterns', duration: '10 min', completed: false },
          { title: 'Deferred execution', duration: '9 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'LINQ Quick Reference', type: 'PDF · 960 KB' },
      { name: 'Collection Performance Tips', type: 'Video · 42 MB' },
    ],
    tests: [
      {
        id: 'linq-mini-practice',
        title: 'LINQ Mini Practice',
        description: '7 questions in this attempt',
        duration: '30 minutes, timed',
        difficulty: 'Medium',
        questions: 7,
      },
    ],
  },
  'exception-handling-in-csharp': {
    id: 4,
    title: 'Exception Handling in C#',
    level: 'Intermediate',
    description: 'Write resilient code with try/catch/finally, exception filters and your own exception types.',
    lastUpdated: 'Updated 2026-07-13',
    lessons: 12,
    questions: 54,
    hours: 2,
    gradient: 'from-[#f7e5e3] via-[#f5efe6] to-[#ecf5f9]',
    chapters: [
      {
        title: 'Exceptions Overview',
        description: 'Understand what exceptions are and how .NET reports them.',
        lessons: [
          { title: 'What is an exception?', duration: '8 min', completed: false },
          { title: 'Exception hierarchy', duration: '7 min', completed: false },
          { title: 'Common runtime errors', duration: '10 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Try/Catch/Finally',
        description: 'Handle failures gracefully without crashing your app.',
        lessons: [
          { title: 'try/catch', duration: '14 min', completed: false },
          { title: 'finally blocks', duration: '9 min', completed: false },
          { title: 'When to rethrow', duration: '6 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Custom Exceptions',
        description: 'Signal domain-specific errors with meaningful metadata.',
        lessons: [
          { title: 'Creating custom exceptions', duration: '10 min', completed: false },
          { title: 'Exception messages', duration: '8 min', completed: false },
          { title: 'Best practices', duration: '7 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'Exception Patterns', type: 'PDF · 780 KB' },
    ],
    tests: [
      {
        id: 'exception-flows',
        title: 'Exception Handling Drill',
        description: '6 questions in this attempt',
        duration: '20 minutes, timed',
        difficulty: 'Medium',
        questions: 6,
      },
    ],
  },
  'advanced-csharp-delegates-events-async': {
    id: 5,
    title: 'Advanced C#: Delegates, Events & Async',
    level: 'Advanced',
    description: 'Delegates, lambda expressions, events, Task-based asynchronous programming and performance tips.',
    lastUpdated: 'Updated 2026-08-10',
    lessons: 26,
    questions: 121,
    hours: 5,
    gradient: 'from-[#e8f0f2] via-[#f2ebea] to-[#f9f4ed]',
    chapters: [
      {
        title: 'Delegates and Lambdas',
        description: 'Pass behavior around your code with flexible abstractions.',
        lessons: [
          { title: 'Delegates', duration: '12 min', completed: true },
          { title: 'Lambda expressions', duration: '10 min', completed: false },
          { title: 'Func and Action', duration: '8 min', completed: false },
        ],
        completed: true,
      },
      {
        title: 'Events',
        description: 'React to runtime changes through event-driven patterns.',
        lessons: [
          { title: 'Publisher and subscriber', duration: '19 min', completed: false },
          { title: 'Event handlers', duration: '11 min', completed: false },
          { title: 'Event best practices', duration: '9 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Async/Await',
        description: 'Write responsive applications without blocking the UI thread.',
        lessons: [
          { title: 'Tasks', duration: '16 min', completed: false },
          { title: 'Awaiting results', duration: '12 min', completed: false },
          { title: 'Avoid blocking calls', duration: '8 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Task Cancellation',
        description: 'Know when to stop work and how to cancel safely.',
        lessons: [
          { title: 'CancellationToken', duration: '15 min', completed: false },
          { title: 'Cancel during operations', duration: '10 min', completed: false },
          { title: 'Timeout patterns', duration: '8 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'Async Patterns', type: 'PDF · 1.4 MB' },
      { name: 'Threading Notes', type: 'Video · 71 MB' },
    ],
    tests: [
      {
        id: 'async-challenge',
        title: 'Async & Tasks Challenge',
        description: '8 questions in this attempt',
        duration: '35 minutes, timed',
        difficulty: 'Hard',
        questions: 8,
      },
    ],
  },
  'csharp-oop-interview-preparation': {
    id: 6,
    title: 'C# & OOP Interview Preparation',
    level: 'Advanced',
    description: 'Curated question sets and guided practice for the most common C# and OOP interview scenarios.',
    lastUpdated: 'Updated 2026-08-05',
    lessons: 15,
    questions: 240,
    hours: 4,
    gradient: 'from-[#e7f0e9] via-[#f0efef] to-[#f8f1ed]',
    chapters: [
      {
        title: 'Core OOP Questions',
        description: 'Review the most common object-oriented interview prompts.',
        lessons: [
          { title: 'What is abstraction?', duration: '10 min', completed: false },
          { title: 'Explain inheritance', duration: '12 min', completed: false },
          { title: 'Polymorphism interview examples', duration: '9 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Design Patterns',
        description: 'Recognize reusable patterns in practical problem-solving.',
        lessons: [
          { title: 'Singleton', duration: '14 min', completed: false },
          { title: 'Factory', duration: '11 min', completed: false },
          { title: 'Repository', duration: '9 min', completed: false },
        ],
        completed: false,
      },
      {
        title: 'Mock Interviews',
        description: 'Practice with realistic coding and behavioral questions.',
        lessons: [
          { title: 'Behavioral answers', duration: '22 min', completed: false },
          { title: 'Coding drills', duration: '18 min', completed: false },
          { title: 'Performance review', duration: '12 min', completed: false },
        ],
        completed: false,
      },
    ],
    instructor: 'Dr. Lan Nguyen',
    instructorRole: 'Content author • C# instructor',
    resources: [
      { name: 'Interview Prep Guide', type: 'PDF · 1.1 MB' },
      { name: 'Mock Interview Checklist', type: 'Document · 53 KB' },
    ],
    tests: [
      {
        id: 'interview-mock-test',
        title: 'OOP Interview Mock Test',
        description: '5 questions in this attempt',
        duration: '25 minutes, timed',
        difficulty: 'Hard',
        questions: 5,
      },
    ],
  },
};

export default function LearnerCourseDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const course = slug ? COURSE_MAP[slug] : null;

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Course not found</h1>
        <p className="mt-2 text-slate-500">This learning path does not exist yet.</p>
        <Link href="/learner/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white">
          Back to courses
        </Link>
      </div>
    );
  }

  const completedCount = course.chapters.filter((chapter: any) => chapter.completed).length;
  const totalLessonCount = course.chapters.reduce((sum: number, chapter: any) => sum + (chapter.lessons?.length || 0), 0);
  const completedLessonCount = course.chapters.reduce((sum: number, chapter: any) => sum + (chapter.lessons?.filter((lesson: any) => lesson.completed).length || 0), 0);
  const progressPercent = totalLessonCount ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1240px] pb-10">
      <Link href="/learner/courses" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        All courses
      </Link>

      <div className="space-y-5">
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
              <span className="text-[13px] text-[#5d6b73]">Updated {course.lastUpdated.split('Updated ')[1]}</span>
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
                <div className="h-full rounded-full bg-[#f7444e]" style={{ width: `${progressPercent}%` }} />
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

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-bold tracking-tight text-slate-800">Curriculum</h2>
              <div className="text-sm text-slate-500">{course.chapters.length} chapters • {course.lessons} lessons</div>
            </div>

            <div className="space-y-4">
              {course.chapters.map((chapter: any, index: number) => (
                <div key={chapter.title} className="overflow-hidden rounded-[16px] border border-slate-200 bg-[#fafafa]">
                  <div className="flex items-start justify-between gap-4 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef5f5] text-sm font-bold text-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-[20px] font-semibold tracking-[-0.02em] text-slate-800">{chapter.title}</div>
                        <div className="mt-1 text-[14px] text-slate-500">{chapter.description}</div>
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
                      <span className="text-[14px] text-slate-400">{chapter.lessons?.reduce((sum: number, lesson: any) => sum + Number.parseInt(lesson.duration, 10) || 0, 0) || 0} min</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-white">
                    {chapter.lessons?.map((lesson: any, lessonIndex: number) => (
                      <div key={`${chapter.title}-${lesson.title}`} className={`flex items-center justify-between gap-4 px-4 py-3 ${lessonIndex !== 0 ? 'border-t border-slate-200' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dff5ea] text-[#2b9e6a]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[17px] font-medium text-slate-700">{lesson.title}</span>
                        </div>
                        <span className="text-[15px] font-medium text-slate-400">{lesson.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800">Instructor</h3>
              <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeff5] text-base font-bold text-slate-700">
                  DL
                </div>
                <div>
                  <div className="text-[15px] font-bold text-slate-800">Dr. Lan Nguyen</div>
                  <div className="text-xs text-slate-500">Content author • C# instructor</div>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[22px] font-bold tracking-tight text-slate-800">Tests</h3>
                <span className="text-sm text-slate-500">{course.questions} available</span>
              </div>

              <div className="space-y-3">
                {course.tests?.map((test: any) => (
                  <div key={test.id} className="rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-3">
                    <div className="text-[15px] font-semibold text-slate-800">{test.title}</div>
                    <div className="mt-1 text-[13px] text-slate-500">{test.description} • {test.duration} • {test.difficulty}</div>
                    <Link
                      href={`/learner/courses/${course.slug}/tests/${test.id}`}
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
                  <div key={resource.name} className="flex items-center gap-3 rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold text-slate-800">{resource.name}</div>
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

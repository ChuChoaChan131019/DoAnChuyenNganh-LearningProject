'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  FileQuestion,
  Library,
} from 'lucide-react';

// ==========================================
// CENTRALIZED STYLES
// ==========================================
const STYLES = {
  pageContainer: 'mx-auto max-w-7xl space-y-8 pb-12',
  headerTitle: 'text-3xl font-bold tracking-tight text-gray-900',
  headerSub: 'mt-2 text-sm text-gray-500',

  searchContainer: 'flex flex-col sm:flex-row gap-3 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-3 shadow-sm',
  searchInputWrapper: 'relative flex-1',
  searchInput:
    'w-full h-11 rounded-xl border border-rose-400 px-10 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all',
  searchIcon: 'absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400',
  
  filterBtn:
    'inline-flex h-11 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none sm:w-auto w-full min-w-[160px]',

  sectionCard: 'rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm',
  sectionTitle: 'mb-4 text-sm font-bold text-slate-800',
  list: 'divide-y divide-gray-100',
  listItem: 'flex items-center justify-between py-3 transition-colors hover:bg-gray-50/50 -mx-2 px-2 rounded-lg',
  listLeft: 'flex items-center gap-3',
  listIcon: 'h-4 w-4 text-[#78BCC4]',
  listTitle: 'text-base font-normal text-slate-700',
  listRightText: 'text-xs text-gray-400',

  statusBadges: {
    Published: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
    },
    Approved: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dot: 'bg-sky-500',
    },
    'In review': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
    },
    Draft: {
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
      dot: 'bg-gray-400',
    },
  },
};

type Status = 'Published' | 'Approved' | 'In review' | 'Draft';

// ==========================================
// MOCK DATA 
// ==========================================
const MOCK_COURSES = [
  { id: 'c1', title: 'C# Fundamentals', status: 'Published' as Status },
  { id: 'c2', title: 'Object-Oriented Programming in C#', status: 'Published' as Status },
  { id: 'c3', title: 'Collections and LINQ', status: 'Approved' as Status },
  { id: 'c4', title: 'Exception Handling in C#', status: 'Draft' as Status },
  { id: 'c5', title: 'Advanced C#: Delegates, Events & Async', status: 'In review' as Status },
  { id: 'c6', title: 'C# & OOP Interview Preparation', status: 'Published' as Status },
];

const MOCK_CHAPTERS = [
  { id: 'ch1', title: 'Introduction to C#', label: '3 lessons' },
  { id: 'ch2', title: 'Variables and Data Types', label: '3 lessons' },
  { id: 'ch3', title: 'Control Flow', label: '3 lessons' },
  { id: 'ch4', title: 'Methods', label: '2 lessons' },
  { id: 'ch5', title: 'Classes and Objects', label: '3 lessons' },
  { id: 'ch6', title: 'Encapsulation', label: '2 lessons' },
  { id: 'ch7', title: 'Inheritance & Polymorphism', label: '4 lessons' },
];

const MOCK_LESSONS = [
  { id: 'l1', title: 'What is C#?', status: 'Published' as Status },
  { id: 'l2', title: 'Installing .NET', status: 'Published' as Status },
  { id: 'l3', title: 'Your First C# Program', status: 'Published' as Status },
  { id: 'l4', title: 'Variables', status: 'Published' as Status },
  { id: 'l5', title: 'Data Types', status: 'Published' as Status },
  { id: 'l6', title: 'Type Conversion', status: 'Published' as Status },
  { id: 'l7', title: 'Encapsulation in Practice', status: 'In review' as Status },
  { id: 'l8', title: 'Inheritance Basics', status: 'Published' as Status },
  { id: 'l9', title: 'virtual, override, sealed', status: 'Published' as Status },
  { id: 'l10', title: 'Abstract Classes', status: 'Approved' as Status },
  { id: 'l11', title: 'Interfaces', status: 'Draft' as Status },
];

const MOCK_QUESTIONS = [
  { id: 'q1', title: 'Which access modifier makes a member visible only inside the declaring class?', label: 'Single Choice' },
  { id: 'q2', title: 'Select all statements that are true about interfaces in C#.', label: 'Multiple Choice' },
  { id: 'q3', title: 'A `struct` in C# is a reference type.', label: 'True / False' },
  { id: 'q4', title: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.', label: 'Fill in the Blank' },
  { id: 'q5', title: 'Which LINQ operator returns a projection of each element in a sequence?', label: 'Single Choice' },
  { id: 'q6', title: 'What happens when an exception is thrown inside a `finally` block?', label: 'Single Choice' },
  { id: 'q7', title: 'Which collection guarantees O(1) average lookup by key?', label: 'Single Choice' },
  { id: 'q8', title: '`async` methods should generally return ______ instead of `void`.', label: 'Fill in the Blank' },
];

const MOCK_RESOURCES = [
  { id: 'r1', title: 'C# Language Cheat Sheet', label: 'PDF' },
  { id: 'r2', title: 'Installing the .NET SDK (walkthrough)', label: 'Video' },
  { id: 'r3', title: 'SOLID principles explained with C#', label: 'Article' },
  { id: 'r4', title: 'Bank account encapsulation demo', label: 'Video' },
  { id: 'r5', title: 'LINQ query operators reference', label: 'Article' },
  { id: 'r6', title: 'Exception handling anti-patterns', label: 'Article' },
];

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
function StatusBadge({ status }: { status: Status }) {
  const config = STYLES.statusBadges[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${config.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

function Section({
  title,
  count,
  items,
  Icon,
  iconColor,
}: {
  title: string;
  count: number;
  items: any[];
  Icon: React.ElementType;
  iconColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={STYLES.sectionCard}>
      <h2 className={STYLES.sectionTitle}>
        {title} <span className="text-gray-400 font-medium">· {count}</span>
      </h2>
      <div className={STYLES.list}>
        {items.map((item) => (
          <div key={item.id} className={STYLES.listItem}>
            <div className={STYLES.listLeft}>
              <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.5} />
              <span className={STYLES.listTitle}>{item.title}</span>
            </div>
            <div>
              {item.status ? (
                <StatusBadge status={item.status as Status} />
              ) : (
                <span className={STYLES.listRightText}>{item.label}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function SearchPage() {
  const [query, setQuery] = useState('');

  // Filtering Logic
  const filteredCourses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return MOCK_COURSES;
    return MOCK_COURSES.filter((item) => item.title.toLowerCase().includes(term));
  }, [query]);

  const filteredChapters = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return MOCK_CHAPTERS;
    return MOCK_CHAPTERS.filter((item) => item.title.toLowerCase().includes(term));
  }, [query]);

  const filteredLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return MOCK_LESSONS;
    return MOCK_LESSONS.filter((item) => item.title.toLowerCase().includes(term));
  }, [query]);

  const filteredQuestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return MOCK_QUESTIONS;
    return MOCK_QUESTIONS.filter((item) => item.title.toLowerCase().includes(term));
  }, [query]);

  const filteredResources = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return MOCK_RESOURCES;
    return MOCK_RESOURCES.filter((item) => item.title.toLowerCase().includes(term));
  }, [query]);

  const hasResults =
    filteredCourses.length > 0 ||
    filteredChapters.length > 0 ||
    filteredLessons.length > 0 ||
    filteredQuestions.length > 0 ||
    filteredResources.length > 0;

  return (
    <div className={STYLES.pageContainer}>
      {/* Page Header */}
      <div>
        <h1 className={STYLES.headerTitle}>Search</h1>
        <p className={STYLES.headerSub}>
          One search across courses, chapters, lessons, resources and questions.
        </p>
      </div>

      {/* Search Input & Filters */}
      <div className={STYLES.searchContainer}>
        <div className={STYLES.searchInputWrapper}>
          <Search className={STYLES.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "polymorphism", "LINQ", "async"...'
            className={STYLES.searchInput}
            autoFocus
          />
        </div>
        
        <button className={STYLES.filterBtn}>
          <span>All content types</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        
        <button className={STYLES.filterBtn}>
          <span>Any level</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Results List */}
      {hasResults ? (
        <div className="space-y-6">
          <Section
            title="Courses"
            count={filteredCourses.length}
            items={filteredCourses}
            Icon={BookOpen}
            iconColor="text-[#F7444E]" 
          />
          <Section
            title="Chapters"
            count={filteredChapters.length}
            items={filteredChapters}
            Icon={Layers}
            iconColor="text-[#78BCC4]"
          />
          <Section
            title="Lessons"
            count={filteredLessons.length}
            items={filteredLessons}
            Icon={FileText}
            iconColor="text-gray-400"
          />
          <Section
            title="Questions"
            count={filteredQuestions.length}
            items={filteredQuestions}
            Icon={FileQuestion}
            iconColor="text-[#78BCC4]"
          />
          <Section
            title="Resources"
            count={filteredResources.length}
            items={filteredResources}
            Icon={Library}
            iconColor="text-[#78BCC4]"
          />
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-gray-900">No results found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filters to find what you're looking for.
          </p>
        </div>
      )}
    </div>
  );
}
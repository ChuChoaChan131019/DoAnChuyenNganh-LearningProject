'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileText,
  PencilLine,
  RotateCw,
  Save,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';

const inputClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/10';

const selectClass =
  'h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/10';

const actionButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]';

const primaryActionClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F7444E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e53e45] active:scale-[0.99]';

export default function AIContentGeneratorPage() {
  const [topic, setTopic] = useState('Encapsulation in C#');
  const [course, setCourse] = useState('Object-Oriented Programming in C#');
  const [chapter, setChapter] = useState('Encapsulation');
  const [lesson, setLesson] = useState('Encapsulation in Practice');
  const [targetLevel, setTargetLevel] = useState('Intermediate');
  const [contentType, setContentType] = useState('Lesson');
  const [desiredLength, setDesiredLength] = useState(900);
  const [instructions, setInstructions] = useState(
    'Use a BankAccount example. Include one common mistake and how to fix it.'
  );

  const generationMeta = useMemo(
    () => ({
      topic,
      difficulty: 'Intermediate',
      readingTime: '6 minutes',
      aiModel: 'GPT-5 education tuned',
      generated: '11 Aug 2026, 08:02',
      tokens: '2,418',
    }),
    [topic]
  );

  const objectiveItems = [
    'Explain why exposing public fields breaks invariants',
    'Convert public fields into properties with validation',
    'Choose the right access modifier for a member',
  ];

  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#B6ECF0] bg-[#E6F7F8] px-2.5 py-1 text-xs font-semibold text-[#14919B]">
          <Sparkles className="h-3.5 w-3.5" />
          AI assisted
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          AI Learning Content Generator
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Draft lessons, explanations, C# examples and exercises. Everything lands as a draft that a human must review.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#f3efe8] px-5 py-4 text-base font-medium text-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7dbb5] text-[#9a5d11]">
            <Wand2 className="h-4 w-4" />
          </div>
          AI generated — requires review. This draft is not visible to students until approved.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1.2fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-[22px] font-bold tracking-tight text-slate-800">
                Generation setup
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Course</label>
                <div className="relative">
                  <select value={course} onChange={(e) => setCourse(e.target.value)} className={selectClass}>
                    <option>Object-Oriented Programming in C#</option>
                    <option>Data Structures & Algorithms</option>
                    <option>Web Development with ASP.NET</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Chapter</label>
                <div className="relative">
                  <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={selectClass}>
                    <option>Encapsulation</option>
                    <option>Inheritance</option>
                    <option>Polymorphism</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Lesson</label>
                <input
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Target level</label>
                  <div className="relative">
                    <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className={selectClass}>
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Content type</label>
                  <div className="relative">
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectClass}>
                      <option>Lesson</option>
                      <option>Exercise</option>
                      <option>Checklist</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Desired length</label>
                  <span className="text-xs font-medium text-slate-500">~{desiredLength} words</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={1500}
                  step={50}
                  value={desiredLength}
                  onChange={(e) => setDesiredLength(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#F7444E]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Additional instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/10"
                />
              </div>

              <button className={`${primaryActionClass} w-full`}>
                <Sparkles className="h-4 w-4" />
                Generate content with AI
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[28px] font-bold tracking-[-0.04em] text-slate-800">Encapsulation in Practice</h3>
            </div>

            <div className="space-y-5">
              <p className="text-base leading-7 text-slate-700">
                Encapsulation is the OOP principle of hiding internal state and exposing behaviour through a controlled public surface. In C# you achieve it with access modifiers, properties and validation inside methods.
              </p>

              <div>
                <h4 className="mb-3 text-base font-bold text-slate-800">Learning objectives</h4>
                <ul className="space-y-3 pl-5 text-base text-slate-700">
                  {objectiveItems.map((item) => (
                    <li key={item} className="list-disc leading-7">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-[#021926] shadow-inner">
              <div className="flex items-center gap-2 border-b border-slate-700 bg-[#021a2a] px-4 py-2 text-[11px] text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-slate-400">Student.cs</span>
              </div>

              <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 text-slate-100">
                <code>{`public class Student
{
    public string Name { get; set; }
    public int Credits { get; private set; }

    public Student(string name) => Name = name;

    public void Enroll(int credits)
    {
        if (credits <= 0)
            throw new ArgumentOutOfRangeException(nameof(credits));

        Credits += credits;
    }

    public void Introduce()
    {
        Console.WriteLine($"Hello, {Name}");
    }
}`}</code>
              </pre>
            </div>
          </article>

          <div className="rounded-2xl border border-[#f2d4d7] bg-[#fbe7e9] p-4 text-base leading-7 text-[#7a3340] shadow-sm">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="text-[#d14b5d]">Rule of thumb:</span>
            </span>
            <span className="block mt-1">
              a class should never let external code put it into an invalid state. If a value has rules, it belongs behind a property or a method.
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">Generation metadata</h3>

            <dl className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Topic</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.topic}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Difficulty</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.difficulty}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Reading time</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.readingTime}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">AI model</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.aiModel}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Generated</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.generated}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Tokens</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.tokens}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-[#1c8a62]" />
                Grounded on the current course outline and lesson objectives.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <button className={actionButtonClass + ' w-full'}>
                <RotateCw className="h-4 w-4" />
                Regenerate
              </button>
              <button className={actionButtonClass + ' w-full'}>
                <PencilLine className="h-4 w-4" />
                Edit content
              </button>
              <button className={actionButtonClass + ' w-full'}>
                <Save className="h-4 w-4" />
                Save as draft
              </button>
              <button className={`${primaryActionClass} w-full`}>
                <Send className="h-4 w-4" />
                Submit for review
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-700">
                <Bot className="h-4 w-4 text-[#14919B]" />
                Typical review turnaround: 1 working day
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  List,
  Play,
  Save,
  Send,
  Table2,
  Type,
  WandSparkles,
  Quote,
  Code2,
} from "lucide-react";

type EditorLesson = {
  title: string;
  slug: string;
  chapter: string;
  content: string;
};

const lessons: EditorLesson[] = [
  {
    title: "What is C#?",
    slug: "what-is-csharp",
    chapter: "Introduction to C#",
    content:
      "C# is a modern, object-oriented programming language created by Microsoft. It runs on .NET and is used to build web, desktop, cloud and game applications.",
  },
  {
    title: "Installing .NET",
    slug: "installing-dotnet",
    chapter: "Introduction to C#",
    content:
      "The .NET SDK includes the compiler, runtime and command-line tools needed to create and run C# applications. Install the latest SDK before starting your first project.",
  },
  {
    title: "Your First C# Program",
    slug: "first-csharp-program",
    chapter: "Introduction to C#",
    content:
      "Encapsulation is the OOP principle of hiding internal state and exposing behaviour through a controlled public surface. In C# you achieve it with access modifiers, properties and validation inside methods.",
  },
  {
    title: "Variables",
    slug: "variables",
    chapter: "Variables and Data Types",
    content:
      "Variables store values that a program can read and change. Every variable has a type, a name and an initial value.",
  },
  {
    title: "Data Types",
    slug: "data-types",
    chapter: "Variables and Data Types",
    content:
      "C# provides value types such as int and bool, reference types such as string and class, and a type system that helps catch mistakes early.",
  },
  {
    title: "Type Conversion",
    slug: "type-conversion",
    chapter: "Variables and Data Types",
    content:
      "Type conversion changes a value from one data type to another. Use implicit conversion when it is safe and explicit casting when precision may be lost.",
  },
  {
    title: "if / else and switch",
    slug: "if-else-switch",
    chapter: "Control Flow",
    content:
      "Conditional statements let a program choose which block of code to execute based on a boolean expression.",
  },
  {
    title: "for, while and foreach",
    slug: "loops",
    chapter: "Control Flow",
    content:
      "Loops repeat a block of code while a condition is true or for each item in a collection.",
  },
  {
    title: "break, continue and goto",
    slug: "jump-statements",
    chapter: "Control Flow",
    content:
      "Jump statements change the normal flow of a loop or method. Use them carefully to keep control flow easy to follow.",
  },
  {
    title: "Declaring Methods",
    slug: "declaring-methods",
    chapter: "Methods",
    content:
      "Methods package reusable behaviour behind a name. A method can accept parameters, return a value and expose a clear contract.",
  },
];

export default function LessonEditorPage() {
  const params = useParams<{ slug: string }>();
  const routeLesson =
    lessons.find((lesson) => lesson.slug === params.slug) ?? lessons[0];
  const [selectedSlug, setSelectedSlug] = useState(routeLesson.slug);
  const selectedLesson =
    lessons.find((lesson) => lesson.slug === selectedSlug) ?? lessons[0];
  const [title, setTitle] = useState(selectedLesson.title);
  const [slug, setSlug] = useState(selectedLesson.slug);
  const [content, setContent] = useState(selectedLesson.content);
  const [showPlayground, setShowPlayground] = useState(true);

  const selectLesson = (lesson: EditorLesson) => {
    setSelectedSlug(lesson.slug);
    setTitle(lesson.title);
    setSlug(lesson.slug);
    setContent(lesson.content);
  };

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/content-manager/learning-content/lessons"
          className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
        >
          <ArrowLeft className="h-4 w-4" />
          All lessons
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <WandSparkles className="h-4 w-4" />
            Generate with AI
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540]"
          >
            <Send className="h-4 w-4" />
            Submit for review
          </button>
        </div>
      </div>
      <header>
        <div className="flex items-center gap-2 text-xs text-[#637981]">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            Published
          </span>
          <span>{selectedLesson.chapter}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#002C3E]">
          {title}
        </h1>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-sm">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-[#637981]">
            Structure
          </p>
          <nav className="space-y-1">
            {lessons.map((lesson) => (
              <button
                key={lesson.slug}
                type="button"
                onClick={() => selectLesson(lesson)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${selectedSlug === lesson.slug ? "border border-[#002C3E] bg-[#ffe0df] font-semibold text-[#F7444E]" : "text-[#526f78] hover:bg-[#f8fbf9]"}`}
              >
                {lesson.title}
              </button>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-[#dfe6df] px-5 py-3 text-[#637981]">
              <Type className="h-4 w-4" />
              <span className="font-semibold">H2</span>
              <span className="font-bold">B</span>
              <List className="h-4 w-4" />
              <Quote className="h-4 w-4" />
              <Code2 className="h-4 w-4" />
              <Table2 className="h-4 w-4" />
              <ImageIcon className="h-4 w-4" />
              <span className="ml-auto text-xs">Markdown supported</span>
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[265px] w-full resize-y border-0 p-5 text-[16px] leading-relaxed text-[#16485a] outline-none focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">C# example</h2>
              <p className="text-xs text-[#637981]">
                Rendered with syntax highlighting for students
              </p>
            </div>
            <pre className="mx-4 my-4 overflow-x-auto rounded-xl bg-[#061d26] p-5 text-sm leading-7 text-[#d8e9e8]">
              <code>{`public class Student\n{\n    public string Name { get; }\n\n    public Student(string name) => Name = name;\n\n    public void Introduce()\n    {\n        Console.WriteLine($"Hello, {Name}");\n    }\n}`}</code>
            </pre>
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Exercises</h2>
            </div>
            <div className="space-y-3 p-4">
              {[
                "Convert the public fields of BankAccount into validated properties.",
                "Add a Withdraw method that throws when the balance is insufficient.",
                "Explain why Credits has a private setter.",
              ].map((exercise, index) => (
                <div
                  key={exercise}
                  className="flex items-center gap-3 rounded-xl bg-[#f4f5f0] px-3 py-3 text-sm text-[#16485a]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F7444E] text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  {exercise}
                </div>
              ))}
            </div>
          </section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
            <h2 className="border-b border-[#dfe6df] pb-4 font-semibold text-[#002C3E]">
              Lesson settings
            </h2>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4]"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Slug
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] px-3 font-mono text-sm text-[#002C3E] outline-none focus:border-[#78BCC4]"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Chapter
              <select className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E]">
                <option>Introduction to C#</option>
                <option>Variables and Data Types</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Status
              <select className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E]">
                <option>Published</option>
                <option>Draft</option>
                <option>In review</option>
              </select>
            </label>
            <label className="mt-5 flex items-center justify-between text-sm text-[#526f78]">
              Show code playground
              <button
                type="button"
                role="switch"
                aria-checked={showPlayground}
                onClick={() => setShowPlayground(!showPlayground)}
                className={`relative h-5 w-9 rounded-full ${showPlayground ? "bg-[#F7444E]" : "bg-[#dfe6df]"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${showPlayground ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </label>
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#002C3E]">Publishing</h2>
            <p className="mt-2 text-xs text-[#637981]">Last saved just now</p>
            <button
              type="button"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F7444E] text-sm font-semibold text-white hover:bg-[#df3540]"
            >
              <Play className="h-4 w-4" />
              Publish
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

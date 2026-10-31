'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileText,
  PencilLine,
  RotateCw,
  Save,
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
  const [topic, setTopic] = useState('Tính đóng gói trong C#');
  const [course, setCourse] = useState('Lập trình hướng đối tượng với C#');
  const [chapter, setChapter] = useState('Tính đóng gói');
  const [lesson, setLesson] = useState('Vận dụng tính đóng gói');
  const [targetLevel, setTargetLevel] = useState('Intermediate');
  const [contentType, setContentType] = useState('Bài học');
  const [desiredLength, setDesiredLength] = useState(900);
  const [instructions, setInstructions] = useState(
    'Dùng ví dụ tài khoản ngân hàng. Nêu một lỗi thường gặp và cách khắc phục.'
  );

  const generationMeta = useMemo(
    () => ({
      topic,
      difficulty: 'Trung cấp',
      readingTime: '6 phút',
      aiModel: 'GPT-5, tinh chỉnh cho giáo dục',
      generated: '11/08/2026, 08:02',
      tokens: '2.418',
    }),
    [topic]
  );

  const objectiveItems = [
    'Giải thích vì sao công khai trường dữ liệu có thể phá vỡ các điều kiện bất biến',
    'Chuyển trường dữ liệu công khai thành thuộc tính có kiểm tra hợp lệ',
    'Chọn phạm vi truy cập phù hợp cho thành viên lớp',
  ];

  return (
    <div className="mx-auto w-full max-w-[1520px] space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#B6ECF0] bg-[#E6F7F8] px-2.5 py-1 text-xs font-semibold text-[#14919B]">
          <Sparkles className="h-3.5 w-3.5" />
          Có hỗ trợ trí tuệ nhân tạo
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Công cụ tạo nội dung học tập bằng AI
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Tạo bản nháp bài học, phần giải thích, ví dụ C# và bài tập. Tất cả nội dung cần được con người kiểm duyệt.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#f3efe8] px-5 py-4 text-base font-medium text-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7dbb5] text-[#9a5d11]">
            <Wand2 className="h-4 w-4" />
          </div>
          Nội dung do AI tạo cần được kiểm duyệt. Học viên chưa thể xem bản nháp cho đến khi nội dung được duyệt.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1.2fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-[22px] font-bold tracking-tight text-slate-800">
                Thiết lập nội dung tạo
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Chủ đề</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Khóa học</label>
                <div className="relative">
                  <select value={course} onChange={(e) => setCourse(e.target.value)} className={selectClass}>
                    <option value="Lập trình hướng đối tượng với C#">Lập trình hướng đối tượng với C#</option>
                    <option value="Cấu trúc dữ liệu và giải thuật">Cấu trúc dữ liệu và giải thuật</option>
                    <option value="Lập trình web với ASP.NET">Lập trình web với ASP.NET</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Chương</label>
                <div className="relative">
                  <select value={chapter} onChange={(e) => setChapter(e.target.value)} className={selectClass}>
                    <option value="Tính đóng gói">Tính đóng gói</option>
                    <option value="Tính kế thừa">Tính kế thừa</option>
                    <option value="Tính đa hình">Tính đa hình</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bài học</label>
                <input
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Trình độ mục tiêu</label>
                  <div className="relative">
                    <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className={selectClass}>
                      <option value="Cơ bản">Cơ bản</option>
                      <option value="Trung cấp">Trung cấp</option>
                      <option value="Nâng cao">Nâng cao</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Loại nội dung</label>
                  <div className="relative">
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectClass}>
                      <option value="Bài học">Bài học</option>
                      <option value="Bài tập">Bài tập</option>
                      <option value="Danh sách kiểm tra">Danh sách kiểm tra</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Độ dài mong muốn</label>
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
                <label className="mb-2 block text-sm font-medium text-slate-700">Hướng dẫn bổ sung</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/10"
                />
              </div>

              <button className={`${primaryActionClass} w-full`}>
                <Sparkles className="h-4 w-4" />
                Tạo nội dung tự động
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[28px] font-bold tracking-[-0.04em] text-slate-800">Vận dụng tính đóng gói</h3>
            </div>

            <div className="space-y-5">
              <p className="text-base leading-7 text-slate-700">
                Tính đóng gói là nguyên tắc lập trình hướng đối tượng giúp ẩn trạng thái bên trong và chỉ cung cấp các thao tác truy cập có kiểm soát. Trong C#, có thể áp dụng nguyên tắc này bằng phạm vi truy cập, thuộc tính và bước kiểm tra dữ liệu trong phương thức.
              </p>

              <div>
                <h4 className="mb-3 text-base font-bold text-slate-800">Mục tiêu học tập</h4>
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
              <span className="text-[#d14b5d]">Nguyên tắc chung:</span>
            </span>
            <span className="block mt-1">
              Một lớp không nên để mã bên ngoài đưa đối tượng vào trạng thái không hợp lệ. Nếu giá trị có quy tắc, hãy kiểm tra nó trong thuộc tính hoặc phương thức.
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800">Thông tin lần tạo</h3>

            <dl className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Chủ đề</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.topic}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Độ khó</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.difficulty}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Thời gian đọc</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.readingTime}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Mô hình tạo nội dung</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.aiModel}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Thời điểm tạo</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.generated}</dd>
              </div>
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1">
                <dt className="text-slate-500">Lượng mã thông báo</dt>
                <dd className="text-right font-semibold text-slate-800">{generationMeta.tokens}</dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-[#1c8a62]" />
                Dựa trên đề cương khóa học và mục tiêu bài học hiện tại.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <button className={actionButtonClass + ' w-full'}>
                <RotateCw className="h-4 w-4" />
                Tạo lại
              </button>
              <button className={actionButtonClass + ' w-full'}>
                <PencilLine className="h-4 w-4" />
                Chỉnh sửa nội dung
              </button>
              <button className={actionButtonClass + ' w-full'}>
                <Save className="h-4 w-4" />
                Lưu bản nháp
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  RotateCw,
  Edit3,
  Trash2,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';

/* ==========================================================================
   CENTRALIZED STYLES (ĐỒNG BỘ NÚT & WORKFLOW CARD CHUẨN PILL)
   ========================================================================== */
const STYLES = {
  // Primary Action Button (Dùng cho "Duyệt tất cả và lưu vào ngân hàng" & "Tạo câu hỏi")
  primaryActionBtn:
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F7444E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#e03b44] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 disabled:opacity-50 disabled:cursor-not-allowed',

  // Nút hành động đơn lẻ trong Footer mỗi Card (Edit, Regenerate, Delete)
  cardActionBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] focus:outline-none',

  // Nút Delete có icon hồng đỏ đặc trưng
  cardDeleteBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-600 active:scale-[0.98] focus:outline-none',

  // Nút Approve riêng từng câu (Bo tròn viên thuốc pill, màu đỏ brand)
  cardApproveBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#F7444E] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#e03b44] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20',

  // Card Layouts
  card: 'rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 shadow-sm transition-all',

  // Form elements
  label: 'block text-xs font-semibold text-gray-700 mb-1.5',
  input:
    'h-10 w-full rounded-xl border border-gray-200  px-3.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',
  select:
    'h-10 w-full appearance-none rounded-xl border border-gray-200 px-3.5 pr-9 text-sm text-gray-900 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',
  textarea:
    'w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',

  // Badges
  aiTag:
    'inline-flex items-center gap-1 rounded-md border border-[#B6ECF0] bg-[#E6F7F8] px-2.5 py-0.5 text-xs font-semibold text-[#14919B]',
  difficulty: {
    'Dễ': 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
    'Trung bình': 'border-amber-200/60 bg-amber-50 text-amber-700',
    'Khó': 'border-rose-200/60 bg-rose-50 text-rose-700',
  },

  // Workflow Header Step Bar
  workflowContainer:
    'flex flex-wrap items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-3 shadow-sm',
  workflowPills: {
    aiGenerated:
      'inline-flex items-center rounded-2xl bg-[#EBF8FA] px-4 py-1.5 text-xs font-medium text-[#118A94]',
    neutral:
      'inline-flex items-center rounded-2xl bg-white px-4 py-1.5 text-xs font-medium text-gray-600',
    approved:
      'inline-flex items-center rounded-2xl bg-[#F7444E]/10 px-4 py-1.5 text-xs font-medium text-gray-600',
    published:
      'inline-flex items-center rounded-2xl bg-[#EAF7F0] px-4 py-1.5 text-xs font-medium text-[#0F766E]',
  },

  // Options styling
  optionCorrect:
    'flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-sm font-medium text-emerald-900 shadow-sm transition-all',
  optionDefault:
    'flex items-center justify-between rounded-xl border border-gray-200 p-3.5 text-sm text-gray-700 hover:border-gray-300 transition-all',
  letterCircleCorrect:
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-white text-xs font-bold text-emerald-700',
  letterCircleDefault:
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500',
};

/* ==========================================================================
   TYPES & INTERFACES
   ========================================================================== */
export type DifficultyLevel = 'Dễ' | 'Trung bình' | 'Khó';
export type QuestionType =
  | 'Một đáp án'
  | 'Nhiều đáp án'
  | 'Đúng / Sai'
  | 'Điền vào chỗ trống';

export interface AnswerOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  lesson: string;
  options: AnswerOption[];
  explanation: string;
}

/* ==========================================================================
   SAMPLE MOCK DATA
   ========================================================================== */
const INITIAL_QUESTIONS: GeneratedQuestion[] = [
  {
    id: 'q1',
    title: 'Chọn tất cả phát biểu đúng về interface trong C#.',
    type: 'Nhiều đáp án',
    difficulty: 'Trung bình',
    lesson: 'Interface',
    options: [
      { id: 'a', label: 'A', text: 'Một lớp có thể triển khai nhiều interface', isCorrect: true },
      { id: 'b', label: 'B', text: 'Interface có thể khai báo trường dữ liệu đối tượng', isCorrect: false },
      { id: 'c', label: 'C', text: 'Interface có thể chứa phần triển khai phương thức mặc định (C# 8 trở lên)', isCorrect: true },
      { id: 'd', label: 'D', text: 'Một interface có thể kế thừa từ interface khác', isCorrect: true },
    ],
    explanation:
      'Một lớp có thể triển khai nhiều interface nhưng chỉ kế thừa một lớp cơ sở. Từ C# 8, interface có thể cung cấp phần triển khai mặc định.',
  },
  {
    id: 'q2',
    title: 'Điền vào chỗ trống: từ khóa dùng để ngăn ghi đè thêm một thành viên virtual là ______.',
    type: 'Điền vào chỗ trống',
    difficulty: 'Trung bình',
    lesson: 'virtual, override, sealed',
    options: [
      { id: 'a', label: 'A', text: 'sealed', isCorrect: true },
    ],
    explanation:
      'Từ khóa sealed override ngăn thành viên bị ghi đè thêm ở các lớp kế thừa phía sau.',
  },
  {
    id: 'q3',
    title: 'Điều gì xảy ra khi một ngoại lệ được ném bên trong khối finally?',
    type: 'Một đáp án',
    difficulty: 'Khó',
    lesson: 'The finally Block',
    options: [
      { id: 'a', label: 'A', text: 'Ngoại lệ bị bỏ qua mà không thông báo', isCorrect: false },
      { id: 'b', label: 'B', text: 'Ngoại lệ mới thay thế ngoại lệ ban đầu và được truyền tiếp', isCorrect: true },
      { id: 'c', label: 'C', text: 'Môi trường chạy chương trình kết thúc ngay lập tức', isCorrect: false },
      { id: 'd', label: 'D', text: 'Ngoại lệ được bọc trong AggregateException', isCorrect: false },
    ],
    explanation:
      'Ngoại lệ mới thay thế ngoại lệ đang được xử lý và tiếp tục truyền lên trên. Vì vậy, không nên ném ngoại lệ trong khối finally.',
  },
  {
    id: 'q4',
    title: 'Kiểu tập hợp nào đảm bảo thời gian tra cứu trung bình theo khóa là O(1)?',
    type: 'Một đáp án',
    difficulty: 'Trung bình',
    lesson: 'Dictionary<TKey, TValue>',
    options: [
      { id: 'a', label: 'A', text: 'List<T> — danh sách liên kết tuần tự', isCorrect: false },
      { id: 'b', label: 'B', text: 'Dictionary<TKey, TValue> — từ điển khóa và giá trị', isCorrect: true },
      { id: 'c', label: 'C', text: 'Queue<T> — hàng đợi', isCorrect: false },
      { id: 'd', label: 'D', text: 'LinkedList<T> — danh sách liên kết', isCorrect: false },
    ],
    explanation:
      'Dictionary<TKey, TValue> sử dụng bảng băm nên có thời gian tra cứu trung bình O(1).',
  },
];

/* ==========================================================================
   PAGE COMPONENT
   ========================================================================== */
export default function AIQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(INITIAL_QUESTIONS);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [course, setCourse] = useState('Lập trình hướng đối tượng với C#');
  const [chapter, setChapter] = useState('Inheritance & Polymorphism');
  const [lesson, setLesson] = useState('Interfaces');
  const [topic, setTopic] = useState('Interface vs abstract class');
  const [questionType, setQuestionType] = useState<QuestionType>('Nhiều đáp án');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Trung bình');
  const [count, setCount] = useState<number>(8);
  const [instructions, setInstructions] = useState(
    'Include one code-reading question using a C# snippet.'
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  const handleApproveOne = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleApproveAll = () => {
    setQuestions([]);
  };

  const handleDeleteOne = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Workflow Progress */}
      <div className="space-y-4">
        <div>
          <span className={STYLES.aiTag}>
            <Sparkles className="h-3.5 w-3.5" />
            Có hỗ trợ trí tuệ nhân tạo
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Công cụ tạo câu hỏi bằng trí tuệ nhân tạo
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generated questions never publish automatically — they enter the review workflow[cite: 1].
          </p>
        </div>

        {/* Workflow Steps Indicator */}
        <div className={STYLES.workflowContainer}>
          <span className={STYLES.workflowPills.aiGenerated}>
            Tạo tự động
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.neutral}>
            Bản nháp
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.neutral}>
            Duyệt
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.approved}>
            Đã duyệt
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.published}>
            Đã xuất bản
          </span>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Generation Setup */}
        <div className={`space-y-4 lg:col-span-4 ${STYLES.card}`}>
          <h2 className="text-base font-bold text-gray-900">Thiết lập nội dung tạo</h2>

          <div className="space-y-3.5">
            <div>
              <label className={STYLES.label}>Khóa học</label>
              <div className="relative">
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className={STYLES.select}
                >
                  <option value="Lập trình hướng đối tượng với C#">Lập trình hướng đối tượng với C#</option>
                  <option value="C# cơ bản">C# cơ bản</option>
                  <option value="Tập hợp và LINQ">Tập hợp và LINQ</option>
                  <option value="Xử lý ngoại lệ trong C#">Xử lý ngoại lệ trong C#</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Chương</label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Bài học</label>
              <input
                type="text"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Chủ đề</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={STYLES.label}>Dạng câu hỏi</label>
                <div className="relative">
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className={STYLES.select}
                  >
                    <option value="Một đáp án">Một đáp án</option>
                    <option value="Nhiều đáp án">Nhiều đáp án</option>
                    <option value="Đúng / Sai">Đúng / Sai</option>
                    <option value="Điền vào chỗ trống">Điền vào chỗ trống</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className={STYLES.label}>Độ khó</label>
                <div className="relative">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className={STYLES.select}
                  >
                    <option value="Dễ">Dễ</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Khó">Khó</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Số lượng</label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Hướng dẫn bổ sung</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className={STYLES.textarea}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full ${STYLES.primaryActionBtn}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tạo câu hỏi...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tạo câu hỏi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Pending Decisions */}
        <div className="space-y-4 lg:col-span-8">
          {/* Top Bar Summary & Inline Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-sm font-medium text-gray-600">
              {questions.length} generated questions pending your decision
            </span>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                className={STYLES.primaryActionBtn}
              >
                <Check className="h-4 w-4" />
                Duyệt tất cả và lưu vào ngân hàng
              </button>
            )}
          </div>

          {/* Cards List */}
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">Tất cả câu hỏi đã được duyệt!</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tạo câu hỏi mới bằng bảng thiết lập bên trái.
              </p>
            </div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className={`space-y-4 ${STYLES.card}`}>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={STYLES.aiTag}>
                    <Sparkles className="h-3 w-3" />
                    Tạo tự động
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      STYLES.difficulty[question.difficulty]
                    }`}
                  >
                    {question.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">
                    {question.type} · {question.lesson}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold leading-snug text-gray-900">
                  {question.title}
                </h3>

                {/* Options List */}
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={option.isCorrect ? STYLES.optionCorrect : STYLES.optionDefault}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            option.isCorrect
                              ? STYLES.letterCircleCorrect
                              : STYLES.letterCircleDefault
                          }
                        >
                          {option.label}
                        </span>
                        <span>{option.text}</span>
                      </div>
                      {option.isCorrect && (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 text-xs text-gray-600">
                  <span className="font-bold text-gray-900">Explanation · </span>
                  {question.explanation}
                </div>

                {/* Fixed Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2.5">
                    <button type="button" className={STYLES.cardActionBtn}>
                      <Edit3 className="h-4 w-4 text-gray-600" />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((q) =>
                            q.id === question.id
                              ? { ...q, title: `${q.title} (Regenerated)` }
                              : q
                          )
                        )
                      }
                      className={STYLES.cardActionBtn}
                    >
                      <RotateCw className="h-4 w-4 text-gray-600" />
                      Tạo lại
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(question.id)}
                      className={STYLES.cardDeleteBtn}
                    >
                      <Trash2 className="h-4 w-4 text-[#F7444E]" />
                      Xóa
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApproveOne(question.id)}
                    className={STYLES.cardApproveBtn}
                  >
                    <Check className="h-4 w-4" />
                    Duyệt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

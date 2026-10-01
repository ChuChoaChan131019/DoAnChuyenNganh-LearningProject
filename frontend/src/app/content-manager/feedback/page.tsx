'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Eye,
  X,
  Search,
  BookOpen,
  User,
  AlertTriangle,
  Bold,
  Italic,
  List,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';
import { feedbacksApi, contentManagerDashboardApi, FeedbackItem, CreateFeedbackPayload } from '@/lib/api';

const CONTEXT_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  progress: { label: 'Tiến độ (Progress)', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  result: { label: 'Kết quả test (Result)', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  task: { label: 'Nhiệm vụ (Task)', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  general: { label: 'Chung (General)', color: 'text-[#002C3E]', bg: 'bg-[#fbfcf8] border-[#dfe6df]' },
};

interface LearnerOption {
  id: string;
  name: string;
  email: string;
}

export default function FeedbackManagementPage() {
  // Trạng thái dữ liệu
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent'>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [searchLearnerName, setSearchLearnerName] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<FeedbackItem | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedLearner, setSelectedLearner] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [contextType, setContextType] = useState<'progress' | 'result' | 'task' | 'general'>('progress');
  const [content, setContent] = useState('');

  // Tải danh sách Feedback
  const loadFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await feedbacksApi.list();
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Không thể tải danh sách phản hồi', {
        description: err?.message || 'Vui lòng kiểm tra lại kết nối.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tải danh sách học viên theo khóa học đang chọn
  const loadLearners = useCallback(async (courseId?: string) => {
    if (!courseId) {
      setLearners([]);
      setSelectedLearner('');
      return;
    }
    try {
      const data = await feedbacksApi.getLearners(courseId);
      const list = Array.isArray(data) ? data : [];
      setLearners(list);
      setSelectedLearner(list.length > 0 ? list[0].id : '');
    } catch {
      setLearners([]);
      setSelectedLearner('');
    }
  }, []);

  // Tải danh sách khóa học thuộc content manager hiện tại (theo created_by)
  useEffect(() => {
    contentManagerDashboardApi.get()
      .then((dashboardData) => {
        const courseList = dashboardData?.courses || [];
        if (courseList.length > 0) {
          const dbCourses = courseList.map((c) => ({ id: String(c.id), title: c.title }));
          setCourses(dbCourses);
          setSelectedCourse(dbCourses[0].id);
          loadLearners(dbCourses[0].id);
        } else {
          setCourses([]);
          setSelectedCourse('');
          setLearners([]);
        }
      })
      .catch(() => {
        setCourses([]);
        setSelectedCourse('');
        setLearners([]);
      });
  }, [loadLearners]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingFeedback(null);
    const initialCourse = courses.length > 0 ? courses[0].id : '';
    setSelectedCourse(initialCourse);
    if (initialCourse) {
      loadLearners(initialCourse);
    } else {
      setLearners([]);
      setSelectedLearner('');
    }
    setContextType('progress');
    setContent('');
    setShowModal(true);
  };

  // Mở modal sửa bản nháp (AC-T26)
  const handleOpenEditModal = (fb: FeedbackItem) => {
    if (fb.status !== 'draft') {
      toast.error('Chỉ bản nháp mới có thể chỉnh sửa!');
      return;
    }
    setEditingFeedback(fb);
    setSelectedCourse(fb.courseId);
    if (fb.courseId) {
      loadLearners(fb.courseId).then(() => {
        setSelectedLearner(fb.learnerId);
      });
    } else {
      setSelectedLearner(fb.learnerId);
    }
    setContextType(fb.contextType || 'progress');
    setContent(fb.content);
    setShowModal(true);
  };

  // Chèn định dạng văn bản (Bold, Italic, List, Code) vào textarea (AC-T30)
  const handleInsertFormat = (formatType: 'bold' | 'italic' | 'list' | 'code') => {
    const textarea = document.getElementById('feedback-content-input') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let replacement = '';

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'văn bản in đậm'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'văn bản in nghiêng'}*`;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'mục đầu dòng'}\n`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'mã code'}\``;
        break;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Lưu bản nháp (Draft) hoặc Gửi ngay (Sent)
  const handleSubmitFeedback = async (targetStatus: 'draft' | 'sent') => {
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi!');
      return;
    }
    if (!selectedLearner) {
      toast.error('Vui lòng chọn học viên nhận phản hồi!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFeedback) {
        // Cập nhật bản nháp đã có
        await feedbacksApi.update(editingFeedback.id, {
          content: content.trim(),
          contextType,
        });

        if (targetStatus === 'sent') {
          // Gửi bản nháp vừa sửa
          await feedbacksApi.send(editingFeedback.id);
          toast.success('Đã gửi phản hồi thành công!', {
            description: 'Học viên sẽ nhận được thông báo in-app.',
          });
        } else {
          toast.success('Đã cập nhật bản nháp thành công!');
        }
      } else {
        // Tạo mới hoàn toàn
        const payload: CreateFeedbackPayload = {
          learnerId: selectedLearner,
          courseId: selectedCourse,
          content: content.trim(),
          contextType,
          status: targetStatus,
        };
        await feedbacksApi.create(payload);

        if (targetStatus === 'sent') {
          toast.success('Đã gửi phản hồi thành công!', {
            description: 'Học viên sẽ nhận được thông báo in-app ngay lập tức.',
          });
        } else {
          toast.success('Đã lưu bản nháp thành công!');
        }
      }

      setShowModal(false);
      await loadFeedbacks();
    } catch (err: any) {
      toast.error('Thao tác không thành công', {
        description: err?.message || 'Vui lòng kiểm tra lại thông tin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi trực tiếp bản nháp từ danh sách (AC-T28)
  const handleQuickSend = async (fb: FeedbackItem) => {
    if (fb.status === 'sent') return;
    try {
      await feedbacksApi.send(fb.id);
      toast.success('Đã gửi phản hồi tới học viên!', {
        description: 'Trạng thái chuyển sang Sent và không thể chỉnh sửa.',
      });
      await loadFeedbacks();
    } catch (err: any) {
      toast.error('Gửi phản hồi thất bại', {
        description: err?.message || 'Có lỗi xảy ra.',
      });
    }
  };

  // Xóa bản nháp (AC-T27)
  const handleDeleteFeedback = async (id: string) => {
    try {
      await feedbacksApi.delete(id);
      toast.success('Đã xóa bản nháp thành công!');
      setDeletingFeedbackId(null);
      await loadFeedbacks();
    } catch (err: any) {
      toast.error('Xóa bản nháp thất bại', {
        description: err?.message || 'Có lỗi xảy ra.',
      });
    }
  };

  // Thống kê nhanh: Chỉ 3 chỉ số thiết yếu (Tổng, Đã gửi, Bản nháp)
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const sent = feedbacks.filter((f) => f.status === 'sent').length;
    const draft = feedbacks.filter((f) => f.status === 'draft').length;
    return { total, sent, draft };
  }, [feedbacks]);

  // Danh sách đã qua lọc & tìm kiếm chính xác theo Tên học viên
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      // 1. Lọc theo trạng thái (Tất cả / Đã gửi / Bản nháp)
      if (statusFilter !== 'all' && fb.status !== statusFilter) return false;
      // 2. Lọc theo loại ngữ cảnh (Tiến độ / Kết quả / Nhiệm vụ)
      if (contextFilter !== 'all' && fb.contextType !== contextFilter) return false;
      // 3. Tìm kiếm tập trung vào Tên học viên
      if (searchLearnerName.trim()) {
        const q = searchLearnerName.toLowerCase().trim();
        const matchesName = fb.learnerName.toLowerCase().includes(q);
        if (!matchesName) {
          return false;
        }
      }
      return true;
    });
  }, [feedbacks, statusFilter, contextFilter, searchLearnerName]);

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#002C3E] sm:text-3xl">
            Phản hồi học tập (Feedback)
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Quản lý và gửi phản hồi cá nhân hóa tới học viên về tiến độ, kết quả bài test hoặc nhiệm vụ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#db3540]"
        >
          <Plus className="h-4 w-4" />
          Soạn phản hồi mới
        </button>
      </div>

      {/* ── STATS CARDS (3 CỘT CÂN ĐỐI) ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#637981]">Tổng phản hồi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7444E]/10 text-[#F7444E]">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#002C3E]">{isLoading ? '...' : stats.total}</p>
        </div>

        <div className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#637981]">Đã gửi thành công</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{isLoading ? '...' : stats.sent}</p>
        </div>

        <div className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#637981]">Bản nháp (Draft)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600">{isLoading ? '...' : stats.draft}</p>
        </div>
      </div>

      {/* ── BỘ LỌC VÀ TÌM KIẾM THEO TÊN HỌC VIÊN ───────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#dfe6df] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc trạng thái */}
          <div className="flex rounded-xl bg-[#fbfcf8] border border-[#dfe6df] p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-[#002C3E] shadow-xs'
                  : 'text-[#637981] hover:text-[#002C3E]'
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('sent')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'sent'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-[#637981] hover:text-[#002C3E]'
              }`}
            >
              Đã gửi ({stats.sent})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === 'draft'
                  ? 'bg-white text-amber-600 shadow-xs'
                  : 'text-[#637981] hover:text-[#002C3E]'
              }`}
            >
              Bản nháp ({stats.draft})
            </button>
          </div>

          {/* Lọc loại ngữ cảnh (Tiến độ, Kết quả, Nhiệm vụ) */}
          <select
            value={contextFilter}
            onChange={(e) => setContextFilter(e.target.value)}
            className="rounded-xl border border-[#dfe6df] bg-white px-3 py-1.5 text-xs font-medium text-[#002C3E] outline-none focus:border-[#78BCC4]"
          >
            <option value="all" className="bg-white text-[#002C3E]">Tất cả ngữ cảnh</option>
            <option value="progress" className="bg-white text-[#002C3E]">Tiến độ (Progress)</option>
            <option value="result" className="bg-white text-[#002C3E]">Kết quả test (Result)</option>
            <option value="task" className="bg-white text-[#002C3E]">Nhiệm vụ (Task)</option>
            <option value="general" className="bg-white text-[#002C3E]">Khác / Chung (General)</option>
          </select>
        </div>

        {/* Ô tìm kiếm theo Tên học viên */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#637981]" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên..."
            value={searchLearnerName}
            onChange={(e) => setSearchLearnerName(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] pl-9 pr-4 text-xs text-[#002C3E] placeholder:text-[#637981]/70 outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4]"
          />
        </div>
      </div>

      {/* ── DANH SÁCH FEEDBACK ────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-[#637981]">
            <Loader2 className="h-6 w-6 animate-spin text-[#78BCC4]" />
            <span className="text-sm">Đang tải danh sách phản hồi...</span>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dfe6df] bg-[#fbfcf8] text-[#637981]">
              {searchLearnerName.trim() ? <Search className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </div>
            <p className="text-base font-semibold text-[#002C3E]">
              {searchLearnerName.trim() ? 'Không tìm thấy học viên' : 'Chưa có phản hồi nào'}
            </p>
            <p className="text-xs text-[#637981]">
              {searchLearnerName.trim()
                ? `Không có học viên nào khớp với từ khóa "${searchLearnerName.trim()}".`
                : 'Danh sách phản hồi hiện đang trống.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5ebe5]">
            {filteredFeedbacks.map((item) => {
              const ctx = CONTEXT_TYPE_LABELS[item.contextType] || CONTEXT_TYPE_LABELS.general;
              const isDraft = item.status === 'draft';

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-[#f3f7f5] sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Cột thông tin học viên & nội dung */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Trạng thái Draft / Sent */}
                      {isDraft ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Bản nháp (Draft)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Đã gửi (Sent)
                        </span>
                      )}

                      {/* Loại ngữ cảnh */}
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${ctx.bg} ${ctx.color}`}>
                        {ctx.label}
                      </span>

                      {/* Khóa học */}
                      <span className="inline-flex items-center gap-1 text-[#637981]">
                        <BookOpen className="h-3 w-3 text-[#78BCC4]" />
                        <span className="max-w-[200px] truncate">{item.courseTitle}</span>
                      </span>

                      {/* Thời gian */}
                      <span className="text-[#637981]">
                        {new Date(item.sentAt || item.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* Người nhận */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#78BCC4]/20 text-xs font-bold text-[#002C3E]">
                        {item.learnerName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-[#002C3E]">{item.learnerName}</span>
                      {item.learnerEmail && (
                        <span className="text-xs text-[#637981]">({item.learnerEmail})</span>
                      )}
                    </div>

                    {/* Nội dung phản hồi */}
                    <p className="text-sm text-[#002C3E]/80 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>

                  {/* Cột nút hành động */}
                  <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                    {isDraft ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickSend(item)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          title="Gửi phản hồi này tới học viên"
                        >
                          <Send className="h-3.5 w-3.5" /> Gửi ngay
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="rounded-xl border border-[#dfe6df] bg-white p-2 text-[#637981] transition hover:bg-[#f3f7f5] hover:text-[#002C3E]"
                          title="Chỉnh sửa bản nháp"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFeedbackId(item.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                          title="Xóa bản nháp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewingFeedback(item)}
                        className="flex items-center gap-1.5 rounded-xl border border-[#dfe6df] bg-white px-3 py-1.5 text-xs font-semibold text-[#002C3E] transition hover:bg-[#f3f7f5]"
                      >
                        <Eye className="h-3.5 w-3.5" /> Chi tiết
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL SOẠN / CHỈNH SỬA FEEDBACK ──────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-[#dfe6df] bg-white p-6 text-[#002C3E] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-[#dfe6df] pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7444E]/10 text-[#F7444E]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002C3E]">
                    {editingFeedback ? 'Chỉnh sửa bản nháp phản hồi' : 'Soạn phản hồi mới cho học viên'}
                  </h3>
                  <p className="text-xs text-[#637981]">
                    Phản hồi có thể lưu thành nháp hoặc gửi ngay tới học viên.
                  </p>
                </div>
              </div>
              {/* Nút X đóng duy nhất ở góc trên */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-[#637981] hover:bg-[#f3f7f5] hover:text-[#002C3E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung form */}
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Chọn Khóa học */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#637981] mb-1">
                    Khóa học liên quan *
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCourse(newId);
                      loadLearners(newId);
                    }}
                    disabled={!!editingFeedback}
                    className="w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-2.5 text-xs text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] disabled:bg-[#dfe6df]/30 disabled:text-[#637981]"
                  >
                    {courses.length === 0 && <option value="">Chưa có khóa học nào</option>}
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-[#002C3E]">
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chọn Học viên */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#637981] mb-1">
                    Người nhận (Learner) *
                  </label>
                  <select
                    value={selectedLearner}
                    onChange={(e) => setSelectedLearner(e.target.value)}
                    disabled={!!editingFeedback}
                    className="w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-2.5 text-xs text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] disabled:bg-[#dfe6df]/30 disabled:text-[#637981]"
                  >
                    {learners.length === 0 ? (
                      <option value="">Khóa học chưa có học viên nào ghi danh</option>
                    ) : (
                      learners.map((l) => (
                        <option key={l.id} value={l.id} className="bg-white text-[#002C3E]">
                          {l.name} ({l.email || 'Không có email'})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Chọn Loại ngữ cảnh (Tiến độ / Kết quả / Nhiệm vụ) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#637981] mb-1.5">
                  Loại ngữ cảnh phản hồi
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['progress', 'result', 'task', 'general'] as const).map((type) => {
                    const isSelected = contextType === type;
                    const meta = CONTEXT_TYPE_LABELS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setContextType(type)}
                        className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-[#78BCC4] bg-[#78BCC4]/15 text-[#002C3E] shadow-xs'
                            : 'border-[#dfe6df] bg-[#fbfcf8] text-[#637981] hover:border-[#78BCC4] hover:bg-[#f3f7f5]'
                        }`}
                      >
                        <div className="font-semibold">{meta.label.split(' (')[0]}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-[#002C3E]' : 'text-[#637981]'}`}>
                          {type}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Khung Soạn thảo Nội dung (hỗ trợ Rich Text toolbar tinh tế) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#637981]">
                    Nội dung phản hồi *
                  </label>
                  {/* Toolbar định dạng Rich Text nhỏ gọn */}
                  <div className="flex items-center gap-1 rounded-lg border border-[#dfe6df] bg-[#fbfcf8] px-1.5 py-0.5 text-xs">
                    <span className="text-[10px] text-[#637981] mr-1">Định dạng:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('bold')}
                      className="rounded p-1 text-[#637981] hover:bg-white hover:text-[#002C3E]"
                      title="In đậm (**text**)"
                    >
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('italic')}
                      className="rounded p-1 text-[#637981] hover:bg-white hover:text-[#002C3E]"
                      title="In nghiêng (*text*)"
                    >
                      <Italic className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('list')}
                      className="rounded p-1 text-[#637981] hover:bg-white hover:text-[#002C3E]"
                      title="Danh sách gạch đầu dòng"
                    >
                      <List className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('code')}
                      className="rounded p-1 text-[#637981] hover:bg-white hover:text-[#002C3E]"
                      title="Khối mã (`code`)"
                    >
                      <Code className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <textarea
                  id="feedback-content-input"
                  rows={6}
                  placeholder="Nhập nội dung góp ý, nhận xét tiến độ học tập hoặc hướng dẫn chi tiết dành cho học viên..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-3.5 text-sm text-[#002C3E] placeholder:text-[#637981]/70 outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4]"
                />
              </div>
            </div>

            {/* Nút hành động modal */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#dfe6df] pt-4">
              {/* Nút 1: Lưu Draft */}
              <button
                type="button"
                onClick={() => handleSubmitFeedback('draft')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Lưu bản nháp
              </button>

              {/* Nút 2: Gửi ngay */}
              <button
                type="button"
                onClick={() => handleSubmitFeedback('sent')}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#db3540] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Gửi phản hồi ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM CHI TIẾT FEEDBACK ───────────────────── */}
      {viewingFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#dfe6df] bg-white p-6 text-[#002C3E] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#dfe6df] pb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Phản hồi đã gửi
                </span>
                <h3 className="mt-2 text-lg font-bold text-[#002C3E]">
                  Gửi tới: {viewingFeedback.learnerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingFeedback(null)}
                className="rounded-lg p-1 text-[#637981] hover:bg-[#f3f7f5] hover:text-[#002C3E]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-[#78BCC4]/15 px-2.5 py-1 font-medium text-[#002C3E]">
                  <BookOpen className="h-3.5 w-3.5 text-[#78BCC4]" />
                  <span>{viewingFeedback.courseTitle || viewingFeedback.courseId}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-[#dfe6df] bg-[#fbfcf8] px-2.5 py-1 text-[#002C3E]">
                  <User className="h-3.5 w-3.5 text-[#637981]" />
                  <span>{viewingFeedback.learnerEmail}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-[#dfe6df] bg-[#fbfcf8] px-2.5 py-1 text-[#637981]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(viewingFeedback.sentAt || viewingFeedback.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#637981] mb-1.5">
                  Nội dung phản hồi
                </label>
                <p className="text-sm text-[#002C3E] whitespace-pre-wrap leading-relaxed">
                  {viewingFeedback.content}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingFeedback(null)}
                className="rounded-xl border border-[#dfe6df] bg-white px-5 py-2 text-xs font-semibold text-[#002C3E] hover:bg-[#f3f7f5]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XÁC NHẬN XÓA BẢN NHÁP ──────────────────── */}
      {deletingFeedbackId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#dfe6df] bg-white p-6 text-[#002C3E] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#002C3E]">Xác nhận xóa bản nháp?</h4>
                <p className="mt-1 text-xs text-[#637981]">
                  Bản nháp này sẽ bị xóa vĩnh viễn khỏi hệ thống (AC-T27).
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingFeedbackId(null)}
                className="rounded-xl border border-[#dfe6df] bg-white px-3 py-1.5 text-xs font-semibold text-[#002C3E] hover:bg-[#f3f7f5]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFeedback(deletingFeedbackId)}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

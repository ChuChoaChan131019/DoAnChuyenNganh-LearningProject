'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  Plus,
  Loader2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi } from '@/lib/api';

// Danh sách các khóa học của Content Manager
const AVAILABLE_COURSES = [
  { id: 'course-1', title: 'Advanced C#: Delegates, Events & Async' },
  { id: 'course-2', title: 'Object-Oriented Programming in C#' },
  { id: 'course-3', title: 'C# & OOP Interview Preparation' },
];

interface LearnerItem {
  id: string;
  name: string;
  email: string;
}

interface NotificationItem {
  id: string;
  courseId: string;
  title: string;
  content: string;
  scopeType: 'course' | 'individual';
  recipientCount: number;
  sentAt: string;
  createdAt: string;
}

export default function NotificationsPage() {
  // Trạng thái form soạn thông báo
  const [selectedCourse, setSelectedCourse] = useState(AVAILABLE_COURSES[0].id);
  const [recipientType, setRecipientType] = useState<'course' | 'individual'>('course');
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

  // Trạng thái dữ liệu từ Database
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [learners, setLearners] = useState<LearnerItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingLearners, setIsLoadingLearners] = useState(false);

  // Tải danh sách thông báo đã gửi từ Backend
  const loadSentNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const data = await notificationsApi.getSent();
      setNotifications(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err: any) {
      toast.error('Không thể tải lịch sử thông báo', {
        description: err?.message || 'Vui lòng kiểm tra lại kết nối.',
      });
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // Tải danh sách học viên theo khóa học đang chọn
  const loadCourseLearners = useCallback(async (courseId: string) => {
    setIsLoadingLearners(true);
    try {
      const data = await notificationsApi.getCourseLearners(courseId);
      setLearners(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (err: any) {
      setLearners([]);
    } finally {
      setIsLoadingLearners(false);
    }
  }, []);

  useEffect(() => {
    loadSentNotifications();
  }, [loadSentNotifications]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseLearners(selectedCourse);
    }
  }, [selectedCourse, loadCourseLearners]);

  const handleToggleLearner = (learnerId: string) => {
    setSelectedLearners((prev) =>
      prev.includes(learnerId) ? prev.filter((id) => id !== learnerId) : [...prev, learnerId]
    );
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    if (recipientType === 'individual' && selectedLearners.length === 0) {
      toast.error('Vui lòng chọn ít nhất một học viên nhận thông báo!');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await notificationsApi.send({
        title: title.trim(),
        content: content.trim(),
        scopeType: recipientType,
        courseId: selectedCourse,
        recipientIds: recipientType === 'individual' ? selectedLearners : undefined,
      });

      toast.success('Gửi thông báo thành công!', {
        description: `Đã lưu vào hệ thống và gửi đến ${res.recipientCount} học viên.`,
      });

      // Reset form và đóng modal
      setTitle('');
      setContent('');
      setSelectedLearners([]);
      setShowComposeModal(false);

      // Tải lại danh sách thông báo thật mới nhất từ Backend
      await loadSentNotifications();
    } catch (err: any) {
      toast.error('Gửi thông báo thất bại', {
        description: err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCourseTitle = (courseId: string) => {
    const found = AVAILABLE_COURSES.find((c) => c.id === courseId);
    return found ? found.title : courseId;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#002C3E] sm:text-3xl">
            Thông báo học tập (Notifications)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Tạo và gửi các thông báo, nhắc nhở tiến độ hoặc cập nhật bài học tới học viên.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#e03a44]"
        >
          <Plus className="h-4 w-4" />
          Soạn thông báo mới
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Tổng thông báo đã gửi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7444E]/10 text-[#F7444E]">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#002C3E]">
            {isLoadingNotifications ? '...' : notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Tổng khóa học quản lý</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#002C3E]">{AVAILABLE_COURSES.length}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Kênh gửi hoạt động</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-lg font-bold text-[#002C3E]">In-app Notification (Web)</p>
        </div>
      </div>

      {/* ── DANH SÁCH THÔNG BÁO ĐÃ GỬI (TỪ SUPABASE) ───────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-[#002C3E]">Lịch sử thông báo đã gửi</h2>
          <p className="text-xs text-gray-500">Dữ liệu thông báo thực tế được lưu trữ trên hệ thống.</p>
        </div>

        {isLoadingNotifications ? (
          <div className="flex items-center justify-center p-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Đang tải thông báo từ máy chủ...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Chưa có thông báo nào được gửi</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Bạn chưa gửi thông báo nào cho học viên. Hãy bấm vào nút &quot;Soạn thông báo mới&quot; ở trên để tạo thông báo đầu tiên.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((item) => (
              <div key={item.id} className="p-5 transition-colors hover:bg-gray-50/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                        <BookOpen className="h-3 w-3" />
                        {getCourseTitle(item.courseId)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        <Users className="h-3 w-3" />
                        {item.scopeType === 'course'
                          ? `Toàn bộ khóa (${item.recipientCount} học viên)`
                          : `${item.recipientCount} học viên`}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.content}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(item.sentAt || item.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL SOẠN THÔNG BÁO MỚI ──────────────────────── */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7444E]/10 text-[#F7444E]">
                  <Send className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-[#002C3E]">Soạn thông báo mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="mt-4 space-y-4">
              {/* Chọn khóa học */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Khóa học áp dụng</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedLearners([]);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-[#F7444E] focus:outline-none"
                >
                  {AVAILABLE_COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phạm vi người nhận */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Phạm vi người nhận</label>
                <div className="mt-1.5 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="scope"
                      checked={recipientType === 'course'}
                      onChange={() => setRecipientType('course')}
                      className="accent-[#F7444E]"
                    />
                    Tất cả học viên trong khóa
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="scope"
                      checked={recipientType === 'individual'}
                      onChange={() => setRecipientType('individual')}
                      className="accent-[#F7444E]"
                    />
                    Chọn học viên cụ thể
                  </label>
                </div>
              </div>

              {/* Danh sách học viên nếu chọn gửi riêng */}
              {recipientType === 'individual' && (
                <div className="rounded-xl border border-gray-200 p-3">
                  <span className="block text-xs font-semibold text-gray-600 mb-2">
                    Tích chọn học viên nhận thông báo:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {isLoadingLearners ? (
                      <p className="text-xs text-gray-400">Đang tải danh sách học viên...</p>
                    ) : learners.length > 0 ? (
                      learners.map((l) => (
                        <label key={l.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLearners.includes(l.id)}
                            onChange={() => handleToggleLearner(l.id)}
                            className="accent-[#F7444E]"
                          />
                          <span className="font-medium">{l.name}</span>
                          <span className="text-gray-400">({l.email})</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">Chưa có học viên nào trong khóa này.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Tiêu đề thông báo</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhắc nhở nộp bài tập thực hành Chương 2..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#F7444E] focus:outline-none"
                />
              </div>

              {/* Nội dung */}
              <div>
                <label className="block text-xs font-semibold text-gray-700">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung cần thông báo hoặc dặn dò học viên..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-[#F7444E] focus:outline-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-[#F7444E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e03a44] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Gửi thông báo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Send,
  Users,
  BookOpen,
  Calendar,
  Plus,
  Loader2,
  Inbox,
} from 'lucide-react';
import { notificationsApi, contentManagerDashboardApi } from '@/lib/api';
import { toast } from 'sonner';

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
  // Trạng thái khóa học thật từ API
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  // Trạng thái form soạn thông báo
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

  // Tải danh sách khóa học thuộc content manager hiện tại (theo created_by)
  useEffect(() => {
    contentManagerDashboardApi.get()
      .then((dashboardData) => {
        const list = (dashboardData?.courses || []).map((c) => ({ id: String(c.id), title: c.title }));
        if (list.length > 0) {
          setCourses(list);
          setSelectedCourse(list[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load courses for notifications:', err);
      });
  }, []);

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
    if (!courseId) {
      setLearners([]);
      return;
    }
    setIsLoadingLearners(true);
    try {
      const data = await notificationsApi.getCourseLearners(courseId);
      setLearners(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch {
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
    } else {
      setLearners([]);
    }
  }, [selectedCourse, loadCourseLearners]);

  const handleToggleLearner = (learnerId: string) => {
    setSelectedLearners((prev) =>
      prev.includes(learnerId) ? prev.filter((id) => id !== learnerId) : [...prev, learnerId]
    );
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse) {
      toast.error('Vui lòng chọn khóa học áp dụng!');
      return;
    }

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
    const found = courses.find((c) => c.id === courseId);
    return found ? found.title : 'Khóa học C#';
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Thông báo học tập (Notifications)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tạo và gửi các thông báo, nhắc nhở tiến độ hoặc cập nhật bài học tới học viên.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowComposeModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Soạn thông báo mới
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tổng thông báo đã gửi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">
            {isLoadingNotifications ? '...' : notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tổng khóa học quản lý</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{courses.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Kênh gửi hoạt động</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-lg font-bold text-foreground">In-app Notification (Web)</p>
        </div>
      </div>

      {/* ── DANH SÁCH THÔNG BÁO ĐÃ GỬI (TỪ SUPABASE) ───────── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold text-foreground">Lịch sử thông báo đã gửi</h2>
          <p className="text-xs text-muted-foreground">Dữ liệu thông báo thực tế được lưu trữ trên hệ thống.</p>
        </div>

        {isLoadingNotifications ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Đang tải thông báo từ máy chủ...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Chưa có thông báo nào được gửi</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Bạn chưa gửi thông báo nào cho học viên. Hãy bấm vào nút &quot;Soạn thông báo mới&quot; ở trên để tạo thông báo đầu tiên.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((item) => (
              <div key={item.id} className="p-5 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-300">
                        <BookOpen className="h-3 w-3" />
                        {getCourseTitle(item.courseId)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {item.scopeType === 'course'
                          ? `Toàn bộ khóa (${item.recipientCount} học viên)`
                          : `${item.recipientCount} học viên`}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Send className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Soạn thông báo mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="mt-4 space-y-4">
              {/* Chọn khóa học */}
              <div>
                <label className="block text-xs font-semibold text-foreground">Khóa học áp dụng</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedLearners([]);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  {courses.length === 0 ? (
                    <option value="">Chưa có khóa học nào</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card text-foreground">
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Phạm vi người nhận */}
              <div>
                <label className="block text-xs font-semibold text-foreground">Phạm vi người nhận</label>
                <div className="mt-1.5 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="scope"
                      checked={recipientType === 'course'}
                      onChange={() => setRecipientType('course')}
                      className="accent-primary"
                    />
                    Tất cả học viên trong khóa
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="scope"
                      checked={recipientType === 'individual'}
                      onChange={() => setRecipientType('individual')}
                      className="accent-primary"
                    />
                    Chọn học viên cụ thể
                  </label>
                </div>
              </div>

              {/* Danh sách học viên nếu chọn gửi riêng */}
              {recipientType === 'individual' && (
                <div className="rounded-xl border border-border bg-background/50 p-3">
                  <span className="block text-xs font-semibold text-foreground mb-2">
                    Tích chọn học viên nhận thông báo:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {isLoadingLearners ? (
                      <p className="text-xs text-muted-foreground">Đang tải danh sách học viên...</p>
                    ) : learners.length > 0 ? (
                      learners.map((l) => (
                        <label key={l.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLearners.includes(l.id)}
                            onChange={() => handleToggleLearner(l.id)}
                            className="accent-primary"
                          />
                          <span className="font-medium">{l.name}</span>
                          <span className="text-muted-foreground">({l.email})</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Chưa có học viên nào trong khóa này.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tiêu đề */}
              <div>
                <label className="block text-xs font-semibold text-foreground">Tiêu đề thông báo</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhắc nhở nộp bài tập thực hành Chương 2..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Nội dung */}
              <div>
                <label className="block text-xs font-semibold text-foreground">Nội dung chi tiết</label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung cần thông báo hoặc dặn dò học viên..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
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

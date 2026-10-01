'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Save,
  Bookmark,
  Clock,
  ExternalLink,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { notesApi, bookmarkApi, type BookmarkLessonItem } from '../../../lib/api';
import { formatDate } from '../../../lib/date';
import type { Note, CreateNotePayload, UpdateNotePayload } from '../../../types/notes';
import DOMPurify from 'isomorphic-dompurify';

type NoteFormData = CreateNotePayload & Partial<Omit<UpdateNotePayload, keyof CreateNotePayload>>;

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}

export default function NotesAndBookmarksPage() {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks'>('notes');

  // ─── Notes State ────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<NoteFormData>({ title: '', content: '' });

  // ─── Bookmarks State ────────────────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState<BookmarkLessonItem[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // ─── Filter State for Notes ─────────────────────────────────────────────────
  const [noteFilter, setNoteFilter] = useState<'all' | 'lesson' | 'general'>('all');

  const lessonNotesCount = notes.filter((n) => !!n.lesson_id).length;
  const generalNotesCount = notes.filter((n) => !n.lesson_id).length;

  const filteredNotes = notes.filter((n) => {
    if (noteFilter === 'lesson') return !!n.lesson_id;
    if (noteFilter === 'general') return !n.lesson_id;
    return true;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const data = await notesApi.list({ search: debouncedSearch || undefined });
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, [debouncedSearch]);

  // Fetch Bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      setLoadingBookmarks(true);
      const data = await bookmarkApi.list();
      setBookmarks(data || []);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setLoadingBookmarks(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Fetch bookmarks ngay khi mount để hiển thị số lượng bài học đã lưu chính xác trên Tab Badge
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Tự động làm mới khi chuyển sang tab bookmarks
  useEffect(() => {
    if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [activeTab, fetchBookmarks]);

  // Note Handlers
  const handleCreate = () => {
    setEditingNote(null);
    setFormData({ title: '', content: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title || '', content: note.content });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    try {
      await notesApi.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Đã xóa ghi chú');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Không thể xóa ghi chú');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    try {
      if (editingNote) {
        const updated = await notesApi.update(editingNote.id, formData);
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        toast.success('Đã cập nhật ghi chú');
      } else {
        const created = await notesApi.create(formData);
        setNotes((prev) => [created, ...prev]);
        toast.success('Đã tạo ghi chú mới');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Không thể lưu ghi chú');
    }
  };

  // Bookmark Handlers
  const handleRemoveBookmark = async (lessonId: string) => {
    try {
      await bookmarkApi.toggle(lessonId);
      setBookmarks((prev) => prev.filter((b) => b.lesson_id !== lessonId));
      toast.success('Đã bỏ lưu bài học');
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      toast.error('Không thể bỏ lưu bài học');
    }
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    if (!debouncedSearch) return true;
    const lessonTitle = b.lessons?.title?.toLowerCase() || '';
    const courseTitle = b.lessons?.chapters?.courses?.title?.toLowerCase() || '';
    const q = debouncedSearch.toLowerCase();
    return lessonTitle.includes(q) || courseTitle.includes(q);
  });

  return (
    <div className="mx-auto max-w-[1216px] space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">
            Notes & Bookmarks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý sổ tay ghi chú và danh sách bài học đã lưu để ôn tập.
          </p>
        </div>

        {activeTab === 'notes' && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'notes'
              ? 'border-[#f7444e] text-[#f7444e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          Ghi chú của tôi ({notes.length})
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'bookmarks'
              ? 'border-[#f7444e] text-[#f7444e]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          Bài học đã lưu ({bookmarks.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={
            activeTab === 'notes'
              ? 'Tìm kiếm trong ghi chú...'
              : 'Tìm kiếm bài học hoặc khóa học đã lưu...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
        />
      </div>

      {/* ─── TAB 1: NOTES GRID ─── */}
      {activeTab === 'notes' && (
        <>
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 text-xs font-semibold">
            <span className="text-slate-400 mr-1 text-[11px]">Bộ lọc:</span>
            <button
              type="button"
              onClick={() => setNoteFilter('all')}
              className={`rounded-full px-3 py-1 transition ${
                noteFilter === 'all'
                  ? 'bg-[#0f3741] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setNoteFilter('lesson')}
              className={`rounded-full px-3 py-1 transition ${
                noteFilter === 'lesson'
                  ? 'bg-[#0f3741] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📘 Theo bài học ({lessonNotesCount})
            </button>
            <button
              type="button"
              onClick={() => setNoteFilter('general')}
              className={`rounded-full px-3 py-1 transition ${
                noteFilter === 'general'
                  ? 'bg-[#0f3741] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📝 Ghi chú tự do ({generalNotesCount})
            </button>
          </div>

          {loadingNotes ? (
            <div className="text-center py-12 text-slate-500">Đang tải ghi chú...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {debouncedSearch
                ? 'Không tìm thấy ghi chú nào phù hợp với từ khóa.'
                : noteFilter === 'lesson'
                ? 'Chưa có ghi chú bài học nào. Khi học, hãy nhấn biểu tượng cây bút chì trong bài học để ghi chú!'
                : noteFilter === 'general'
                ? 'Chưa có ghi chú tự do nào. Nhấn "+ New Note" để tạo ghi chú mới!'
                : 'Chưa có ghi chú nào. Hãy tạo ghi chú đầu tiên!'}
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="break-inside-avoid rounded-[24px] border border-[#dfe6df] bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition"
                >
                  {/* Header: Badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {note.lesson ? (
                      <div className="flex flex-col min-w-0 max-w-[calc(100%-65px)]">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200/60 px-2.5 py-0.5 text-[11px] font-bold text-[#0f3741] truncate"
                          title={note.lesson.title}
                        >
                          <BookOpen className="h-3 w-3 text-[#78bcc4] shrink-0" />
                          <span className="truncate">{note.lesson.title}</span>
                        </span>
                        {note.lesson.course_title && (
                          <span className="text-[10px] text-slate-400 truncate mt-0.5 pl-1">
                            {note.lesson.course_title}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                        Ghi chú tự do
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50 transition"
                        aria-label="Edit note"
                        title="Chỉnh sửa ghi chú"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition"
                        aria-label="Delete note"
                        data-testid={`delete-note-${note.id}`}
                        title="Xóa ghi chú"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title (if any) */}
                  {note.title && (
                    <h3 className="text-sm font-bold text-[#0f3741] mb-1.5 break-words">
                      {note.title}
                    </h3>
                  )}

                  {/* Content */}
                  <div
                    className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
                  />

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {formatDate(note.updated_at)}
                    </span>

                    {note.lesson ? (
                      <Link
                        href={`/learner/courses/${note.lesson.course_slug || 'csharp-fundamentals'}/lessons/${note.lesson.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-cyan-50 border border-cyan-200/50 px-2.5 py-1 text-xs font-bold text-[#0f3741] hover:bg-cyan-100 transition shadow-2xs"
                        title="Xem bài học này"
                      >
                        Xem bài học
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: BOOKMARKS GRID ─── */}
      {activeTab === 'bookmarks' && (
        <>
          {loadingBookmarks ? (
            <div className="text-center py-12 text-slate-500">Đang tải danh sách bài học đã lưu...</div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {debouncedSearch
                ? 'Không tìm thấy bài học phù hợp với từ khóa.'
                : 'Bạn chưa lưu bài học nào. Khi học, hãy nhấn nút Bookmark để lưu lại ôn tập sau!'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBookmarks.map((b) => {
                const lesson = b.lessons;
                const course = lesson?.chapters?.courses;
                const courseSlug = course?.slug || 'csharp-fundamentals';
                const lessonId = lesson?.id || b.lesson_id;
                const lessonHref = `/learner/courses/${courseSlug}/lessons/${lessonId}`;

                return (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between rounded-[20px] border border-[#dfe6df] bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition"
                  >
                    <div>
                      {/* Course badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 truncate max-w-[170px]">
                            <BookOpen className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{course?.title || 'Khóa học'}</span>
                          </span>

                          {b.is_completed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#dff5ea] px-2 py-0.5 text-[10px] font-bold text-[#2b9e6a] border border-[#a2e5c6]">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              Đã hoàn thành
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveBookmark(b.lesson_id)}
                          className="text-slate-400 hover:text-rose-500 p-1 shrink-0"
                          title="Bỏ lưu bài học"
                        >
                          <Bookmark className="h-4 w-4 fill-current text-[#f7444e]" />
                        </button>
                      </div>

                      {/* Lesson title */}
                      <h3 className="text-base font-bold text-[#0f3741] mt-2 mb-1 line-clamp-2">
                        {lesson?.title || 'Bài học đã lưu'}
                      </h3>

                      {/* Chapter info */}
                      {lesson?.chapters?.title && (
                        <p className="text-xs text-slate-500 mb-3">
                          Chương: {lesson.chapters.title}
                        </p>
                      )}

                      {/* Duration */}
                      {lesson?.estimated_duration_minutes ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{lesson.estimated_duration_minutes} phút học</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Action link */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Đã lưu: {formatDate(b.created_at)}
                      </span>
                      {b.is_completed ? (
                        <Link
                          href={lessonHref}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#2b9e6a] border border-[#a2e5c6] hover:bg-emerald-100 transition shadow-xs"
                          title="Xem lại nội dung bài học đã hoàn thành"
                        >
                          Ôn tập lại
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <Link
                          href={lessonHref}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#f7444e] hover:bg-rose-100 transition"
                          title="Tiếp tục học bài học này"
                        >
                          Học tiếp
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0f3741]">
                {editingNote ? 'Edit Note' : 'Create Note'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title (optional)"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
              />
              <textarea
                placeholder="Write your note..."
                value={formData.content}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                rows={6}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20 resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-600"
                >
                  <Save className="h-4 w-4" />
                  {editingNote ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

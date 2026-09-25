'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { notesApi } from '../../../lib/api';
import type { Note, CreateNotePayload } from '../../../types/notes';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<CreateNotePayload>({ title: '', content: '' });

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notesApi.list({ search: searchQuery || undefined });
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
    if (!confirm('Delete this note?')) return;
    try {
      await notesApi.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    try {
      if (editingNote) {
        const updated = await notesApi.update(editingNote.id, formData);
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      } else {
        const created = await notesApi.create(formData);
        setNotes(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  return (
    <div className="mx-auto max-w-[1216px] space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">My Notes</h1>
          <p className="mt-1 text-sm text-slate-500">Capture your thoughts and code snippets.</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
        />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {searchQuery ? 'No notes found.' : 'No notes yet. Create your first note!'}
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className="break-inside-avoid rounded-[24px] border border-[#dfe6df] bg-[#fbfdf9] p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#145a68] bg-cyan-50 px-2 py-1 rounded-md">
                  {note.title || 'Untitled'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Edit note"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label="Delete note"
                    data-testid={`delete-note-${note.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                {new Date(note.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0f3741]">
                {editingNote ? 'Edit Note' : 'Create Note'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title (optional)"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
              />
              <textarea
                placeholder="Write your note..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
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

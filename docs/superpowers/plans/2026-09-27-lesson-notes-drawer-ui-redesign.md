# Lesson Notes Drawer UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the lesson notes drawer in the learner lesson page (`frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`) by removing the modal backdrop blur, adding a note title input, expanding the note editor to take up the majority of the drawer height, and compacting the existing notes list into the lower portion.

**Architecture:**
- Frontend-only changes in `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`.
- The backdrop overlay `<div className="fixed inset-0 ...">` is completely removed, transforming the drawer into a non-blocking floating side panel so learners can read lesson material/code while taking notes.
- A `newNoteTitle` state is introduced and sent to `notesApi.create({ title, content, lesson_id })` (which already accepts `title`).
- The drawer flex layout is reordered: the editor takes `flex-1` (majority height ~65-70%), while the notes list is placed underneath in a compact scrollable container (`max-h-[220px]`, ~30-35%).

**Tech Stack:** Next.js (React 19, TypeScript), Tailwind CSS, Lucide React icons, `notesApi` client.

**Spec:** In-chat bounded design agreed with user on 2026-09-27.

## Global Constraints
- Do not introduce new dependencies; use existing Tailwind classes and Lucide icons (`FileText`, `X`, `Edit3`, `Trash2`, `ExternalLink`).
- Ensure no backdrop overlay blocks clicking or viewing the lesson content.
- Support both `title` (optional) and `content` (required).
- Keep delete confirmation dialog (`window.confirm`) intact.
- Maintain TypeScript compilation with 0 errors via `cd frontend && npx tsc --noEmit`.

## Review Focus
1. **No Backdrop:** Verify that no overlay `div` is rendered when `isNoteOpen` is true; clicking outside the drawer should interact with the page, and the drawer closes via the `X` button or FAB.
2. **Title Handling:** Verify that empty or whitespace-only titles are sent as `undefined` rather than empty strings, and that titles appear clearly in the note card.
3. **Height Allocation:** Verify that the textarea expands to fill the available height in the editor block (`flex-1`), and that long notes in the list scroll inside `max-h-[220px]` without expanding the drawer.
4. **Validation:** Verify that the Save button remains disabled when content is empty, regardless of title.
5. **Mobile Responsiveness:** Ensure the drawer remains usable on small screens (`w-full max-w-md`).

---

### Task 1: Add `newNoteTitle` state and update `handleCreateNote`

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx:560-635`

**Interfaces:**
- Consumes: `notesApi.create(payload: CreateNotePayload)` from `frontend/src/lib/api.ts`
- Produces: `newNoteTitle` state and updated `handleCreateNote` sending `title: newNoteTitle.trim() || undefined`

- [ ] **Step 1: Check existing state and create handler**

Examine `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx` around line 560 to verify current state declarations (`newNoteContent`, `isCreating`).

- [ ] **Step 2: Add `newNoteTitle` state and update `handleCreateNote`**

In `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`:
Add state:
```typescript
const [newNoteTitle, setNewNoteTitle] = useState('');
```
Update `handleCreateNote`:
```typescript
  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    setIsCreating(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeLessonId);
      await notesApi.create({
        lesson_id: isUuid ? activeLessonId : undefined,
        title: newNoteTitle.trim() || undefined,
        content: newNoteContent.trim(),
      });
      setNewNoteTitle('');
      setNewNoteContent('');
      await fetchNotes();
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setIsCreating(false);
    }
  };
```

- [ ] **Step 3: Run TypeScript compiler to verify no syntax or type errors**

Run: `cd frontend && npx tsc --noEmit && echo "TypeScript check clean"`
Expected: `TypeScript check clean` with exit code 0.

- [ ] **Step 4: Commit state and API updates**

```bash
git add "frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx"
git commit -m "feat(lesson-notes): add note title state and payload"
```

---

### Task 2: Redesign Drawer Layout (Remove Backdrop, Expand Editor, Compact List)

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx:1065-1165`

**Interfaces:**
- Consumes: `newNoteTitle`, `setNewNoteTitle`, `newNoteContent`, `setNewNoteContent`, `handleCreateNote`, `handleDeleteNote`, `notes`, `isLoadingNotes`
- Produces: New Drawer JSX without backdrop, full-height editor area, and compact lower notes list.

- [ ] **Step 1: Replace Drawer markup in `page.tsx`**

Replace the current drawer markup with the new redesigned structure:
1. **FAB button**: Update `onClick` to toggle:
```tsx
      {/* Note FAB */}
      <button
        onClick={() => {
          if (!isNoteOpen) {
            fetchNotes();
          }
          setIsNoteOpen((prev) => !prev);
        }}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0f3741] text-white shadow-xl transition hover:scale-105 hover:bg-[#145a68]"
        title="Ghi chú bài học"
      >
        <Edit3 className="h-6 w-6" />
      </button>
```

2. **Drawer container (NO backdrop overlay)**:
```tsx
      {/* Note Drawer (No backdrop overlay) */}
      {isNoteOpen && (
        <aside
          aria-label="Bảng ghi chú bài học"
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform ease-[cubic-bezier(0.32,0.72,0,1)] duration-500 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f3741]">Ghi chú bài học</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{currentLesson.title}</p>
              </div>
            </div>
            <button
              onClick={() => setIsNoteOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Đóng ghi chú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Editor Area (Dominant - Takes remaining vertical space) */}
          <div className="flex-1 flex flex-col p-4 bg-white min-h-0">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Tiêu đề ghi chú (tùy chọn)..."
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#78bcc4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10 transition"
            />
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Nội dung ghi chú... (Hỗ trợ Markdown)"
              className="flex-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10 transition"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {newNoteContent.length} ký tự
              </span>
              <button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || isCreating}
                className="rounded-lg bg-[#0f3741] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#145a68] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isCreating ? 'Đang lưu...' : 'Lưu ghi chú'}
              </button>
            </div>
          </div>

          {/* Compact Notes List Section (Subordinate - Max 220px height) */}
          <div className="border-t border-slate-200 bg-slate-50 p-4 max-h-[220px] flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ghi chú bài này ({notes.length})
              </span>
              <Link
                href="/learner/notes"
                className="text-xs font-semibold text-[#f7444e] hover:text-rose-600 transition"
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingNotes ? (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <div className="h-5 w-5 border-2 border-slate-300 border-t-[#0f3741] rounded-full animate-spin" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  Chưa có ghi chú nào cho bài học này
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {note.title && (
                          <h4 className="text-xs font-bold text-slate-800 truncate mb-0.5">
                            {note.title}
                          </h4>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="Xóa ghi chú"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(note.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      )}
```

- [ ] **Step 2: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit && echo "TypeScript check clean"`
Expected: `TypeScript check clean` with exit code 0.

- [ ] **Step 3: Verify backend build**

Run: `cd backend && npm run build`
Expected: NestJS build succeeds with exit code 0.

- [ ] **Step 4: Commit redesigned drawer layout**

```bash
git add "frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx"
git commit -m "feat(lesson-notes): redesign drawer with title input, full editor and no backdrop"
```


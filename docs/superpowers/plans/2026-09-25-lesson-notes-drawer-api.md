# Lesson Notes Drawer - Connect to API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for 2-task plan) or superpowers:subagent-driven-development

**Goal:** Kết nối drawer ghi chú trong trang bài học với backend API để lưu/nạp nhiều notes theo lessonId

**Architecture:** Thay textarea đơn lẻ bằng danh sách notes (fetch từ API) + form tạo mới. Mỗi note có nội dung, thời gian, và nút xóa.

**Tech Stack:** Next.js App Router, React hooks, notesApi từ `@/lib/api`, types từ `@/types/notes`

**Spec:** Design đã approve trong conversation (bounded approach)

---

## Files to Modify

- `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx` - Thay đổi drawer UI và thêm API calls

---

## Task 1: Fetch notes on drawer open

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx:160-180`

**Interfaces:**
- Consumes: `lessonId` từ useParams(), `notesApi.list({ lessonId })` từ `@/lib/api`
- Produces: State `notes: Note[]`, `isLoadingNotes: boolean`

- [ ] **Step 1: Thêm state cho notes list**

Thêm vào đầu file, sau các useState hiện tại:
```typescript
const [notes, setNotes] = useState<Note[]>([]);
const [isLoadingNotes, setIsLoadingNotes] = useState(false);
```

- [ ] **Step 2: Thêm hàm fetchNotes**

Sau các hàm xử lý hiện tại (sau `handleCopyCode`):
```typescript
const fetchNotes = async () => {
  setIsLoadingNotes(true);
  try {
    const data = await notesApi.list({ lessonId });
    setNotes(data);
  } catch (err) {
    console.error('Failed to load notes:', err);
  } finally {
    setIsLoadingNotes(false);
  }
};
```

- [ ] **Step 3: Gọi fetchNotes khi drawer mở**

Sửa `setIsNoteOpen(true)` thành:
```typescript
onClick={() => {
  setIsNoteOpen(true);
  fetchNotes();
}}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/learner/courses/\[slug\]/lessons/\[lessonId\]/page.tsx
git commit -m "feat(lesson-notes): add fetch notes on drawer open"
```

---

## Task 2: Build notes list UI + create note

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx:1033-1080`

**Interfaces:**
- Consumes: `notes`, `isLoadingNotes`, `notesApi.create()`, `notesApi.delete()`, `lessonId`
- Produces: Giao diện drawer mới với list + form

- [ ] **Step 1: Thêm state cho create form**

```typescript
const [newNoteContent, setNewNoteContent] = useState('');
const [isCreating, setIsCreating] = useState(false);
```

- [ ] **Step 2: Thêm hàm tạo note**

```typescript
const handleCreateNote = async () => {
  if (!newNoteContent.trim()) return;
  setIsCreating(true);
  try {
    await notesApi.create({ lesson_id: lessonId, content: newNoteContent.trim() });
    setNewNoteContent('');
    await fetchNotes();
  } catch (err) {
    console.error('Failed to create note:', err);
  } finally {
    setIsCreating(false);
  }
};
```

- [ ] **Step 3: Thêm hàm xóa note**

```typescript
const handleDeleteNote = async (id: string) => {
  try {
    await notesApi.delete(id);
    setNotes(notes.filter(n => n.id !== id));
  } catch (err) {
    console.error('Failed to delete note:', err);
  }
};
```

- [ ] **Step 4: Thay thế drawer content**

Thay toàn bộ phần `{/* Note Drawer */}` (từ dòng 1033) bằng:

```tsx
{/* Note Drawer */}
{isNoteOpen && (
  <>
    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsNoteOpen(false)} />
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform ease-[cubic-bezier(0.32,0.72,0,1)] duration-500 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#0f3741]">My Notes</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{currentLesson.title}</p>
          </div>
        </div>
        <button onClick={() => setIsNoteOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingNotes ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <div className="h-6 w-6 border-2 border-slate-300 border-t-[#0f3741] rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Chưa có ghi chú nào cho bài học này
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                    title="Xóa ghi chú"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(note.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Note Form */}
      <div className="border-t border-slate-100 p-4 bg-slate-50">
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Viết ghi chú mới..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
          rows={3}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {notes.length} ghi chú
          </span>
          <button
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || isCreating}
            className="rounded-lg bg-[#0f3741] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#145a68] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Đang lưu...' : 'Lưu ghi chú'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-end">
        <Link href="/learner/notes" className="text-xs font-semibold text-[#f7444e] hover:text-rose-600 transition">
          View all notes →
        </Link>
      </div>
    </div>
  </>
)}
```

- [ ] **Step 5: Test thủ công**

1. Mở trang bài học → click nút ghi chú (Edit3)
2. Kiểm tra loading spinner hiện ra
3. Tạo 2-3 ghi chú → verify chúng hiển thị
4. Reload trang → mở lại drawer → notes vẫn còn
5. Xóa 1 note → verify nó biến mất
6. Click "View all notes" → verify navigate đúng

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/learner/courses/\[slug\]/lessons/\[lessonId\]/page.tsx
git commit -m "feat(lesson-notes): connect drawer to API with list/create/delete"
```

---

## Review Focus

1. **Empty lessonId**: Nếu `lessonId` undefined, `notesApi.list({})` sẽ trả về tất cả notes → Thêm guard check hoặc chấp nhận behavior hiện tại (lesson page luôn có lessonId)
2. **Delete confirmation**: Không có confirm dialog trước khi xóa → Thêm `confirm()` hoặc chấp nhận quick delete
3. **Optimistic update**: Xóa note là optimistic (update UI trước) → Cần rollback nếu API fail
4. **Empty content**: User submit empty note → Disabled button + trim check đã cover
5. **Network error**: API fail → Hiện tại silent fail với console.error → Acceptable cho MVP

---

## Self-Review Checklist

- [x] Spec coverage: List notes, Create note, Delete note đều có task cover
- [x] No placeholders: Tất cả code đều có actual content
- [x] Type consistency: `Note`, `notesApi.list()`, `notesApi.create()`, `notesApi.delete()` đúng từ types/api
- [x] Review Focus: 5 cases đã listed với test approach

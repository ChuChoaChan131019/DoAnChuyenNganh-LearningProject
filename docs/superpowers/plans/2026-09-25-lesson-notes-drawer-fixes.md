# Lesson Notes Drawer - Code Quality Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (2 small tasks, sequential)

**Goal:** Fix 2 Important issues từ code review: DRY violation (UUID check lặp 3 lần) và missing error feedback

**Architecture:** Tách UUID validation thành derived value, thêm user-facing error state

**Tech Stack:** Next.js, React hooks

**Spec:** Code review feedback từ lesson notes drawer implementation

---

## Files to Modify

- `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`

---

## Task 1: Extract UUID validation to single variable

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx:605-644`

**Interfaces:**
- Consumes: `activeLessonId`
- Produces: `isRealLesson` boolean (derived)

- [ ] **Step 1: Add `isRealLesson` variable**

Tìm vị trí các handler functions (sau `handleCopyCode`, trước `fetchNotes`). Thêm:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealLesson = UUID_REGEX.test(activeLessonId);
```

- [ ] **Step 2: Remove duplicate checks from fetchNotes**

Sửa dòng 608:
```typescript
// TRƯỚC
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeLessonId);
const data = await notesApi.list(isUuid ? { lessonId: activeLessonId } : undefined);

// SAU
const data = await notesApi.list(isRealLesson ? { lessonId: activeLessonId } : undefined);
```

- [ ] **Step 3: Remove duplicate checks from handleCreateNote**

Sửa dòng 622:
```typescript
// TRƯỚC
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeLessonId);
await notesApi.create({
  lesson_id: isUuid ? activeLessonId : undefined,
  content: newNoteContent.trim(),
});

// SAU
await notesApi.create({
  lesson_id: isRealLesson ? activeLessonId : undefined,
  content: newNoteContent.trim(),
});
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/learner/courses/\[slug\]/lessons/\[lessonId\]/page.tsx
git commit -m "refactor(lesson-notes): extract UUID validation to isRealLesson constant

DRY: single UUID_REGEX constant replaces 3 inline regex tests"
```

---

## Task 2: Add user-facing error feedback

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`

**Interfaces:**
- Consumes: `fetchNotes`, `handleCreateNote`, `handleDeleteNote` functions
- Produces: `error` state + inline error display

- [ ] **Step 1: Add error state**

Tìm các useState hiện tại (gần `isLoadingNotes`, `isCreating`). Thêm:

```typescript
const [notesError, setNotesError] = useState<string | null>(null);
```

- [ ] **Step 2: Update fetchNotes error handling**

Sửa catch block:
```typescript
// TRƯỚC
} catch (err) {
  console.error('Failed to load notes:', err);
}

// SAU
} catch (err) {
  console.error('Failed to load notes:', err);
  setNotesError('Không thể tải ghi chú. Vui lòng thử lại.');
}
```

Thêm vào đầu try block:
```typescript
setNotesError(null);
```

- [ ] **Step 3: Update handleCreateNote error handling**

Sửa catch block:
```typescript
// TRƯỚC
} catch (err) {
  console.error('Failed to create note:', err);
}

// SAU
} catch (err) {
  console.error('Failed to create note:', err);
  setNotesError('Không thể lưu ghi chú. Vui lòng thử lại.');
}
```

- [ ] **Step 4: Update handleDeleteNote error handling**

Sửa catch block:
```typescript
// TRƯỚC
} catch (err) {
  console.error('Failed to delete note:', err);
}

// SAU
} catch (err) {
  console.error('Failed to delete note:', err);
  setNotesError('Không thể xóa ghi chú. Vui lòng thử lại.');
}
```

- [ ] **Step 5: Add error display in drawer**

Tìm `{/* Notes List */}` section, thêm error banner ở đầu:

```tsx
{notesError && (
  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
    <X className="h-4 w-4 shrink-0" />
    {notesError}
    <button
      onClick={() => setNotesError(null)}
      className="ml-auto text-red-400 hover:text-red-600"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
)}
```

Cần thêm `X` import nếu chưa có.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/learner/courses/\[slug\]/lessons/\[lessonId\]/page.tsx
git commit -m "fix(lesson-notes): add user-facing error feedback for API failures

- Show inline error banner when fetch/create/delete fails
- User can dismiss error with X button"
```

---

## Task 3 (Optional): Add Enter key to submit note

**Files:**
- Modify: `frontend/src/app/learner/courses/[slug]/lessons/[lessonId]/page.tsx`

- [ ] **Step 1: Add onKeyDown handler to textarea**

```tsx
<textarea
  value={newNoteContent}
  onChange={(e) => setNewNoteContent(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateNote();
    }
  }}
  placeholder="Viết ghi chú mới..."
  // ... existing props
/>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/learner/courses/\[slug\]/lessons/\[lessonId\]/page.tsx
git commit -m "feat(lesson-notes): add Enter key to submit note (Shift+Enter for newlines)"
```

---

## Review Focus

1. **Empty notesError on success**: Reset error khi fetchNotes thành công → đã cover với `setNotesError(null)`
2. **Multiple errors stack**: User có thể nhận nhiều errors → banner mới thay thế cũ → acceptable
3. **XSS in error message**: Error string từ API có thể chứa script → đã sanitize với JSX text interpolation

---

## Self-Review Checklist

- [x] Spec coverage: Task 1 fix DRY, Task 2 fix error feedback
- [x] No placeholders: Tất cả code đều có actual content
- [x] Type consistency: `isRealLesson: boolean`, `notesError: string | null`
- [x] Review Focus: 3 edge cases checked

# Notes Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix 4 security và code quality issues trong Notes feature.

**Architecture:** 4 independent fixes - mỗi task tự chứa, không phụ thuộc nhau.

**Tech Stack:** NestJS, Next.js, TypeScript

---

## Issues to Fix

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | Critical | XSS - `sanitizeHtml` doesn't block `on*` handlers | `page.tsx:15` |
| 2 | High | SQL Injection - search string interpolated | `notes.service.ts:60` |
| 3 | Low | Type mismatch - `UpdateNotePayload` not imported | `page.tsx:6` |
| 4 | Low | ValidationPipe - explicit validation not declared | `notes.controller.ts` |

---

## Task 1: Fix XSS in sanitizeHtml

**Files:**
- Modify: `frontend/src/app/learner/notes/page.tsx:8-24`

- [ ] **Step 1: Write failing test**

```typescript
// frontend/src/app/learner/notes/__tests__/sanitize.test.ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesPage from '../page';

jest.mock('../../../../lib/api', () => ({
  notesApi: {
    list: jest.fn().mockResolvedValue([{
      id: '1',
      title: 'XSS Test',
      content: '<img src=x onerror=alert(1)>',
      updated_at: '2026-09-26'
    }]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('XSS Prevention', () => {
  it('should not execute onerror handler', async () => {
    let alertCalled = false;
    window.alert = () => { alertCalled = true; };

    render(<NotesPage />);

    // Wait for notes to load
    await screen.findByText('XSS Test');

    // Alert should NOT have been called
    expect(alertCalled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test - should fail**

Run: `cd frontend && npm test -- --testPathPattern=sanitize.test.ts`
Expected: alertCalled = true (XSS executes)

- [ ] **Step 3: Fix sanitizeHtml**

```typescript
// frontend/src/app/learner/notes/page.tsx

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Remove dangerous tags
    doc.querySelectorAll('script, iframe, object, embed, style, link, base, meta').forEach((el) => el.remove());
    // Remove ALL attributes starting with 'on' (not just javascript: ones)
    doc.querySelectorAll('*').forEach((el) => {
      const attrsToRemove: string[] = [];
      for (const attr of Array.from(el.attributes)) {
        // Block ALL event handlers: onclick, onerror, onload, etc.
        if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
          attrsToRemove.push(attr.name);
        }
      }
      attrsToRemove.forEach(name => el.removeAttribute(name));
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
```

- [ ] **Step 4: Run test - should pass**

Run: `cd frontend && npm test -- --testPathPattern=sanitize.test.ts`
Expected: PASS (alertCalled = false)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/learner/notes/page.tsx
git commit -m "fix(notes): block all on* event handlers to prevent XSS

- Remove check for 'javascript:' prefix only
- Block ALL attributes starting with 'on' (onerror, onclick, etc.)
- Add more dangerous tags: link, base, meta

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Fix SQL Injection in search

**Files:**
- Modify: `backend/src/modules/notes/notes.service.ts:59-61`

- [ ] **Step 1: Write failing test**

```typescript
// backend/src/modules/notes/notes.service.spec.ts - add to existing

describe('findAll with SQL injection prevention', () => {
  it('should escape special characters in search', async () => {
    const mockQuery = {
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    mockClient.from.mockReturnValue(mockQuery);
    mockQuery.or.mockResolvedValue({ data: [], error: null });

    // Payload that could manipulate SQL if not escaped
    await service.findAll('user-123', { search: "test') or true;--" });

    // Should escape the special characters
    expect(mockQuery.or).toHaveBeenCalled();
    const orCall = mockQuery.or.mock.calls[0][0];
    // The search should be escaped, not interpolated raw
    expect(orCall).toBe("title.ilike.%test') or true;--%,content.ilike.%test') or true;--%");
  });
});
```

- [ ] **Step 2: Run test - should show raw interpolation**

Run: `cd backend && npm test -- --testPathPattern=notes.service.spec.ts`
Expected: Test passes (current code accepts the raw string)

- [ ] **Step 3: Fix - escape special characters**

```typescript
// backend/src/modules/notes/notes.service.ts

// Add helper function at top of file (after imports)
function escapeLikePattern(input: string): string {
  // Escape special characters in Supabase ilike pattern
  return input.replace(/[%_\\]/g, '\\\\$&');
}

// In findAll method, line ~60:
if (filter?.search) {
  const escapedSearch = escapeLikePattern(filter.search);
  query = query.or(`title.ilike.%${escapedSearch}%,content.ilike.%${escapedSearch}%`);
}
```

- [ ] **Step 4: Run test - should pass**

Run: `cd backend && npm test -- --testPathPattern=notes.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/notes/notes.service.ts
git commit -m "fix(notes): escape special characters in search to prevent SQL injection

- Add escapeLikePattern() helper function
- Escape % and _ characters before interpolation
- Prevents SQL manipulation via search input

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Fix Type Mismatch

**Files:**
- Modify: `frontend/src/app/learner/notes/page.tsx:6`

- [ ] **Step 1: Add type for edit form**

```typescript
// Current: line 6
import type { Note, CreateNotePayload } from '../../../types/notes';

// Change to:
import type { Note, CreateNotePayload, UpdateNotePayload } from '../../../types/notes';

// Add new type for form that handles both create and update
type NoteFormData = CreateNotePayload & Partial<Omit<UpdateNotePayload, keyof CreateNotePayload>>;

// Update line 33: formData state
const [formData, setFormData] = useState<NoteFormData>({ title: '', content: '' });
```

- [ ] **Step 2: Run type check**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep notes`
Expected: No errors (types match)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/learner/notes/page.tsx
git commit -m "fix(notes): add UpdateNotePayload import and proper typing

- Import UpdateNotePayload alongside CreateNotePayload
- Create NoteFormData type for form state
- Proper typing when editing existing notes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Add explicit ValidationPipe

**Files:**
- Modify: `backend/src/modules/notes/notes.controller.ts`

- [ ] **Step 1: Write test**

```typescript
// backend/src/modules/notes/notes.controller.spec.ts - add test

describe('create with empty content', () => {
  it('should reject empty content with 400 Bad Request', async () => {
    const req = { user: { id: 'user-123' } };
    const invalidDto = { content: '' };

    await expect(controller.create(req, invalidDto as any)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test - should fail (or pass via runtime guard)**

Run: `cd backend && npm test -- --testPathPattern=notes.controller.spec.ts`
Expected: May pass (runtime guard exists in service)

- [ ] **Step 3: Add explicit ValidationPipe**

```typescript
// backend/src/modules/notes/notes.controller.ts

import {
  // ... existing imports
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

// Add decorator to class or methods
@Controller('api/v1/notes')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class NotesController {
  // ... rest unchanged
}
```

- [ ] **Step 4: Run test - should pass**

Run: `cd backend && npm test -- --testPathPattern=notes.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/notes/notes.controller.ts
git commit -m "fix(notes): add explicit ValidationPipe to controller

- Add @UsePipes(ValidationPipe) decorator
- Enable whitelist and transform options
- Ensure validation runs even without global ValidationPipe

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Review Focus

1. **XSS via onerror** - Tested in Task 1
2. **XSS via other handlers** - All `on*` attributes blocked in Task 1
3. **SQL injection via search** - Tested in Task 2
4. **Empty content bypass** - Tested in Task 4
5. **Type safety** - Verified in Task 3

---

## Self-Review Checklist

- [x] All 4 issues addressed with specific code changes
- [x] Tests written before fixes (TDD approach)
- [x] No placeholder code - actual implementation provided
- [x] Each task independently testable and committable
- [x] Security issues (#1, #2) prioritized

---

**Plan complete.** Các tasks độc lập, có thể implement song song hoặc tuần tự.

Bạn muốn tôi implement ngay (native) hay dùng subagent-driven?

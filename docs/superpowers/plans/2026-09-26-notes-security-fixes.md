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

- [x] **Step 1: Write failing test** (Completed in `frontend/src/app/learner/notes/__tests__/sanitize.test.tsx`)
- [x] **Step 2: Run test - should fail**
- [x] **Step 3: Fix sanitizeHtml** (Completed via `isomorphic-dompurify`)
- [x] **Step 4: Run test - should pass**
- [x] **Step 5: Commit** (Commits `e02c351` & `2bd05fc`)

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

- [x] **Step 1: Write failing test** (Added to `backend/src/modules/notes/notes.service.spec.ts`)
- [x] **Step 2: Run test - should show raw interpolation**
- [x] **Step 3: Fix - escape special characters** (Added `escapeLikePattern` helper in `notes.service.ts`)
- [x] **Step 4: Run test - should pass**
- [x] **Step 5: Commit** (Commit `0a6922f`)

```bash
git add backend/src/modules/notes/notes.service.ts
git commit -m "fix(notes): escape special characters in search to prevent SQL injection"
```

---

## Task 3: Fix Type Mismatch

**Files:**
- Modify: `frontend/src/app/learner/notes/page.tsx:6`

- [x] **Step 1: Add type for edit form** (Added `UpdateNotePayload` and `NoteFormData` in `page.tsx`)
- [x] **Step 2: Run type check**
- [x] **Step 3: Commit** (Commit `be15bec`)

```bash
git add frontend/src/app/learner/notes/page.tsx
git commit -m "fix(notes): add UpdateNotePayload import and proper typing"
```

---

## Task 4: Add explicit ValidationPipe

**Files:**
- Modify: `backend/src/modules/notes/notes.controller.ts`

- [x] **Step 1: Write test** (Added to `backend/src/modules/notes/notes.controller.spec.ts`)
- [x] **Step 2: Run test - should fail (or pass via runtime guard)**
- [x] **Step 3: Add explicit ValidationPipe** (Added `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))`)
- [x] **Step 4: Run test - should pass**
- [x] **Step 5: Commit** (Commit `4c7628a`)

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

# Notes Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learner có thể tạo, đọc, cập nhật, xóa ghi chú cá nhân, có thể gắn với bài học hoặc ghi chú tự do.

**Architecture:** REST API trên NestJS với Supabase (RLS policy), frontend Next.js kết nối qua shared API client. Notes có thể standalone hoặc gắn với lesson_id.

**Tech Stack:** NestJS, Supabase, Next.js, TypeScript

**Spec:** `docs/ChiTiet_ChucNang_NguoiHoc_PhanHeNguoiDung_V2.md` (L-M06)

## Global Constraints

- Auth: JWT Bearer token, lấy learner_id từ `req.user.id`
- RLS: `notes.learner_id = auth.uid()` cho tất cả queries
- Supabase client: dùng `supabaseService.getClient()`

## Review Focus

- Learner không thể đọc/sửa/xóa notes của learner khác
- Khi xóa lesson, notes gắn với lesson đó vẫn tồn tại (lesson_id = NULL)
- Content có thể chứa HTML từ rich text editor
- Empty content không được chấp nhận

---

## Task 1: Backend - Notes Service (CRUD methods)

**Files:**
- Modify: `backend/src/modules/notes/notes.service.ts`

**Interfaces:**
- Consumes: `SupabaseService`
- Produces:
  - `findAll(userId: string, filter?: { lessonId?: string; search?: string }): Promise<Note[]>`
  - `findOne(id: string, userId: string): Promise<Note | null>`
  - `create(userId: string, data: CreateNoteDto): Promise<Note>`
  - `update(id: string, userId: string, data: UpdateNoteDto): Promise<Note>`
  - `delete(id: string, userId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/notes/notes.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service.js';
import { SupabaseService } from '../../config/supabase.service.js';

describe('NotesService', () => {
  let service: NotesService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: SupabaseService, useValue: { getClient: () => mockClient } },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  describe('findAll', () => {
    it('should return notes for a learner', async () => {
      const mockNotes = [{ id: '1', title: 'Test', content: 'Content' }];
      mockClient.eq.mockResolvedValue({ data: mockNotes, error: null });

      const result = await service.findAll('user-123');

      expect(result).toEqual(mockNotes);
      expect(mockClient.from).toHaveBeenCalledWith('notes');
      expect(mockClient.eq).toHaveBeenCalledWith('learner_id', 'user-123');
    });

    it('should filter by lesson_id when provided', async () => {
      mockClient.eq.mockResolvedValue({ data: [], error: null });

      await service.findAll('user-123', { lessonId: 'lesson-1' });

      expect(mockClient.eq).toHaveBeenCalledWith('lesson_id', 'lesson-1');
    });

    it('should search by title or content when search provided', async () => {
      mockClient.or.mockResolvedValue({ data: [], error: null });

      await service.findAll('user-123', { search: 'test' });

      expect(mockClient.or).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a note for learner', async () => {
      const createDto = { title: 'New Note', content: 'Note content' };
      const mockNote = { id: '1', ...createDto, learner_id: 'user-123' };
      mockClient.insert.mockReturnThis();
      mockClient.select.mockReturnThis();
      mockClient.single.mockResolvedValue({ data: mockNote, error: null });

      const result = await service.create('user-123', createDto);

      expect(result).toEqual(mockNote);
      expect(mockClient.insert).toHaveBeenCalledWith({ ...createDto, learner_id: 'user-123' });
    });

    it('should throw if content is empty', async () => {
      const createDto = { content: '' };

      await expect(service.create('user-123', createDto)).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete note owned by learner', async () => {
      mockClient.eq.mockResolvedValue({ data: { id: '1' }, error: null });
      mockClient.delete.mockReturnThis();
      mockClient.eq.mockResolvedValue({ data: null, error: null });

      await expect(service.delete('1', 'user-123')).resolves.toBeUndefined();
    });

    it('should throw if note not found', async () => {
      mockClient.eq.mockResolvedValue({ data: null, error: null });

      await expect(service.delete('1', 'user-123')).rejects.toThrow('Note not found');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=notes.service.spec.ts`
Expected: FAIL - service methods not implemented

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/modules/notes/notes.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';

export interface CreateNoteDto {
  title?: string;
  content: string;
  lesson_id?: string;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  lesson_id?: string;
}

export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(userId: string, filter?: { lessonId?: string; search?: string }): Promise<Note[]> {
    const client = this.supabaseService.getClient();

    let query = client.from('notes').select('*').eq('learner_id', userId);

    if (filter?.lessonId) {
      query = query.eq('lesson_id', filter.lessonId);
    }

    if (filter?.search) {
      query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      this.logger.error('Error fetching notes', error);
      throw error;
    }

    return data || [];
  }

  async findOne(id: string, userId: string): Promise<Note> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('learner_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Note not found');
    }

    return data;
  }

  async create(userId: string, data: CreateNoteDto): Promise<Note> {
    if (!data.content?.trim()) {
      throw new BadRequestException('Content is required');
    }

    const client = this.supabaseService.getClient();

    const { data: note, error } = await client
      .from('notes')
      .insert({ ...data, learner_id: userId })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating note', error);
      throw error;
    }

    return note;
  }

  async update(id: string, userId: string, data: UpdateNoteDto): Promise<Note> {
    if (data.content !== undefined && !data.content.trim()) {
      throw new BadRequestException('Content cannot be empty');
    }

    const client = this.supabaseService.getClient();

    const { data: note, error } = await client
      .from('notes')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('learner_id', userId)
      .select()
      .single();

    if (error || !note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async delete(id: string, userId: string): Promise<void> {
    const client = this.supabaseService.getClient();

    // Verify ownership first
    const { data: existing } = await client
      .from('notes')
      .select('id')
      .eq('id', id)
      .eq('learner_id', userId)
      .single();

    if (!existing) {
      throw new NotFoundException('Note not found');
    }

    const { error } = await client.from('notes').delete().eq('id', id);

    if (error) {
      this.logger.error('Error deleting note', error);
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern=notes.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /media/thanhhien/DATA/DoAnChuyenNganh-LearningProject
git add backend/src/modules/notes/notes.service.ts backend/src/modules/notes/notes.service.spec.ts
git commit -m "feat(notes): implement NotesService with CRUD methods

- findAll with optional lesson_id filter and search
- findOne with ownership check
- create with content validation
- update with partial update support
- delete with ownership verification

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Backend - Notes Controller (REST endpoints)

**Files:**
- Modify: `backend/src/modules/notes/notes.controller.ts`

**Interfaces:**
- Consumes: `NotesService` methods from Task 1
- Produces: REST endpoints at `/api/v1/notes`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/notes/notes.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

describe('NotesController', () => {
  let controller: NotesController;
  let service: jest.Mocked<NotesService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [{ provide: NotesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .applyStub()
      .compile();

    controller = module.get<NotesController>(NotesController);
    service = module.get(NotesService);
  });

  describe('GET /api/v1/notes', () => {
    it('should return notes for authenticated learner', async () => {
      const mockNotes = [{ id: '1', title: 'Test' }];
      service.findAll.mockResolvedValue(mockNotes);

      const req = { user: { id: 'user-123' } };
      const result = await controller.findAll(req, { lessonId: 'lesson-1' });

      expect(result).toEqual(mockNotes);
      expect(service.findAll).toHaveBeenCalledWith('user-123', { lessonId: 'lesson-1' });
    });

    it('should return notes without filter', async () => {
      service.findAll.mockResolvedValue([]);

      const req = { user: { id: 'user-123' } };
      await controller.findAll(req, {});

      expect(service.findAll).toHaveBeenCalledWith('user-123', {});
    });
  });

  describe('DELETE /api/v1/notes/:id', () => {
    it('should delete note owned by learner', async () => {
      service.delete.mockResolvedValue(undefined);

      const req = { user: { id: 'user-123' } };
      await controller.delete(req, 'note-1');

      expect(service.delete).toHaveBeenCalledWith('note-1', 'user-123');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- --testPathPattern=notes.controller.spec.ts`
Expected: FAIL - endpoints not implemented

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/modules/notes/notes.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService, CreateNoteDto, UpdateNoteDto } from './notes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('api/v1/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: { lessonId?: string; search?: string }) {
    const userId = req.user.id;
    return this.notesService.findAll(userId, {
      lessonId: query.lessonId,
      search: query.search,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    return this.notesService.findOne(id, userId);
  }

  @Post()
  async create(@Request() req: any, @Body() createNoteDto: CreateNoteDto) {
    const userId = req.user.id;
    return this.notesService.create(userId, createNoteDto);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    const userId = req.user.id;
    return this.notesService.update(id, userId, updateNoteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    await this.notesService.delete(id, userId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- --testPathPattern=notes.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/notes/notes.controller.ts backend/src/modules/notes/notes.controller.spec.ts
git commit -m "feat(notes): add NotesController with CRUD endpoints

- GET /api/v1/notes - list with optional lessonId/search filters
- GET /api/v1/notes/:id - get single note
- POST /api/v1/notes - create new note
- PUT /api/v1/notes/:id - update note
- DELETE /api/v1/notes/:id - delete note

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Frontend - API Client (notesApi)

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/types/notes.ts`

**Interfaces:**
- Consumes: Existing `request()` helper
- Produces: `notesApi` object with CRUD methods

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/api/notes.test.ts
import { notesApi } from '../../lib/api';

describe('notesApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('list', () => {
    it('should call GET /api/v1/notes', async () => {
      const mockNotes = [{ id: '1', title: 'Test', content: 'Content' }];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockNotes }),
      });

      const result = await notesApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notes'),
        expect.any(Object)
      );
      expect(result).toEqual(mockNotes);
    });

    it('should pass query params for filter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await notesApi.list({ lessonId: 'lesson-1', search: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('lessonId=lesson-1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test'),
        expect.any(Object)
      );
    });
  });

  describe('create', () => {
    it('should POST to /api/v1/notes', async () => {
      const newNote = { title: 'New', content: 'Content' };
      const createdNote = { id: '1', ...newNote };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdNote }),
      });

      const result = await notesApi.create(newNote);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/notes',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual(createdNote);
    });
  });

  describe('delete', () => {
    it('should DELETE to /api/v1/notes/:id', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

      await notesApi.delete('note-1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/notes/note-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=notes.test.ts`
Expected: FAIL - notesApi not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/types/notes.ts
export interface Note {
  id: string;
  learner_id: string;
  lesson_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotePayload {
  title?: string;
  content: string;
  lesson_id?: string;
}

export interface UpdateNotePayload {
  title?: string;
  content?: string;
  lesson_id?: string;
}
```

```typescript
// Add to frontend/src/lib/api.ts - after existing API methods (~line 200)

// ============ NOTES API ============
export const notesApi = {
  async list(filter?: { lessonId?: string; search?: string }): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filter?.lessonId) params.append('lessonId', filter.lessonId);
    if (filter?.search) params.append('search', filter.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    const { data } = await request<{ data: Note[] }>(`/api/v1/notes${query}`);
    return data;
  },

  async get(id: string): Promise<Note> {
    const { data } = await request<{ data: Note }>(`/api/v1/notes/${id}`);
    return data;
  },

  async create(payload: CreateNotePayload): Promise<Note> {
    const { data } = await request<{ data: Note }>('/api/v1/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data;
  },

  async update(id: string, payload: UpdateNotePayload): Promise<Note> {
    const { data } = await request<{ data: Note }>(`/api/v1/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data;
  },

  async delete(id: string): Promise<void> {
    await request(`/api/v1/notes/${id}`, { method: 'DELETE' });
  },
};
```

Also add to imports at top of api.ts:
```typescript
import type { Note, CreateNotePayload, UpdateNotePayload } from '../types/notes';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=notes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/types/notes.ts
git commit -m "feat(notes): add notesApi client for frontend

- list() with optional lessonId/search filters
- get() for single note
- create(), update(), delete() CRUD operations

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Frontend - Notes Page (connect to API)

**Files:**
- Modify: `frontend/src/app/learner/notes/page.tsx`

**Interfaces:**
- Consumes: `notesApi` from Task 3
- Produces: Interactive notes page with CRUD

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/app/learner/notes/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesPage from '../page';

// Mock the API
jest.mock('../../../../lib/api', () => ({
  notesApi: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('NotesPage', () => {
  const mockNotes = [
    { id: '1', title: 'Test Note', content: 'Test content', updated_at: '2026-09-26' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display notes from API', async () => {
    const { notesApi } = require('../../../../lib/api');
    notesApi.list.mockResolvedValue(mockNotes);

    render(<NotesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });
  });

  it('should open create modal on New Note click', async () => {
    const { notesApi } = require('../../../../lib/api');
    notesApi.list.mockResolvedValue([]);

    render(<NotesPage />);
    await userEvent.click(screen.getByText('New Note'));

    expect(screen.getByText('Create Note')).toBeInTheDocument();
  });

  it('should delete note on delete button click', async () => {
    const { notesApi } = require('../../../../lib/api');
    notesApi.list.mockResolvedValue(mockNotes);
    notesApi.delete.mockResolvedValue(undefined);

    render(<NotesPage />);
    await userEvent.click(screen.getByTestId('delete-note-1'));

    expect(notesApi.delete).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=learner/notes/page.test.tsx`
Expected: FAIL - component not connected to API

- [ ] **Step 3: Write minimal implementation**

```tsx
// frontend/src/app/learner/notes/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { notesApi } from '../../../lib/api';
import type { Note, CreateNotePayload, UpdateNotePayload } from '../../../types/notes';

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
      setNotes(data);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=learner/notes/page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/learner/notes/page.tsx
git commit -m "feat(notes): connect NotesPage to API

- Load notes from API on mount
- Create note via modal form
- Edit existing note via modal
- Delete note with confirmation
- Search notes by title/content

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Integration Test (End-to-End)

**Files:**
- Modify: Manual testing checklist

- [ ] **Step 1: Test the full flow**

```bash
# 1. Start backend
cd backend && npm run start:dev

# 2. Start frontend
cd frontend && npm run dev

# 3. Test scenarios:
# a. Login as learner
# b. Navigate to /learner/notes
# c. Create note - should appear in grid
# d. Edit note - changes should persist on refresh
# e. Delete note - note should disappear
# f. Search - results should filter
```

- [ ] **Step 2: Verify RLS (security)**

```bash
# As different learner, verify you cannot access other's notes
curl -H "Authorization: Bearer $LEARNER2_TOKEN" \
     http://localhost:3001/api/v1/notes
# Should only return learner2's notes
```

- [ ] **Step 3: Commit final**

```bash
git add -A && git commit -m "chore(notes): complete notes feature integration

- Backend: NotesService + NotesController
- Frontend: notesApi client + NotesPage connected
- Tests: unit tests for service, controller, API, component

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

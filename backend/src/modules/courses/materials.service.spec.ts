import { describe, expect, it, vi } from 'vitest';
import { MaterialsService } from './materials.service.js';

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    insert: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
  };
  return builder;
}

describe('MaterialsService', () => {
  it('hides materials of an unpublished lesson from learners', async () => {
    const from = vi.fn((table: string) => {
      if (table !== 'lessons') throw new Error(`Unexpected table: ${table}`);
      return query({ data: { id: 'lesson-1', chapter_id: 'chapter-1', status: 'draft' }, error: null });
    });
    const service = new MaterialsService({ getClient: () => ({ from }) } as never);

    await expect(service.listForLesson('lesson-1', true)).rejects.toThrow('Lesson not found');
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('hides materials when the lesson is published but the course is not', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'lessons') return query({ data: { id: 'lesson-1', chapter_id: 'chapter-1', status: 'published' }, error: null });
      if (table === 'chapters') return query({ data: { course_id: 'course-1' }, error: null });
      if (table === 'courses') return query({ data: { status: 'draft' }, error: null });
      throw new Error(`Unexpected table: ${table}`);
    });
    const service = new MaterialsService({ getClient: () => ({ from }) } as never);

    await expect(service.listForLesson('lesson-1', true)).rejects.toThrow('Lesson not found');
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('removes a newly uploaded object when saving metadata fails', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => table === 'lessons'
      ? query({ data: { id: 'lesson-1', chapter_id: 'chapter-1', status: 'draft' }, error: null })
      : query({ data: null, error: { message: 'database failed' } }));
    const service = new MaterialsService({ getClient: () => ({ from, storage: { from: () => ({ upload, remove }) } }) } as never);
    const buffer = Buffer.from('// test code\n');

    await expect(service.upload('lesson-1', {
      originalname: 'example.cs', mimetype: 'text/plain', size: buffer.length, buffer,
    })).rejects.toThrow('Unable to save material');
    expect(upload).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^lesson-1\/.*\.cs$/)]);
  });

  it('rejects a file whose bytes do not match its PDF extension', async () => {
    const upload = vi.fn();
    const from = vi.fn(() => query({ data: { id: 'lesson-1', status: 'draft' }, error: null }));
    const service = new MaterialsService({ getClient: () => ({ from, storage: { from: () => ({ upload }) } }) } as never);

    await expect(service.upload('lesson-1', {
      originalname: 'fake.pdf', mimetype: 'application/pdf', size: 5, buffer: Buffer.from('hello'),
    })).rejects.toThrow('File content does not match its type');
    expect(upload).not.toHaveBeenCalled();
  });

  it('stores a validated file under a random path and saves only its metadata', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'lessons') return query({ data: { id: 'lesson-1', status: 'draft' }, error: null });
      if (table === 'materials') return query({
        data: { id: 'material-1', lesson_id: 'lesson-1', title: 'intro.pdf', file_type: 'PDF', file_size: 8, created_at: '2026-11-16T00:00:00Z' },
        error: null,
      });
      throw new Error(`Unexpected table: ${table}`);
    });
    const service = new MaterialsService({ getClient: () => ({ from, storage: { from: () => ({ upload }) } }) } as never);
    const buffer = Buffer.from('%PDF-1.7');

    await expect(service.upload('lesson-1', {
      originalname: 'intro.pdf', mimetype: 'application/pdf', size: buffer.length, buffer,
    })).resolves.toMatchObject({ id: 'material-1', file_type: 'PDF' });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^lesson-1\/[0-9a-f-]+\.pdf$/),
      buffer,
      { contentType: 'application/pdf', upsert: false },
    );
  });

  it('rejects an empty file name before writing to Storage', async () => {
    const upload = vi.fn();
    const from = vi.fn(() => query({ data: { id: 'lesson-1', status: 'draft' }, error: null }));
    const service = new MaterialsService({ getClient: () => ({ from, storage: { from: () => ({ upload }) } }) } as never);
    const buffer = Buffer.from('%PDF-1.7');

    await expect(service.upload('lesson-1', {
      originalname: '   ', mimetype: 'application/pdf', size: buffer.length, buffer,
    })).rejects.toThrow('File name is required');
    expect(upload).not.toHaveBeenCalled();
  });
});

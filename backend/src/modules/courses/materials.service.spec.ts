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
});

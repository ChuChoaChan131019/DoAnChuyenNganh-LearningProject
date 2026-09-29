import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notesApi } from '../../lib/api';

const jest = vi;

describe('notesApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('list', () => {
    it('should call GET /api/v1/notes', async () => {
      const mockNotes = [{ id: '1', title: 'Test', content: 'Content' }];
      (global.fetch as any).mockResolvedValueOnce({
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
      (global.fetch as any).mockResolvedValueOnce({
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
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: createdNote }),
      });

      const result = await notesApi.create(newNote);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notes'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual(createdNote);
    });
  });

  describe('delete', () => {
    it('should DELETE to /api/v1/notes/:id', async () => {
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      await notesApi.delete('note-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/notes/note-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});

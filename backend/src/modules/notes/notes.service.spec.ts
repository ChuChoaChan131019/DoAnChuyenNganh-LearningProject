import { Test, TestingModule } from '@nestjs/testing';
import { NotesService } from './notes.service.js';
import { SupabaseService } from '../../config/supabase.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const jest = vi;

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
      order: jest.fn().mockReturnThis(),
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
      mockClient.order.mockResolvedValue({ data: mockNotes, error: null });

      const result = await service.findAll('user-123');

      expect(result).toEqual(mockNotes);
      expect(mockClient.from).toHaveBeenCalledWith('notes');
      expect(mockClient.eq).toHaveBeenCalledWith('learner_id', 'user-123');
    });

    it('should filter by lesson_id when provided', async () => {
      mockClient.order.mockResolvedValue({ data: [], error: null });

      await service.findAll('user-123', { lessonId: 'lesson-1' });

      expect(mockClient.eq).toHaveBeenCalledWith('lesson_id', 'lesson-1');
    });

    it('should search by title or content when search provided', async () => {
      mockClient.order.mockResolvedValue({ data: [], error: null });

      await service.findAll('user-123', { search: 'test' });

      expect(mockClient.or).toHaveBeenCalled();
    });

    it('should escape special characters %, _, and \\ in search pattern', async () => {
      mockClient.order.mockResolvedValue({ data: [], error: null });

      await service.findAll('user-123', { search: '100%_match\\test' });

      expect(mockClient.or).toHaveBeenCalled();
      const orCall = mockClient.or.mock.calls[0][0];
      expect(orCall).toContain('\\%');
      expect(orCall).toContain('\\_');
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
      mockClient.single.mockResolvedValue({ data: { id: '1' }, error: null });
      mockClient.delete.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(service.delete('1', 'user-123')).resolves.toBeUndefined();
    });

    it('should throw if note not found', async () => {
      mockClient.single.mockResolvedValue({ data: null, error: null });

      await expect(service.delete('1', 'user-123')).rejects.toThrow('Note not found');
    });
  });
});

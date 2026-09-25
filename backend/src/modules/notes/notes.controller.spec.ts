import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const jest = vi;

describe('NotesController', () => {
  let controller: NotesController;
  let service: any;

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
      .useValue({ canActivate: () => true })
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

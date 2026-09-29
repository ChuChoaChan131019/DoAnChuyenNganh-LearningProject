import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { CreateNoteDto, UpdateNoteDto } from './notes.service.js';

describe('Notes DTO Validation', () => {
  it('should fail CreateNoteDto validation when content is empty or lesson_id is not UUID', async () => {
    const dto = new CreateNoteDto();
    dto.content = '';
    dto.lesson_id = 'not-a-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const properties = errors.map(e => e.property);
    expect(properties).toContain('content');
    expect(properties).toContain('lesson_id');
  });

  it('should pass CreateNoteDto validation with valid fields', async () => {
    const dto = new CreateNoteDto();
    dto.title = 'Valid title';
    dto.content = 'Valid content';
    dto.lesson_id = '123e4567-e89b-12d3-a456-426614174000';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail UpdateNoteDto when lesson_id is not UUID', async () => {
    const dto = new UpdateNoteDto();
    dto.lesson_id = 'invalid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('lesson_id');
  });
});

import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  SaveCodeExerciseDto,
  UpdateCodeExerciseDto,
} from './save-code-exercise.dto.js';

const payload = {
  lesson_id: '00000000-0000-4000-8000-000000000001',
  title: 'Sum the numbers',
  difficulty: 'easy',
};
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (body: unknown, metatype = SaveCodeExerciseDto) =>
  pipe.transform(body, { type: 'body', metatype });

describe('Code exercise input validation', () => {
  it('accepts an incomplete draft without tests or solution', async () => {
    expect(await validate(payload)).toMatchObject(payload);
  });

  it('preserves raw multiline text and allows empty input/output', async () => {
    const test_cases = [
      { input: '5\r\n1 2 3 4 5\r\n', expected_output: '15\n', is_public: true },
      { input: '', expected_output: '', is_public: false },
    ];
    expect((await validate({ ...payload, test_cases })).test_cases).toEqual(
      test_cases,
    );
  });

  it.each([
    { lesson_id: 'invalid' },
    { title: 'ab' },
    { title: 'x'.repeat(161) },
    { difficulty: 'expert' },
    { status: 'published' },
    { created_by: 'another-author' },
    { published_revision_id: payload.lesson_id },
    { test_cases: [{ input: 'x', expected_output: 'y', is_public: 'false' }] },
    { test_cases: [{ input: 123, expected_output: 'y', is_public: false }] },
    { test_cases: [{ input: '', is_public: false }] },
    {
      test_cases: Array.from({ length: 101 }, () => ({
        input: '',
        expected_output: '',
        is_public: false,
      })),
    },
  ])('rejects invalid or server-owned fields: %j', async (change) => {
    await expect(validate({ ...payload, ...change })).rejects.toMatchObject({
      status: 400,
    });
  });

  it.each([undefined, -1, 1.5, '1'])(
    'rejects invalid expected version %s',
    async (edit_version) => {
      await expect(
        validate({ ...payload, edit_version }, UpdateCodeExerciseDto),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it.each([0, 1])(
    'accepts expected version %i (zero starts a new draft)',
    async (edit_version) => {
      expect(
        await validate({ ...payload, edit_version }, UpdateCodeExerciseDto),
      ).toMatchObject({ edit_version });
    },
  );
});

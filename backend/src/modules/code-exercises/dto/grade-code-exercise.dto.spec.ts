import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { GradeCodeExerciseDto } from './grade-code-exercise.dto.js';

const revisionId = '50000000-0000-4000-8000-000000000001';
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: GradeCodeExerciseDto });

describe('GradeCodeExerciseDto', () => {
  it('requires the displayed revision along with learner code', async () => {
    const body = { code: 'Console.WriteLine(3);', revision_id: revisionId };
    await expect(validate(body)).resolves.toMatchObject(body);
  });

  it.each([
    { code: 'x' },
    { code: 'x', revision_id: null },
    { code: 'x', revision_id: 123 },
    { code: 'x', revision_id: 'not-a-uuid' },
    { code: '', revision_id: revisionId },
    { code: 'x'.repeat(64001), revision_id: revisionId },
    { code: 'x', revision_id: revisionId, expected_output: 'forged' },
    { code: 'x', revision_id: revisionId, test_cases: [] },
  ])('rejects incomplete or forged grading payloads', async (body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});

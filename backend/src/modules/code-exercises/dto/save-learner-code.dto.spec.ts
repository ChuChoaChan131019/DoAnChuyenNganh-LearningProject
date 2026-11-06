import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SaveLearnerCodeDto } from './save-learner-code.dto.js';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: SaveLearnerCodeDto });

describe('Learner code save validation', () => {
  it.each(['', 'using System;\nConsole.WriteLine("Xin chào");']) (
    'accepts code including an empty saved program',
    async (code) => {
      await expect(validate({ code, expected_save_version: 0 })).resolves
        .toMatchObject({ code, expected_save_version: 0 });
    },
  );

  it.each([
    { code: 123, expected_save_version: 0 },
    { code: 'x'.repeat(100001), expected_save_version: 0 },
    { code: 'x', expected_save_version: -1 },
    { code: 'x', expected_save_version: 1.5 },
    { code: 'x', expected_save_version: '1' },
    { code: 'x', expected_save_version: 0, learner_id: 'forged' },
  ])('rejects invalid or server-owned fields: %j', async (body) => {
    await expect(validate(body)).rejects.toMatchObject({ status: 400 });
  });
});

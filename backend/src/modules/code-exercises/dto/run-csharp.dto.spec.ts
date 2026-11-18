import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RunCsharpDto } from './run-csharp.dto.js';

describe('RunCsharpDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const validate = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: RunCsharpDto });

  it('accepts multiline stdin without normalizing whitespace', async () => {
    const body = {
      code: 'Console.WriteLine(Console.ReadLine());',
      stdin: '  Tiếng Việt  \r\n\ncuối\n',
    };
    await expect(validate(body)).resolves.toMatchObject(body);
  });

  it('accepts omitted stdin', async () => {
    await expect(
      validate({ code: 'Console.WriteLine(1);' }),
    ).resolves.toBeInstanceOf(RunCsharpDto);
  });

  it.each([
    { code: '' },
    { code: 12 },
    { code: 'x'.repeat(64001) },
    { code: 'x', stdin: 123 },
    { code: 'x', stdin: 'x'.repeat(16001) },
    { code: 'x', image: 'untrusted-image' },
    { code: 'x', timeout: 999999 },
  ])(
    'rejects invalid payload or attempts to override sandbox settings',
    async (body) => {
      await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

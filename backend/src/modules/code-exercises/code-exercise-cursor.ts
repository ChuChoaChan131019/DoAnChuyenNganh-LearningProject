import { BadRequestException } from '@nestjs/common';

type CodeExerciseCursor = {
  updated_at: string;
  id: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeCodeExerciseCursor(row: CodeExerciseCursor): string {
  return Buffer.from(JSON.stringify(row), 'utf8').toString('base64url');
}

export function decodeCodeExerciseCursor(
  value?: string,
): CodeExerciseCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<CodeExerciseCursor>;

    if (
      typeof parsed.updated_at !== 'string'
      || Number.isNaN(Date.parse(parsed.updated_at))
      || typeof parsed.id !== 'string'
      || !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error('Invalid cursor payload');
    }

    return {
      updated_at: new Date(parsed.updated_at).toISOString(),
      id: parsed.id,
    };
  } catch {
    throw new BadRequestException('Con trỏ phân trang không hợp lệ');
  }
}

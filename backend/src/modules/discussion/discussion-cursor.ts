import { BadRequestException } from '@nestjs/common';

type DiscussionCursor = {
  created_at: string;
  id: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeDiscussionCursor(row: DiscussionCursor): string {
  return Buffer.from(JSON.stringify(row), 'utf8').toString('base64url');
}

export function decodeDiscussionCursor(value?: string): DiscussionCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<DiscussionCursor>;

    if (
      typeof parsed.created_at !== 'string'
      || Number.isNaN(Date.parse(parsed.created_at))
      || typeof parsed.id !== 'string'
      || !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error('Invalid cursor payload');
    }

    return {
      created_at: new Date(parsed.created_at).toISOString(),
      id: parsed.id,
    };
  } catch {
    throw new BadRequestException('Con trỏ phân trang không hợp lệ');
  }
}

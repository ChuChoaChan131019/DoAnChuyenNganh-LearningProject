import { BadRequestException } from '@nestjs/common';

export type TimeCursor = { created_at: string; id: string };

export function encodeTimeCursor(row: TimeCursor) {
  return Buffer.from(
    JSON.stringify({ created_at: row.created_at, id: row.id }),
  ).toString('base64url');
}

export function decodeTimeCursor(value?: string): TimeCursor | null {
  if (!value) return null;
  try {
    if (value.length > 500) throw new Error('length');
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      typeof parsed.created_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(
        parsed.created_at,
      ) ||
      Number.isNaN(Date.parse(parsed.created_at)) ||
      typeof parsed.id !== 'string' ||
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(parsed.id)
    )
      throw new Error('payload');
    // Keep PostgreSQL microseconds: normalizing through Date would lose tie-break precision.
    return { created_at: parsed.created_at, id: parsed.id };
  } catch {
    throw new BadRequestException('Con trỏ phân trang không hợp lệ');
  }
}

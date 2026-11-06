import { describe, expect, it } from 'vitest';

import {
  decodeDiscussionCursor,
  encodeDiscussionCursor,
} from './discussion-cursor.js';

describe('discussion cursor', () => {
  it('round-trips a timestamp and UUID', () => {
    const value = {
      created_at: '2026-11-06T07:30:00.000Z',
      id: '00000000-0000-4000-8000-000000000001',
    };
    expect(decodeDiscussionCursor(encodeDiscussionCursor(value))).toEqual(value);
  });

  it.each(['not-base64', Buffer.from('{}').toString('base64url')])(
    'rejects invalid cursor %s',
    (value) => {
      expect(() => decodeDiscussionCursor(value)).toThrow(
        'Con trỏ phân trang không hợp lệ',
      );
    },
  );
});

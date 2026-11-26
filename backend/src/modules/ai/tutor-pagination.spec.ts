import { describe, expect, it } from 'vitest';
import { AiService } from './ai.service.js';
import {
  decodeTimeCursor,
  encodeTimeCursor,
} from '../../common/pagination-cursor.js';

type Row = {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_role: string;
  message_content: string;
};
function fixture() {
  const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    created_at: '2026-11-26T12:00:00.123456+00:00',
    conversation_id: 'own',
    sender_role: 'user',
    message_content: `message-${i + 1}`,
  }));
  let messagesReads = 0;
  const client = {
    from(table: string) {
      let limit = 20;
      let before: { created_at: string; id: string } | null = null;
      let owner = '';
      let conversation = '';
      const query = {
        select() {
          return query;
        },
        eq(key: string, value: string) {
          if (key === 'user_id') owner = value;
          if (key === 'id') conversation = value;
          return query;
        },
        order() {
          return query;
        },
        limit(value: number) {
          limit = value;
          return query;
        },
        or(value: string) {
          const id = value.match(/id\.lt\.([^)]*)/)![1];
          before = { created_at: rows[0].created_at, id };
          return query;
        },
        maybeSingle() {
          return Promise.resolve({
            data:
              owner === 'viewer' && conversation === 'own'
                ? { id: 'own' }
                : null,
            error: null,
          });
        },
        // Supabase query builders deliberately implement PromiseLike.
        // oxlint-disable-next-line unicorn/no-thenable
        then(resolve: (value: unknown) => unknown) {
          messagesReads++;
          return Promise.resolve({
            data: rows
              .filter((row) => !before || row.id < before.id)
              .sort((a, b) => b.id.localeCompare(a.id))
              .slice(0, limit),
            error: null,
          }).then(resolve);
        },
      };
      if (table !== 'ai_tutor_conversations' && table !== 'ai_tutor_messages')
        throw new Error(table);
      return query;
    },
  };
  const service = new AiService(
    { get: () => '' } as never,
    { getAdminClient: () => client } as never,
  );
  return { rows, service, reads: () => messagesReads };
}

describe('Tutor message cursor pagination', () => {
  it('does not repeat older messages after new messages are appended', async () => {
    const { rows, service } = fixture();
    const first = await service.getTutorMessagesPage('viewer', 'own', 20);
    expect(first.items).toHaveLength(20);
    expect(first.next_cursor).toBeTruthy();
    rows.push({
      ...rows[0],
      id: '00000000-0000-4000-8000-000000000026',
      message_content: 'new message',
    });
    const older = await service.getTutorMessagesPage(
      'viewer',
      'own',
      20,
      first.next_cursor!,
    );
    expect(older.items).toHaveLength(5);
    expect(
      new Set([...first.items, ...older.items].map((row) => row.id)).size,
    ).toBe(25);
    expect(older.next_cursor).toBeNull();
  });
  it('preserves timestamp microseconds and rejects unsafe cursor payloads', () => {
    const row = fixture().rows[0];
    expect(decodeTimeCursor(encodeTimeCursor(row))?.created_at).toBe(
      row.created_at,
    );
    expect(() =>
      decodeTimeCursor(
        Buffer.from(
          JSON.stringify({ ...row, created_at: '2026-11-26),id.gt.0' }),
        ).toString('base64url'),
      ),
    ).toThrow();
  });
  it('checks ownership before reading messages and bounds page size', async () => {
    const { service, reads } = fixture();
    await expect(
      service.getTutorMessagesPage('viewer', 'someone-else'),
    ).rejects.toMatchObject({ status: 404 });
    expect(reads()).toBe(0);
    await expect(
      service.getTutorMessagesPage('viewer', 'own', 51),
    ).rejects.toMatchObject({ status: 400 });
  });
});

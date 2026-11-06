import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../../../database/migrations/20261106002000_question_rejected_status.sql',
    import.meta.url,
  ),
  'utf8',
);

describe('question rejected status migration', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE TABLE public.questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        status text NOT NULL DEFAULT 'draft',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT legacy_question_status CHECK (status IN ('draft', 'approved'))
      );
      INSERT INTO public.questions (status) VALUES ('draft'), ('approved');
    `);
    await db.exec(migration);
    await db.exec(migration);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it('preserves existing questions and accepts rejected status', async () => {
    await db.exec("INSERT INTO public.questions (status) VALUES ('rejected')");
    const result = await db.query<{ status: string; total: number }>(`
      SELECT status, count(*)::integer AS total
      FROM public.questions
      GROUP BY status
      ORDER BY status
    `);

    expect(result.rows).toEqual([
      { status: 'approved', total: 1 },
      { status: 'draft', total: 1 },
      { status: 'rejected', total: 1 },
    ]);
  });

  it('continues to reject unsupported statuses', async () => {
    await expect(
      db.exec("INSERT INTO public.questions (status) VALUES ('published')"),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('creates the partial index used by pending review queries', async () => {
    const result = await db.query<{ indexdef: string }>(`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'questions_draft_created_idx'
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].indexdef).toContain("WHERE (status = 'draft'::text)");
  });
});

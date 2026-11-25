import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../../../database/migrations/20261115090000_ai_question_authoring_drafts.sql',
    import.meta.url,
  ),
  'utf8',
);
const historyMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261115093000_ai_question_history.sql',
    import.meta.url,
  ),
  'utf8',
);

const atomicMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261116093000_atomic_question_creation_history.sql',
    import.meta.url,
  ),
  'utf8',
);

const actor = '00000000-0000-4000-8000-000000000001';
const course = '00000000-0000-4000-8000-000000000010';
const chapter = '00000000-0000-4000-8000-000000000011';
const lesson = '00000000-0000-4000-8000-000000000012';
const batch = '00000000-0000-4000-8000-000000000020';

const question = (client_id: string, content: string) => ({
  client_id,
  course_id: course,
  chapter_id: chapter,
  lesson_id: lesson,
  question_type: 'single_choice',
  difficulty: 'easy',
  content,
  explanation: 'Biến dùng để lưu trữ giá trị trong chương trình.',
  options: [
    { option_text: 'Lưu trữ giá trị', is_correct: true, order_index: 0 },
    { option_text: 'Biên dịch mã', is_correct: false, order_index: 1 },
  ],
});

describe('shared AI question draft migration', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.courses (id uuid primary key, title text not null, status text not null);
      create table public.chapters (id uuid primary key, course_id uuid not null references public.courses(id), title text not null);
      create table public.lessons (id uuid primary key, chapter_id uuid not null references public.chapters(id), title text not null, content text, status text not null);
      create table public.questions (
        id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id),
        chapter_id uuid references public.chapters(id), lesson_id uuid references public.lessons(id),
        question_type text, difficulty text, content text not null, explanation text,
        status text default 'draft', is_ai_generated boolean default false,
        generated_for_user_id uuid, created_at timestamptz default now()
      );
      create table public.question_options (
        id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id),
        option_text text not null, is_correct boolean default false, order_index integer default 0
      );
      insert into public.profiles values ('${actor}', 'content_manager');
      insert into public.courses values ('${course}', 'C#', 'draft');
      insert into public.chapters values ('${chapter}', '${course}', 'Biến');
      insert into public.lessons values ('${lesson}', '${chapter}', 'Kiểu dữ liệu', 'Nội dung', 'draft');
    `);
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(historyMigration);
    await db.exec(historyMigration);
    await db.exec(atomicMigration);
    await db.exec(atomicMigration);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it('saves a complete batch as shared AI drafts', async () => {
    const payload = [
      question('q-1', 'Câu hỏi thứ nhất'),
      question('q-2', 'Câu hỏi thứ hai'),
    ];
    const saved = await db.query<{
      client_id: string;
      id: string;
      status: string;
    }>(
      'select * from public.save_ai_question_drafts($1::uuid, $2::uuid, $3::jsonb)',
      [actor, batch, JSON.stringify(payload)],
    );
    expect(saved.rows).toHaveLength(2);
    expect(saved.rows.map((row) => row.status)).toEqual(['draft', 'draft']);
    const rows = await db.query<{
      is_ai_generated: boolean;
      generated_for_user_id: string | null;
      options: number;
    }>(
      `
      select q.is_ai_generated, q.generated_for_user_id, count(o.id)::integer as options
      from public.questions q join public.question_options o on o.question_id = q.id
      where q.ai_draft_batch_id = $1 group by q.id
      order by q.ai_draft_client_id
    `,
      [batch],
    );
    expect(rows.rows).toEqual([
      { is_ai_generated: true, generated_for_user_id: null, options: 2 },
      { is_ai_generated: true, generated_for_user_id: null, options: 2 },
    ]);
  });

  it('returns the same ids for an exact retry and rejects a changed payload', async () => {
    const payload = [
      question('q-1', 'Câu hỏi thứ nhất'),
      question('q-2', 'Câu hỏi thứ hai'),
    ];
    const retry = await db.query<{ client_id: string; id: string }>(
      'select * from public.save_ai_question_drafts($1::uuid, $2::uuid, $3::jsonb)',
      [actor, batch, JSON.stringify(payload)],
    );
    expect(retry.rows).toHaveLength(2);
    await expect(
      db.query(
        'select * from public.save_ai_question_drafts($1::uuid, $2::uuid, $3::jsonb)',
        [
          actor,
          batch,
          JSON.stringify([
            question('q-1', 'Nội dung đã đổi'),
            question('q-2', 'Câu hỏi thứ hai'),
          ]),
        ],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('rolls back the whole batch when one question is invalid', async () => {
    const invalidBatch = '00000000-0000-4000-8000-000000000021';
    await expect(
      db.query(
        'select * from public.save_ai_question_drafts($1::uuid, $2::uuid, $3::jsonb)',
        [
          actor,
          invalidBatch,
          JSON.stringify([
            question('q-1', 'Hợp lệ'),
            { ...question('q-2', 'Sai'), options: [] },
          ]),
        ],
      ),
    ).rejects.toThrow();
    const rows = await db.query(
      'select id from public.questions where ai_draft_batch_id = $1',
      [invalidBatch],
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('records one creation event per question, including exact retry', async () => {
    const rows = await db.query<{ total: number }>(
      `select count(*)::int as total from public.question_history h join public.questions q on q.id=h.question_id where q.ai_draft_batch_id=$1 and h.action='created'`,
      [batch],
    );
    expect(rows.rows[0].total).toBe(2);
  });

  it('rolls back questions and options when history insert fails', async () => {
    await db.exec(`create function public.fail_history() returns trigger language plpgsql as $$ begin raise exception 'forced history failure'; end $$;
      create trigger fail_history before insert on public.question_history for each row execute function public.fail_history();`);
    const count = async () =>
      (
        await db.query(
          `select (select count(*) from public.questions)::int q, (select count(*) from public.question_options)::int o, (select count(*) from public.question_history)::int h`,
        )
      ).rows;
    const before = await count();
    try {
      await expect(
        db.query(
          'select * from public.save_ai_question_drafts($1::uuid,$2::uuid,$3::jsonb)',
          [
            actor,
            '00000000-0000-4000-8000-000000000031',
            JSON.stringify([question('fail', 'Rollback history')]),
          ],
        ),
      ).rejects.toThrow('forced history failure');
      expect(await count()).toEqual(before);
    } finally {
      await db.exec(
        'drop trigger fail_history on public.question_history; drop function public.fail_history();',
      );
    }
  });

  it('serializes concurrent retries without duplicating rows or history', async () => {
    const concurrent = '00000000-0000-4000-8000-000000000041';
    const payload = JSON.stringify([
      question('concurrent', 'Concurrent retry'),
    ]);
    const call = () =>
      db.query(
        'select * from public.save_ai_question_drafts($1::uuid,$2::uuid,$3::jsonb)',
        [actor, concurrent, payload],
      );
    const [first, second] = await Promise.all([call(), call()]);
    expect(first.rows).toEqual(second.rows);
    expect(
      (
        await db.query(
          `select count(*)::int total from public.question_history h join public.questions q on h.question_id=q.id where q.ai_draft_batch_id=$1`,
          [concurrent],
        )
      ).rows,
    ).toEqual([{ total: 1 }]);
  });

  it('creates manual questions and their actual option snapshot atomically', async () => {
    const result = await db.query<{ id: string }>(
      'select * from public.create_shared_question_with_history($1::uuid,$2::jsonb)',
      [actor, JSON.stringify(question('manual', 'Manual question'))],
    );
    const history = await db.query<{
      snapshot: {
        options: unknown[];
        is_ai_generated: boolean;
        version: number;
      };
    }>(
      `select snapshot from public.question_history where question_id=$1 and action='created'`,
      [result.rows[0].id],
    );
    expect(history.rows[0].snapshot).toMatchObject({
      version: 1,
      is_ai_generated: false,
      content: 'Manual question',
      options: question('manual', '').options,
    });
  });

  it('rolls back manual creation when its history fails', async () => {
    await db.exec(`create function public.fail_manual_history() returns trigger language plpgsql as $$ begin raise exception 'forced history failure'; end $$;
      create trigger fail_manual_history before insert on public.question_history for each row execute function public.fail_manual_history();`);
    const before = (
      await db.query('select count(*)::int total from public.questions')
    ).rows;
    try {
      await expect(
        db.query(
          'select * from public.create_shared_question_with_history($1::uuid,$2::jsonb)',
          [actor, JSON.stringify(question('manual-fail', 'Manual rollback'))],
        ),
      ).rejects.toThrow('forced history failure');
      expect(
        (await db.query('select count(*)::int total from public.questions'))
          .rows,
      ).toEqual(before);
    } finally {
      await db.exec(
        'drop trigger fail_manual_history on public.question_history; drop function public.fail_manual_history();',
      );
    }
  });

  it('limits privileged RPCs to service_role and checks the actor', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect(
        (
          await db.query<{ allowed: boolean }>(
            `select has_function_privilege($1, 'public.save_ai_question_drafts(uuid,uuid,jsonb)', 'execute') allowed`,
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
      expect(
        (
          await db.query<{ allowed: boolean }>(
            `select has_function_privilege($1, 'public.create_shared_question_with_history(uuid,jsonb)', 'execute') allowed`,
            [role],
          )
        ).rows[0].allowed,
      ).toBe(false);
    }
    await expect(
      db.query(
        'select * from public.save_ai_question_drafts($1::uuid,$2::uuid,$3::jsonb)',
        [
          '00000000-0000-4000-8000-000000000099',
          '00000000-0000-4000-8000-000000000045',
          JSON.stringify([question('unauthorized', 'Denied')]),
        ],
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('tracks versioned submit and approval transitions', async () => {
    const saved = await db.query<{ id: string }>(
      'select id from public.questions where ai_draft_client_id = $1',
      ['q-1'],
    );
    const questionId = saved.rows[0].id;
    const updated = await db.query<{ version: number; status: string }>(
      'select * from public.update_shared_question_with_history($1::uuid, $2::uuid, $3, $4::jsonb)',
      [
        actor,
        questionId,
        1,
        JSON.stringify(question('q-1', 'Nội dung đã sửa')),
      ],
    );
    expect(updated.rows[0]).toMatchObject({ version: 2, status: 'draft' });
    const submitted = await db.query<{ version: number; status: string }>(
      'select * from public.transition_shared_question_with_history($1::uuid, $2::uuid, $3, $4, $5)',
      [actor, questionId, 'submit', 2, null],
    );
    expect(submitted.rows[0]).toMatchObject({ version: 3, status: 'draft' });
    const approved = await db.query<{ version: number; status: string }>(
      'select * from public.transition_shared_question_with_history($1::uuid, $2::uuid, $3, $4, $5)',
      [actor, questionId, 'approve', 3, null],
    );
    expect(approved.rows[0]).toMatchObject({ version: 4, status: 'approved' });
    const history = await db.query<{ action: string; version: number }>(
      'select action, version from public.question_history where question_id = $1 order by version',
      [questionId],
    );
    expect(history.rows.map((row) => row.action)).toEqual([
      'created',
      'updated',
      'submitted',
      'approved',
    ]);
  });
});

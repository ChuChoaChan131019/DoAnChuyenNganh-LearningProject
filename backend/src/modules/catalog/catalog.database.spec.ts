import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const manager = '00000000-0000-4000-8000-000000000001';
const learner = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
type Page = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  total_pages: number;
  stats: Record<string, number>;
};
async function page(
  kind: string,
  filters = {},
  number = 1,
  size = 10,
  actor = manager,
) {
  const result = await db.query<{ result: Page }>(
    'select public.content_catalog_page($1,$2,$3::jsonb,$4,$5) result',
    [kind, actor, JSON.stringify(filters), number, size],
  );
  return result.rows[0].result;
}

describe('catalog pagination SQL', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE profiles(id uuid PRIMARY KEY, role text);
      CREATE TABLE courses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text, slug text, description text, level text, status text, updated_at timestamptz DEFAULT now());
      CREATE TABLE chapters(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid REFERENCES courses, title text, status text, order_index int);
      CREATE TABLE lessons(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chapter_id uuid REFERENCES chapters, title text, status text, order_index int, is_ai_generated boolean, version int DEFAULT 1, estimated_duration_minutes int DEFAULT 10, created_at timestamptz DEFAULT now());
      CREATE TABLE questions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid REFERENCES courses, chapter_id uuid REFERENCES chapters, lesson_id uuid REFERENCES lessons, content text, status text, difficulty text DEFAULT 'easy', question_type text DEFAULT 'single_choice', is_ai_generated boolean DEFAULT false, generated_for_user_id uuid, deleted_at timestamptz, created_at timestamptz DEFAULT now());
      CREATE TABLE question_options(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid REFERENCES questions, option_text text, is_correct boolean, order_index int);
      CREATE TABLE quizzes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid REFERENCES courses, title text, is_active boolean DEFAULT true, pass_percentage numeric DEFAULT 50, created_at timestamptz DEFAULT now());
      CREATE TABLE quiz_questions(quiz_id uuid REFERENCES quizzes, question_id uuid REFERENCES questions);
      CREATE TABLE code_exercises(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid, lesson_id uuid, published_revision_id uuid, archived_at timestamptz, updated_at timestamptz DEFAULT now());
      CREATE TABLE code_exercise_revisions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exercise_id uuid REFERENCES code_exercises, title text, difficulty text DEFAULT 'easy', status text, revision_no int, edit_version int DEFAULT 1);
      CREATE TABLE lesson_validation_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lesson_id uuid REFERENCES lessons, created_at timestamptz DEFAULT now(), status text, lesson_version int);
      CREATE TABLE ai_tutor_messages(id uuid PRIMARY KEY, conversation_id uuid, created_at timestamptz);
      INSERT INTO profiles VALUES ('${manager}','content_manager'), ('${learner}','learner');
      INSERT INTO courses(title,slug,description,level,status) SELECT 'Course '||i, 'course-'||i, 'description', 'beginner', CASE WHEN i=26 THEN 'draft' ELSE 'published' END FROM generate_series(1,26) i;
      INSERT INTO chapters(course_id,title,status,order_index) SELECT id,'Chapter '||title, status,1 FROM courses;
      INSERT INTO lessons(chapter_id,title,status,order_index,is_ai_generated) SELECT id,'Lesson '||title,status,1,false FROM chapters;
      INSERT INTO lessons(chapter_id,title,status,order_index,is_ai_generated) SELECT (SELECT id FROM chapters ORDER BY title LIMIT 1),'Extra '||i,'published',i+1,true FROM generate_series(1,1029) i;
      INSERT INTO questions(course_id,chapter_id,lesson_id,content,status) SELECT c.id,ch.id,l.id,'Question '||i,'approved'
        FROM generate_series(1,1055) i CROSS JOIN LATERAL (SELECT id FROM courses ORDER BY title LIMIT 1) c
        CROSS JOIN LATERAL (SELECT id FROM chapters WHERE course_id=c.id LIMIT 1) ch
        CROSS JOIN LATERAL (SELECT id FROM lessons WHERE chapter_id=ch.id LIMIT 1) l;
      INSERT INTO quizzes(course_id,title) SELECT id,title||' Quiz' FROM courses;
      INSERT INTO quiz_questions SELECT q.id,x.id FROM quizzes q CROSS JOIN LATERAL (SELECT id FROM questions LIMIT 1) x;
      INSERT INTO code_exercises(created_by,lesson_id) SELECT '${manager}',id FROM lessons LIMIT 26;
      INSERT INTO code_exercise_revisions(exercise_id,title,status,revision_no) SELECT id,'Draft '||row_number() OVER(ORDER BY id),'draft',2 FROM code_exercises;
      INSERT INTO code_exercise_revisions(exercise_id,title,status,revision_no) SELECT id,'Published old','published',1 FROM code_exercises;
    `);
    await db.exec(
      readFileSync(
        new URL(
          '../../../../database/migrations/20261126065322_content_catalog_pagination.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
  }, 20000);
  afterAll(async () => db?.close());

  it('reaches rows beyond 1000 with stable ties and exact total', async () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 22; i++) {
      const result = await page('questions', {}, i, 50);
      expect(result.total).toBe(1055);
      expect(result.total_pages).toBe(22);
      result.items.forEach((item) => {
        expect(seen.has(String(item.id))).toBe(false);
        seen.add(String(item.id));
      });
    }
    expect(seen.size).toBe(1055);
  });

  it('filters before pagination and excludes assigned questions across pages', async () => {
    const match = await page('questions', {
      search: 'Question 1055',
      status: 'approved',
    });
    expect(match.total).toBe(1);
    const empty = await page('questions', {
      search: 'Question 1055',
      exclude_ids: match.items[0].id,
    });
    expect(empty.items).toEqual([]);
    expect(empty.total).toBe(0);
    expect(match.stats.approved).toBe(1055);
    expect((await page('questions', { search: 'Course 1' })).total).toBe(1055);
  });

  it('limits every catalog kind and reports out-of-range pages accurately', async () => {
    for (const kind of ['courses', 'lessons', 'quizzes', 'code', 'review']) {
      const first = await page(kind);
      expect(first.items).toHaveLength(10);
      expect(first.total).toBeGreaterThan(10);
      const missing = await page(kind, {}, 999);
      expect(missing.items).toEqual([]);
      expect(missing.total).toBe(first.total);
    }
  });

  it('does not expose drafts or authoring data to Learner', async () => {
    const courses = await page('courses', {}, 1, 50, learner);
    expect(courses.total).toBe(25);
    expect(courses.items.every((item) => item.status === 'Published')).toBe(
      true,
    );
    const lessons = await page('lessons', {}, 1, 50, learner);
    expect(lessons.total).toBe(1054);
    for (const kind of ['questions', 'quizzes', 'code', 'review'])
      await expect(page(kind, {}, 1, 10, learner)).rejects.toMatchObject({
        code: '42501',
      });
  });

  it('uses the latest draft for code search and computes quiz count without N+1 HTTP calls', async () => {
    const code = await page('code', { search: 'Draft 26' });
    expect(code.total).toBe(1);
    expect(code.items[0]).toMatchObject({
      title: 'Draft 26',
      has_draft: true,
      can_edit: true,
    });
    const quiz = await page('quizzes');
    expect(quiz.items[0]).toMatchObject({
      status: 'published',
      questions_count: 1,
    });
  });

  it('restricts the RPC to the backend role and rejects invalid sizes', async () => {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', 'public.content_catalog_page(text,uuid,jsonb,integer,integer)', 'EXECUTE') allowed",
    );
    expect(result.rows[0].allowed).toBe(false);
    await expect(page('courses', {}, 0)).rejects.toMatchObject({
      code: '22023',
    });
    await expect(page('courses', {}, 1, 51)).rejects.toMatchObject({
      code: '22023',
    });
  });
});

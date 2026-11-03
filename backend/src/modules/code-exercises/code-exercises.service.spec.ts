import { describe, expect, it, vi } from 'vitest';
import { CodeExercisesService } from './code-exercises.service.js';
import {
  CodeDifficulty,
  type SaveCodeExerciseDto,
} from './dto/save-code-exercise.dto.js';

const author = { id: 'author-1', role: 'content_manager' };
const admin = { id: 'admin-1', role: 'admin' };
const exercise = {
  id: 'exercise-1',
  lesson_id: 'lesson-1',
  created_by: author.id,
  published_revision_id: 'published-1',
  archived_at: null,
};
const published = {
  id: 'published-1',
  exercise_id: exercise.id,
  title: 'Published title',
  status: 'published',
  revision_no: 1,
  edit_version: 2,
};
const draft = {
  ...published,
  id: 'draft-1',
  title: 'Draft title',
  status: 'draft',
  revision_no: 2,
  edit_version: 3,
  difficulty: CodeDifficulty.EASY,
  hint_1: 'First hint',
  hint_2: 'Second hint',
  hint_3: 'Third hint',
  solution_code: 'Console.WriteLine(15);',
  solution_explanation: 'Sum the numbers',
};
const testCases = [
  {
    id: 'public-1',
    input_text: '5\n1 2 3 4 5\n',
    expected_output: '15\n',
    is_public: true,
    order_index: 1,
  },
  {
    id: 'hidden-1',
    input_text: '',
    expected_output: '',
    is_public: false,
    order_index: 2,
  },
];
const payload: SaveCodeExerciseDto = {
  lesson_id: exercise.lesson_id,
  title: 'Sum the numbers',
  difficulty: CodeDifficulty.EASY,
};

// Queue actual query results; keep builders inspectable to verify ownership filters.
function setup(results: Array<{ data: unknown; error?: unknown }> = []) {
  const builders: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
  const from = vi.fn(() => {
    const result = results.shift();
    if (!result) throw new Error('Unexpected database query');
    const resolved = { error: null, ...result };
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'eq', 'is', 'in', 'order', 'update']) {
      builder[method] = vi.fn(() => builder);
    }
    builder.maybeSingle = vi.fn(async () => resolved);
    // PostgREST builders implement PromiseLike, not just terminal single().
    // oxlint-disable-next-line unicorn/no-thenable -- Match the PostgREST query interface.
    Object.defineProperty(builder, 'then', {
      value: Promise.resolve(resolved).then.bind(Promise.resolve(resolved)),
    });
    builders.push(builder);
    return builder;
  });
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: { id: 'new-1', status: 'draft' }, error: null });
  const service = new CodeExercisesService({
    getClient: () => ({ from, rpc }),
  } as never);
  return { service, from, rpc, builders };
}

describe('CodeExercisesService', () => {
  it('lists only the author’s active exercises and searches the draft title', async () => {
    const { service, builders } = setup([
      { data: [exercise] },
      { data: [draft, published] },
    ]);
    const result = await service.findAll(author, exercise.lesson_id, ' DRAFT ');
    expect(result).toMatchObject([
      {
        id: exercise.id,
        title: 'Draft title',
        status: 'draft',
        has_draft: true,
        is_published: true,
      },
    ]);
    expect(builders[0].eq).toHaveBeenCalledWith('created_by', author.id);
    expect(builders[0].eq).toHaveBeenCalledWith(
      'lesson_id',
      exercise.lesson_id,
    );
    expect(builders[0].is).toHaveBeenCalledWith('archived_at', null);
  });

  it('allows an admin to list exercises across authors', async () => {
    const { service, builders } = setup([
      { data: [exercise] },
      { data: [published] },
    ]);
    expect(await service.findAll(admin)).toMatchObject([
      { title: 'Published title', has_draft: false },
    ]);
    expect(builders[0].eq).not.toHaveBeenCalledWith(
      'created_by',
      expect.anything(),
    );
  });

  it('returns an empty list without querying revisions', async () => {
    const { service, from } = setup([{ data: [] }]);
    expect(await service.findAll(author)).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('rejects reading another author’s hidden tests and solution before loading revisions', async () => {
    const { service, from } = setup([
      { data: { ...exercise, created_by: 'another-author' } },
    ]);
    await expect(service.findOne(exercise.id, author)).rejects.toMatchObject({
      status: 403,
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('reports a missing exercise', async () => {
    const { service } = setup([{ data: null }]);
    await expect(service.findOne('missing', author)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('loads draft tests without trimming empty or multiline data', async () => {
    const { service, builders } = setup([
      { data: exercise },
      { data: [draft, published] },
      { data: testCases },
    ]);
    const result = await service.findOne(exercise.id, author);
    expect(result.revision).toMatchObject({
      id: draft.id,
      hint_1: draft.hint_1,
      hint_2: draft.hint_2,
      hint_3: draft.hint_3,
      solution_code: draft.solution_code,
      solution_explanation: draft.solution_explanation,
    });
    expect(result.revision.test_cases).toEqual(
      testCases.map(({ input_text, ...rest }) => ({
        ...rest,
        input: input_text,
      })),
    );
    expect(builders[2].eq).toHaveBeenCalledWith('revision_id', draft.id);
  });

  it('lets an admin read another author’s published revision when no draft exists', async () => {
    const { service, builders } = setup([
      { data: exercise },
      { data: [published] },
      { data: [] },
    ]);
    expect((await service.findOne(exercise.id, admin)).revision.id).toBe(
      published.id,
    );
    expect(builders[2].eq).toHaveBeenCalledWith('revision_id', published.id);
  });

  it('creates through the atomic draft RPC using the authenticated actor', async () => {
    const { service, rpc } = setup();
    expect(await service.create(payload, author)).toEqual({
      id: 'new-1',
      status: 'draft',
    });
    expect(rpc).toHaveBeenCalledWith('save_code_exercise_draft', {
      p_actor_id: author.id,
      p_payload: payload,
      p_exercise_id: null,
      p_expected_version: 0,
    });
  });

  it('passes the expected version separately when updating', async () => {
    const { service, rpc } = setup();
    await service.updateDraft(
      exercise.id,
      { ...payload, edit_version: 3 },
      author,
    );
    expect(rpc).toHaveBeenCalledWith('save_code_exercise_draft', {
      p_actor_id: author.id,
      p_payload: payload,
      p_exercise_id: exercise.id,
      p_expected_version: 3,
    });
  });

  it.each([
    ['P0002', 404],
    ['42501', 403],
    ['PT409', 409],
    ['23505', 409],
    ['23502', 400],
    ['23503', 400],
    ['23514', 400],
    ['22023', 400],
    ['22P02', 400],
    ['XX000', 500],
  ])('maps database error %s to HTTP %i', async (code, status) => {
    const { service, rpc } = setup();
    rpc.mockResolvedValue({
      data: null,
      error: { code, message: 'database detail' },
    });
    await expect(
      service.updateDraft(exercise.id, { ...payload, edit_version: 1 }, author),
    ).rejects.toMatchObject({ status });
  });

  it('copies hints, solution and both test types into a new draft without old IDs', async () => {
    const { service, rpc } = setup([
      { data: exercise },
      { data: [draft] },
      { data: testCases },
    ]);
    await service.copy(exercise.id, author);
    const args = rpc.mock.calls[0][1];
    expect(args).toMatchObject({
      p_actor_id: author.id,
      p_exercise_id: null,
      p_expected_version: 0,
      p_payload: {
        title: 'Draft title (bản sao)',
        hint_1: draft.hint_1,
        hint_2: draft.hint_2,
        hint_3: draft.hint_3,
        solution_code: draft.solution_code,
        solution_explanation: draft.solution_explanation,
      },
    });
    expect(args.p_payload.test_cases).toEqual(
      testCases.map((t) => ({
        input: t.input_text,
        expected_output: t.expected_output,
        is_public: t.is_public,
      })),
    );
  });

  it('archives without deleting the exercise or its revisions', async () => {
    const { service, from, builders } = setup([
      { data: exercise },
      { data: [draft] },
      { data: [] },
      { data: null },
    ]);
    expect(await service.archive(exercise.id, author)).toEqual({
      id: exercise.id,
      archived: true,
    });
    expect(from).toHaveBeenCalledTimes(4);
    expect(builders[3].update).toHaveBeenCalledWith({
      archived_at: expect.any(String),
      updated_at: expect.any(String),
    });
    expect(builders[3].eq).toHaveBeenCalledWith('id', exercise.id);
  });

  it('rejects archiving an already archived exercise', async () => {
    const { service, from } = setup([
      { data: { ...exercise, archived_at: '2026-11-03T00:00:00Z' } },
      { data: [draft] },
      { data: [] },
    ]);
    await expect(service.archive(exercise.id, author)).rejects.toMatchObject({
      status: 409,
    });
    expect(from).toHaveBeenCalledTimes(3);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { LearnerCodeExercisesService } from './learner-code-exercises.service.js';

const learnerId = '00000000-0000-4000-8000-000000000001';
const exerciseId = '00000000-0000-4000-8000-000000000010';
const revisionId = '00000000-0000-4000-8000-000000000011';

function detailSetup(results: Array<{ data: unknown; error?: unknown }>) {
  const builders: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
  const from = vi.fn(() => {
    const result = { error: null, ...results.shift() };
    const builder: Record<string, any> = {};
    for (const method of ['select', 'eq', 'is', 'order', 'limit']) {
      builder[method] = vi.fn(() => builder);
    }
    builder.maybeSingle = vi.fn(async () => result);
    // Supabase query builders are thenable when a list query is awaited.
    // oxlint-disable-next-line unicorn/no-thenable
    builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
    builders.push(builder);
    return builder;
  });
  const service = new LearnerCodeExercisesService({
    getClient: () => ({ from }),
  } as never);
  return { service, from, builders };
}

describe('LearnerCodeExercisesService', () => {
  it('maps the learner list and creates a stable next cursor', async () => {
    const rows = [1, 2].map((index) => ({
      id: `00000000-0000-4000-8000-00000000001${index}`,
      title: `Bài ${index}`,
      difficulty: 'easy',
      course_id: 'course',
      course_slug: 'csharp-co-ban',
      course_title: 'C# cơ bản',
      chapter_id: 'chapter',
      chapter_title: 'Biến',
      lesson_id: 'lesson',
      lesson_title: 'Đọc dữ liệu',
      published_revision_id: revisionId,
      progress_status: index === 1 ? 'in_progress' : 'not_started',
      requires_resubmission: false,
      last_saved_at: null,
      published_updated_at: `2026-11-0${index}T00:00:00.000Z`,
    }));
    const rpc = vi.fn(async () => ({ data: rows, error: null }));
    const service = new LearnerCodeExercisesService({
      getClient: () => ({ rpc }),
    } as never);

    const page = await service.findAll({ limit: 1 }, learnerId);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      title: 'Bài 1',
      progress_status: 'in_progress',
      course: { slug: 'csharp-co-ban' },
    });
    expect(page.next_cursor).toEqual(expect.any(String));
    expect(rpc).toHaveBeenCalledWith(
      'list_learner_code_exercises',
      expect.objectContaining({ p_actor_id: learnerId, p_limit: 2 }),
    );
  });

  it('returns only safe published detail fields and the caller progress', async () => {
    const { service, builders } = detailSetup([
      {
        data: {
          id: exerciseId,
          lesson_id: 'lesson',
          published_revision_id: revisionId,
          archived_at: null,
        },
      },
      {
        data: {
          id: revisionId,
          revision_no: 1,
          title: 'Tính tổng',
          objective: 'Luyện tập',
          description: 'Đề bài',
          difficulty: 'easy',
          input_format: 'Hai số',
          output_format: 'Một số',
          starter_code: 'using System;',
          hint_1: 'HINT_ONE',
          hint_2: 'HINT_TWO',
          hint_3: 'HINT_THREE',
        },
      },
      { data: { id: 'lesson', title: 'Đọc dữ liệu', chapter_id: 'chapter' } },
      { data: { id: 'chapter', title: 'Biến', course_id: 'course' } },
      { data: { id: 'course', title: 'C# cơ bản', slug: 'csharp-co-ban' } },
      {
        data: [{
          id: 'case',
          input_text: '2\n3\n',
          expected_output: '5\n',
          order_index: 1,
        }],
      },
      {
        data: {
          saved_code: '',
          save_version: 2,
          status: 'in_progress',
          run_count: 4,
          highest_hint_level: 1,
          last_seen_revision_id: revisionId,
          completed_revision_id: null,
          updated_at: '2026-11-06T00:00:00.000Z',
        },
      },
      { data: null },
    ]);

    const detail = await service.findOne(exerciseId, learnerId);

    expect(detail.progress).toMatchObject({
      has_saved_code: true,
      saved_code: '',
      save_version: 2,
    });
    expect(detail.public_examples).toEqual([
      expect.objectContaining({ input: '2\n3\n', expected_output: '5\n' }),
    ]);
    const revisionSelect = builders[1].select.mock.calls[0][0] as string;
    expect(revisionSelect).not.toContain('solution_code');
    // Gợi ý chỉ được trả khi học sinh đã tự mở.
    expect(detail.progress).toMatchObject({ run_count: 4, highest_hint_level: 1 });
    expect(detail.hints.opened).toEqual([{ level: 1, hint: 'HINT_ONE' }]);
    expect(JSON.stringify(detail)).not.toContain('HINT_TWO');
    expect(detail.last_submission).toBeNull();
    expect(builders[5].eq).toHaveBeenCalledWith('is_public', true);
    expect(builders[6].eq).toHaveBeenCalledWith('learner_id', learnerId);
  });

  it('saves with the authenticated learner and expected version', async () => {
    const rpc = vi.fn(async () => ({
      data: { exercise_id: exerciseId, save_version: 4 },
      error: null,
    }));
    const service = new LearnerCodeExercisesService({
      getClient: () => ({ rpc }),
    } as never);

    await expect(
      service.saveCode(
        exerciseId,
        { code: 'Console.WriteLine(5);', expected_save_version: 3 },
        learnerId,
      ),
    ).resolves.toMatchObject({ save_version: 4 });
    expect(rpc).toHaveBeenCalledWith('save_learner_code_progress', {
      p_actor_id: learnerId,
      p_exercise_id: exerciseId,
      p_code: 'Console.WriteLine(5);',
      p_expected_version: 3,
    });
  });

  it('maps stale saves to HTTP 409', async () => {
    const service = new LearnerCodeExercisesService({
      getClient: () => ({
        rpc: vi.fn(async () => ({
          data: null,
          error: { code: 'PT409', message: 'stale' },
        })),
      }),
    } as never);

    await expect(
      service.saveCode(
        exerciseId,
        { code: 'old', expected_save_version: 1 },
        learnerId,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('C07: maps out-of-order hints to 409 and returns the opened hint', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { level: 1, hint: 'HINT_ONE', highest_hint_level: 1 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PT409', message: 'order' },
      });
    const service = new LearnerCodeExercisesService({
      getClient: () => ({ rpc }),
    } as never);

    await expect(service.openHint(exerciseId, 1, learnerId)).resolves.toMatchObject({
      hint: 'HINT_ONE',
    });
    expect(rpc).toHaveBeenCalledWith('open_code_exercise_hint', {
      p_actor_id: learnerId,
      p_exercise_id: exerciseId,
      p_level: 1,
    });
    await expect(service.openHint(exerciseId, 3, learnerId)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('C07: a failed run counter never breaks the run result', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: 'XX000', message: 'boom' },
    }));
    const service = new LearnerCodeExercisesService({
      getClient: () => ({ rpc }),
    } as never);

    await expect(service.recordRun(exerciseId, learnerId)).resolves.toBeUndefined();
  });

  it('C07: records a submission and maps a stale revision to 409', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: { all_passed: true }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'PT409', message: 'newer' },
      });
    const service = new LearnerCodeExercisesService({
      getClient: () => ({ rpc }),
    } as never);
    const submission = {
      revisionId,
      code: 'code',
      totalCases: 2,
      passedCases: 2,
      results: [],
    };

    await expect(
      service.recordSubmission(exerciseId, learnerId, submission),
    ).resolves.toMatchObject({ all_passed: true });
    expect(rpc).toHaveBeenCalledWith(
      'submit_code_exercise',
      expect.objectContaining({
        p_actor_id: learnerId,
        p_revision_id: revisionId,
        p_total_cases: 2,
        p_passed_cases: 2,
      }),
    );
    await expect(
      service.recordSubmission(exerciseId, learnerId, submission),
    ).rejects.toMatchObject({ status: 409 });
  });
});

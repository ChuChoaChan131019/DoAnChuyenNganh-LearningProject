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
    for (const method of ['select', 'eq', 'is', 'order']) {
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
          last_seen_revision_id: revisionId,
          completed_revision_id: null,
          updated_at: '2026-11-06T00:00:00.000Z',
        },
      },
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
    expect(revisionSelect).not.toContain('hint_1');
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
});

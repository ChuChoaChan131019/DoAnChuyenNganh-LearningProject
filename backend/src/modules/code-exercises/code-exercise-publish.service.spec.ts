import { describe, expect, it, vi } from 'vitest';
import { CodeExercisePublishService } from './code-exercise-publish.service.js';

const actor = { id: 'author-1', role: 'content_manager' };
const revision = {
  id: 'revision-1',
  edit_version: 1,
  status: 'draft',
  title: 'Tính tổng',
  objective: 'Cộng hai số',
  description: 'Đọc hai dòng và in tổng',
  input_format: 'Hai dòng số',
  output_format: 'Một dòng tổng',
  hint_1: 'Đọc',
  hint_2: 'Đổi kiểu',
  hint_3: 'Cộng',
  solution_code: 'Console.WriteLine(3);',
  solution_explanation: 'Cộng hai số',
  test_cases: [
    { input: '1\n2\n', expected_output: '3\n', is_public: true },
    { input: '2\n1\n', expected_output: '3\n', is_public: false },
  ],
};

function setup() {
  const detail = {
    id: 'exercise-1',
    lesson_id: 'lesson-1',
    archived_at: null as string | null,
    revision: structuredClone(revision),
  };
  const findOne = vi.fn(async () => structuredClone(detail));
  const parents: Record<
    string,
    { status: string; chapter_id?: string; course_id?: string }
  > = {
    lessons: { status: 'published', chapter_id: 'chapter-1' },
    chapters: { status: 'published', course_id: 'course-1' },
    courses: { status: 'published' },
  };
  const from = vi.fn((table: string) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: parents[table], error: null })),
    };
    return chain;
  });
  const rpc = vi.fn(async (_name: string, _args: unknown) => ({
    data: { id: detail.id, revision_id: revision.id, status: 'published' },
    error: null as { code: string } | null,
  }));
  const run = vi.fn(async (_code: string, _input: string) => ({
    status: 'success',
    stdout: '3\n',
    stderr: '',
  }));
  const service = new CodeExercisePublishService(
    { getClient: () => ({ from, rpc }) } as never,
    { findOne } as never,
    { run } as never,
  );
  return { service, detail, findOne, parents, rpc, run };
}

describe('C04 reference solution validation and publication', () => {
  it('runs every public and hidden input before allowing publication', async () => {
    const { service, run } = setup();
    const result = await service.validate('exercise-1', actor, 1);
    expect(result.can_publish).toBe(true);
    expect(result.cases.map((item) => item.is_public)).toEqual([true, false]);
    expect(run.mock.calls).toEqual(
      revision.test_cases.map((test) => [revision.solution_code, test.input]),
    );
  });

  it.each(['3\r\n', '3\r', '3 \t\n\n', '3'])(
    'normalizes equivalent output %j',
    async (stdout) => {
      const { service, run } = setup();
      run.mockResolvedValue({ status: 'success', stdout, stderr: '' });
      expect((await service.validate('exercise-1', actor, 1)).can_publish).toBe(
        true,
      );
    },
  );

  it('rejects a hidden case failure even when the public example passes', async () => {
    const { service, run, rpc } = setup();
    run.mockResolvedValueOnce({ status: 'success', stdout: '3', stderr: '' });
    run.mockResolvedValue({ status: 'success', stdout: 'wrong', stderr: '' });
    const result = await service.validate('exercise-1', actor, 1);
    expect(result.can_publish).toBe(false);
    expect(result.cases.map((item) => item.status)).toEqual([
      'passed',
      'wrong_answer',
    ]);
    await expect(service.publish('exercise-1', actor, 1)).rejects.toMatchObject(
      { status: 400 },
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    'compile_error',
    'runtime_error',
    'time_limit',
    'resource_limit',
    'output_limit',
  ])('blocks publication on runner status %s', async (status) => {
    const { service, run, rpc } = setup();
    run.mockResolvedValue({
      status,
      stdout: '3\n',
      stderr: 'runner diagnostic',
    });
    await expect(service.publish('exercise-1', actor, 1)).rejects.toMatchObject(
      { status: 400 },
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it('propagates runner unavailability without publishing', async () => {
    const { service, run, rpc } = setup();
    run.mockRejectedValue(new Error('Runner unavailable'));
    await expect(service.publish('exercise-1', actor, 1)).rejects.toThrow(
      'Runner unavailable',
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['hint_1', 'solution_code', 'description'] as const)(
    'rejects missing %s before starting Docker',
    async (field) => {
      const { service, detail, run } = setup();
      detail.revision[field] = ' \n\t';
      expect((await service.validate('exercise-1', actor, 1)).can_publish).toBe(
        false,
      );
      expect(run).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'requires both public and hidden tests (only public=%s)',
    async (isPublic) => {
      const { service, detail, run } = setup();
      detail.revision.test_cases.forEach((test) => {
        test.is_public = isPublic;
      });
      expect((await service.validate('exercise-1', actor, 1)).can_publish).toBe(
        false,
      );
      expect(run).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized UTF-8 input before running code', async () => {
    const { service, detail, run } = setup();
    detail.revision.test_cases[0].input = 'ế'.repeat(6000);
    expect((await service.validate('exercise-1', actor, 1)).can_publish).toBe(
      false,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['lessons', 'chapters', 'courses'])(
    'requires published parent %s',
    async (table) => {
      const { service, parents, run, rpc } = setup();
      parents[table].status = 'draft';
      await expect(
        service.publish('exercise-1', actor, 1),
      ).rejects.toMatchObject({ status: 400 });
      expect(run).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it('rejects a stale version before running code', async () => {
    const { service, run } = setup();
    await expect(
      service.validate('exercise-1', actor, 2),
    ).rejects.toMatchObject({ status: 409 });
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects archived content', async () => {
    const { service, detail, run } = setup();
    detail.archived_at = new Date().toISOString();
    await expect(service.publish('exercise-1', actor, 1)).rejects.toMatchObject(
      { status: 404 },
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('never replaces the checked revision with a newly created draft at the same edit version', async () => {
    const { service, detail, findOne, run, rpc } = setup();
    run.mockImplementationOnce(async () => {
      // Another request publishes A and creates B while A is being checked.
      detail.revision.id = 'revision-B';
      detail.revision.solution_code = 'Console.WriteLine(999);';
      return { status: 'success', stdout: '3', stderr: '' };
    });
    rpc.mockResolvedValue({ data: null as never, error: { code: 'PT409' } });
    await expect(service.publish('exercise-1', actor, 1)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(rpc).toHaveBeenCalledWith('publish_code_exercise_draft', {
      p_actor_id: actor.id,
      p_exercise_id: detail.id,
      p_revision_id: revision.id,
      p_expected_edit_version: 1,
    });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(
      run.mock.calls.every(([code]) => code === revision.solution_code),
    ).toBe(true);
  });

  it('publishes the exact checked revision and version on success', async () => {
    const { service, findOne, rpc } = setup();
    expect(await service.publish('exercise-1', actor, 1)).toMatchObject({
      status: 'published',
    });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('publish_code_exercise_draft', {
      p_actor_id: actor.id,
      p_exercise_id: 'exercise-1',
      p_revision_id: revision.id,
      p_expected_edit_version: 1,
    });
  });
});

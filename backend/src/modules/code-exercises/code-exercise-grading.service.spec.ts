import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';

import { CodeExerciseGradingService } from './code-exercise-grading.service.js';
import { codeOutputMatches } from './code-exercise-output.js';

const exerciseId = 'exercise-1';
const learnerId = 'learner-1';

const sampleTests = [
  {
    order_index: 1,
    input_text: '2\n3\n',
    expected_output: '5\n',
    is_public: true,
  },
  {
    order_index: 2,
    input_text: 'HIDDEN_INPUT_12345',
    expected_output: 'HIDDEN_EXPECTED_12345',
    is_public: false,
  },
];

function execution(stdout: string, status = 'success') {
  return {
    status,
    stdout,
    stderr: '',
    exit_code: 0,
    elapsed_ms: 100,
  };
}

function setup() {
  const detail = {
    published_revision: {
      id: 'revision-1',
      revision_no: 1,
    },
  };

  const findOne = vi.fn(async () => detail);
  const recordSubmission = vi.fn(async () => ({ status: 'completed' }));

  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(async () => ({
      data: structuredClone(sampleTests),
      error: null,
    })),
  };

  const from = vi.fn(() => query);

  const run = vi.fn(async () => execution('5\n'));

  const service = new CodeExerciseGradingService(
    { getClient: () => ({ from }) } as never,
    { findOne, recordSubmission } as never,
    { run } as never,
  );

  return {
    service,
    run,
    findOne,
    from,
    recordSubmission,
  };
}

describe('C05 - Chấm bài thực hành C#', () => {
  it('chuẩn hóa kết quả theo quy ước', () => {
    expect(codeOutputMatches('30\r\n', '30\n')).toBe(true);
    expect(codeOutputMatches('Hello   \n', 'Hello')).toBe(true);
    expect(codeOutputMatches('Hello', 'hello')).toBe(false);
    expect(codeOutputMatches('1  2', '1 2')).toBe(false);
  });

  it('chạy thử chỉ sử dụng test công khai', async () => {
    const { service, run } = setup();

    const result = await service.grade(
      exerciseId,
      learnerId,
      'Console.WriteLine(5);',
      'public',
      'revision-1',
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('Console.WriteLine(5);', '2\n3\n');

    expect(result.total_cases).toBe(1);
    expect(result.passed_cases).toBe(1);
    expect(result.all_passed).toBe(true);
  });

  it('chấm test ẩn nhưng không trả dữ liệu ẩn', async () => {
    const { service, run } = setup();

    run
      .mockResolvedValueOnce(execution('5\n'))
      .mockResolvedValueOnce(execution('SAI_KET_QUA'));

    const result = await service.grade(
      exerciseId,
      learnerId,
      'Console.WriteLine(5);',
      'all',
      'revision-1',
    );

    expect(result.total_cases).toBe(2);
    expect(result.passed_cases).toBe(1);
    expect(result.all_passed).toBe(false);

    expect(result.cases[0].status).toBe('passed');
    expect(result.cases[1].status).toBe('wrong_answer');

    // Không có input, expected, actual hoặc stderr.
    expect(result.cases[1]).toEqual({
      index: 2,
      is_public: false,
      status: 'wrong_answer',
      message: 'Sai kết quả',
    });

    const responseText = JSON.stringify(result);

    expect(responseText).not.toContain('HIDDEN_INPUT_12345');

    expect(responseText).not.toContain('HIDDEN_EXPECTED_12345');

    expect(responseText).not.toContain('SAI_KET_QUA');
  });

  it('lỗi biên dịch không giả vờ đã chạy các test sau', async () => {
    const { service, run } = setup();

    run.mockResolvedValueOnce({
      ...execution(''),
      status: 'compile_error',
      stderr: 'CS1002: ; expected',
      exit_code: 21,
    });

    const result = await service.grade(
      exerciseId,
      learnerId,
      'using System;',
      'all',
      'revision-1',
    );

    expect(run).toHaveBeenCalledTimes(1);

    expect(result.cases[0].status).toBe('compile_error');
    expect(result.cases[1].status).toBe('not_run');
    expect(result.all_passed).toBe(false);
  });

  it('không tạo điểm giả nếu Docker lỗi', async () => {
    const { service, run } = setup();

    run.mockRejectedValueOnce(
      new ServiceUnavailableException('Docker không khả dụng'),
    );

    await expect(
      service.grade(
        exerciseId,
        learnerId,
        'Console.WriteLine(5);',
        'public',
        'revision-1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each(['public', 'all'] as const)(
    'rejects an outdated displayed revision before reading tests (%s)',
    async (mode) => {
      const { service, run, from } = setup();
      await expect(
        service.grade(
          exerciseId,
          learnerId,
          'Console.WriteLine(5);',
          mode,
          'old-revision',
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(from).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
    },
  );

  it('rejects a revision published while grading is in progress', async () => {
    const { service, findOne } = setup();
    findOne.mockResolvedValueOnce({
      published_revision: { id: 'revision-1', revision_no: 1 },
    });
    findOne.mockResolvedValueOnce({
      published_revision: { id: 'revision-2', revision_no: 2 },
    });
    await expect(
      service.grade(
        exerciseId,
        learnerId,
        'Console.WriteLine(5);',
        'all',
        'revision-1',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it.each(['runtime_error', 'time_limit', 'resource_limit', 'output_limit'])(
    'preserves %s while withholding all hidden diagnostics',
    async (status) => {
      const { service, run } = setup();
      run.mockResolvedValueOnce(execution('5\n'));
      run.mockResolvedValueOnce({
        ...execution('PRIVATE_STDOUT', status),
        stderr: 'PRIVATE_STDERR',
      });
      const result = await service.grade(
        exerciseId,
        learnerId,
        'test code',
        'all',
        'revision-1',
      );
      expect(result.cases[1]).toEqual({
        index: 2,
        is_public: false,
        status,
        message: expect.any(String),
      });
      expect(result.all_passed).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(
        /PRIVATE_STDOUT|PRIVATE_STDERR|HIDDEN_INPUT|HIDDEN_EXPECTED/,
      );
    },
  );

  it('checks learner access before reading or executing tests', async () => {
    const { service, findOne, from, run } = setup();
    findOne.mockRejectedValueOnce(new Error('Access denied'));
    await expect(
      service.grade(exerciseId, learnerId, 'test code', 'all', 'revision-1'),
    ).rejects.toThrow('Access denied');
    expect(from).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('C07: nộp bài chấm toàn bộ test và lưu kết quả không lộ test ẩn', async () => {
    const { service, run, recordSubmission } = setup();
    run
      .mockResolvedValueOnce(execution('5\n'))
      .mockResolvedValueOnce(execution('SAI_KET_QUA'));

    const result = await service.submit(
      exerciseId,
      learnerId,
      'Console.WriteLine(5);',
      'revision-1',
    );

    expect(run).toHaveBeenCalledTimes(2);
    expect(result.all_passed).toBe(false);
    expect(result.submission).toEqual({ status: 'completed' });
    expect(recordSubmission).toHaveBeenCalledWith(
      exerciseId,
      learnerId,
      expect.objectContaining({
        revisionId: 'revision-1',
        totalCases: 2,
        passedCases: 1,
      }),
    );
    expect(JSON.stringify(recordSubmission.mock.calls)).not.toMatch(
      /HIDDEN_INPUT|HIDDEN_EXPECTED|SAI_KET_QUA/,
    );
  });

  it('C07: không lưu lần nộp khi chấm bị từ chối', async () => {
    const { service, findOne, recordSubmission } = setup();
    findOne.mockRejectedValueOnce(new Error('Access denied'));
    await expect(
      service.submit(exerciseId, learnerId, 'code', 'revision-1'),
    ).rejects.toThrow('Access denied');
    expect(recordSubmission).not.toHaveBeenCalled();
  });
});

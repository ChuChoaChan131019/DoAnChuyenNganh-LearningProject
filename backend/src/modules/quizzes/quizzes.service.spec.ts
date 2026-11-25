import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { gradeAnswer, quizSubmitGraceSeconds, QuizzesService, scorePercentage } from './quizzes.service.js';

type Result = { data: unknown; error: { message: string; code?: string } | null };

/** Chuỗi truy vấn Supabase giả: mọi phương thức trả lại chính nó, await ra kết quả của bảng. */
function chain(result: Result) {
  const q: any = {};
  for (const method of ['select', 'eq', 'in', 'is', 'not', 'order', 'limit', 'insert', 'update', 'delete']) {
    q[method] = vi.fn(() => q);
  }
  q.maybeSingle = vi.fn(async () => result);
  q.single = vi.fn(async () => result);
  q.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

function serviceWith(tables: Record<string, Result | Result[]>, rpc = vi.fn(async () => ({ data: null, error: null }) as Result)) {
  const queues = new Map(Object.entries(tables).map(([name, value]) => [name, Array.isArray(value) ? [...value] : [value]]));
  const from = vi.fn((table: string) => {
    const queue = queues.get(table);
    if (!queue?.length) throw new Error(`Unexpected table ${table}`);
    return chain(queue.length > 1 ? queue.shift()! : queue[0]);
  });
  const service = new QuizzesService({ getClient: () => ({ from, rpc }) } as never);
  return { service, from, rpc };
}

const ok = (data: unknown): Result => ({ data, error: null });
const activeQuiz = ok({ id: 'quiz', title: 'Quiz', is_active: true, duration_minutes: 10, pass_percentage: 50 });

const options = [
  { id: 'a', option_text: 'A', order_index: 0, is_correct: true },
  { id: 'b', option_text: 'B', order_index: 1, is_correct: false },
];

describe('quiz scoring helpers', () => {
  it('grades by weight and ignores options from other questions', () => {
    expect(gradeAnswer('q', 3, options, { question_id: 'q', selected_option_ids: ['a', 'zzz'] })).toMatchObject({
      is_correct: true, earned_score: 3, selected_option_ids: ['a'],
    });
    expect(gradeAnswer('q', 3, options, { question_id: 'q', selected_option_ids: ['a', 'b'] })).toMatchObject({
      is_correct: false, earned_score: 0,
    });
    expect(gradeAnswer('q', 2, options, undefined)).toMatchObject({ is_correct: false, earned_score: 0, selected_option_ids: [] });
  });

  it('computes the weighted percentage (3 + 1 points, only the 3-point question correct = 75%)', () => {
    expect(scorePercentage(3, 4)).toBe(75);
    expect(scorePercentage(0, 0)).toBe(0);
    expect(scorePercentage(null, 4)).toBeNull();
  });

  it('reads the grace period from the environment with a 30 second default', () => {
    expect(quizSubmitGraceSeconds(undefined)).toBe(30);
    expect(quizSubmitGraceSeconds('45')).toBe(45);
    expect(quizSubmitGraceSeconds('abc')).toBe(30);
  });
});

describe('QuizzesService.getQuestions', () => {
  it('does not send correct answers or explanations to learners', async () => {
    const { service } = serviceWith({
      quizzes: activeQuiz,
      quiz_questions: ok([
        { question_id: 'q1', score_weight: 1, questions: { id: 'q1', status: 'approved', content: 'Q1', question_type: 'single_choice', options } },
        { question_id: 'q2', score_weight: 1, questions: { id: 'q2', status: 'draft', content: 'Q2', options } },
      ]),
    });
    const result = await service.getQuestions('quiz', 'learner');
    expect(result).toHaveLength(1);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('is_correct');
    expect(serialized).not.toContain('explanation');
  });
});

describe('QuizzesService.startAttempt', () => {
  it('returns the server deadline from the start RPC', async () => {
    const rpc = vi.fn(async () => ok({ id: 'attempt', quiz_id: 'quiz', started_at: 's', expires_at: 'e', server_now: 'n' }));
    const { service } = serviceWith({ quizzes: activeQuiz, quiz_questions: ok([{ question_id: 'q1', score_weight: 1, questions: { status: 'approved', options } }]) }, rpc);
    await expect(service.startAttempt('quiz', 'learner')).resolves.toMatchObject({
      attempt_id: 'attempt', expires_at: 'e', server_now: 'n', questions: [expect.objectContaining({ question_id: 'q1' })],
    });
    expect(rpc).toHaveBeenCalledWith('start_quiz_attempt', { p_quiz_id: 'quiz', p_user_id: 'learner', p_grace_seconds: 30 });
  });
});

describe('QuizzesService.submitAttempt', () => {
  const scoring = ok([
    { question_id: 'q3', score_weight: 3, questions: { status: 'approved', options } },
    { question_id: 'q1', score_weight: 1, questions: { status: 'approved', options } },
  ]);

  it('sends graded answers and the weighted maximum to the RPC', async () => {
    const rpc = vi.fn(async () => ok({ status: 'submitted', attempt_id: 'attempt', end_reason: 'submitted', score: 3, max_score: 4, percentage: 75, pass_percentage: 50, passed: true }));
    const { service } = serviceWith({ quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz' }), quiz_questions: scoring }, rpc);
    await expect(service.submitAttempt('attempt', { answers: [{ question_id: 'q3', selected_option_ids: ['a'] }] }, 'learner'))
      .resolves.toMatchObject({ score: 3, max_score: 4, percentage: 75, passed: true, already_submitted: false });
    const args = (rpc.mock.calls[0] as unknown[])[1] as { p_details: Array<{ earned_score: number }>; p_max_score: number };
    expect(args.p_max_score).toBe(4);
    expect(args.p_details.map((item) => item.earned_score)).toEqual([3, 0]);
  });

  it('returns the stored result when the attempt was already submitted', async () => {
    const rpc = vi.fn(async () => ok({ status: 'already_submitted', attempt_id: 'attempt', end_reason: 'submitted', score: 3, max_score: 4, percentage: 75, passed: true }));
    const { service } = serviceWith({ quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz' }), quiz_questions: scoring }, rpc);
    await expect(service.submitAttempt('attempt', { answers: [] }, 'learner')).resolves.toMatchObject({ already_submitted: true, percentage: 75 });
  });

  it('rejects late submissions with QUIZ_ATTEMPT_EXPIRED', async () => {
    const rpc = vi.fn(async () => ok({ status: 'expired', attempt_id: 'attempt', end_reason: 'expired' }));
    const { service } = serviceWith({ quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz' }), quiz_questions: scoring }, rpc);
    const error = await service.submitAttempt('attempt', { answers: [] }, 'learner').catch((reason) => reason);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ error: { code: 'QUIZ_ATTEMPT_EXPIRED' } });
  });

  it('returns 404 for an attempt of another learner', async () => {
    const { service } = serviceWith({ quiz_attempts: ok(null) });
    await expect(service.submitAttempt('attempt', { answers: [] }, 'other')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuizzesService.latestResult', () => {
  it('returns the stored percentage instead of the raw score', async () => {
    const { service } = serviceWith({
      quiz_attempts: ok({ id: 'attempt', total_score: 3, max_score: 4, score_percentage: 75, is_passed: true, completed_at: 'c' }),
    });
    await expect(service.latestResult('quiz', 'learner')).resolves.toMatchObject({ score: 3, max_score: 4, percentage: 75 });
  });

  it('computes the percentage for attempts saved before the migration', async () => {
    const { service } = serviceWith({
      quiz_attempts: ok({ id: 'attempt', total_score: 1, max_score: null, score_percentage: null, is_passed: false, completed_at: 'c' }),
      quiz_questions: ok([{ score_weight: 3 }, { score_weight: 1 }]),
    });
    await expect(service.latestResult('quiz', 'learner')).resolves.toMatchObject({ max_score: 4, percentage: 25 });
  });
});

describe('QuizzesService.getAttemptReview', () => {
  it('refuses to reveal answers before the attempt is submitted', async () => {
    const { service } = serviceWith({ quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz', completed_at: null }) });
    const error = await service.getAttemptReview('attempt', 'learner').catch((reason) => reason);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ error: { code: 'QUIZ_ATTEMPT_IN_PROGRESS' } });
  });

  it('returns stored answers, correct options and explanations of a submitted attempt', async () => {
    const question = { id: 'q3', content: 'Q3', question_type: 'single_choice', explanation: 'Because', options };
    const { service } = serviceWith({
      quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz', completed_at: 'c', total_score: 3, max_score: 4, score_percentage: 75, pass_percentage: 50, is_passed: true, end_reason: 'submitted' }),
      quiz_attempt_details: ok([
        { id: 'd3', question_id: 'q3', answer_text: null, is_correct: true, score_weight: 3, earned_score: 3, quiz_attempt_answers: [{ option_id: 'a' }], questions: question },
        { id: 'd1', question_id: 'q1', answer_text: null, is_correct: false, score_weight: 1, earned_score: 0, quiz_attempt_answers: [], questions: { ...question, id: 'q1' } },
      ]),
      quiz_questions: ok([
        { question_id: 'q3', score_weight: 3, questions: question },
        { question_id: 'q1', score_weight: 1, questions: { ...question, id: 'q1' } },
      ]),
    });
    const review = await service.getAttemptReview('attempt', 'learner');
    expect(review).toMatchObject({ percentage: 75, correct_count: 1, total_questions: 2, passed: true });
    expect(review.questions[0]).toMatchObject({ question_id: 'q3', selected_option_ids: ['a'], explanation: 'Because' });
    expect(review.questions[0].options.find((option) => option.id === 'a')?.is_correct).toBe(true);
  });
});

describe('QuizzesService.configureQuestions', () => {
  it('rejects deleted questions that are not already in the quiz', async () => {
    const { service } = serviceWith({
      quizzes: ok({ id: 'quiz', is_active: false }),
      questions: ok([{ id: 'q1', status: 'approved', deleted_at: '2026-11-25' }]),
      quiz_questions: ok([]),
    });
    await expect(service.configureQuestions('quiz', { questions: [{ question_id: 'q1', score_weight: 1 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps a deleted question that the quiz already uses', async () => {
    const { service } = serviceWith({
      quizzes: ok({ id: 'quiz', is_active: false }),
      questions: ok([{ id: 'q1', status: 'approved', deleted_at: '2026-11-25' }]),
      quiz_questions: [ok([{ question_id: 'q1' }]), ok(null), ok(null), ok([{ score_weight: 1 }])],
    });
    await expect(service.configureQuestions('quiz', { questions: [{ question_id: 'q1', score_weight: 1 }] }))
      .resolves.toMatchObject({ total_questions: 1 });
  });
});

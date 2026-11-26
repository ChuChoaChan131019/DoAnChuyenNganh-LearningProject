import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { gradeAnswer, QuizzesService, scorePercentage } from './quizzes.service.js';

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
const activeQuiz = ok({ id: 'quiz', title: 'Quiz', course_id: 'course', chapter_id: null, is_active: true, duration_minutes: 10, pass_percentage: 50 });

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

  it('grades a typed fill-in answer against the private answer key', () => {
    expect(gradeAnswer('blank', 2, [{ id: 'key', option_text: ' Hà Nội ', is_correct: true }],
      { question_id: 'blank', answer: 'hà nội' })).toMatchObject({ is_correct: true, earned_score: 2 });
  });

});

describe('QuizzesService.getQuestions', () => {
  it('blocks learner access when the course is unpublished', async () => {
    const { service } = serviceWith({ quizzes: activeQuiz, courses: ok({ status: 'draft' }) });
    await expect(service.getQuestions('quiz', 'learner')).rejects.toMatchObject({ status: 403 });
  });

  it('does not send correct answers or explanations to learners', async () => {
    const { service } = serviceWith({
      quizzes: activeQuiz,
      courses: ok({ status: 'published' }),
      quiz_questions: ok([
        { question_id: 'q1', score_weight: 1, questions: { id: 'q1', status: 'approved', content: 'Q1', question_type: 'single_choice', options } },
        { question_id: 'q3', score_weight: 1, questions: { id: 'q3', status: 'approved', content: 'Blank', question_type: 'fill_in_blank', options: [{ id: 'answer', option_text: 'secret answer', is_correct: true }] } },
        { question_id: 'q2', score_weight: 1, questions: { id: 'q2', status: 'draft', content: 'Q2', options } },
      ]),
    });
    const result = await service.getQuestions('quiz', 'learner');
    expect(result).toHaveLength(2);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('is_correct');
    expect(serialized).not.toContain('explanation');
    expect(serialized).not.toContain('secret answer');
  });
});

describe('QuizzesService.startAttempt', () => {
  it('returns the server deadline from the start RPC', async () => {
    const rpc = vi.fn(async () => ok({ id: 'attempt', quiz_id: 'quiz', started_at: 's', expires_at: 'e', server_now: 'n', questions: [
      { question_id: 'q1', score_weight: 1, question: { id: 'q1', content: 'Q1', options } },
      { question_id: 'q2', score_weight: 1, question: { id: 'q2', content: 'Blank', question_type: 'fill_in_blank', options: [{ id: 'answer', option_text: 'secret answer', is_correct: true }] } },
    ] }));
    const { service } = serviceWith({ quizzes: activeQuiz }, rpc);
    await expect(service.startAttempt('quiz', 'learner')).resolves.toMatchObject({
      attempt_id: 'attempt', expires_at: 'e', server_now: 'n', questions: [
        expect.objectContaining({ question_id: 'q1' }),
        expect.objectContaining({ question_id: 'q2', options: [] }),
      ],
    });
    expect(rpc).toHaveBeenCalledWith('start_quiz_attempt', { p_quiz_id: 'quiz', p_user_id: 'learner', p_grace_seconds: 0 });
    expect(JSON.stringify(await service.startAttempt('quiz', 'learner'))).not.toContain('is_correct');
    expect(JSON.stringify(await service.startAttempt('quiz', 'learner'))).not.toContain('secret answer');
  });

  it('resumes a saved attempt even after the quiz is archived', async () => {
    const rpc = vi.fn(async () => ok({ id: 'attempt', quiz_id: 'quiz', questions: [
      { question_id: 'q1', score_weight: 1, question: { id: 'q1', content: 'Original', options } },
    ] }));
    const { service } = serviceWith({ quizzes: ok({ id: 'quiz', title: 'Quiz', is_active: false }) }, rpc);
    await expect(service.startAttempt('quiz', 'learner')).resolves.toMatchObject({
      attempt_id: 'attempt', questions: [expect.objectContaining({ content: 'Original' })],
    });
  });
});

describe('QuizzesService.submitAttempt', () => {
  const savedQuestions = [
    { question_id: 'q3', score_weight: 3, question: { content: 'Original Q3', options } },
    { question_id: 'q1', score_weight: 1, question: { content: 'Original Q1', options } },
  ];
  const savedAttempt = ok({ id: 'attempt', quiz_id: 'quiz' });
  const submissionRpc = (result: Record<string, unknown>) => vi.fn(async (name: string) =>
    ok(name === 'get_quiz_attempt_snapshot' ? savedQuestions : result));

  it('sends graded answers and the weighted maximum to the RPC', async () => {
    const rpc = submissionRpc({ status: 'submitted', attempt_id: 'attempt', end_reason: 'submitted', score: 3, max_score: 4, percentage: 75, pass_percentage: 50, passed: true });
    const { service, from } = serviceWith({ quiz_attempts: savedAttempt }, rpc);
    await expect(service.submitAttempt('attempt', { answers: [{ question_id: 'q3', selected_option_ids: ['a'] }] }, 'learner'))
      .resolves.toMatchObject({ score: 3, max_score: 4, percentage: 75, passed: true, already_submitted: false });
    const args = (rpc.mock.calls[1] as unknown[])[1] as {
      p_details: Array<{ earned_score: number; question_snapshot: { options: typeof options } }>;
      p_max_score: number;
      p_grace_seconds: number;
    };
    expect(args.p_max_score).toBe(4);
    expect(args.p_grace_seconds).toBe(0);
    expect(args.p_details.map((item) => item.earned_score)).toEqual([3, 0]);
    expect(args.p_details[0].question_snapshot.options).toEqual(options);
    expect(from).not.toHaveBeenCalledWith('quiz_questions');
    expect(rpc).toHaveBeenNthCalledWith(1, 'get_quiz_attempt_snapshot', {
      p_attempt_id: 'attempt', p_user_id: 'learner',
    });
  });

  it('returns the stored result when the attempt was already submitted', async () => {
    const rpc = submissionRpc({ status: 'already_submitted', attempt_id: 'attempt', end_reason: 'submitted', score: 3, max_score: 4, percentage: 75, passed: true });
    const { service } = serviceWith({ quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz', completed_at: 'done' }) }, rpc);
    await expect(service.submitAttempt('attempt', { answers: [] }, 'learner')).resolves.toMatchObject({ already_submitted: true, percentage: 75 });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('rejects late submissions with QUIZ_ATTEMPT_EXPIRED', async () => {
    const rpc = submissionRpc({ status: 'expired', attempt_id: 'attempt', end_reason: 'expired' });
    const { service } = serviceWith({ quiz_attempts: savedAttempt }, rpc);
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
  it('does not reveal questions or correct options for an expired attempt', async () => {
    const { service, from } = serviceWith({
      quiz_attempts: ok({
        id: 'attempt', quiz_id: 'quiz', completed_at: 'c', end_reason: 'expired',
        total_score: 0, max_score: 4, score_percentage: 0,
      }),
    });
    await expect(service.getAttemptReview('attempt', 'learner')).resolves.toMatchObject({
      end_reason: 'expired', questions: [], correct_count: 0, total_questions: 0,
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

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

  it('reviews the submitted snapshot even after the question bank changes', async () => {
    const snapshot = { id: 'q3', content: 'Original', question_type: 'single_choice', explanation: 'Original explanation', options };
    const changed = { ...snapshot, content: 'Edited', explanation: 'Edited explanation', options: [{ id: 'new', option_text: 'Changed', is_correct: true }] };
    const { service } = serviceWith({
      quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz', completed_at: 'c', end_reason: 'submitted', total_score: 3, max_score: 3, score_percentage: 100 }),
      quiz_attempt_details: ok([{
        id: 'd3', question_id: 'q3', is_correct: true, score_weight: 3, earned_score: 3,
        selected_option_ids: ['a'], question_snapshot: snapshot, quiz_attempt_answers: [{ option_id: 'a' }], questions: changed,
      }]),
      quiz_questions: ok([{ question_id: 'q3', score_weight: 3, questions: changed }]),
    });
    const review = await service.getAttemptReview('attempt', 'learner');
    expect(review.questions[0]).toMatchObject({
      content: 'Original', explanation: 'Original explanation', selected_option_ids: ['a'],
    });
    expect(review.questions[0].options).toContainEqual(expect.objectContaining({ id: 'a', is_correct: true }));
    expect(review.questions[0].options).not.toContainEqual(expect.objectContaining({ id: 'new' }));
  });

  it('uses the saved attempt order for questions and options in the review', async () => {
    const reversedOptions = [...options].reverse();
    const rpc = vi.fn(async () => ok([{ question_id: 'q1' }, { question_id: 'q3' }]));
    const { service } = serviceWith({
      quiz_attempts: ok({ id: 'attempt', quiz_id: 'quiz', completed_at: 'c', end_reason: 'submitted', total_score: 0, max_score: 2, score_percentage: 0 }),
      quiz_attempt_details: ok([
        { id: 'd3', question_id: 'q3', is_correct: false, score_weight: 1, question_snapshot: { id: 'q3', content: 'Q3', options: reversedOptions } },
        { id: 'd1', question_id: 'q1', is_correct: false, score_weight: 1, question_snapshot: { id: 'q1', content: 'Q1', options: [] } },
      ]),
      quiz_questions: ok([{ question_id: 'q3', score_weight: 1 }, { question_id: 'q1', score_weight: 1 }]),
    }, rpc);
    const review = await service.getAttemptReview('attempt', 'learner');
    expect(review.questions.map((question) => question.question_id)).toEqual(['q1', 'q3']);
    expect(review.questions[1].options.map((option) => option.id)).toEqual(['b', 'a']);
  });
});

describe('QuizzesService.configureQuestions', () => {
  it('rejects a chapter assigned to another course before changing links', async () => {
    const { service, rpc } = serviceWith({
      quizzes: ok({ id: 'quiz', course_id: 'course', chapter_id: null }),
      chapters: ok({ id: 'chapter', course_id: 'different-course' }),
    });
    await expect(service.configureQuestions('quiz', { questions: [] }, { chapter_id: 'chapter' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('saves settings and question links through one RPC, including a zero pass score', async () => {
    const { service, rpc } = serviceWith({
      quizzes: [ok({ id: 'quiz', is_active: true }), ok({ id: 'quiz', is_active: false, pass_percentage: 0, title: 'Updated' })],
      questions: ok([{ id: 'q1', status: 'approved', deleted_at: null }]),
      quiz_questions: [ok([{ score_weight: 2 }]), ok([{ question_id: 'q1', questions: { status: 'approved' } }]), ok([{ score_weight: 2 }])],
    });
    await expect(service.saveConfiguration('quiz', {
      settings: { title: 'Updated', pass_score: 0 },
      questions: [{ question_id: 'q1', score_weight: 2 }],
    })).resolves.toMatchObject({ title: 'Updated', pass_percentage: 0, total_questions: 1 });
    expect(rpc).toHaveBeenCalledWith('replace_quiz_questions', {
      p_quiz_id: 'quiz',
      p_questions: [{ question_id: 'q1', score_weight: 2 }],
      p_settings: expect.objectContaining({ title: 'Updated', pass_score: 0 }),
    });
  });

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
    const { service, rpc } = serviceWith({
      quizzes: ok({ id: 'quiz', is_active: false }),
      questions: ok([{ id: 'q1', status: 'approved', deleted_at: '2026-11-25' }]),
      quiz_questions: [ok([{ question_id: 'q1' }]), ok([{ score_weight: 1 }])],
    });
    await expect(service.configureQuestions('quiz', { questions: [{ question_id: 'q1', score_weight: 1 }] }))
      .resolves.toMatchObject({ total_questions: 1 });
    expect(rpc).toHaveBeenCalledWith('replace_quiz_questions', {
      p_quiz_id: 'quiz', p_questions: [{ question_id: 'q1', score_weight: 1 }], p_settings: null,
    });
  });

  it('does not delete links or archive the quiz separately when the replacement fails', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'insert failed' } }));
    const { service, from } = serviceWith({
      quizzes: ok({ id: 'quiz', is_active: true }),
      questions: ok([{ id: 'q1', status: 'approved', deleted_at: null }]),
    }, rpc);
    await expect(service.configureQuestions('quiz', { questions: [{ question_id: 'q1', score_weight: 1 }] }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalledWith('quiz_questions');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

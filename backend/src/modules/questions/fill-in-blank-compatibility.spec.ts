import { describe, expect, it, vi } from 'vitest';
import { PracticeService } from '../practice/practice.service.js';
import { QuizzesService } from '../quizzes/quizzes.service.js';
const options = [
  { id: 'answer', option_text: 'Console.WriteLine', is_correct: true },
];
const question = {
  id: 'q1',
  course_id: 'course',
  status: 'approved',
  generated_for_user_id: null,
  question_type: 'fill_in_blank',
  explanation: 'Explanation',
  options,
};
function query(data: unknown) {
  const result = { data, error: null };
  const q: any = {
    select: () => q,
    eq: () => q,
    insert: () => q,
    update: () => q,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return q;
}
describe('standard fill-in-blank answer compatibility', () => {
  it.each([
    ['  console.writeline  ', true],
    ['Console.ReadLine', false],
  ])('practice grades %s', async (answer, correct) => {
    const service = new PracticeService(
      {
        getClient: () => ({
          from: (table: string) =>
            query(table === 'questions' ? question : options),
        }),
      } as never,
      {} as never,
    );
    vi.spyOn(service as any, 'getAvailableCourseIds').mockResolvedValue([
      'course',
    ]);
    await expect(
      service.checkAnswer('learner', {
        question_id: 'q1',
        answer_text: answer as string,
      }),
    ).resolves.toMatchObject({ is_correct: correct });
  });
  it.each([
    ['  console.writeline  ', 1],
    ['Console.ReadLine', 0],
  ])('quiz grades %s', async (answer, score) => {
    // RPC submit_quiz_attempt lưu đúng phần điểm backend đã chấm.
    const rpc = async (_name: string, args: { p_details: Array<{ earned_score: number }>; p_max_score: number }) => {
      const total = args.p_details.reduce((sum, item) => sum + item.earned_score, 0);
      return {
        data: { status: 'submitted', attempt_id: 'attempt', quiz_id: 'quiz', end_reason: 'submitted', score: total, max_score: args.p_max_score, percentage: total * 100, pass_percentage: 50, passed: total > 0 },
        error: null,
      };
    };
    const service = new QuizzesService({
      getClient: () => ({
        rpc,
        from: (table: string) =>
          query(
            table === 'quiz_attempts'
              ? { id: 'attempt', quiz_id: 'quiz', pass_percentage: 50 }
              : { id: 'detail' },
          ),
      }),
    } as never);
    vi.spyOn(service as any, 'getScoringQuestions').mockResolvedValue([
      { question_id: 'q1', score_weight: 1, questions: question },
    ]);
    await expect(
      service.submitAttempt(
        'attempt',
        { answers: [{ question_id: 'q1', answer }] } as never,
        'learner',
      ),
    ).resolves.toMatchObject({ score });
  });
});

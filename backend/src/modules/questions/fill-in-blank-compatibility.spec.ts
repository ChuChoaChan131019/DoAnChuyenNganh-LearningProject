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
    const service = new QuizzesService({
      getClient: () => ({
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

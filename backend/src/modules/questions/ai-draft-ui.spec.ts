import { describe, expect, it } from 'vitest';
import {
  changeQuestionOptions,
  completeSavedMapping,
  draftErrors,
  makeSaveSnapshot,
  resolveGeneratedSource,
} from '../../../../frontend/src/lib/ai-question-drafts';
import type { QuestionType } from '../../../../frontend/src/types/question';
const types: QuestionType[] = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_in_blank',
];
const source = [
  { option_text: 'A', is_correct: true, order_index: 0 },
  { option_text: 'B', is_correct: true, order_index: 1 },
  { option_text: 'C', is_correct: false, order_index: 2 },
];
const question = {
  client_id: 'q1',
  course_id: 'c',
  chapter_id: 'ch',
  lesson_id: 'l',
  content: 'Question',
  explanation: 'Explanation',
  difficulty: 'easy' as const,
  question_type: 'single_choice' as const,
  options: changeQuestionOptions(source, 'single_choice'),
};
describe('authoring editor and retry contracts', () => {
  for (const from of types)
    for (const to of types.filter((type) => type !== from)) {
      it(`converts ${from} to ${to} and can be completed for saving`, () => {
        const options = changeQuestionOptions(
          changeQuestionOptions(source, from),
          to,
        );
        expect(options.length).toBeGreaterThanOrEqual(
          to === 'multiple_choice' ? 3 : to === 'fill_in_blank' ? 1 : 2,
        );
        options.forEach((option, index) => {
          if (!option.option_text) option.option_text = `Answer ${index}`;
          option.is_correct =
            to === 'multiple_choice' ? index < 2 : index === 0;
        });
        expect(
          draftErrors({ ...question, question_type: to, options }),
        ).toEqual([]);
      });
    }
  it('does not invent correct answers on a conversion to multiple choice', () => {
    const options = changeQuestionOptions(
      changeQuestionOptions(source, 'fill_in_blank'),
      'multiple_choice',
    );
    expect(options.filter((option) => option.is_correct)).toHaveLength(1);
    expect(
      draftErrors({ ...question, question_type: 'multiple_choice', options })
        .length,
    ).toBeGreaterThan(0);
  });
  it('keeps an immutable payload for retry after the editor changes', () => {
    const original = structuredClone(question);
    const snapshot = makeSaveSnapshot('batch', [original]);
    const wire = JSON.stringify(snapshot);
    original.options[0].option_text = 'Changed';
    original.content = 'Changed';
    expect(JSON.stringify(snapshot)).toBe(wire);
    expect(
      completeSavedMapping(snapshot, [{ client_id: 'q1', id: 'db1' }]),
    ).toBe(true);
    expect(completeSavedMapping(snapshot, [])).toBe(false);
    expect(
      completeSavedMapping(snapshot, [{ client_id: 'other', id: 'db1' }]),
    ).toBe(false);
    expect(completeSavedMapping(snapshot, [{ client_id: 'q1', id: '' }])).toBe(
      false,
    );
  });
  it('rejects batches beyond ten instead of silently truncating', () => {
    expect(() =>
      makeSaveSnapshot(
        'batch',
        Array.from({ length: 11 }, () => question),
      ),
    ).toThrow();
  });
});

describe('generated question source placement', () => {
  it('retains different source lessons from one course through the save payload', () => {
    const selected = { course_id: 'c' };
    const questions = ['a', 'b'].map(id => {
      const generated = { ...question, client_id: id, chapter_id: `chapter-${id}`, lesson_id: `lesson-${id}` };
      return { ...generated, ...resolveGeneratedSource(generated, selected)! };
    });
    const snapshot = makeSaveSnapshot('batch', questions);
    expect(snapshot.questions.map(q => [q.chapter_id, q.lesson_id])).toEqual([
      ['chapter-a', 'lesson-a'], ['chapter-b', 'lesson-b'],
    ]);
  });
  it('rejects missing placement in course and chapter scopes', () => {
    const { chapter_id, lesson_id, ...missing } = question;
    expect(resolveGeneratedSource(missing, { course_id: 'c' })).toBeNull();
    expect(resolveGeneratedSource(missing, { course_id: 'c', chapter_id })).toBeNull();
    expect(resolveGeneratedSource(missing, { course_id: 'c', chapter_id, lesson_id })).toEqual({ course_id: 'c', chapter_id, lesson_id });
  });
  it('rejects sources outside any explicitly selected level, including regeneration', () => {
    expect(resolveGeneratedSource(question, { course_id: 'foreign' })).toBeNull();
    expect(resolveGeneratedSource(question, { course_id: 'c', chapter_id: 'foreign' })).toBeNull();
    expect(resolveGeneratedSource(question, { course_id: 'c', chapter_id: 'ch', lesson_id: 'foreign' })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { buildScopedAuthoringSource, type AuthoringLessonSource } from './authoring-source.js';
const lesson = (id: number, chapter = 'a'): AuthoringLessonSource => ({
  id: String(id), chapter_id: chapter, chapter_title: chapter, title: `Lesson ${id}`,
  content: 'Variables store typed values in a running C# program. '.repeat(300),
});
describe('bounded multi-lesson authoring context', () => {
  it('caps the context and sources, including multiple chapters fairly', () => {
    const lessons = Array.from({ length: 30 }, (_, i) => lesson(i, i < 15 ? 'a' : 'b'));
    const result = buildScopedAuthoringSource({ title: 'Course' }, lessons);
    expect(result.text.length).toBeLessThanOrEqual(20_000);
    expect(result.lessons).toHaveLength(10);
    expect(result.lessons.slice(0, 2).map(l => l.chapter_id)).toEqual(['a', 'b']);
    expect(result.truncated).toBe(true);
    result.lessons.forEach(l => expect(result.text).toContain(`source_lesson_id="${l.id}"`));
  });
  it('keeps a code example whole even when it exceeds its fair share', () => {
    const code = 'int value = 42;\n'.repeat(200);
    const result = buildScopedAuthoringSource({ title: 'Course' }, [
      { ...lesson(1), content: '', code_example: code }, lesson(2),
    ], '', 40, 5000);
    expect(result.text).toContain(code.trim());
    expect(result.text.length).toBeLessThanOrEqual(5000);
    expect((result.text.match(/```/g) ?? []).length % 2).toBe(0);
  });
  it('skips empty lessons and complete code blocks that cannot fit', () => {
    const result = buildScopedAuthoringSource({ title: 'Course' }, [
      { ...lesson(1), content: '<p>&nbsp;</p>' },
      { ...lesson(2), content: '', code_example: 'int value = 42;'.repeat(2000) }, lesson(3),
    ]);
    expect(result.lessons.map(l => l.id)).toEqual(['3']);
    expect(result.truncated).toBe(true);
  });
  it('prioritizes topic relevance within a chapter without treating titles as content', () => {
    const result = buildScopedAuthoringSource({ title: 'Course' }, [
      lesson(1), { ...lesson(2), title: 'Inheritance' }, { ...lesson(3), title: 'Inheritance', content: '' },
    ], 'Inheritance', 40, 2000, 1);
    expect(result.lessons.map(l => l.id)).toEqual(['2']);
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../../../frontend/src/lib/api', () => ({ ApiClientError: class extends Error {}, questionApi: {} }));
import AIQuestionGeneratorPage from '../../../../frontend/src/app/content-manager/ai/question-generator/page';
describe('generator scope controls', () => {
  it('labels chapter and lesson optional and exposes the whole-course choice', () => {
    const html = renderToStaticMarkup(createElement(AIQuestionGeneratorPage));
    expect(html).toContain('Chương (tùy chọn)');
    expect(html).toContain('Bài học (tùy chọn)');
    expect(html).toContain('Tất cả chương trong khóa học');
  });
});

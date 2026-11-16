import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({ id: 'saved-ai-question' as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: (name: string) => name === 'id' ? navigation.id : null }),
}));
vi.mock('../../../../frontend/src/lib/api', () => ({
  ApiClientError: class extends Error {}, questionApi: {},
}));
import QuestionEditorPage from '../../../../frontend/src/app/content-manager/questions/editor/page';

describe('question editor review entry point', () => {
  it('allows an already saved AI draft to be submitted for review', () => {
    navigation.id = 'saved-ai-question';
    const html = renderToStaticMarkup(createElement(QuestionEditorPage));
    expect(html.includes('Gửi duyệt</span>')).toBe(true);
  });
  it('keeps submission available when composing a new question', () => {
    navigation.id = null;
    expect(renderToStaticMarkup(createElement(QuestionEditorPage))).toContain('Gửi duyệt');
  });
});

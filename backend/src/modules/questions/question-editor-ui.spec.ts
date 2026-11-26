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

function publishButton(html: string) {
  return html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
    ?.find((button) => button.includes('<span>Công bố</span>'));
}

describe('question editor two-state publication entry point', () => {
  it('renders publication while keeping a saved draft disabled until it finishes loading', () => {
    navigation.id = 'saved-ai-question';
    const html = renderToStaticMarkup(createElement(QuestionEditorPage));
    expect(publishButton(html)).toContain('disabled=""');
    expect(html).not.toContain('<span>Gửi duyệt</span>');
  });
  it('renders publication but blocks a new question until its required fields are valid', () => {
    navigation.id = null;
    const html = renderToStaticMarkup(createElement(QuestionEditorPage));
    expect(publishButton(html)).toContain('disabled=""');
  });
});

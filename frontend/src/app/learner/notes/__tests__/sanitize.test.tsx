// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import NotesPage from '../page';
import { notesApi } from '../../../../lib/api';

vi.mock('../../../../lib/api', () => ({
  notesApi: {
    list: vi.fn().mockResolvedValue([{
      id: '1',
      title: 'XSS Test',
      content: '<img src=x onerror=alert(1)>',
      updated_at: '2026-09-26'
    }]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('XSS Prevention', () => {
  afterEach(() => {
    cleanup();
  });

  it('should not execute onerror handler', async () => {
    let alertCalled = false;
    window.alert = () => { alertCalled = true; };

    render(<NotesPage />);

    // Wait for notes to load
    await screen.findByText('XSS Test');

    // Alert should NOT have been called
    expect(alertCalled).toBe(false);

    // img element should have no onerror attribute
    const img = document.querySelector('img');
    expect(img?.getAttribute('onerror')).toBeNull();
  });

  it('should strip dangerous tags like script, link, base, meta', async () => {
    (notesApi.list as any).mockResolvedValueOnce([{
      id: '2',
      title: 'Tags Test',
      content: '<link rel="stylesheet" href="malicious.css"><meta http-equiv="refresh" content="0"><base href="https://evil.com">',
      updated_at: '2026-09-26'
    }]);

    render(<NotesPage />);
    await screen.findByText('Tags Test');

    expect(document.querySelector('link')).toBeNull();
    expect(document.querySelector('meta')).toBeNull();
    expect(document.querySelector('base')).toBeNull();
  });
});

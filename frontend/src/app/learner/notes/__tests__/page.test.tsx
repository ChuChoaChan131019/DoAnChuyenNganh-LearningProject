// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import NotesPage from '../page';
import { notesApi } from '../../../../lib/api';

vi.mock('../../../../lib/api', () => ({
  notesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NotesPage', () => {
  const mockNotes = [
    { id: '1', title: 'Test Note', content: 'Test content', updated_at: '2026-09-26' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display notes from API', async () => {
    (notesApi.list as any).mockResolvedValue(mockNotes);

    render(<NotesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });
  });

  it('should open create modal on New Note click', async () => {
    (notesApi.list as any).mockResolvedValue([]);

    render(<NotesPage />);
    await userEvent.click(screen.getByText('New Note'));

    expect(screen.getByText('Create Note')).toBeInTheDocument();
  });

  it('should delete note on delete button click', async () => {
    (notesApi.list as any).mockResolvedValue(mockNotes);
    (notesApi.delete as any).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<NotesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('delete-note-1')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-note-1'));

    expect(notesApi.delete).toHaveBeenCalledWith('1');
  });

  it('should render HTML formatted content safely without raw tags', async () => {
    const htmlNotes = [
      { id: '2', title: 'HTML Note', content: '<p>Formatted <strong>bold text</strong></p><script>alert(1)</script>', updated_at: '2026-09-26' },
    ];
    (notesApi.list as any).mockResolvedValue(htmlNotes);

    render(<NotesPage />);
    await waitFor(() => {
      expect(screen.getByText('bold text')).toBeInTheDocument();
    });
    expect(document.querySelector('script')).toBeNull();
    expect(screen.queryByText('<p>Formatted <strong>bold text</strong></p>')).toBeNull();
  });

  it('should debounce search queries', async () => {
    (notesApi.list as any).mockResolvedValue([]);
    render(<NotesPage />);

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await userEvent.type(searchInput, 'abc');

    expect(notesApi.list).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'abc' }));

    await waitFor(() => {
      expect(notesApi.list).toHaveBeenCalledWith(expect.objectContaining({ search: 'abc' }));
    }, { timeout: 1000 });
  });
});

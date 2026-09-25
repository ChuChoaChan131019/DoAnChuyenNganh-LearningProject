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
});

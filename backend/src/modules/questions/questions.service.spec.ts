import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../config/supabase.service.js';
import { QuestionsService } from './questions.service.js';

describe('QuestionsService review count', () => {
  let service: QuestionsService;
  let from: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;
  let is: ReturnType<typeof vi.fn>;
  let not: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    not = vi.fn().mockResolvedValue({ count: 7, error: null });
    is = vi.fn().mockReturnThis();
    eq = vi.fn().mockReturnThis();
    select = vi.fn().mockReturnValue({ eq, is, not });
    from = vi.fn().mockReturnValue({ select });

    service = new QuestionsService({
      getClient: vi.fn().mockReturnValue({ from }),
    } as unknown as SupabaseService);
  });

  it('counts draft questions without loading their rows', async () => {
    await expect(service.countPendingReview()).resolves.toEqual({ count: 7 });

    expect(from).toHaveBeenCalledWith('questions');
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eq).toHaveBeenCalledWith('status', 'draft');
    expect(is).toHaveBeenCalledWith('generated_for_user_id', null);
    expect(not).toHaveBeenCalledWith('submitted_for_review_at', 'is', null);
  });

  it('returns zero when Supabase does not provide a count', async () => {
    not.mockResolvedValueOnce({ count: null, error: null });

    await expect(service.countPendingReview()).resolves.toEqual({ count: 0 });
  });

  it('propagates Supabase query failures', async () => {
    not.mockResolvedValueOnce({ count: null, error: { message: 'count failed' } });

    await expect(service.countPendingReview()).rejects.toThrow(BadRequestException);
  });
});


describe('atomic AI draft persistence', () => {
  const question = { client_id: 'q1', course_id: 'c', chapter_id: 'ch', lesson_id: 'l', question_type: 'single_choice', difficulty: 'easy', content: 'Question', explanation: 'Explanation', options: [{ option_text: 'Yes', is_correct: true, order_index: 0 }, { option_text: 'No', is_correct: false, order_index: 1 }] };
  it('returns RPC ids without writing history again after commit', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ client_id: 'q1', id: 'db-id', status: 'draft' }], error: null });
    const from = vi.fn(() => { throw new Error('Unexpected post-commit mutation'); });
    const service = new QuestionsService({ getAdminClient: () => ({ rpc, from }) } as never);
    await expect(service.saveAiDrafts({ batch_id: 'batch', questions: [question] } as never, 'actor')).resolves.toMatchObject({ saved: [{ id: 'db-id' }] });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });
  it('returns 500 for a rolled back history failure so clients retain their retry', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'P0001', message: 'question_history insert failed' } });
    const service = new QuestionsService({ getAdminClient: () => ({ rpc }) } as never);
    await expect(service.saveAiDrafts({ batch_id: 'batch', questions: [question] } as never, 'actor')).rejects.toMatchObject({ status: 500 });
  });
});

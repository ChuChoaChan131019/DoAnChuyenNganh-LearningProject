import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../config/supabase.service.js';
import { QuestionsService } from './questions.service.js';

describe('QuestionsService review count', () => {
  let service: QuestionsService;
  let from: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eq = vi.fn().mockResolvedValue({ count: 7, error: null });
    select = vi.fn().mockReturnValue({ eq });
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
  });

  it('returns zero when Supabase does not provide a count', async () => {
    eq.mockResolvedValueOnce({ count: null, error: null });

    await expect(service.countPendingReview()).resolves.toEqual({ count: 0 });
  });

  it('propagates Supabase query failures', async () => {
    eq.mockResolvedValueOnce({ count: null, error: { message: 'count failed' } });

    await expect(service.countPendingReview()).rejects.toThrow(BadRequestException);
  });
});

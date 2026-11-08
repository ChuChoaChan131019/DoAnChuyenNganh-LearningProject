import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionHelpfulService } from './discussion-helpful.service.js';

const target = '00000000-0000-4000-8000-000000000001';
const user = '00000000-0000-4000-8000-000000000002';

function setup() {
  const result = {
    data: { id: target, post_id: target },
    error: null as null | { message: string },
  };
  const rpc = vi
    .fn()
    .mockResolvedValue({
      data: [{ target_id: target, helpful_count: '3', is_helpful: true }],
      error: null,
    });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    delete: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    upsert,
  };
  for (const method of [builder.select, builder.eq, builder.is, builder.delete])
    method.mockReturnValue(builder);
  // oxlint-disable-next-line unicorn/no-thenable -- Match the awaited PostgREST DELETE builder.
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  });
  const from = vi.fn(() => builder);
  const assertPostAccessible = vi.fn().mockResolvedValue({ id: target });
  const service = new DiscussionHelpfulService(
    { getClient: () => ({ rpc, from }) } as never,
    { assertPostAccessible } as never,
  );
  return { service, rpc, from, builder, assertPostAccessible, result };
}

describe('DiscussionHelpfulService validation and failures', () => {
  it('returns an empty summary without querying the database', async () => {
    const { service, rpc, from } = setup();
    expect(await service.summary({}, user)).toEqual({
      posts: {},
      comments: {},
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['not-an-array', 42, {}, ['bad-id'], [null], Array(51).fill(target)])(
    'rejects malformed or over-limit ID lists: %j',
    async (post_ids) => {
      const { service, rpc } = setup();
      await expect(service.summary({ post_ids }, user)).rejects.toMatchObject({
        status: 400,
      });
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it('deduplicates both lists and returns numeric counts with the caller’s state', async () => {
    const { service, rpc } = setup();
    expect(
      await service.summary(
        { post_ids: [target, target], comment_ids: [target, target] },
        user,
      ),
    ).toEqual({
      posts: { [target]: { helpful_count: 3, is_helpful: true } },
      comments: { [target]: { helpful_count: 3, is_helpful: true } },
    });
    expect(rpc).toHaveBeenCalledWith('discussion_post_helpful_stats', {
      p_ids: [target],
      p_user_id: user,
    });
    expect(rpc).toHaveBeenCalledWith('discussion_comment_helpful_stats', {
      p_ids: [target],
      p_user_id: user,
    });
  });

  it('accepts fifty requested IDs at the boundary', async () => {
    const { service, rpc } = setup();
    await service.summary({ post_ids: Array(50).fill(target) }, user);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('reports RPC failures rather than returning fake zero counts', async () => {
    const { service, rpc } = setup();
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'internal detail' },
    });
    await expect(
      service.summary({ post_ids: [target] }, user),
    ).rejects.toMatchObject({ status: 500 });
  });

  it('does not write a vote when its parent post is inaccessible', async () => {
    const { service, from, assertPostAccessible } = setup();
    assertPostAccessible.mockRejectedValue(new NotFoundException());
    await expect(service.markPost(target, user)).rejects.toMatchObject({
      status: 404,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('does not write a vote for a missing or hidden comment', async () => {
    const { service, builder, assertPostAccessible } = setup();
    builder.maybeSingle.mockResolvedValue({ data: null, error: null } as never);
    await expect(service.markComment(target, user)).rejects.toMatchObject({
      status: 404,
    });
    expect(builder.upsert).not.toHaveBeenCalled();
    expect(assertPostAccessible).not.toHaveBeenCalled();
  });

  it('reports failures while checking comment visibility', async () => {
    const { service, result, builder } = setup();
    result.error = { message: 'internal detail' };
    await expect(service.markComment(target, user)).rejects.toMatchObject({
      status: 500,
    });
    expect(builder.upsert).not.toHaveBeenCalled();
  });

  it('reports an insertion failure', async () => {
    const { service, builder } = setup();
    builder.upsert.mockResolvedValue({
      error: { message: 'database failure' },
    });
    await expect(service.markPost(target, user)).rejects.toMatchObject({
      status: 500,
    });
  });

  it('reports a removal failure and filters by the authenticated user', async () => {
    const { service, result, builder } = setup();
    result.error = { message: 'database failure' };
    await expect(service.unmarkPost(target, user)).rejects.toMatchObject({
      status: 500,
    });
    expect(builder.eq).toHaveBeenCalledWith('user_id', user);
    expect(builder.eq).toHaveBeenCalledWith('post_id', target);
  });

  it('reports content withdrawn between the write and the stats read', async () => {
    const { service, rpc } = setup();
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(service.markPost(target, user)).rejects.toMatchObject({
      status: 404,
    });
  });
});

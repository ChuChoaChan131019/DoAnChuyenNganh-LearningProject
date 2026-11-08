import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { DiscussionHelpfulController } from './discussion-helpful.controller.js';

const target = '00000000-0000-4000-8000-000000000001';
const user = '00000000-0000-4000-8000-000000000002';
function context(role: string) {
  return {
    getClass: () => DiscussionHelpfulController,
    getHandler: () => DiscussionHelpfulController.prototype.summary,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('D03 API authorization and identity', () => {
  it('requires authentication and role guards', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, DiscussionHelpfulController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(
      new RolesGuard(new Reflector()).canActivate(context('learner')),
    ).toBe(true);
  });

  it.each(['content_manager', 'admin'])(
    'does not grant %s the learner vote endpoints',
    (role) => {
      expect(() =>
        new RolesGuard(new Reflector()).canActivate(context(role)),
      ).toThrow('Access denied');
    },
  );

  it.each(['markPost', 'unmarkPost', 'markComment', 'unmarkComment'] as const)(
    '%s uses identity from the authenticated request',
    async (method) => {
      const call = vi
        .fn()
        .mockResolvedValue({ helpful_count: 1, is_helpful: true });
      const controller = new DiscussionHelpfulController({
        [method]: call,
      } as never);
      await controller[method](target, { user: { id: user } });
      expect(call).toHaveBeenCalledWith(target, user);
    },
  );

  it('summary uses identity from the authenticated request', async () => {
    const summary = vi.fn().mockResolvedValue({ posts: {}, comments: {} });
    const controller = new DiscussionHelpfulController({ summary } as never);
    const body = { post_ids: [target], user_id: 'forged-user' };
    await controller.summary(body, { user: { id: user } });
    expect(summary).toHaveBeenCalledWith(body, user);
  });
});

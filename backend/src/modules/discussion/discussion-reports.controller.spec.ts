import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminDiscussionReportsController, LearnerDiscussionReportsController } from './discussion-reports.controller.js';

function context(controller: typeof AdminDiscussionReportsController | typeof LearnerDiscussionReportsController, role: string) {
  return {
    getClass: () => controller,
    getHandler: () => controller.prototype.constructor,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('D04 report API authorization', () => {
  it.each([
    [LearnerDiscussionReportsController, 'learner', 'admin'],
    [AdminDiscussionReportsController, 'admin', 'learner'],
  ] as const)('%s only allows %s', (controller, allowed, denied) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toEqual([JwtAuthGuard, RolesGuard]);
    const guard = new RolesGuard(new Reflector());
    expect(guard.canActivate(context(controller, allowed))).toBe(true);
    expect(() => guard.canActivate(context(controller, denied))).toThrow('Access denied');
    expect(() => guard.canActivate(context(controller, 'content_manager'))).toThrow('Access denied');
  });

  it('uses the authenticated learner as reporter', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'report' });
    const controller = new LearnerDiscussionReportsController({ create } as never);
    const dto = { target_type: 'post' as const, target_id: 'target', reason: 'A valid reason', reporter_id: 'forged' };
    await controller.create(dto, { user: { id: 'real-learner' } });
    expect(create).toHaveBeenCalledWith(dto, 'real-learner');
  });

  it('uses the authenticated admin as moderator', async () => {
    const resolve = vi.fn().mockResolvedValue({ id: 'report' });
    const controller = new AdminDiscussionReportsController({ resolve } as never);
    const dto = { decision: 'hidden' as const, reason: 'A valid reason', moderator_id: 'forged' };
    await controller.resolve('report', dto, { user: { id: 'real-admin' } });
    expect(resolve).toHaveBeenCalledWith('report', dto, 'real-admin');
  });
});

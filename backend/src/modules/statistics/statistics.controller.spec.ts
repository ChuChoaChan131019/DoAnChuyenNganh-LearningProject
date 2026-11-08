import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { StatisticsController } from './statistics.controller.js';

function context(role: string): ExecutionContext {
  return {
    getClass: () => StatisticsController,
    getHandler: () => StatisticsController.prototype.getDashboard,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
}

describe('Content Manager statistics authorization', () => {
  it('requires both authentication and role guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, StatisticsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it.each(['content_manager', 'admin'])(
    'allows %s to view content statistics',
    (role) => {
      expect(new RolesGuard(new Reflector()).canActivate(context(role))).toBe(
        true,
      );
    },
  );

  it('blocks learners from the content statistics API', () => {
    expect(() =>
      new RolesGuard(new Reflector()).canActivate(context('learner')),
    ).toThrow('Access denied');
  });
});

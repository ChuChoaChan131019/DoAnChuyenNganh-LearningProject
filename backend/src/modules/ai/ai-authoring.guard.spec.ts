import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AiController } from './ai.controller.js';

describe('authoring endpoint access guards', () => {
  it.each([null, 'learner', 'content_manager', 'admin'])(
    'checks token and role %s before provider access',
    async (role) => {
      const request: any = {
        headers: role ? { authorization: 'Bearer fixture' } : {},
      };
      const query: any = {
        from: () => query,
        select: () => query,
        eq: () => query,
        single: async () => ({ data: { role }, error: null }),
        auth: {
          getUser: async () => ({
            data: { user: { id: 'fixture-user' } },
            error: null,
          }),
        },
      };
      const auth = new JwtAuthGuard({ getClient: () => query } as never);
      const roles = new RolesGuard(new Reflector());
      const context: any = {
        switchToHttp: () => ({ getRequest: () => request }),
        getClass: () => AiController,
        getHandler: () => AiController.prototype.generateQuestions,
      };
      const generateAuthoringQuestions = vi
        .fn()
        .mockResolvedValue({ questions: [] });
      const controller = new AiController({
        generateAuthoringQuestions,
      } as never);
      const execute = async () => {
        await auth.canActivate(context);
        roles.canActivate(context);
        return controller.generateQuestions({} as never, request);
      };
      if (!role)
        await expect(execute()).rejects.toBeInstanceOf(UnauthorizedException);
      else if (role !== 'content_manager')
        await expect(execute()).rejects.toBeInstanceOf(ForbiddenException);
      else await expect(execute()).resolves.toEqual({ questions: [] });
      expect(generateAuthoringQuestions).toHaveBeenCalledTimes(
        role === 'content_manager' ? 1 : 0,
      );
    },
  );
});

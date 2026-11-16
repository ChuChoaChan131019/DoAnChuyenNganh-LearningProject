import 'reflect-metadata';
import { ValidationPipe, type ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AdminAccountsController } from './admin-accounts.controller.js';
import { CreateContentManagerDto, ListAdminAccountsDto, UpdateAdminAccountDto } from './dto/admin-account.dto.js';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
describe('FR-44 request boundary', () => {
  it.each(['learner', 'content_manager'])('denies %s on every account endpoint', (role) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminAccountsController)).toEqual([JwtAuthGuard, RolesGuard]);
    const guard = new RolesGuard(new Reflector());
    for (const method of ['list','detail','create','update','status'] as const) {
      const context = { getClass: () => AdminAccountsController,
        getHandler: () => AdminAccountsController.prototype[method],
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) } as unknown as ExecutionContext;
      expect(() => guard.canActivate(context)).toThrow('Access denied');
    }
  });
  it.each(['admin','learner','content_manager'])('rejects a client-supplied creation role %s', async (role) => {
    await expect(pipe.transform({ fullName: 'Content', email: 'content@example.com', password: 'StrongPassword1!', role },
      { type: 'body', metatype: CreateContentManagerDto })).rejects.toMatchObject({ status: 400 });
  });
  it('rejects changing roles through the information endpoint', async () => {
    await expect(pipe.transform({ fullName: 'Content', email: 'content@example.com', role: 'admin' },
      { type: 'body', metatype: UpdateAdminAccountDto })).rejects.toMatchObject({ status: 400 });
  });
  it.each(['short','alllowercase123!','ALLUPPERCASE123!','NoNumbersHere!','NoSymbols123'])('rejects a noncompliant password', async (password) => {
    await expect(pipe.transform({ fullName: 'Content', email: 'content@example.com', password },
      { type: 'body', metatype: CreateContentManagerDto })).rejects.toMatchObject({ status: 400 });
  });
  it('normalizes inputs and accepts compliant content-manager creation', async () => {
    expect(await pipe.transform({ fullName: ' Content ', email: ' CONTENT@example.com ', password: 'StrongPassword1!' },
      { type: 'body', metatype: CreateContentManagerDto })).toMatchObject({ fullName: 'Content', email: 'content@example.com' });
  });
  it('rejects invalid pagination', async () => {
    await expect(pipe.transform({ limit: '1000', offset: '-1' }, { type: 'query', metatype: ListAdminAccountsDto }))
      .rejects.toMatchObject({ status: 400 });
  });
});

import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto.js';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: RegisterDto });
const registration = { email: 'student@example.com', password: 'ValidPassword1!', fullName: 'Student' };

describe('RegisterDto', () => {
  it('accepts a registration without a role', async () => {
    await expect(validate(registration)).resolves.toMatchObject(registration);
  });

  it.each(['content_manager', 'admin', 'learner'])('rejects a client-supplied role: %s', async (role) => {
    await expect(validate({ ...registration, role })).rejects.toMatchObject({ status: 400 });
  });
});

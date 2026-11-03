import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  CreateDiscussionPostDto,
  UpdateDiscussionPostDto,
} from './discussion-post.dto.js';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const create = {
  chapter_id: '00000000-0000-4000-8000-000000000001',
  post_type: 'question',
  title: 'Question title',
  content: 'Question content with details',
};
const validate = (body: unknown, update = false) =>
  pipe.transform(body, {
    type: 'body',
    metatype: update ? UpdateDiscussionPostDto : CreateDiscussionPostDto,
  });

describe('Discussion post input validation', () => {
  it.each(['title', 'content'])(
    'rejects null %s in PATCH with HTTP 400',
    async (field) => {
      await expect(validate({ [field]: null }, true)).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it.each([
    { title: 'Updated title' },
    { content: 'Updated detailed content' },
  ])('allows partial updates: %j', async (body) => {
    expect(await validate(body, true)).toMatchObject(body);
  });

  it.each([
    { author_id: 'another-user' },
    { status: 'visible' },
    { deleted_at: null },
    { chapter_id: create.chapter_id },
    { lesson_id: create.chapter_id },
    { post_type: 'resource' },
  ])('rejects changing server-owned fields: %j', async (body) => {
    await expect(validate(body, true)).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    { title: 'tiny' },
    { content: 'short' },
    { post_type: 'invalid' },
    { lesson_id: 'invalid-uuid' },
    { author_id: create.chapter_id },
    { resource_url: 'javascript:alert(1)' },
    { resource_url: 'http://example.com' },
  ])('rejects invalid create data: %j', async (change) => {
    await expect(validate({ ...create, ...change })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('accepts a valid chapter post', async () => {
    expect(await validate(create)).toMatchObject(create);
  });
});

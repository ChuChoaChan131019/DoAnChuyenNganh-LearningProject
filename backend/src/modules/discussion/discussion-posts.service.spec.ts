import { describe, expect, it, vi } from 'vitest';
import { DiscussionPostsService } from './discussion-posts.service.js';
import type { CreateDiscussionPostDto } from './dto/discussion-post.dto.js';

const author = 'author-1';
const chapter = { id: 'chapter-1', course_id: 'course-1', status: 'published' };
const lesson = { id: 'lesson-1', chapter_id: chapter.id, status: 'published' };
const course = { id: chapter.course_id, status: 'published' };
const post = {
  id: 'post-1',
  chapter_id: chapter.id,
  lesson_id: lesson.id,
  post_type: 'question',
  author_id: author,
};
const body: CreateDiscussionPostDto = {
  lesson_id: lesson.id,
  post_type: 'question',
  title: 'Question title',
  content: 'Question content with details',
};

function setup(results: Array<{ data: unknown; error?: unknown }>) {
  const builders: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
  const from = vi.fn((table: string) => {
    const next = results.shift();
    if (!next) throw new Error(`Unexpected query on ${table}`);
    const result = { error: null, ...next };
    const builder: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ['select', 'eq', 'is', 'insert', 'update'])
      builder[method] = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => result);
    builder.single = vi.fn(async () => result);
    builders.push(builder);
    return builder;
  });
  const service = new DiscussionPostsService({
    getClient: () => ({ from }),
  } as never);
  return { service, from, builders };
}

describe('DiscussionPostsService', () => {
  it('derives the chapter from the lesson and records the authenticated author', async () => {
    const { service, builders } = setup([
      { data: lesson },
      { data: chapter },
      { data: course },
      { data: post },
    ]);
    await service.create(body, author);
    expect(builders[3].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        chapter_id: chapter.id,
        lesson_id: lesson.id,
        author_id: author,
        status: 'visible',
      }),
    );
  });

  it.each([{}, { chapter_id: chapter.id, lesson_id: lesson.id }])(
    'rejects ambiguous or absent targets %j',
    async (target) => {
      const { service, from } = setup([]);
      await expect(
        service.create({ ...body, lesson_id: undefined, ...target }, author),
      ).rejects.toMatchObject({ status: 400 });
      expect(from).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ data: { ...lesson, status: 'draft' } }],
    [{ data: lesson }, { data: { ...chapter, status: 'approved' } }],
    [
      { data: lesson },
      { data: chapter },
      { data: { ...course, status: 'draft' } },
    ],
  ])('rejects creating on unpublished content', async (...results) => {
    const { service, builders } = setup(results);
    await expect(service.create(body, author)).rejects.toMatchObject({
      status: 400,
    });
    expect(builders.every((b) => b.insert.mock.calls.length === 0)).toBe(true);
  });

  it.each([
    [{ data: { ...lesson, status: 'draft' } }],
    [{ data: lesson }, { data: { ...chapter, status: 'approved' } }],
    [
      { data: lesson },
      { data: chapter },
      { data: { ...course, status: 'draft' } },
    ],
  ])(
    'rejects editing after related content is withdrawn',
    async (...results) => {
      const { service, builders } = setup([{ data: post }, ...results]);
      await expect(
        service.update(post.id, { title: 'Updated title' }, author),
      ).rejects.toMatchObject({ status: 400 });
      expect(builders.every((b) => b.update.mock.calls.length === 0)).toBe(
        true,
      );
    },
  );

  it('revalidates a chapter-only post and updates only the visible author-owned row', async () => {
    const { service, builders } = setup([
      { data: { ...post, lesson_id: null } },
      { data: chapter },
      { data: course },
      { data: { ...post, title: 'Updated title' } },
    ]);
    await service.update(post.id, { title: 'Updated title' }, author);
    expect(builders[3].eq).toHaveBeenCalledWith('author_id', author);
    expect(builders[3].eq).toHaveBeenCalledWith('status', 'visible');
    expect(builders[3].is).toHaveBeenCalledWith('deleted_at', null);
    expect(builders[3].update).toHaveBeenCalledWith({
      title: 'Updated title',
      updated_at: expect.any(String),
    });
  });

  it('rejects another author before reading the related content', async () => {
    const { service, builders, from } = setup([{ data: null }]);
    await expect(
      service.update(post.id, { title: 'Changed title' }, 'other'),
    ).rejects.toMatchObject({ status: 404 });
    expect(builders[0].eq).toHaveBeenCalledWith('author_id', 'other');
    expect(from).toHaveBeenCalledTimes(1);
  });

  it.each(['title', 'content'])(
    'returns 400 for null %s even if DTO validation is bypassed',
    async (field) => {
      const { service } = setup([
        { data: post },
        { data: lesson },
        { data: chapter },
        { data: course },
      ]);
      await expect(
        service.update(post.id, { [field]: null } as never, author),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it('soft-deletes only a visible author-owned row', async () => {
    const { service, builders } = setup([
      { data: { id: post.id, deleted_at: '2026-11-03T00:00:00Z' } },
    ]);
    expect(await service.remove(post.id, author)).toMatchObject({
      id: post.id,
      deleted: true,
    });
    expect(builders[0].eq).toHaveBeenCalledWith('author_id', author);
    expect(builders[0].eq).toHaveBeenCalledWith('status', 'visible');
    expect(builders[0].is).toHaveBeenCalledWith('deleted_at', null);
    expect(builders[0].update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('rejects deletion if no visible author-owned row matches', async () => {
    const { service } = setup([{ data: null }]);
    await expect(service.remove(post.id, author)).rejects.toMatchObject({
      status: 404,
    });
  });
});

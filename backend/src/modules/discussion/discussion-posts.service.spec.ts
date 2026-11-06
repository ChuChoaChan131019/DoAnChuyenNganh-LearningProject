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
  it('lists all visible posts with their published course locations', async () => {
    const courseId = '00000000-0000-4000-8000-000000000030';
    const chapterId = '00000000-0000-4000-8000-000000000031';
    const lessonId = '00000000-0000-4000-8000-000000000032';
    const postRow = {
      id: '00000000-0000-4000-8000-000000000033',
      chapter_id: chapterId,
      lesson_id: lessonId,
      author_id: author,
      post_type: 'question',
      title: 'Global discussion question',
      content: 'Question content with enough details',
      resource_url: null,
      status: 'visible',
      created_at: '2026-11-06T00:00:00.000Z',
      updated_at: '2026-11-06T00:00:00.000Z',
      deleted_at: null,
    };
    const results = [
      {
        data: [{ id: courseId, title: 'C# Basics', slug: 'csharp-basics' }],
        error: null,
      },
      {
        data: [{ id: chapterId, title: 'Variables', course_id: courseId }],
        error: null,
      },
      { data: [postRow], error: null },
      { data: [], error: null },
      { data: [{ id: lessonId, title: 'Local variables' }], error: null },
    ];
    const from = vi.fn((table: string) => {
      const result = results.shift();
      if (!result) throw new Error(`Unexpected query on ${table}`);
      const builder: Record<string, any> = {};
      for (const method of [
        'select', 'eq', 'is', 'in', 'textSearch', 'or', 'order',
      ]) {
        builder[method] = vi.fn(() => builder);
      }
      builder.limit = vi.fn(async () => result);
      // Supabase query builders are intentionally thenable; mirror that API here.
      // oxlint-disable-next-line unicorn/no-thenable
      builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
      return builder;
    });
    const service = new DiscussionPostsService({
      getClient: () => ({ from }),
    } as never);

    const page = await service.findAll({ scope: 'all', limit: 20 }, author);

    expect(page.items).toEqual([
      expect.objectContaining({
        id: postRow.id,
        course_id: courseId,
        course_title: 'C# Basics',
        course_slug: 'csharp-basics',
        chapter_title: 'Variables',
        lesson_title: 'Local variables',
      }),
    ]);
  });

  it('lists posts across every published chapter in a published course', async () => {
    const courseId = '00000000-0000-4000-8000-000000000010';
    const chapterIds = [
      '00000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000012',
    ];
    const postRows = chapterIds.map((chapterId, index) => ({
      id: `00000000-0000-4000-8000-00000000002${index}`,
      chapter_id: chapterId,
      lesson_id: null,
      author_id: author,
      post_type: 'question',
      title: `Question ${index + 1}`,
      content: 'Question content with details',
      resource_url: null,
      status: 'visible',
      created_at: `2026-11-0${index + 1}T00:00:00.000Z`,
      updated_at: `2026-11-0${index + 1}T00:00:00.000Z`,
      deleted_at: null,
    }));
    const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
    const results = [
      { data: { id: courseId, status: 'published' }, error: null },
      { data: chapterIds.map((id) => ({ id })), error: null },
      { data: postRows, error: null },
      { data: [], error: null },
    ];
    const from = vi.fn((table: string) => {
      const result = results.shift();
      if (!result) throw new Error(`Unexpected query on ${table}`);
      const builder: Record<string, any> = {};
      for (const method of [
        'select', 'eq', 'is', 'in', 'textSearch', 'or', 'order',
      ]) {
        builder[method] = vi.fn((...args: unknown[]) => {
          calls.push({ table, method, args });
          return builder;
        });
      }
      builder.maybeSingle = vi.fn(async () => result);
      builder.limit = vi.fn(async (...args: unknown[]) => {
        calls.push({ table, method: 'limit', args });
        return result;
      });
      // Supabase query builders are intentionally thenable; mirror that API here.
      // oxlint-disable-next-line unicorn/no-thenable
      builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
      return builder;
    });
    const service = new DiscussionPostsService({
      getClient: () => ({ from }),
    } as never);

    const page = await service.findAll({ course_id: courseId, limit: 20 }, author);

    expect(page.items).toHaveLength(2);
    expect(calls).toContainEqual({
      table: 'discussion_posts',
      method: 'in',
      args: ['chapter_id', chapterIds],
    });
    expect(page.items.map((item) => item.chapter_id)).toEqual(chapterIds);
  });

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

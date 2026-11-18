import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import { discussionSeed } from './csharp-discussion.dataset.mjs';

const { Client } = pg;
const learnerIds = [
  '7507eb38-b001-4ddd-97aa-47ba0ace2c7b',
  '0e94c163-d183-4b6f-a5a0-fcdbf444780d',
  '5cbd1959-8cb0-44d4-99e1-000b2ca5125d',
];
const managerId = '7b7ba3f6-f67c-4bea-86fa-c2298aa18566';

function dbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const line = fs.readFileSync(path.resolve('backend/.env'), 'utf8').split(/\r?\n/).find((item) => item.startsWith('SUPABASE_DB_URL='));
  if (!line) throw new Error('Không tìm thấy SUPABASE_DB_URL.');
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

function id(prefix, number) {
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

const client = new Client({ connectionString: dbUrl() });
try {
  await client.connect();
  await client.query('begin');
  await client.query("set local statement_timeout = '30s'");
  const course = (await client.query('select id,status from public.courses where id=$1', [discussionSeed.courseId])).rows[0];
  if (!course || course.status !== 'published') throw new Error('Khóa C# chưa được publish.');
  const profileRows = await client.query('select id, role from public.profiles where id = any($1::uuid[]) or id=$2', [learnerIds, managerId]);
  if (profileRows.rows.length !== learnerIds.length + 1) throw new Error('Thiếu profile seed cần thiết.');

  const postIds = [];
  for (let index = 0; index < discussionSeed.posts.length; index += 1) {
    const post = discussionSeed.posts[index];
    const chapterId = id('11000000', post.chapter);
    const lessonId = id('12000000', (post.chapter - 1) * 4 + post.lesson);
    const postId = id('19000000', index + 1);
    const authorId = learnerIds[index % learnerIds.length];
    await client.query(`
      insert into public.discussion_posts
        (id, chapter_id, lesson_id, author_id, post_type, title, content, resource_url, status)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'visible')
      on conflict (id) do nothing
    `, [postId, chapterId, lessonId, authorId, post.type, post.title, post.content, post.resourceUrl ?? null]);
    postIds.push(postId);
  }

  const commentIds = [];
  for (let index = 0; index < discussionSeed.comments.length; index += 1) {
    const [postNumber, content] = discussionSeed.comments[index];
    const commentId = id('1a000000', index + 1);
    const authorId = learnerIds[(index + 1) % learnerIds.length];
    await client.query(`
      insert into public.discussion_comments
        (id, post_id, author_id, content, status)
      values ($1,$2,$3,$4,'visible')
      on conflict (id) do nothing
    `, [commentId, postIds[postNumber - 1], authorId, content]);
    commentIds.push(commentId);
  }

  for (let index = 0; index < postIds.length; index += 1) {
    for (const voter of learnerIds.slice(0, (index % 3) + 1)) {
      await client.query(`
        insert into public.discussion_post_helpful_votes (post_id,user_id)
        values ($1,$2) on conflict do nothing
      `, [postIds[index], voter]);
    }
  }
  for (let index = 0; index < commentIds.length; index += 1) {
    for (const voter of learnerIds.slice(0, (index % 2) + 1)) {
      await client.query(`
        insert into public.discussion_comment_helpful_votes (comment_id,user_id)
        values ($1,$2) on conflict do nothing
      `, [commentIds[index], voter]);
    }
  }

  const reports = [
    { id: id('1b000000', 1), postId: postIds[2], commentId: null, reason: 'Nội dung này cần được kiểm tra vì có thể gây hiểu nhầm cho người mới học.' },
    { id: id('1b000000', 2), postId: null, commentId: commentIds[9], reason: 'Bình luận có dấu hiệu không phù hợp với chủ đề học tập của bài.' },
  ];
  for (const report of reports) {
    await client.query(`
      insert into public.discussion_reports
        (id, post_id, comment_id, reporter_id, reason, status)
      values ($1,$2,$3,$4,$5,'pending')
      on conflict (id) do nothing
    `, [report.id, report.postId, report.commentId, learnerIds[2], report.reason]);
  }

  await client.query('commit');
  const result = await client.query(`
    select
      (select count(*)::int from public.discussion_posts where id >= $1 and id < $2) as posts,
      (select count(*)::int from public.discussion_comments where id >= $3 and id < $4) as comments,
      (select count(*)::int from public.discussion_post_helpful_votes where post_id >= $1 and post_id < $2) as post_votes,
      (select count(*)::int from public.discussion_comment_helpful_votes where comment_id >= $5 and comment_id < $6) as comment_votes,
      (select count(*)::int from public.discussion_reports where id >= $7 and id < $8 and status='pending') as pending_reports
  `, [id('19000000', 1), id('19000000', 99), id('1a000000', 1), id('1a000000', 99), id('1a000000', 1), id('1a000000', 99), id('1b000000', 1), id('1b000000', 99)]);
  console.log(JSON.stringify(result.rows[0], null, 2));
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}


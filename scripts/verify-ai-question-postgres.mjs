import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
const exec = promisify(execFile);
const modulePath = process.env.PG_CLIENT_MODULE;
const pg = await import(modulePath ? pathToFileURL(modulePath).href : "pg");
const Client = pg.Client ?? pg.default.Client;
const bin = process.env.PG_BIN || "C:/Program Files/PostgreSQL/17/bin";
const port = Number(process.env.AUTHORING_TEST_PG_PORT || 55439);
const directory = await mkdtemp(
  path.join(tmpdir(), "learning-ai-authoring-pg-"),
);
const ctl = path.join(bin, "pg_ctl.exe");
const clients = [];
let started = false;
const run = (file, args) =>
  exec(file, args, {
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
const actor = "00000000-0000-4000-8000-000000000001";
const course = "00000000-0000-4000-8000-000000000010";
const chapter = "00000000-0000-4000-8000-000000000011";
const lesson = "00000000-0000-4000-8000-000000000012";
const question = (client_id, content) => ({
  client_id,
  course_id: course,
  chapter_id: chapter,
  lesson_id: lesson,
  question_type: "single_choice",
  difficulty: "easy",
  content,
  explanation: "Fixture explanation",
  options: [
    { option_text: "Yes", is_correct: true, order_index: 0 },
    { option_text: "No", is_correct: false, order_index: 1 },
  ],
});
async function connect(role) {
  const client = new Client({
    host: "127.0.0.1",
    port,
    user: "postgres",
    database: "postgres",
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  clients.push(client);
  if (role) await client.query(`set role ${role}`);
  return client;
}
const save = (client, batch, payload) =>
  client.query(
    "select * from public.save_ai_question_drafts($1::uuid,$2::uuid,$3::jsonb)",
    [actor, batch, JSON.stringify(payload)],
  );
try {
  await run(path.join(bin, "initdb.exe"), [
    "-D",
    directory,
    "--auth=trust",
    "--no-locale",
    "--encoding=UTF8",
    "--username=postgres",
  ]);
  await run(ctl, [
    "-D",
    directory,
    "-l",
    path.join(directory, "server.log"),
    "-o",
    `-h 127.0.0.1 -p ${port}`,
    "-w",
    "start",
  ]);
  started = true;
  const admin = await connect();
  await admin.query(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create table public.profiles(id uuid primary key,role text not null);
 create table public.courses(id uuid primary key,title text,status text);
 create table public.chapters(id uuid primary key,course_id uuid references public.courses(id),title text);
 create table public.lessons(id uuid primary key,chapter_id uuid references public.chapters(id),title text,content text,status text);
 create table public.questions(id uuid primary key default gen_random_uuid(),course_id uuid references public.courses(id),chapter_id uuid references public.chapters(id),lesson_id uuid references public.lessons(id),question_type text,difficulty text,content text not null,explanation text,status text default 'draft',is_ai_generated boolean default false,generated_for_user_id uuid,created_at timestamptz default now());
 create table public.question_options(id uuid primary key default gen_random_uuid(),question_id uuid references public.questions(id),option_text text not null,is_correct boolean,order_index integer);
 insert into public.profiles values('${actor}','content_manager');
 insert into public.courses values('${course}','Fixture course','draft');
 insert into public.chapters values('${chapter}','${course}','Fixture chapter');
 insert into public.lessons values('${lesson}','${chapter}','Fixture lesson','Fixture content','draft');
 `);
  for (const name of [
    "20261115090000_ai_question_authoring_drafts.sql",
    "20261115093000_ai_question_history.sql",
    "20261116093000_atomic_question_creation_history.sql",
  ]) {
    await admin.query(
      await readFile(
        new URL(`../database/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  }
  await admin.query(
    "grant usage on schema public to service_role; grant select on profiles,courses,chapters,lessons to service_role; grant select,insert,update on questions,question_options to service_role;",
  );
  const first = await connect("service_role");
  const second = await connect("service_role");
  const batch = "00000000-0000-4000-8000-000000000020";
  const payload = [
    question("one", "First question"),
    question("two", "Second question"),
  ];
  await admin.query("begin");
  await admin.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
    batch,
  ]);
  const pendingFirst = save(first, batch, payload);
  const pendingSecond = save(second, batch, payload);
  let waiters = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    waiters = Number(
      (
        await admin.query(
          "select count(*) total from pg_stat_activity where wait_event='advisory' and query like 'select * from public.save_ai_question_drafts%'",
        )
      ).rows[0].total,
    );
    if (waiters === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(
    waiters,
    2,
    "two independent database sessions must wait on the batch lock",
  );
  await admin.query("commit");
  const [saved, retry] = await Promise.all([pendingFirst, pendingSecond]);
  assert.deepEqual(saved.rows, retry.rows);
  const counts = (
    await admin.query(
      "select (select count(*)::int from questions) q,(select count(*)::int from question_options) o,(select count(*)::int from question_history) h",
    )
  ).rows[0];
  assert.deepEqual(counts, { q: 2, o: 4, h: 2 });
  await assert.rejects(
    save(first, batch, [question("one", "Changed payload")]),
    { code: "23505" },
  );
  await admin.query(
    `create function public.fixture_fail_history() returns trigger language plpgsql as $$ begin if NEW.snapshot->>'content'='ROLLBACK' then raise exception 'forced history failure'; end if; return NEW; end $$; create trigger fixture_fail_history before insert on public.question_history for each row execute function public.fixture_fail_history();`,
  );
  const badBatch = "00000000-0000-4000-8000-000000000021";
  await assert.rejects(
    save(first, badBatch, [
      question("good", "Would otherwise commit"),
      question("bad", "ROLLBACK"),
    ]),
    /forced history failure/,
  );
  assert.equal(
    (
      await admin.query(
        "select count(*)::int total from questions where ai_draft_batch_id=$1",
        [badBatch],
      )
    ).rows[0].total,
    0,
  );
  await assert.rejects(
    first.query(
      "select * from public.create_shared_question_with_history($1::uuid,$2::jsonb)",
      [actor, JSON.stringify(question("manual", "ROLLBACK"))],
    ),
    /forced history failure/,
  );
  const created = await first.query(
    "select * from public.create_shared_question_with_history($1::uuid,$2::jsonb)",
    [actor, JSON.stringify(question("manual", "Manual question"))],
  );
  const manual = (
    await admin.query(
      "select snapshot from question_history where question_id=$1 and action='created'",
      [created.rows[0].id],
    )
  ).rows[0].snapshot;
  assert.equal(manual.is_ai_generated, false);
  assert.equal(manual.options.length, 2);
  assert.equal(manual.version, 1);
  const id = saved.rows[0].id;
  const update = (version, content) =>
    first.query(
      "select * from public.update_shared_question_with_history($1::uuid,$2::uuid,$3,$4::jsonb)",
      [actor, id, version, JSON.stringify(question("one", content))],
    );
  const transition = (action, version, reason = null) =>
    first.query(
      "select * from public.transition_shared_question_with_history($1::uuid,$2::uuid,$3,$4,$5)",
      [actor, id, action, version, reason],
    );
  await update(1, "Edited question");
  await transition("submit", 2);
  await transition("reject", 3, "Needs a clearer explanation");
  await update(4, "Corrected question");
  await transition("submit", 5);
  await transition("approve", 6);
  assert.deepEqual(
    (
      await admin.query(
        "select action from question_history where question_id=$1 order by version",
        [id],
      )
    ).rows.map((row) => row.action),
    [
      "created",
      "updated",
      "submitted",
      "rejected",
      "updated",
      "submitted",
      "approved",
    ],
  );
  await assert.rejects(transition("approve", 2), { code: "40001" });
  for (const role of ["anon", "authenticated"]) {
    const blocked = await connect(role);
    await assert.rejects(save(blocked, batch, payload), { code: "42501" });
  }
  console.log(
    JSON.stringify(
      {
        passed: true,
        engine: "PostgreSQL 17",
        isolated: true,
        live_writes: 0,
        concurrent_waiting_sessions: waiters,
        cases: [
          "concurrent exact retry",
          "changed payload conflict",
          "history failure rolls back batch",
          "manual atomic creation and rollback",
          "service_role invoker permissions",
          "edit-submit-reject-edit-submit-approve history",
          "stale version conflict",
          "anon/authenticated RPC denial",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await Promise.allSettled(clients.map((client) => client.end()));
  if (started) await run(ctl, ["-D", directory, "-m", "fast", "-w", "stop"]);
}

// Default is a read-only preflight. --apply performs the reviewed additive migration.
// Supply DATABASE_URL privately and PG_CLIENT_MODULE if pg is not on module resolution paths.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const dsn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!dsn || !process.env.SUPABASE_URL) {
  console.error(
    JSON.stringify({
      status: "requires_sql_connection",
      required: "DATABASE_URL (or SUPABASE_DB_URL) and SUPABASE_URL",
      database_writes: 0,
    }),
  );
  process.exit(2);
}
let target;
let project;
try {
  target = new URL(dsn);
  project = new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
} catch {
  console.error(
    JSON.stringify({
      status: "invalid_connection_configuration",
      database_writes: 0,
    }),
  );
  process.exit(2);
}
const username = decodeURIComponent(target.username);
const expectedHost = `db.${project}.supabase.co`;
const poolerMatches =
  target.hostname.endsWith(".pooler.supabase.com") &&
  username.endsWith(`.${project}`);
if (target.hostname !== expectedHost && !poolerMatches) {
  console.error(
    JSON.stringify({
      status: "target_mismatch",
      message:
        "SQL connection does not identify the Supabase project configured by the backend; no connection attempted.",
      database_writes: 0,
    }),
  );
  process.exit(2);
}
const modulePath = process.env.PG_CLIENT_MODULE;
const pg = await import(modulePath ? pathToFileURL(modulePath).href : "pg");
const Client = pg.Client ?? pg.default.Client;
const client = new Client({
  host: target.hostname,
  port: Number(target.port || 5432),
  user: username,
  password: decodeURIComponent(target.password),
  database: decodeURIComponent(target.pathname.slice(1) || "postgres"),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 15_000,
});
let transaction = false;
try {
  await client.connect();
  const apply = process.argv.includes("--apply");
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  transaction = true;
  await client.query(
    "SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';",
  );
  const base = await client.query(
    "select to_regprocedure('public.save_ai_question_drafts(uuid,uuid,jsonb)') is not null ai_drafts, to_regprocedure('public.transition_shared_question_with_history(uuid,uuid,text,integer,text)') is not null review_history",
  );
  if (!base.rows[0].ai_drafts || !base.rows[0].review_history)
    throw new Error("base_migrations_missing");
  const audit = (
    await client.query(`select
   (select count(*)::int from (select question_id from public.question_history where action='created' group by question_id having count(*)>1) duplicates) duplicate_creation_questions,
   (select count(*)::int from public.questions q where q.generated_for_user_id is null and not exists(select 1 from public.question_history h where h.question_id=q.id and h.action='created')) legacy_missing_creation`)
  ).rows[0];
  if (audit.duplicate_creation_questions > 0)
    throw new Error("legacy_creation_duplicates_require_review");
  if (apply) {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('learning-ai-question-authoring-migration-20261116',0))",
    );
    await client.query(
      await readFile(
        new URL(
          "../database/migrations/20261116093000_atomic_question_creation_history.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const signature of [
      "public.save_ai_question_drafts(uuid,uuid,jsonb)",
      "public.create_shared_question_with_history(uuid,jsonb)",
    ]) {
      const privilege = (
        await client.query(
          "select has_function_privilege('service_role',$1,'EXECUTE') backend,has_function_privilege('anon',$1,'EXECUTE') anonymous,has_function_privilege('authenticated',$1,'EXECUTE') authenticated",
          [signature],
        )
      ).rows[0];
      if (!privilege.backend || privilege.anonymous || privilege.authenticated)
        throw new Error("unexpected_rpc_permissions");
    }
    const historyPrivilege = (
      await client.query(
        "select (has_table_privilege('service_role','public.question_history','SELECT') AND has_table_privilege('service_role','public.question_history','INSERT')) allowed",
      )
    ).rows[0];
    if (!historyPrivilege.allowed)
      throw new Error("service_role_history_privileges_missing");
    await client.query("NOTIFY pgrst, 'reload schema'");
    await client.query("COMMIT");
    transaction = false;
  } else {
    await client.query("ROLLBACK");
    transaction = false;
  }
  console.log(
    JSON.stringify(
      {
        status: apply ? "migration_applied" : "preflight_passed",
        migration: "20261116093000_atomic_question_creation_history",
        audit,
        legacy_history_modified: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (transaction) await client.query("ROLLBACK").catch(() => {});
  const known = [
    "base_migrations_missing",
    "legacy_creation_duplicates_require_review",
    "unexpected_rpc_permissions",
    "service_role_history_privileges_missing",
  ];
  console.error(
    JSON.stringify({
      status: "deployment_failed",
      code: known.includes(error.message)
        ? error.message
        : error.code || "SQL_ERROR",
      transaction_rolled_back: transaction,
    }),
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

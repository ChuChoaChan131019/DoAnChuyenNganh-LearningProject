import { writeFile } from "node:fs/promises";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("Supabase backend configuration is missing");
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function read(path, extraHeaders = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { ...headers, ...extraHeaders },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(`Read-only preflight failed: HTTP ${response.status}`);
  return {
    data: await response.json(),
    range: response.headers.get("content-range"),
  };
}
const schema = await read("");
const paths = Object.keys(schema.data.paths ?? {});
const rpcNames = paths
  .filter((path) => path.startsWith("/rpc/"))
  .map((path) => path.slice(5));
const schemaFields = Object.keys(
  schema.data.definitions?.questions?.properties ?? {},
);
let offset = 0;
const creations = new Map();
let scanned = 0;
let complete = false;
for (let page = 0; page < 10; page++) {
  const result = await read(
    `question_history?select=question_id&action=eq.created&order=id&limit=1000&offset=${offset}`,
  );
  for (const item of result.data)
    creations.set(item.question_id, (creations.get(item.question_id) ?? 0) + 1);
  scanned += result.data.length;
  if (result.data.length < 1000) {
    complete = true;
    break;
  }
  offset += 1000;
}
const report = {
  checked_at: new Date().toISOString(),
  database_writes: 0,
  rpc_names: rpcNames,
  creation_rpc_present: rpcNames.includes(
    "create_shared_question_with_history",
  ),
  ai_draft_rpc_present: rpcNames.includes("save_ai_question_drafts"),
  question_fields: schemaFields,
  creation_history: {
    scanned,
    scan_complete: complete,
    duplicate_question_count: [...creations.values()].filter(
      (count) => count > 1,
    ).length,
  },
  direct_sql_configuration_available: Boolean(
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_ACCESS_TOKEN,
  ),
};
console.log(JSON.stringify(report, null, 2));
if (process.env.AUTHORING_PREFLIGHT_REPORT)
  await writeFile(
    process.env.AUTHORING_PREFLIGHT_REPORT,
    JSON.stringify(report, null, 2) + "\n",
  );

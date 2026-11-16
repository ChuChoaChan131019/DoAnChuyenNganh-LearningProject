// Run against a local production/dev server. Every backend call is intercepted; no live writes.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation; CHROME_PATH selects a browser.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath ? pathToFileURL(modulePath).href : "playwright"
);
console.log("Launching fixture browser");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
});
const base = process.env.AUTHORING_UI_URL || "http://localhost:3200";
const question = (client_id) => ({
  client_id,
  content: "Biến trong C# dùng để lưu gì?",
  question_type: "single_choice",
  difficulty: "easy",
  explanation: "Biến lưu giá trị.",
  options: [
    { option_text: "Giá trị", is_correct: true, order_index: 0 },
    { option_text: "Biên dịch", is_correct: false, order_index: 1 },
  ],
});
const context = await browser.newContext();
await context.addCookies([
  { name: "auth_token", value: "fixture-only", url: base },
  { name: "auth_role", value: "content_manager", url: base },
]);
context.setDefaultTimeout(15_000);
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") console.log("Browser:", message.text());
});
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("dialog", (dialog) => dialog.accept());
let generateCalls = 0;
let saveCalls = [];
let mode = "lost-response";
let releaseGeneration;
let regeneration = false;
const fulfill = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(status >= 400 ? { error: data } : { data }),
  });
await page.route("**/api/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  if (route.request().method() === "OPTIONS")
    return route.fulfill({
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      },
    });
  if (path.endsWith("/questions/review-count"))
    return fulfill(route, { count: 0 });
  if (path.endsWith("/courses"))
    return fulfill(route, [
      { id: "A", title: "Khóa A" },
      { id: "B", title: "Khóa B" },
    ]);
  if (path.endsWith("/chapters")) {
    const isA = path.includes("/A/");
    await new Promise((resolve) => setTimeout(resolve, isA ? 600 : 30));
    return fulfill(route, [
      { id: isA ? "ch-A" : "ch-B", title: isA ? "Chương A" : "Chương B" },
    ]);
  }
  if (path.endsWith("/lessons"))
    return fulfill(route, [{ id: "lesson-B", title: "Bài B" }]);
  if (path.endsWith("/ai/questions/generate")) {
    generateCalls++;
    const request = route.request().postDataJSON();
    await new Promise((resolve) => {
      releaseGeneration = resolve;
    });
    const questions = Array.from({ length: request.count }, (_, index) => ({
      ...question(`q-${generateCalls}-${index}`),
      ...(regeneration ? { content: "Đề bài sau khi tạo lại" } : {}),
    }));
    return fulfill(route, {
      questions,
      warnings: [],
      source: { lesson_id: request.lesson_id, title: "Bài B" },
    });
  }
  if (path.endsWith("/questions/ai-drafts")) {
    const body = route.request().postDataJSON();
    saveCalls.push(body);
    if (mode === "lost-response") {
      mode = "retry";
      return route.abort("failed");
    }
    if (mode === "validation") {
      mode = "validation-fixed";
      return fulfill(
        route,
        { message: "Invalid question", code: "BAD_REQUEST" },
        400,
      );
    }
    if (mode === "incomplete") return fulfill(route, { saved: [] });
    return fulfill(route, {
      saved: body.questions.map((item, index) => ({
        client_id: item.client_id,
        id: `db-${index}`,
        status: "draft",
      })),
    });
  }
  return fulfill(route, []);
});
const release = async () => {
  await page.waitForFunction(
    () =>
      document.body.textContent.includes("Đang tạo...") ||
      document.querySelector("fieldset[disabled]"),
  );
  for (let attempt = 0; !releaseGeneration && attempt < 100; attempt++)
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(releaseGeneration, "generation request was sent");
  releaseGeneration();
  releaseGeneration = undefined;
};
const setup = async () => {
  console.log("Loading generator fixture");
  await page.goto(`${base}/content-manager/ai/question-generator`);
  const courses = page.getByLabel(/^Khóa học/);
  console.log("Selecting courses");
  await courses.selectOption("A");
  await courses.selectOption("B");
  await page.getByLabel(/^Chương/).selectOption("ch-B");
  await page.waitForTimeout(750);
  assert.equal(
    await page
      .getByLabel(/^Chương/)
      .locator("option")
      .allTextContents()
      .then((items) => items.includes("Chương A")),
    false,
  );
  await page.getByLabel(/^Bài học/).selectOption("lesson-B");
  await page.getByLabel("Số lượng", { exact: true }).fill("1");
};
try {
  await setup();
  console.log("Testing generation and regeneration");
  await page
    .getByRole("button", { name: "Tạo câu hỏi", exact: true })
    .dblclick();
  await release();
  await page.getByLabel("Đề bài").waitFor();
  assert.equal(generateCalls, 1, "double click sends only one request");
  assert.equal(await page.getByLabel(/^Khóa học/).isEnabled(), true);
  await page.getByRole("button", { name: "Tạo lại", exact: true }).click();
  regeneration = true;
  assert.equal(await page.getByLabel("Đề bài").isDisabled(), true);
  await release();
  await page.waitForFunction(
    () =>
      document.querySelector('textarea[aria-label="Đề bài"]')?.value ===
      "Đề bài sau khi tạo lại",
  );
  console.log("Saving fixture");
  await page
    .getByRole("button", { name: "Lưu tất cả bản nháp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thử lưu lại", exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("Đề bài").isDisabled(), true);
  await page.getByRole("button", { name: "Thử lưu lại", exact: true }).click();
  await page.getByRole("link", { name: "Mở câu đã lưu 1" }).waitFor();
  assert.equal(saveCalls.length, 2);
  assert.deepEqual(
    saveCalls[0],
    saveCalls[1],
    "lost response retries the exact batch and payload",
  );
  assert.equal(await page.getByLabel("Đề bài").count(), 0);

  // Incomplete successful responses must keep proposals and pending retry.
  await setup();
  regeneration = false;
  mode = "incomplete";
  await page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();
  await release();
  await page.getByLabel("Đề bài").waitFor();
  console.log("Saving fixture");
  await page
    .getByRole("button", { name: "Lưu tất cả bản nháp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thử lưu lại", exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("Đề bài").count(), 1);
  mode = "retry";
  await page.getByRole("button", { name: "Thử lưu lại", exact: true }).click();
  await page.getByRole("link", { name: "Mở câu đã lưu 1" }).waitFor();

  // A confirmed validation rollback permits correction under a new batch.
  await setup();
  mode = "validation";
  await page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();
  await release();
  await page.getByLabel("Đề bài").waitFor();
  console.log("Saving fixture");
  await page
    .getByRole("button", { name: "Lưu tất cả bản nháp", exact: true })
    .click();
  await page.getByLabel("Đề bài").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !document.querySelector('textarea[aria-label="Đề bài"]')?.disabled &&
      !document.querySelector("fieldset[disabled]"),
  );
  await page.getByLabel("Đề bài").fill("Nội dung được sửa sau validation");
  console.log("Saving fixture");
  await page
    .getByRole("button", { name: "Lưu tất cả bản nháp", exact: true })
    .click();
  await page.getByRole("link", { name: "Mở câu đã lưu 1" }).waitFor();
  assert.notEqual(saveCalls.at(-1).batch_id, saveCalls.at(-2).batch_id);
  // Conversion controls enforce option bounds without inventing answers.
  await setup();
  mode = "retry";
  await page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();
  await release();
  await page.getByLabel("Đề bài").waitFor();
  const editor = page.locator("fieldset").last();
  await editor.locator("select").first().selectOption("fill_in_blank");
  assert.equal(await page.getByLabel(/^Đáp án [0-9]/).count(), 1);
  assert.equal(
    await page.getByLabel("Đáp án 1", { exact: true }).inputValue(),
    "Giá trị",
  );
  await editor.locator("select").first().selectOption("multiple_choice");
  assert.equal(await page.getByLabel(/^Đáp án [0-9]/).count(), 3);
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Thêm đáp án", exact: true })
      .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Thêm đáp án", exact: true })
      .isDisabled(),
    true,
  );
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Xóa đáp án 1", exact: true })
      .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Xóa đáp án 1", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Bỏ đề xuất", exact: true }).click();
  await page.getByLabel("Số lượng", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();
  await release();
  await page.getByLabel("Đề bài").nth(9).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Tạo câu hỏi", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Lưu tất cả bản nháp", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Mở câu đã lưu 10", exact: true })
    .waitFor();
  assert.equal(saveCalls.at(-1).questions.length, 10);
  assert.deepEqual(browserErrors, []);
  console.log(
    JSON.stringify({
      passed: true,
      cases: [
        "stale course response",
        "double generation guard",
        "regeneration edit lock and replacement",
        "lost response exact retry",
        "incomplete mapping retains proposals",
        "validation correction uses new batch",
        "option bounds and standard answer",
        "ten proposal limit",
      ],
      generateCalls,
      saveCalls: saveCalls.length,
    }),
  );
} catch (error) {
  console.error(
    "Fixture URL:",
    page.url(),
    "Body:",
    (await page.locator("body").innerText()).slice(0, 1500),
  );
  console.error(error);
  throw error;
} finally {
  releaseGeneration?.();
  await browser.close();
}

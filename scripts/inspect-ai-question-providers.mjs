const providers = [
  {
    name: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
  },
  {
    name: "openai",
    url: "https://api.openai.com/v1/models",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
  },
];
for (const provider of providers) {
  try {
    const response = await fetch(provider.url, {
      headers: provider.headers,
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    const report = { provider: provider.name, http_status: response.status };
    if (!response.ok)
      report.error_code = data.error?.code ?? data.error?.status ?? "unknown";
    else if (provider.name === "gemini")
      report.generation_models = (data.models ?? [])
        .filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => m.name);
    else {
      report.model_count = data.data?.length ?? 0;
      report.configured_model_listed = (data.data ?? []).some(
        (m) => m.id === (process.env.AI_QUESTION_OPENAI_MODEL || "gpt-4o-mini"),
      );
    }
    console.log(JSON.stringify(report));
  } catch (error) {
    console.log(
      JSON.stringify({ provider: provider.name, failure_type: error.name }),
    );
  }
}

"use client";

import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const code = isValidElement<{ className?: string; children?: ReactNode }>(
    children,
  )
    ? children
    : null;
  const language =
    /language-([^\s]+)/.exec(code?.props.className ?? "")?.[1] ?? "";
  const label = ["csharp", "cs", "c#"].includes(language.toLowerCase())
    ? "C#"
    : language.slice(0, 24) || "Mã";
  const text =
    typeof code?.props.children === "string" ? code.props.children : "";

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="my-3 min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2 font-sans text-[11px]">
        <span className="font-semibold text-slate-300">{label}</span>
        <button
          type="button"
          aria-label={`Sao chép mã ${label}`}
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-slate-200 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          {copyState === "copied" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span aria-live="polite">
            {copyState === "copied"
              ? "Đã sao chép"
              : copyState === "failed"
                ? "Không sao chép được"
                : "Sao chép"}
          </span>
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-label={`Đoạn mã ${label}`}
        className="max-w-full overflow-x-auto p-3 font-mono text-xs leading-5 whitespace-pre [overflow-wrap:normal] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-300"
      >
        {children}
      </pre>
    </div>
  );
}

export function TutorMessage({ content }: { content: string }) {
  return (
    <div className="min-w-0 space-y-3 text-sm leading-6 [overflow-wrap:anywhere] [&_p]:whitespace-pre-wrap [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li>p]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-teal-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_h1]:text-base [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h4]:font-semibold [&_hr]:border-slate-200 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={["img"]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2">
                {children}
              </table>
            </div>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#145a68] underline decoration-teal-300 underline-offset-2 hover:decoration-teal-700"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

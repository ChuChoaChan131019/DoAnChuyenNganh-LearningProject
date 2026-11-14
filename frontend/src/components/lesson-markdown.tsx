import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function LessonMarkdown({ content }: { content: string }) {
  return <div className="min-w-0 break-words text-[15px] leading-7 text-slate-700">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      h1: ({ children }) => <h1 className="mb-5 mt-8 text-3xl font-bold leading-tight text-[#0f3741] first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-3 mt-7 text-2xl font-bold leading-snug text-[#0f3741] first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-bold text-[#0f3741] first:mt-0">{children}</h3>,
      h4: ({ children }) => <h4 className="mb-2 mt-5 font-bold text-[#0f3741]">{children}</h4>,
      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-6">{children}</ul>,
      ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-6">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      blockquote: ({ children }) => <blockquote className="my-5 border-l-4 border-[#78bcc4] bg-[#f3f9f8] px-4 py-3 text-[#16485a]">{children}</blockquote>,
      strong: ({ children }) => <strong className="font-bold text-[#0f3741]">{children}</strong>,
      a: ({ children, href }) => <a href={href} className="font-medium text-[#087c89] underline underline-offset-2 hover:text-[#0f3741]">{children}</a>,
      hr: () => <hr className="my-7 border-slate-200" />,
      pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-xl bg-[#061d26] p-4 font-mono text-sm leading-6 text-[#d8e9e8]">{children}</pre>,
      code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-[#0f3741] [pre_&]:bg-transparent [pre_&]:p-0 [pre_&]:text-inherit">{children}</code>,
      table: ({ children }) => <table className="my-5 block w-full overflow-x-auto border-collapse text-left text-sm">{children}</table>,
      th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-3 py-2 font-semibold text-[#0f3741]">{children}</th>,
      td: ({ children }) => <td className="border border-slate-300 px-3 py-2 align-top">{children}</td>,
    }}>{content}</ReactMarkdown>
  </div>;
}

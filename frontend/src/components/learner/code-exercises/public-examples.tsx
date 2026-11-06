import type { PublicCodeExample } from '@/types/code-exercise';

export function PublicExamples({ examples }: { examples: PublicCodeExample[] }) {
  if (!examples.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[#0f3741]">Ví dụ công khai</h2>
      {examples.map((example, index) => (
        <div key={example.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">Ví dụ {index + 1}</div>
          <div className="grid md:grid-cols-2">
            <ExampleBlock title="Đầu vào" value={example.input} />
            <ExampleBlock title="Kết quả mong đợi" value={example.expected_output} bordered />
          </div>
        </div>
      ))}
    </section>
  );
}

function ExampleBlock({ title, value, bordered }: { title: string; value: string; bordered?: boolean }) {
  return <div className={`p-4 ${bordered ? 'border-t border-slate-100 md:border-l md:border-t-0' : ''}`}><div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</div><pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-slate-700">{value || '(trống)'}</pre></div>;
}

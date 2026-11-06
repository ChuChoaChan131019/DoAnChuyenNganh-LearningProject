import { Code2 } from 'lucide-react';

export function CodeEditor({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const lines = value ? value.split('\n').length : 1;
  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-700 bg-[#101b20] shadow-[0_18px_40px_rgba(15,55,65,0.14)]">
      <div className="flex items-center justify-between border-b border-slate-700 bg-[#17272e] px-4 py-3 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2 font-bold"><Code2 className="h-4 w-4 text-[#72c6c4]" /> Program.cs</span>
        <span>{lines} dòng</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        spellCheck={false}
        aria-label="Trình soạn thảo mã C#"
        className="min-h-[480px] w-full resize-y bg-[#101b20] p-5 font-mono text-[14px] leading-7 text-[#e5eef0] outline-none placeholder:text-slate-500 disabled:opacity-70"
        placeholder="Viết mã C# của bạn tại đây..."
      />
    </div>
  );
}

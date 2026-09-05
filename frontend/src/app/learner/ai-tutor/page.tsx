'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'Explain polymorphism with an example',
  'What is the difference between an interface and an abstract class?',
  'How does LINQ GroupBy work?',
  'When should I use try/catch/finally?',
];

export default function AITutorPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      {/* Header */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#145a68]">Learn</p>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">AI Tutor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Course-aware explanations with real C# examples, available any time.
        </p>
      </div>

      <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_276px]">
        {/* Left: Chat Interface */}
        <div className="flex min-h-[365px] flex-col overflow-hidden rounded-[16px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.06)]">
          {/* Chat Header (Có đường kẻ ngang giống ảnh mẫu) */}
          <div className="border-b border-slate-100 px-[18px] py-[15px]">
            <h2 className="text-[15px] font-bold text-[#0f3741]">Conversation</h2>
          </div>

          {/* Chat History Area */}
          <div className="flex flex-1 flex-col gap-6 p-[18px]">
            {/* AI Welcome Message */}
            <div className="flex items-start gap-4">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8a3a0] text-white">
                <Bot className="h-[15px] w-[15px]" />
              </div>
              <div className="rounded-[18px] rounded-tl-sm bg-[#f4f5f0] px-4 py-[13px] text-[15px] leading-[1.45] text-slate-700">
                Hi! I&apos;m your C# tutor. Ask me about any concept from your courses — I&apos;ll explain it and show working code.
              </div>
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="border-t border-slate-100 px-[18px] py-[14px]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about a C# or OOP concept..."
                className="h-[35px] flex-1 rounded-[13px] border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 shadow-sm transition-all focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setInputValue('');
                  }
                }}
              />
              <button
                type="button"
                aria-label="Send question"
                className="flex h-[35px] w-[45px] shrink-0 items-center justify-center rounded-[12px] bg-[#f7949a] text-white shadow-sm transition-colors hover:bg-rose-400"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Suggested Questions */}
        <div className="w-full shrink-0 rounded-[16px] border border-[#dfe6df] bg-[#fbfdf9] p-[18px] shadow-[0_8px_18px_rgba(0,44,62,0.06)]">
          <h2 className="text-[15px] font-bold text-[#0f3741]">Try asking</h2>
          <div className="mt-4 flex flex-col gap-2">
            {SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInputValue(suggestion)}
                className="flex items-start gap-2 rounded-[13px] border border-slate-200/80 bg-white px-3 py-[9px] text-left transition-all hover:border-[#78bcc4] hover:shadow-sm"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#78bcc4]" />
                <span className="text-sm leading-[1.4] text-[#145a68]">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
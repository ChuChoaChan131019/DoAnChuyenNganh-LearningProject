'use client';

import React, { useState } from 'react';
import { FileText, Search, Plus, Trash2, Edit2 } from 'lucide-react';

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="mx-auto max-w-[1216px] space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">My Notes</h1>
          <p className="mt-1 text-sm text-slate-500">Capture your thoughts and code snippets.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95">
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
        />
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {/* Mock Notes */}
        <div className="break-inside-avoid rounded-[24px] border border-[#dfe6df] bg-[#fbfdf9] p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#145a68] bg-cyan-50 px-2 py-1 rounded-md">
              C# Fundamentals
            </span>
            <div className="flex gap-2">
              <button className="text-slate-400 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
              <button className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <h3 className="font-bold text-[#0f3741] mb-2">Value vs Reference Types</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Value types are stored on the stack (int, double, struct). Reference types are stored on the heap (class, string, array). When you assign a reference type, you only copy the pointer.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5" /> Lesson: Primitive Data Types
          </div>
        </div>

        <div className="break-inside-avoid rounded-[24px] border border-[#dfe6df] bg-[#fffaf5] p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
              OOP in C#
            </span>
            <div className="flex gap-2">
              <button className="text-slate-400 hover:text-slate-700"><Edit2 className="h-3.5 w-3.5" /></button>
              <button className="text-slate-400 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <h3 className="font-bold text-[#0f3741] mb-2">Interface vs Abstract Class</h3>
          <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1">
            <li>Interfaces define contract only (no implementation before C# 8).</li>
            <li>A class can implement multiple interfaces but inherit only ONE abstract class.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

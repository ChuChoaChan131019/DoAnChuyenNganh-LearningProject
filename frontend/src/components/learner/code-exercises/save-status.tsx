import { AlertCircle, Check, Cloud, Loader2, RefreshCw } from 'lucide-react';

export type EditorSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export function SaveStatus({ state, updatedAt }: { state: EditorSaveState; updatedAt?: string | null }) {
  const content = {
    idle: { icon: <Cloud className="h-4 w-4" />, text: 'Mã chưa thay đổi', className: 'text-slate-500' },
    dirty: { icon: <Cloud className="h-4 w-4" />, text: 'Có thay đổi chưa lưu', className: 'text-amber-700' },
    saving: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: 'Đang lưu...', className: 'text-[#145a68]' },
    saved: { icon: <Check className="h-4 w-4" />, text: updatedAt ? `Đã lưu lúc ${new Date(updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đã lưu', className: 'text-emerald-700' },
    error: { icon: <AlertCircle className="h-4 w-4" />, text: 'Lưu thất bại, mã vẫn còn trên màn hình', className: 'text-rose-700' },
    conflict: { icon: <RefreshCw className="h-4 w-4" />, text: 'Mã đã thay đổi ở một phiên khác', className: 'text-amber-800' },
  }[state];
  return <span className={`inline-flex items-center gap-2 text-xs font-semibold ${content.className}`}>{content.icon}{content.text}</span>;
}

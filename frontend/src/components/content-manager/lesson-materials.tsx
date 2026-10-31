"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileCode2, FileImage, FileText, Pencil, Trash2, Upload } from "lucide-react";
import { materialApi, type Material } from "@/lib/api";

const MAX_SIZE = 6 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'cs', 'zip'];

export function MaterialIcon({ type }: { type: string }) {
  if (type === 'Image') return <FileImage className="h-5 w-5" />;
  if (type === 'Code Sample') return <FileCode2 className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

export function formatMaterialSize(size: number | null) {
  if (size == null) return 'Unknown size';
  return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function LessonMaterials({ lessonId }: { lessonId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    let active = true;
    materialApi.byLesson(lessonId).then((items) => {
      if (active) setMaterials(items);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải tài liệu.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId]);

  async function uploadFile(file?: File) {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !EXTENSIONS.includes(extension)) {
      setError('Chọn tệp PDF, PNG, JPG, WebP, CS hoặc ZIP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Dung lượng tệp không được vượt quá 6 MiB.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const item = await materialApi.upload(lessonId, file);
      setMaterials((current) => [item, ...current]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tải tệp lên thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle(id: string) {
    if (!editTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await materialApi.rename(id, editTitle.trim());
      setMaterials((current) => current.map((item) => item.id === id ? updated : item));
      setEditingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Đổi tên thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this material?')) return;
    setBusy(true);
    setError(null);
    try {
      await materialApi.remove(id);
      setMaterials((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string, download: boolean) {
    const tab = window.open('about:blank', '_blank');
    try {
      const { url } = await materialApi.access(id, download);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (cause) {
      tab?.close();
      setError(cause instanceof Error ? cause.message : 'Không thể mở tài liệu');
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe6df] px-5 py-4">
      <div>
        <h2 className="font-semibold text-[#002C3E]">Tài liệu bài học</h2>
        <p className="text-xs text-[#637981]">Tệp PDF, hình ảnh và mã nguồn tối đa 6 MiB</p>
      </div>
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#002C3E] px-3 py-2 text-xs font-semibold text-white ${busy ? 'opacity-50' : ''}`}>
        <Upload className="h-4 w-4" /> {busy ? 'Working…' : 'Upload file'}
        <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.cs,.zip" disabled={busy} onChange={(event) => { void uploadFile(event.target.files?.[0]); event.target.value = ''; }} />
      </label>
    </div>
    {error && <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="p-5 text-sm text-[#637981]">Đang tải tài liệu…</p> : materials.length === 0 ?
      <p className="p-5 text-sm text-[#637981]">Bài học này chưa có tệp đính kèm.</p> :
      <ul className="divide-y divide-[#dfe6df]">
        {materials.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
          <span className="text-[#F7444E]"><MaterialIcon type={item.file_type} /></span>
          <div className="min-w-0 flex-1">
            {editingId === item.id ? <div className="flex gap-2">
              <input className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" value={editTitle} maxLength={255} onChange={(event) => setEditTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveTitle(item.id); }} />
              <button type="button" disabled={busy || !editTitle.trim()} onClick={() => void saveTitle(item.id)} className="text-xs font-semibold text-[#002C3E]">Lưu</button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-slate-500">Hủy</button>
            </div> : <p className="truncate text-sm font-medium text-[#002C3E]">{item.title}</p>}
            <p className="text-xs text-[#637981]">{item.file_type} · {formatMaterialSize(item.file_size)}</p>
          </div>
          <button type="button" title="Mở" aria-label={`Open ${item.title}`} onClick={() => void open(item.id, false)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><ExternalLink className="h-4 w-4" /></button>
          <button type="button" title="Tải xuống" aria-label={`Download ${item.title}`} onClick={() => void open(item.id, true)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><Download className="h-4 w-4" /></button>
          <button type="button" title="Đổi tên" aria-label={`Rename ${item.title}`} onClick={() => { setEditingId(item.id); setEditTitle(item.title); }} className="rounded p-1.5 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
          <button type="button" title="Xóa" aria-label={`Delete ${item.title}`} disabled={busy} onClick={() => void remove(item.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
        </li>)}
      </ul>}
  </section>;
}

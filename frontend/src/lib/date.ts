/**
 * Tiện ích định dạng ngày tháng theo tiêu chuẩn Việt Nam (DD/MM/YYYY)
 */

/**
 * Định dạng ngày theo chuẩn DD/MM/YYYY (ví dụ: 01/10/2026)
 * @param date - Chuỗi ISO, timestamp, Date object hoặc null/undefined
 * @param fallback - Chuỗi hiển thị dự phòng nếu date không hợp lệ (mặc định '')
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Định dạng ngày và giờ theo chuẩn HH:mm DD/MM/YYYY (ví dụ: 14:30 01/10/2026)
 * @param date - Chuỗi ISO, timestamp, Date object hoặc null/undefined
 * @param fallback - Chuỗi hiển thị dự phòng nếu date không hợp lệ (mặc định '')
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Định dạng giờ phút 24h theo chuẩn HH:mm (ví dụ: 14:30)
 * @param date - Chuỗi ISO, timestamp, Date object hoặc null/undefined
 * @param fallback - Chuỗi hiển thị dự phòng nếu date không hợp lệ (mặc định '')
 */
export function formatTime(
  date: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Định dạng ngày thân thiện có xét Hôm nay / Hôm qua
 * @param date - Chuỗi ISO, timestamp, Date object hoặc null/undefined
 * @param fallback - Chuỗi hiển thị dự phòng nếu date không hợp lệ (mặc định '')
 */
export function formatRelativeDate(
  date: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const formatted = formatDate(d);

  if (isToday) return `Hôm nay, ${formatted}`;
  if (isYesterday) return `Hôm qua, ${formatted}`;
  return formatted;
}

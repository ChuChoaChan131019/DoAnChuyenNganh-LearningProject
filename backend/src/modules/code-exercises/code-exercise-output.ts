/**
 * Chuẩn hóa đầu ra theo quy ước Phòng thực hành C#.
 *
 * 1. CRLF, CR -> LF.
 * 2. Xóa dấu cách và tab ở cuối mỗi dòng.
 * 3. Xóa các dòng trống ở cuối.
 * 4. Giữ nguyên chữ hoa/thường và khoảng trắng bên trong.
 */
export function normalizeCodeOutput(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

export function codeOutputMatches(actual: string, expected: string): boolean {
  return normalizeCodeOutput(actual) === normalizeCodeOutput(expected);
}
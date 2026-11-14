type Cell = string | number | null | undefined;

function cell(value: Cell) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Free-text fields could start with a formula character; neutralise them for spreadsheet apps.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// BOM keeps Chinese text readable when the file is opened in Excel.
export function toCsv(rows: Cell[][]) {
  return '﻿' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}

export function localDateTime(iso: string) {
  const d = new Date(iso);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export async function saveTextFile(name: string, text: string) {
  const file = new File([text], name, {type: 'text/csv;charset=utf-8'});
  const touch = window.matchMedia('(pointer: coarse)').matches;
  // On phones (especially an installed iOS PWA) the share sheet is the reliable way to save a file.
  if (touch && navigator.canShare?.({files: [file]})) {
    try {
      await navigator.share({files: [file], title: name});
      return;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 3725 -> "01:02:05"
export const fmt = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')

// "C:\\Videos\\RecordRoom\\a.webm" -> "a.webm"
export const fileName = (p) => (p || '').split(/[\\/]/).pop()

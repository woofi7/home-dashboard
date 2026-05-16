export function formatBytes(n: number, perSecond = false): string {
  const suffix = perSecond ? '/s' : ''
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB${suffix}`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB${suffix}`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB${suffix}`
  return `${n} B${suffix}`
}

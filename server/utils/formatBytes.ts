export function formatBytes(n: number, perSecond = false): string {
  const s = perSecond ? '/s' : ''
  if (n >= 1024 ** 4)
    return `${(n / 1024 ** 4).toFixed(2)} TB${s}`
  if (n >= 1024 ** 3)
    return `${(n / 1024 ** 3).toFixed(2)} GB${s}`
  if (n >= 1024 ** 2)
    return `${(n / 1024 ** 2).toFixed(2)} MB${s}`
  if (n >= 1024)
    return `${(n / 1024).toFixed(1)} KB${s}`
  return `${n} B${s}`
}

/** Format a value that is already in kilobytes. */
export function formatKilobytes(kb: string | number): string {
  const n = Number(kb)
  if (n >= 1024 ** 3)
    return `${(n / 1024 ** 3).toFixed(1)} TB`
  if (n >= 1024 ** 2)
    return `${(n / 1024 ** 2).toFixed(1)} GB`
  if (n >= 1024)
    return `${(n / 1024).toFixed(1)} MB`
  return `${n} KB`
}

/** Format a seconds value as "X hrs" or "X days". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  return h >= 24 ? `${(h / 24).toFixed(1)} days` : `${h} hrs`
}

/** Format bytes-per-second with an optional speed limit. */
export function formatSpeed(bps: number, limitBps = 0): string {
  return limitBps > 0
    ? `${formatBytes(bps, true)} / ${formatBytes(limitBps, true)}`
    : formatBytes(bps, true)
}

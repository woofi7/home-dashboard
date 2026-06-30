import { getEntry } from '#shared/changelog'

export function useChangelog() {
  const version = useRuntimeConfig().public.version
  const entry = getEntry(version)
  const show = ref(false)

  onMounted(async () => {
    if (!entry)
      return
    const state = await $fetch<{ lastSeenVersion: string | null }>('/api/changelog').catch(() => null)
    if (state?.lastSeenVersion !== version)
      show.value = true
  })

  async function dismiss() {
    show.value = false
    await $fetch('/api/changelog/dismiss', { method: 'POST', body: { version } }).catch(() => {})
  }

  return { show, entry, dismiss }
}

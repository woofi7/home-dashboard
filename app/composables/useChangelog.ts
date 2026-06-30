import { getEntry } from '#shared/changelog'

const STORAGE_KEY = 'lastSeenVersion'

export function useChangelog() {
  const version = useRuntimeConfig().public.version
  const entry = getEntry(version)
  const show = ref(false)

  onMounted(() => {
    if (!entry)
      return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== version)
      show.value = true
  })

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, version)
    show.value = false
  }

  return { show, entry, dismiss }
}

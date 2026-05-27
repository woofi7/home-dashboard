export type GlobalSettings = {
  title?: string
  bookmarkCounterEnabled?: boolean
  bookmarkAutoSort?: boolean
  linkTarget?: 'new-tab' | 'same-tab'
}

export function useGlobalSettings() {
  const { data } = useAsyncData<GlobalSettings>(
    'globalSettings',
    () => $fetch<GlobalSettings>('/api/admin/settings'),
    { default: () => ({}) },
  )
  return { settings: data }
}

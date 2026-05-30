import { storeToRefs } from 'pinia'
import { useConfigStore } from '~/stores/config'

export type GlobalSettings = {
  title?: string
  bookmarkCounterEnabled?: boolean
  bookmarkAutoSort?: boolean
  linkTarget?: 'new-tab' | 'same-tab'
}

export function useGlobalSettings() {
  const { config } = storeToRefs(useConfigStore())
  const settings = computed(() => (config.value.settings ?? {}) as GlobalSettings)
  return { settings }
}

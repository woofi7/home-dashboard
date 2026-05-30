import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const store = useAuthStore()
  const ready = import.meta.client ? store.ensureLoaded() : Promise.resolve()
  const { tokenConfigured, editEnabled, authenticated, needsLogin } = storeToRefs(store)

  return {
    ready,
    tokenConfigured,
    editEnabled,
    authenticated,
    needsLogin,
    login: store.login,
    setup: store.setup,
    logout: store.logout,
  }
}

type AuthStatus = { tokenConfigured: boolean; editEnabled: boolean; authenticated: boolean }

const status = ref<AuthStatus>({ tokenConfigured: false, editEnabled: false, authenticated: false })

async function fetchStatus() {
  try {
    status.value = await $fetch<AuthStatus>('/api/auth/status')
  } catch { /* ignore */ }
}

let initialized = false
let readyPromise: Promise<void> = Promise.resolve()

export function useAuth() {
  if (!initialized && import.meta.client) {
    initialized = true
    readyPromise = fetchStatus()
  }

  return {
    ready: readyPromise,
    tokenConfigured: computed(() => status.value.tokenConfigured),
    editEnabled: computed(() => status.value.editEnabled),
    authenticated: computed(() => status.value.authenticated),
    needsLogin: computed(() => status.value.editEnabled && !status.value.authenticated),

    async login(password: string): Promise<boolean> {
      try {
        await $fetch('/api/auth/login', { method: 'POST', body: { password } })
        await fetchStatus()
        return true
      } catch {
        return false
      }
    },

    async setup(password: string): Promise<boolean> {
      try {
        await $fetch('/api/auth/setup', { method: 'POST', body: { password } })
        await fetchStatus()
        return true
      } catch {
        return false
      }
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      await fetchStatus()
    },
  }
}

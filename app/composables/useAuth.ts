type AuthStatus = { editEnabled: boolean; authenticated: boolean }

const status = ref<AuthStatus>({ editEnabled: false, authenticated: false })

async function fetchStatus() {
  try {
    status.value = await $fetch<AuthStatus>('/api/auth/status')
  } catch { /* ignore */ }
}

let initialized = false

export function useAuth() {
  if (!initialized && import.meta.client) {
    initialized = true
    fetchStatus()
  }

  return {
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

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      await fetchStatus()
    },
  }
}

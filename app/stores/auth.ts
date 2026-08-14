import { defineStore } from 'pinia'
import { clearOfflineCache } from '~/utils/offlineCache'

type AuthStatus = { tokenConfigured: boolean; editEnabled: boolean; authenticated: boolean }

let readyPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    tokenConfigured: false,
    editEnabled: false,
    authenticated: false,
  }),
  getters: {
    needsLogin: (s): boolean => s.editEnabled && !s.authenticated,
    // The whole dashboard - not just edit mode - is locked behind the same
    // password. Locked whether a password still needs to be chosen (first
    // run) or one is set but this session hasn't logged in yet.
    locked: (s): boolean => !s.authenticated,
  },
  actions: {
    async fetchStatus() {
      try {
        const status = await $fetch<AuthStatus>('/api/auth/status')
        this.tokenConfigured = status.tokenConfigured
        this.editEnabled = status.editEnabled
        this.authenticated = status.authenticated
        if (!status.authenticated)
          clearOfflineCache()
      } catch { /* ignore */ }
    },
    ensureLoaded() {
      if (!readyPromise)
        readyPromise = this.fetchStatus()
      return readyPromise
    },
    async login(password: string): Promise<boolean> {
      try {
        await $fetch('/api/auth/login', { method: 'POST', body: { password } })
        await this.fetchStatus()
        return true
      } catch {
        return false
      }
    },
    async setup(password: string): Promise<boolean> {
      try {
        await $fetch('/api/auth/setup', { method: 'POST', body: { password } })
        await this.fetchStatus()
        return true
      } catch {
        return false
      }
    },
    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      await this.fetchStatus()
    },
  },
})

<script setup lang="ts">
const { tokenConfigured, login, setup } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const input = ref<HTMLInputElement | null>(null)

onMounted(() => nextTick(() => input.value?.focus()))

async function submit() {
  error.value = ''
  if (!password.value)
    return

  if (!tokenConfigured.value) {
    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      return
    }
    loading.value = true
    const ok = await setup(password.value)
    loading.value = false
    if (!ok)
      error.value = 'Setup failed - the server may already have a password configured'
    return
  }

  loading.value = true
  const ok = await login(password.value)
  loading.value = false
  if (!ok) {
    error.value = 'Wrong password'
    password.value = ''
    nextTick(() => input.value?.focus())
  }
}
</script>

<template>
  <div class="fixed inset-0 z-100 flex items-center justify-center bg-base p-4">
    <div class="bg-surface border border-border rounded-2xl p-6 w-80 shadow-2xl">
      <h1 class="text-base font-semibold text-primary mb-1">
        {{ tokenConfigured ? 'Password required' : 'Set a dashboard password' }}
      </h1>
      <p class="text-xs text-muted mb-4">
        <template v-if="tokenConfigured">This dashboard is password-protected.</template>
        <template v-else>This dashboard is public-facing and has no password yet. Choose one to continue - it will be required on every visit. You can also set <code class="bg-elevated px-1 rounded text-xs">ADMIN_TOKEN</code> in your environment instead.</template>
      </p>
      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <input
          ref="input"
          v-model="password"
          type="password"
          :placeholder="tokenConfigured ? 'Password' : 'Choose a password'"
          :autocomplete="tokenConfigured ? 'current-password' : 'new-password'"
          class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <input
          v-if="!tokenConfigured"
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm password"
          autocomplete="new-password"
          class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <p v-if="error" class="text-xs text-danger">{{ error }}</p>
        <button
          type="submit"
          :disabled="loading || !password || (!tokenConfigured && !confirmPassword)"
          class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="loading || !password || (!tokenConfigured && !confirmPassword)
            ? 'bg-elevated text-muted cursor-not-allowed'
            : 'bg-accent text-white hover:bg-accent-hover cursor-pointer'"
        >{{ loading ? '...' : (tokenConfigured ? 'Unlock' : 'Set password') }}</button>
      </form>
    </div>
  </div>
</template>

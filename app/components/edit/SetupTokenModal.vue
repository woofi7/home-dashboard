<script setup lang="ts">
const emit = defineEmits<{ success: []; close: [] }>()
const { setup } = useAuth()

const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)
const input = ref<HTMLInputElement | null>(null)

onMounted(() => nextTick(() => input.value?.focus()))

async function submit() {
  error.value = ''
  if (!password.value)
    return
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  const ok = await setup(password.value)
  loading.value = false
  if (ok) {
    emit('success')
  } else {
    error.value = 'Setup failed — the server may already have a token configured'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-surface border border-border rounded-2xl p-6 w-80 shadow-2xl">
        <h2 class="text-base font-semibold text-primary mb-1">Set up admin access</h2>
        <p class="text-xs text-muted mb-4">No password has been configured yet. Set one to enable edit mode. You can also set <code class="bg-elevated px-1 rounded text-xs">ADMIN_TOKEN</code> in your environment instead.</p>
        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <input
            ref="input"
            v-model="password"
            type="password"
            placeholder="Choose a password"
            autocomplete="new-password"
            class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <input
            v-model="confirm"
            type="password"
            placeholder="Confirm password"
            autocomplete="new-password"
            class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <p v-if="error" class="text-xs text-danger">{{ error }}</p>
          <div class="flex gap-2 justify-end">
            <button type="button" class="px-4 py-2 rounded-lg text-sm text-muted hover:text-primary transition-colors" @click="$emit('close')">Cancel</button>
            <button
              type="submit"
              :disabled="loading || !password || !confirm"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="loading || !password || !confirm
                ? 'bg-elevated text-muted cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent-hover cursor-pointer'"
            >{{ loading ? '...' : 'Set password' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const emit = defineEmits<{ success: []; close: [] }>()
const { login } = useAuth()

const password = ref('')
const error = ref('')
const loading = ref(false)
const input = ref<HTMLInputElement | null>(null)

onMounted(() => nextTick(() => input.value?.focus()))

async function submit() {
  if (!password.value)
    return
  loading.value = true
  error.value = ''
  const ok = await login(password.value)
  loading.value = false
  if (ok) {
    emit('success')
  } else {
    error.value = 'Wrong password'
    password.value = ''
    nextTick(() => input.value?.focus())
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-surface border border-border rounded-2xl p-6 w-80 shadow-2xl">
        <h2 class="text-base font-semibold text-primary mb-1">Enter password</h2>
        <p class="text-xs text-muted mb-4">Edit mode is password-protected.</p>
        <form @submit.prevent="submit" class="flex flex-col gap-3">
          <input
            ref="input"
            v-model="password"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <p v-if="error" class="text-xs text-danger">{{ error }}</p>
          <div class="flex gap-2 justify-end">
            <button type="button" class="px-4 py-2 rounded-lg text-sm text-muted hover:text-primary transition-colors" @click="$emit('close')">Cancel</button>
            <button
              type="submit"
              :disabled="loading || !password"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="loading || !password
                ? 'bg-elevated text-muted cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent-hover cursor-pointer'"
            >{{ loading ? '…' : 'Unlock' }}</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

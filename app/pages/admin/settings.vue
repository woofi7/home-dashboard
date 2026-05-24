<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

type SettingsConfig = { title?: string }

const { data: current, refresh } = await useFetch<SettingsConfig>('/api/admin/settings')

const form = ref<SettingsConfig>({ title: '' })

watch(current, (v) => {
  if (v)
    form.value = { title: v.title ?? '' }
}, { immediate: true })

const isDirty = computed(() => (form.value.title ?? '') !== (current.value?.title ?? ''))

function cancel() {
  if (current.value)
    form.value = { title: current.value.title ?? '' }
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/edit/settings', { method: 'POST', body: { title: form.value.title } })
    await refresh()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminSaveBar
    :is-dirty="isDirty"
    :saving="saving"
    :save-error="saveError"
    :save-success="saveSuccess"
    @save="save"
    @cancel="cancel"
  />
  <div class="px-6 py-8 max-w-xl space-y-6">
    <!-- General section -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">General</p>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="text-xs text-muted block mb-2">Dashboard title</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Dashboard"
            class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <p class="text-xs text-muted/60 mt-1">Shown in the browser tab.</p>
        </div>
      </div>
    </div>
  </div>
</template>

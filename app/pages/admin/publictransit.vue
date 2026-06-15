<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

const { data: current, refresh } = useFetch<{ url: string }>('/api/admin/publictransit')
const { data: preview, refresh: refreshPreview } = useFetch('/api/publictransit')

const form = ref({ url: '' })

watch(current, (v) => {
  if (v)
    form.value = { url: v.url }
}, { immediate: true })

const isDirty = computed(() => form.value.url !== (current.value?.url ?? ''))

function cancel() {
  form.value = { url: current.value?.url ?? '' }
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/publictransit', { method: 'POST', body: form.value })
    await refresh()
    await refreshPreview()
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
  <div class="px-6 py-8">
    <div class="flex flex-col xl:flex-row gap-6 items-start max-w-3xl">

      <div class="w-full xl:flex-1 rounded-xl border border-border bg-surface overflow-hidden">
        <div class="px-4 py-3 border-b border-border">
          <p class="text-xs text-muted uppercase tracking-widest">St-Jean-sur-Richelieu</p>
        </div>
        <div class="p-6 space-y-4">
          <p class="text-xs text-muted">
            Paste the public URL of your transit card page. The dashboard fetches this page server-side and parses
            the remaining pass counts. Leave blank to hide the widget.
          </p>
          <div>
            <label class="text-xs text-muted block mb-1">URL</label>
            <input
              v-model="form.url"
              type="url"
              placeholder="https://example.com/macarte/..."
              class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      <div class="w-full xl:w-64 xl:shrink-0 rounded-xl border border-border bg-surface overflow-hidden">
        <div class="px-4 py-3 border-b border-border">
          <p class="text-xs text-muted uppercase tracking-widest">Preview</p>
        </div>
        <div class="bg-black/80 p-4 min-h-20">
          <PublicTransitCard v-if="preview" :data="preview as any" />
          <p v-else class="text-xs text-muted italic">No URL configured</p>
        </div>
      </div>

    </div>
  </div>
</template>

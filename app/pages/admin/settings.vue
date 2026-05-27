<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

type SettingsConfig = { title?: string; bookmarkCounterEnabled?: boolean; bookmarkAutoSort?: boolean; linkTarget?: 'new-tab' | 'same-tab'; adminToken?: string; timezone?: string }

const { data: current, refresh } = await useFetch<SettingsConfig>('/api/admin/settings')
const { data: clicks, refresh: refreshClicks } = useFetch<Record<string, number>>('/api/bookmarks/clicks')

const form = ref<SettingsConfig>({ title: '', bookmarkCounterEnabled: true, bookmarkAutoSort: false, adminToken: '', timezone: '' })

watch(current, (v) => {
  if (v)
    form.value = { title: v.title ?? '', bookmarkCounterEnabled: v.bookmarkCounterEnabled ?? true, bookmarkAutoSort: v.bookmarkAutoSort ?? false, linkTarget: v.linkTarget ?? 'new-tab', adminToken: v.adminToken ?? '', timezone: v.timezone ?? '' }
}, { immediate: true })

const isDirty = computed(() => {
  const c = current.value
  return (form.value.title ?? '') !== (c?.title ?? '')
    || (form.value.bookmarkCounterEnabled ?? true) !== (c?.bookmarkCounterEnabled ?? true)
    || (form.value.bookmarkAutoSort ?? false) !== (c?.bookmarkAutoSort ?? false)
    || (form.value.linkTarget ?? 'new-tab') !== (c?.linkTarget ?? 'new-tab')
    || (form.value.adminToken ?? '') !== (c?.adminToken ?? '')
    || (form.value.timezone ?? '') !== (c?.timezone ?? '')
})

function cancel() {
  if (current.value)
    form.value = { title: current.value.title ?? '', bookmarkCounterEnabled: current.value.bookmarkCounterEnabled ?? true, bookmarkAutoSort: current.value.bookmarkAutoSort ?? false, linkTarget: current.value.linkTarget ?? 'new-tab', adminToken: current.value.adminToken ?? '', timezone: current.value.timezone ?? '' }
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/edit/settings', { method: 'POST', body: { title: form.value.title, bookmarkCounterEnabled: form.value.bookmarkCounterEnabled, bookmarkAutoSort: form.value.bookmarkAutoSort, linkTarget: form.value.linkTarget, adminToken: form.value.adminToken, timezone: form.value.timezone } })
    await refresh()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

const totalClicks = computed(() => Object.values(clicks.value ?? {}).reduce((s, n) => s + n, 0))

const resetting = ref(false)
const resetSuccess = ref(false)

async function resetClicks() {
  resetting.value = true
  resetSuccess.value = false
  try {
    await $fetch('/api/admin/bookmark-clicks', { method: 'DELETE' })
    await refreshClicks()
    resetSuccess.value = true
    setTimeout(() => { resetSuccess.value = false }, 2000)
  } finally {
    resetting.value = false
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
        <div>
          <label class="text-xs text-muted block mb-2">Link behavior</label>
          <div class="flex gap-2">
            <button
              class="flex-1 px-3 py-2 rounded-lg text-sm border transition-colors"
              :class="(form.linkTarget ?? 'new-tab') === 'new-tab' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
              @click="form.linkTarget = 'new-tab'"
            >New tab</button>
            <button
              class="flex-1 px-3 py-2 rounded-lg text-sm border transition-colors"
              :class="form.linkTarget === 'same-tab' ? 'bg-accent text-white border-accent' : 'bg-elevated border-border text-muted hover:border-accent'"
              @click="form.linkTarget = 'same-tab'"
            >Same tab</button>
          </div>
          <p class="text-xs text-muted/60 mt-1">Where service and bookmark links open.</p>
        </div>
        <div>
          <label class="text-xs text-muted block mb-2">Timezone</label>
          <TimezoneSelect v-model="form.timezone as string" />
          <p class="text-xs text-muted/60 mt-1">Used for background rotation and the clock. Defaults to server time.</p>
        </div>
      </div>
    </div>

    <!-- Security section -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Security</p>
      </div>
      <div class="p-6">
        <label class="text-xs text-muted block mb-2">Admin token</label>
        <SecretInput v-model="form.adminToken" placeholder="Enter admin token" />
        <p class="text-xs text-muted/60 mt-1">Required to access the admin panel. Keep this secret.</p>
      </div>
    </div>

    <!-- Bookmark Counter section -->
    <div class="rounded-xl border border-border bg-surface overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-xs text-muted uppercase tracking-widest">Bookmark Counter</p>
      </div>
      <div class="p-6 space-y-4">
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p class="text-sm text-primary">Show click count</p>
            <p class="text-xs text-muted mt-0.5">Displays a click count badge on each bookmark icon.</p>
          </div>
          <button
            role="switch"
            :aria-checked="form.bookmarkCounterEnabled"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
            :class="form.bookmarkCounterEnabled ? 'bg-accent' : 'bg-border'"
            @click="form.bookmarkCounterEnabled = !form.bookmarkCounterEnabled"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
              :class="form.bookmarkCounterEnabled ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </label>

        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p class="text-sm text-primary">Auto-sort by clicks</p>
            <p class="text-xs text-muted mt-0.5">Orders bookmarks by most clicked first within each group.</p>
          </div>
          <button
            role="switch"
            :aria-checked="form.bookmarkAutoSort"
            class="relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none"
            :class="form.bookmarkAutoSort ? 'bg-accent' : 'bg-border'"
            @click="form.bookmarkAutoSort = !form.bookmarkAutoSort"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform"
              :class="form.bookmarkAutoSort ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </label>

        <div class="pt-2 border-t border-border flex items-center justify-between gap-4">
          <div>
            <p class="text-sm text-primary">Total clicks recorded</p>
            <p class="text-xs text-muted mt-0.5">
              <span v-if="resetSuccess" class="text-success">Counts cleared.</span>
              <span v-else>{{ totalClicks }} click{{ totalClicks !== 1 ? 's' : '' }} across all bookmarks.</span>
            </p>
          </div>
          <button
            class="cursor-pointer px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-danger hover:border-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            :disabled="resetting || totalClicks === 0"
            @click="resetClicks"
          >{{ resetting ? 'Resetting...' : 'Reset' }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

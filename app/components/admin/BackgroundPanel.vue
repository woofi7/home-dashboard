<script setup lang="ts">
import type { ProviderForm } from './BackgroundProviderConfig.vue'
import type { AppearanceForm } from './BackgroundAppearance.vue'

type BackgroundConfig = ProviderForm & AppearanceForm & { color?: string }

const emit = defineEmits<{ saved: [] }>()

const { data: current, refresh: refreshCurrent } = await useFetch<BackgroundConfig>('/api/admin/background')

function formFromConfig(val: Partial<BackgroundConfig>): Required<BackgroundConfig> {
  return {
    provider:        val.provider        ?? 'none',
    color:           val.color           ?? '#0f1117',
    unsplashApiKey:  val.unsplashApiKey  ?? '',
    pexelsApiKey:    val.pexelsApiKey    ?? '',
    pixabayApiKey:   val.pixabayApiKey   ?? '',
    query:           val.query           ?? '',
    url:             val.url             ?? '',
    position:        val.position        ?? 'center',
    overlay:         typeof val.overlay === 'number' ? val.overlay : 40,
    blur:            val.blur            ?? 'none',
    fadeSpeed:       val.fadeSpeed       ?? 'normal',
  }
}

const form = ref(formFromConfig({}))

watch(current, (val) => {
  form.value = formFromConfig(val ?? {})
}, { immediate: true })

const isDirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(formFromConfig(current.value ?? {})))

function cancel() {
  form.value = formFromConfig(current.value ?? {})
}

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function save() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/admin/background', { method: 'POST', body: form.value })
    await refreshCurrent()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
    emit('saved')
  } catch (err: unknown) {
    saveError.value = (err as { data?: { message?: string } })?.data?.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

const providerForm = computed({
  get: () => ({
    provider:       form.value.provider,
    color:          form.value.color,
    unsplashApiKey: form.value.unsplashApiKey,
    pexelsApiKey:   form.value.pexelsApiKey,
    pixabayApiKey:  form.value.pixabayApiKey,
    query:          form.value.query,
    url:            form.value.url,
  }),
  set: (v: ProviderForm) => { form.value = { ...form.value, ...v } },
})

const appearanceForm = computed({
  get: () => ({
    position:  form.value.position,
    overlay:   form.value.overlay,
    blur:      form.value.blur,
    fadeSpeed: form.value.fadeSpeed,
  }),
  set: (v: AppearanceForm) => { form.value = { ...form.value, ...v } },
})
</script>

<template>
  <div class="space-y-4">

    <!-- Top bar -->
    <div class="flex items-center justify-between gap-4">
      <p v-if="isDirty" class="text-xs text-warning">Unsaved changes</p>
      <p v-else-if="saveSuccess" class="text-xs text-success">Saved</p>
      <span v-else />
      <div class="flex items-center gap-2">
        <p v-if="saveError" class="text-xs text-danger">{{ saveError }}</p>
        <button
          class="cursor-pointer px-3 py-1.5 rounded-lg text-sm border border-border text-muted hover:text-primary transition-colors disabled:opacity-40"
          :disabled="saving || !isDirty"
          @click="cancel"
        >Cancel</button>
        <button
          class="cursor-pointer px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="saving || !isDirty"
          @click="save"
        >{{ saving ? 'Saving...' : 'Save' }}</button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-6 items-start">

      <!-- Left panel: Provider -->
      <div class="w-full lg:flex-1 lg:min-w-0 rounded-xl border border-border bg-surface p-6">
        <BackgroundProviderConfig
          v-model="providerForm"
          :saved-provider="current?.provider"
        />
      </div>

      <!-- Right panel: Appearance -->
      <div class="w-full lg:w-72 lg:shrink-0 rounded-xl border border-border bg-surface p-6">
        <BackgroundAppearance v-model="appearanceForm" />
      </div>

    </div>

  </div>
</template>

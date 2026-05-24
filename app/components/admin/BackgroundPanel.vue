<script setup lang="ts">
import type { ProviderForm } from './BackgroundProviderConfig.vue'
import type { AppearanceForm } from './BackgroundAppearance.vue'

type BackgroundConfig = ProviderForm & AppearanceForm & { color?: string }
type CSSVars = Record<string, string>

const SECTION_STYLE_MAP: Record<string, CSSVars> = {
  glass:   { backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)' },
  dark:    { backgroundColor: 'rgba(0,0,0,0.5)' },
  darker:  { backgroundColor: 'rgba(0,0,0,0.75)' },
  none:    { backgroundColor: 'transparent' },
}

const CARD_STYLE_MAP: Record<string, CSSVars> = {
  glass:   { backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' },
  dark:    { backgroundColor: 'rgba(0,0,0,0.6)' },
  darker:  { backgroundColor: 'rgba(0,0,0,0.8)' },
  none:    { backgroundColor: 'transparent' },
}

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
    sectionStyle:    val.sectionStyle    ?? 'glass',
    cardStyle:       val.cardStyle       ?? 'dark',
  }
}

const form = ref(formFromConfig({}))

watch(current, (val) => { form.value = formFromConfig(val ?? {}) }, { immediate: true })

const isDirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(formFromConfig(current.value ?? {})))

function cancel() { form.value = formFromConfig(current.value ?? {}) }

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
    position:     form.value.position,
    overlay:      form.value.overlay,
    blur:         form.value.blur,
    fadeSpeed:    form.value.fadeSpeed,
    sectionStyle: form.value.sectionStyle,
    cardStyle:    form.value.cardStyle,
  }),
  set: (v: AppearanceForm) => { form.value = { ...form.value, ...v } },
})

const BLUR_PX: Record<string, string>   = { none: '0px', sm: '4px', md: '12px', lg: '24px' }
const BLUR_INSET: Record<string, string> = { none: '0',   sm: '-12px', md: '-30px', lg: '-60px' }
const POSITION_CSS: Record<string, string> = {
  center: 'center center',
  top:    'center top',
  bottom: 'center bottom',
  left:   'left center',
  right:  'right center',
}

const isImageProvider = computed(() => form.value.provider !== 'none')

const previewImageUrl = computed(() => {
  if (form.value.provider === 'url')    return form.value.url || ''
  if (form.value.provider === 'upload') return '/api/background-file'
  return 'https://picsum.photos/seed/preview/600/300'
})

const previewImageStyle = computed((): CSSVars => {
  const blurPx   = BLUR_PX[form.value.blur]    ?? '0px'
  const inset    = BLUR_INSET[form.value.blur]  ?? '0'
  const position = POSITION_CSS[form.value.position] ?? 'center center'
  return {
    inset,
    backgroundImage:    `url(${previewImageUrl.value})`,
    backgroundSize:     'cover',
    backgroundPosition: position,
    ...(blurPx !== '0px' ? { filter: `blur(${blurPx})` } : {}),
  }
})

const previewOverlayStyle = computed((): CSSVars => ({
  backgroundColor: `rgba(0,0,0,${(form.value.overlay ?? 40) / 100})`,
}))

const previewSolidStyle = computed((): CSSVars => ({
  background: `linear-gradient(135deg, ${form.value.color} 0%, color-mix(in srgb, ${form.value.color} 70%, #6366f1) 100%)`,
}))

const previewSectionStyle = computed((): CSSVars => SECTION_STYLE_MAP[form.value.sectionStyle] ?? SECTION_STYLE_MAP.glass)
const previewCardStyle    = computed((): CSSVars => CARD_STYLE_MAP[form.value.cardStyle]    ?? CARD_STYLE_MAP.dark)
</script>

<template>
  <div class="space-y-4">

    <!-- Save bar -->
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

      <!-- Left: stacked section cards -->
      <div class="w-full lg:flex-1 lg:min-w-0 space-y-4">

        <!-- Background -->
        <div class="rounded-xl border border-border bg-surface overflow-hidden">
          <div class="px-4 py-3 border-b border-border">
            <p class="text-xs text-muted uppercase tracking-widest">Background</p>
          </div>
          <div class="p-6">
            <BackgroundProviderConfig
              v-model="providerForm"
              :saved-provider="current?.provider"
            />
          </div>
        </div>

        <!-- Appearance -->
        <div class="rounded-xl border border-border bg-surface overflow-hidden">
          <div class="px-4 py-3 border-b border-border">
            <p class="text-xs text-muted uppercase tracking-widest">Appearance</p>
          </div>
          <div class="p-6">
            <BackgroundAppearance v-model="appearanceForm" />
          </div>
        </div>

      </div>

      <!-- Right: preview (sticky) -->
      <div class="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-6">
        <div class="rounded-xl border border-border overflow-hidden">
          <div class="px-4 py-3 border-b border-border bg-surface">
            <p class="text-xs text-muted uppercase tracking-widest">Preview</p>
          </div>
          <!-- layered preview: bg image / overlay / content -->
          <div class="relative overflow-hidden min-h-40">

            <!-- image background -->
            <div v-if="isImageProvider" class="absolute" :style="previewImageStyle" />

            <!-- overlay on top of image -->
            <div v-if="isImageProvider" class="absolute inset-0" :style="previewOverlayStyle" />

            <!-- solid color background -->
            <div v-else class="absolute inset-0" :style="previewSolidStyle" />

            <!-- section + card mockup -->
            <div class="relative p-4">
              <div
                class="rounded-xl border border-white/10 overflow-hidden"
                :style="previewSectionStyle"
              >
                <div class="flex items-center gap-2 px-4 py-2 border-b border-white/10">
                  <span class="text-xs font-semibold text-white/60">My Services</span>
                </div>
                <div class="p-3">
                  <div
                    class="rounded-lg border border-white/10 p-3"
                    :style="previewCardStyle"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded bg-white/10 shrink-0" />
                      <div class="flex-1 min-w-0">
                        <div class="h-2.5 bg-white/30 rounded w-16 mb-1.5" />
                        <div class="h-2 bg-white/15 rounded w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import type { ProviderForm } from './BackgroundProviderConfig.vue'
import type { AppearanceForm } from './BackgroundAppearance.vue'

type BackgroundConfig = ProviderForm & AppearanceForm & { color?: string }
type CSSVars = Record<string, string>

const SECTION_STYLE_MAP: Record<string, CSSVars> = {
  glass:   { backgroundColor: 'color-mix(in srgb, var(--color-surface) 75%, transparent)', backdropFilter: 'blur(12px)' },
  dark:    { backgroundColor: 'var(--color-surface)' },
  darker:  { backgroundColor: 'var(--color-base)' },
  none:    { backgroundColor: 'transparent' },
}

const CARD_STYLE_MAP: Record<string, CSSVars> = {
  glass:   { backgroundColor: 'color-mix(in srgb, var(--color-elevated) 70%, transparent)', backdropFilter: 'blur(4px)' },
  dark:    { backgroundColor: 'var(--color-elevated)' },
  darker:  { backgroundColor: 'var(--color-base)' },
  none:    { backgroundColor: 'transparent' },
}

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }
const emit = defineEmits<{ saved: []; state: [PanelState] }>()

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

watch(
  () => ({ isDirty: isDirty.value, saving: saving.value, saveError: saveError.value, saveSuccess: saveSuccess.value }),
  (val) => emit('state', val),
  { deep: true, immediate: true },
)

defineExpose({ save, cancel })

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
    <div class="flex flex-col lg:flex-row gap-6 items-start">

      <!-- Preview: top on small screens, right on large (always sticky) -->
      <div class="w-full lg:w-72 lg:shrink-0 sticky lg:order-2 z-10" :style="{ top: 'calc(var(--admin-header-h, 4rem) + 1rem)' }">
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
                data-testid="preview-section"
                class="rounded-xl border border-border overflow-hidden"
                :style="previewSectionStyle"
              >
                <div class="flex items-center gap-2 px-4 py-2 border-b border-border">
                  <span class="text-xs font-semibold text-secondary">My Services</span>
                </div>
                <div class="p-3">
                  <div
                    data-testid="preview-card"
                    class="rounded-lg border border-border p-3"
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

      <!-- Form panels: below preview on small screens, left on large -->
      <div class="w-full lg:flex-1 lg:min-w-0 space-y-4 lg:order-1">

        <slot />

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

    </div>

  </div>
</template>

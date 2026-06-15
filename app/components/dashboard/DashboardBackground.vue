<script setup lang="ts">
import { externalUrl } from '#shared/externalUrl'

const safeHref = (u?: string) => (u ? externalUrl(u) : undefined)

type Appearance = {
  position?: string
  overlay?: number
  blur?: string
  fadeSpeed?: string
  color?: string
}

const props = defineProps<{
  background?: { thumb?: string; full?: string; author?: string; authorLink?: string; source?: string } | null
  appearance?: Appearance | null
}>()

const thumbLoaded = ref(false)
const fullLoaded = ref(false)

if (import.meta.client) {
  watch(() => props.background?.thumb, (url) => {
    thumbLoaded.value = false
    if (!url) return
    const img = new Image()
    img.onload = () => { thumbLoaded.value = true }
    img.src = url
  }, { immediate: true })

  watch(() => props.background?.full, (url) => {
    fullLoaded.value = false
    if (!url) return
    const img = new Image()
    img.onload = () => { fullLoaded.value = true }
    img.src = url
  }, { immediate: true })
}

const bgPosition = computed(() => {
  const map: Record<string, string> = {
    center: 'center',
    top: 'center top',
    bottom: 'center bottom',
    left: 'left center',
    right: 'right center',
  }
  return map[props.appearance?.position ?? 'center'] ?? 'center'
})

const overlayColor = computed(() => {
  const opacity = (props.appearance?.overlay ?? 40) / 100
  return `rgba(0,0,0,${opacity})`
})

const blurStyle = computed(() => {
  const map: Record<string, string> = { none: '0px', sm: '4px', md: '12px', lg: '24px' }
  return map[props.appearance?.blur ?? 'none'] ?? '0px'
})

const blurInset = computed(() => {
  const map: Record<string, string> = { none: '0px', sm: '-12px', md: '-30px', lg: '-60px' }
  return map[props.appearance?.blur ?? 'none'] ?? '0px'
})

const fadeDuration = computed(() => {
  const map: Record<string, { thumb: string; full: string }> = {
    none:   { thumb: '0ms',    full: '0ms' },
    fast:   { thumb: '400ms',  full: '600ms' },
    normal: { thumb: '1000ms', full: '1500ms' },
    slow:   { thumb: '2000ms', full: '3000ms' },
  }
  return map[props.appearance?.fadeSpeed ?? 'normal'] ?? map.normal
})
</script>

<template>
  <template v-if="background?.thumb">
    <div class="fixed inset-0 -z-10 overflow-hidden">
      <div
        class="absolute bg-cover transition-opacity"
        :class="thumbLoaded ? 'opacity-100' : 'opacity-0'"
        :style="{
          inset: blurInset,
          backgroundImage: `url(${background.thumb})`,
          backgroundPosition: bgPosition,
          filter: blurStyle !== '0px' ? `blur(${blurStyle})` : undefined,
          transitionDuration: fadeDuration.thumb,
        }"
      />
      <div
        v-if="background.full"
        class="absolute bg-cover transition-opacity"
        :class="fullLoaded ? 'opacity-100' : 'opacity-0'"
        :style="{
          inset: blurInset,
          backgroundImage: `url(${background.full})`,
          backgroundPosition: bgPosition,
          filter: blurStyle !== '0px' ? `blur(${blurStyle})` : undefined,
          transitionDuration: fadeDuration.full,
        }"
      />
      <div class="absolute inset-0" :style="{ backgroundColor: overlayColor }" />
    </div>
    <a
      v-if="background.author"
      :href="safeHref(background.authorLink)"
      target="_blank"
      rel="noopener"
      class="fixed bottom-2 right-2 text-[10px] text-white/30 hover:text-white/60 transition-colors z-10"
    >Photo by {{ background.author }}{{ background.source ? ` on ${background.source}` : '' }}</a>
  </template>
  <div
    v-else-if="appearance?.color"
    class="fixed inset-0 -z-10"
    :style="{ backgroundColor: appearance.color }"
  />
</template>

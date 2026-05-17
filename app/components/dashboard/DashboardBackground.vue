<script setup lang="ts">
const props = defineProps<{
  background?: { thumb?: string; full?: string; author?: string; authorLink?: string } | null
}>()

const fullLoaded = ref(false)
if (import.meta.client) {
  watch(() => props.background?.full, (url) => {
    if (!url)
      return
    const img = new Image()
    img.onload = () => { fullLoaded.value = true }
    img.src = url
  }, { immediate: true })
}
</script>

<template>
  <template v-if="background?.thumb">
    <div class="fixed inset-0 -z-10 bg-cover bg-center" :style="{ backgroundImage: `url(${background.thumb})` }" />
    <div
      v-if="background.full"
      class="fixed inset-0 -z-10 bg-cover bg-center transition-opacity duration-1500"
      :class="fullLoaded ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url(${background.full})` }"
    />
    <div class="fixed inset-0 -z-10 bg-black/40" />
    <a
      v-if="background.author"
      :href="background.authorLink"
      target="_blank"
      rel="noopener"
      class="fixed bottom-2 right-2 text-[10px] text-white/30 hover:text-white/60 transition-colors z-10"
    >Photo by {{ background.author }} on Unsplash</a>
  </template>
</template>

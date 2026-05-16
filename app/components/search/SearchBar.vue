<script setup lang="ts">
const props = defineProps<{ provider: string }>()
const query = ref('')
const suggestions = ref<string[]>([])
const showSuggestions = ref(false)
let debounceTimer: ReturnType<typeof setTimeout>

const PROVIDER_URLS: Record<string, string> = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=',
  baidu: 'https://www.baidu.com/s?wd=',
}

async function fetchSuggestions(q: string) {
  if (!q.trim()) { suggestions.value = []; return }
  const data = await $fetch<string[]>(`/api/search/suggest?q=${encodeURIComponent(q)}&provider=${props.provider}`)
  suggestions.value = data
}

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchSuggestions(query.value), 200)
}

function submit(q = query.value) {
  const base = PROVIDER_URLS[props.provider] || PROVIDER_URLS.duckduckgo
  window.location.href = base + encodeURIComponent(q)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { showSuggestions.value = false; query.value = '' }
}
</script>

<template>
  <div class="flex justify-center pt-8 px-6">
    <div class="relative w-full max-w-xl">
      <input
        v-model="query"
        type="text"
        placeholder="Search…"
        class="w-full rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
        @input="onInput"
        @focus="showSuggestions = true"
        @blur="setTimeout(() => showSuggestions = false, 150)"
        @keydown="onKeydown"
        @keydown.enter="submit()"
      />
      <ul
        v-if="showSuggestions && suggestions.length"
        class="absolute top-full mt-1 w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] overflow-hidden z-50"
      >
        <li
          v-for="s in suggestions"
          :key="s"
          class="px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-sm"
          @mousedown="submit(s)"
        >{{ s }}</li>
      </ul>
    </div>
  </div>
</template>

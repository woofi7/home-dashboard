<script setup lang="ts">
const emit = defineEmits<{ select: [url: string]; close: [] }>()

const search = ref('')

const { data: allIcons, pending } = useLazyFetch<{ name: string; url: string }[]>('/api/icons')

type IconResult = { name: string; url: string; label: string }

function fuzzy(str: string, pattern: string): { score: number; indices: number[] } | null {
  let si = 0, pi = 0, score = 0, lastMatch = -1
  const s = str.toLowerCase()
  const p = pattern.toLowerCase()
  const indices: number[] = []
  while (si < s.length && pi < p.length) {
    if (s[si] === p[pi]) {
      score += lastMatch === si - 1 ? 3 : 1
      lastMatch = si
      indices.push(si)
      pi++
    }
    si++
  }
  return pi === p.length ? { score, indices } : null
}

function highlight(name: string, indices: number[]): string {
  const matched = new Set(indices)
  return name
    .split('')
    .map((ch, i) =>
      matched.has(i)
        ? `<mark style="background:transparent;color:var(--color-accent-hover);font-weight:600">${ch}</mark>`
        : ch
    )
    .join('')
}

const icons = computed<IconResult[]>(() => {
  if (!allIcons.value)
    return []
  const q = search.value.trim()
  if (!q)
    return allIcons.value.slice(0, 120).map((i) => ({ ...i, label: i.name }))

  return allIcons.value
    .map((i) => ({ i, result: fuzzy(i.name, q) }))
    .filter((x): x is { i: typeof x.i; result: { score: number; indices: number[] } } => x.result !== null)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 120)
    .map(({ i, result }) => ({ ...i, label: highlight(i.name, result.indices) }))
})

useScrollLock()
const input = ref<HTMLInputElement>()
onMounted(() => nextTick(() => input.value?.focus()))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-surface border border-border rounded-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">

        <!-- Header -->
        <div class="px-5 py-4 border-b border-border flex items-center gap-3">
          <input
            ref="input"
            v-model="search"
            type="text"
            placeholder="Search icons…"
            class="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
          />
          <button class="text-muted hover:text-primary" @click="$emit('close')">✕</button>
        </div>

        <!-- Grid -->
        <div class="overflow-y-auto p-4">
          <div v-if="pending" class="text-center text-muted text-sm py-12">Loading icons…</div>
          <div v-else-if="!icons.length" class="text-center text-muted text-sm py-12">No icons found</div>
          <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3">
            <button
              v-for="icon in icons"
              :key="icon.name"
              class="group flex flex-col items-center gap-2 p-3 rounded-xl border border-transparent hover:border-border hover:bg-elevated transition-colors"
              @click="$emit('select', icon.url)"
            >
              <div class="w-16 h-16 rounded-xl bg-elevated group-hover:bg-surface flex items-center justify-center overflow-hidden transition-colors">
                <img
                  :src="icon.url"
                  :alt="icon.name"
                  loading="lazy"
                  class="w-12 h-12 object-contain"
                  @error="($event.target as HTMLImageElement).style.opacity = '0'"
                />
              </div>
              <span class="text-xs text-muted text-center leading-tight line-clamp-2 w-full" v-html="icon.label" />
            </button>
          </div>

          <p v-if="icons.length === 120" class="text-center text-muted text-xs mt-4">
            Showing 120 of {{ allIcons?.length }} — refine your search to see more
          </p>
        </div>

      </div>
    </div>
  </Teleport>
</template>

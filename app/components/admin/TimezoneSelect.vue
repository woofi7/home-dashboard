<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { fuzzyMatch, type Segment } from '~/utils/fuzzy'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const allZones: string[] = typeof window !== 'undefined'
  ? (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone')
  : []

// Precompute offsets once — recomputed when dropdown opens to reflect DST changes
const now = new Date()
const offsetMap = new Map<string, string>(
  allZones.map((zone) => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(now)
    const offset = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    return [zone, offset]
  }),
)

const search = ref(props.modelValue ?? '')
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

watch(() => props.modelValue, (v) => {
  if (!showDropdown.value)
    search.value = v ?? ''
})


function updateDropdownPosition() {
  const rect = inputRef.value?.getBoundingClientRect()
  if (!rect)
    return
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  }
}

type FilteredZone = { zone: string; offset: string; segments: Segment[] }

const filtered = computed((): FilteredZone[] => {
  const q = search.value.trim()
  if (!q) {
    return allZones.map(zone => ({
      zone,
      offset: offsetMap.get(zone) ?? '',
      segments: [{ text: zone, highlight: false }],
    }))
  }
  return allZones
    .map((zone) => {
      const offset = offsetMap.get(zone) ?? ''
      // match against zone name OR offset string (e.g. "-4", "GMT-4")
      const zoneMatch = fuzzyMatch(zone, q)
      const offsetMatch = fuzzyMatch(offset, q)
      const best = zoneMatch && offsetMatch
        ? (zoneMatch.score >= offsetMatch.score ? zoneMatch : null)
        : (zoneMatch ?? null)
      // if offset matched but zone didn't, still show with plain zone segments
      const match = best ?? (offsetMatch ? { score: offsetMatch.score, segments: [{ text: zone, highlight: false }] } : null)
      return { zone, offset, match }
    })
    .filter(e => e.match !== null)
    .sort((a, b) => b.match!.score - a.match!.score)
    .map(e => ({ zone: e.zone, offset: e.offset, segments: e.match!.segments }))
})

onClickOutside(wrapperRef, () => {
  showDropdown.value = false
  search.value = props.modelValue ?? ''
})

function select(zone: string) {
  emit('update:modelValue', zone)
  search.value = zone
  showDropdown.value = false
}

function clear() {
  emit('update:modelValue', '')
  search.value = ''
  inputRef.value?.focus()
}

function openDropdown() {
  updateDropdownPosition()
  showDropdown.value = true
  search.value = ''
}
</script>

<template>
  <div ref="wrapperRef" class="relative">
    <input
      ref="inputRef"
      v-model="search"
      type="text"
      class="w-full px-3 py-2 rounded-lg bg-elevated border border-border text-primary text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
      :class="modelValue ? 'pr-14' : 'pr-8'"
      :placeholder="showDropdown ? 'Search timezones...' : 'Server time (default)'"
      autocomplete="off"
      @input="showDropdown = true; updateDropdownPosition()"
      @focus="openDropdown"
      @keydown.esc.stop="showDropdown = false; search = modelValue ?? ''"
      @keydown.enter.prevent="filtered.length === 1 && select(filtered[0].zone)"
    />
    <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
      <button
        v-if="modelValue"
        class="cursor-pointer text-muted hover:text-primary transition-colors text-xs"
        title="Reset to server default"
        @mousedown.prevent="clear"
      >
        <FaIcon icon="xmark" />
      </button>
      <span class="pointer-events-none text-muted text-xs">
        <FaIcon :icon="showDropdown ? 'chevron-up' : 'chevron-down'" />
      </span>
    </div>
    <Teleport to="body">
      <div
        v-if="showDropdown && filtered.length"
        :style="dropdownStyle"
        class="rounded-lg border border-border bg-elevated shadow-lg overflow-hidden max-h-52 overflow-y-auto overscroll-contain"
      >
        <button
          v-for="entry in filtered"
          :key="entry.zone"
          class="w-full px-3 py-2 text-sm text-left hover:bg-surface transition-colors flex items-center justify-between gap-3"
          :class="modelValue === entry.zone ? 'bg-accent/10' : ''"
          @mousedown.prevent="select(entry.zone)"
        >
          <span :class="modelValue === entry.zone ? 'text-accent' : 'text-primary'">
            <span v-for="(seg, i) in entry.segments" :key="i" :class="seg.highlight ? 'text-accent font-semibold' : ''">{{ seg.text }}</span>
          </span>
          <span class="text-xs text-muted shrink-0">{{ entry.offset }}</span>
        </button>
      </div>
      <div
        v-else-if="showDropdown && search && !filtered.length"
        :style="dropdownStyle"
        class="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted"
      >No matching timezone</div>
    </Teleport>
  </div>
</template>

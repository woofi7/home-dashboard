<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LayoutSettings } from './SectionLayoutSettings.vue'

type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[]; layout?: LayoutSettings }

const props = defineProps<{
  group: BookmarkGroup
  edit: boolean
}>()

const visible = ref(false)
onMounted(() => nextTick(() => { visible.value = true }))

const emit = defineEmits<{
  update: [group: BookmarkGroup]
  dirty: []
  delete: []
}>()

const localGroup = ref<BookmarkGroup>(JSON.parse(JSON.stringify(props.group)))

watch(() => props.group, (v) => {
  if (!props.edit)
    localGroup.value = JSON.parse(JSON.stringify(v))
}, { deep: true })

const layout = computed({
  get: () => localGroup.value.layout ?? {},
  set: (v: LayoutSettings) => {
    localGroup.value.layout = v
    onUpdate()
  },
})

const { containerStyle, itemStyle: baseItemStyle, effective } = useLayoutSettings(layout)

const bookmarkContainerStyle = computed(() => ({
  ...containerStyle.value,
  alignItems: 'flex-start',
}))

const bookmarkItemStyle = computed(() => ({
  ...baseItemStyle.value,
  flex: effective.value.columns
    ? baseItemStyle.value.flex
    : '0 0 80px',
}))

const editSnapshot = ref<BookmarkGroup | null>(null)
const pendingDeleteNames = ref<Set<string>>(new Set())

watch(() => props.edit, (editing) => {
  if (editing) {
    editSnapshot.value = JSON.parse(JSON.stringify(props.group))
    pendingDeleteNames.value = new Set()
  } else {
    editSnapshot.value = null
    pendingDeleteNames.value = new Set()
  }
}, { immediate: true })

function onUpdate() {
  emit('update', {
    ...localGroup.value,
    bookmarks: localGroup.value.bookmarks.filter(b => !pendingDeleteNames.value.has(b.name)),
  })
  emit('dirty')
}

const pendingItems = computed(() => {
  if (!props.edit || !editSnapshot.value)
    return new Set<string>()
  const original = new Map(editSnapshot.value.bookmarks.map(b => [b.name, JSON.stringify(b)]))
  return new Set(
    localGroup.value.bookmarks
      .filter(b => !pendingDeleteNames.value.has(b.name))
      .filter(b => !original.has(b.name) || original.get(b.name) !== JSON.stringify(b))
      .map(b => b.name)
  )
})

const dragging = ref(false)

const { data: clicks, refresh: refreshClicks } = useFetch<Record<string, number>>('/api/bookmarks/clicks')

async function trackClick(name: string) {
  await $fetch('/api/bookmarks/clicks', { method: 'POST', body: { name } })
  refreshClicks()
}

const editingBookmark = ref<Bookmark | null>(null)
const showModal = ref(false)

function revertBookmark(name: string) {
  if (pendingDeleteNames.value.has(name)) {
    pendingDeleteNames.value = new Set([...pendingDeleteNames.value].filter(n => n !== name))
    onUpdate()
    return
  }
  if (!editSnapshot.value)
    return
  const idx = localGroup.value.bookmarks.findIndex(b => b.name === name)
  if (idx === -1)
    return
  const original = editSnapshot.value.bookmarks.find(b => b.name === name)
    ?? editSnapshot.value.bookmarks[idx]
  if (original) {
    localGroup.value.bookmarks[idx] = JSON.parse(JSON.stringify(original))
  } else {
    localGroup.value.bookmarks.splice(idx, 1)
  }
  onUpdate()
}

function openAdd() { editingBookmark.value = null; showModal.value = true }
function openEdit(b: Bookmark) { editingBookmark.value = b; showModal.value = true }
function deleteBookmark(b: Bookmark) {
  pendingDeleteNames.value = new Set([...pendingDeleteNames.value, b.name])
  onUpdate()
}
function save(updated: Bookmark) {
  if (editingBookmark.value) {
    const idx = localGroup.value.bookmarks.findIndex((b) => b.name === editingBookmark.value!.name)
    if (idx !== -1)
      localGroup.value.bookmarks[idx] = updated
  } else {
    localGroup.value.bookmarks.push(updated)
  }
  onUpdate()
  showModal.value = false
}

function faviconUrl(url: string) {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  } catch {
    return null
  }
}
</script>

<template>
  <div
    class="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-4 transition-[opacity,transform] duration-[400ms] ease-out"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
  >
    <!-- Header -->
    <div class="flex items-center gap-2 mb-4">
      <span v-if="edit" class="section-handle cursor-grab text-muted select-none">⠿</span>
      <span class="text-xs font-semibold text-secondary uppercase tracking-widest flex-1">{{ group.name }}</span>
      <template v-if="edit">
        <SectionLayoutSettings v-model="layout" />
        <button class="text-xs text-danger" @click="$emit('delete')">Remove</button>
      </template>
    </div>

    <!-- Bookmark cards -->
    <VueDraggable
      v-model="localGroup.bookmarks"
      :disabled="!edit"
      :group="{ name: 'bookmarks', pull: true, put: true }"
      :animation="300"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      handle=".bookmark-handle"
      item-key="name"
      :style="{ ...bookmarkContainerStyle, minHeight: '48px' }"
      @start="dragging = true"
      @end="dragging = false; onUpdate()"
    >
      <component
        v-for="b in localGroup.bookmarks"
        :is="edit ? 'div' : 'a'"
        :key="b.name"
        :style="bookmarkItemStyle"
        v-bind="edit ? {} : { href: b.url, target: '_blank', rel: 'noopener' }"
        class="group/bm relative flex flex-col items-center gap-1.5 transition-opacity"
        @click="!edit && trackClick(b.name)"
        :class="[
          edit ? 'cursor-default' : 'cursor-pointer',
          pendingDeleteNames.has(b.name) ? 'opacity-40' : '',
        ]"
      >
        <div
          class="aspect-square w-full rounded-xl bg-black/60 border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors overflow-hidden relative"
          :class="pendingDeleteNames.has(b.name) ? 'border-danger/70' : pendingItems.has(b.name) ? 'border-warning/60' : 'border-border'"
        >
          <img
            :src="b.icon || faviconUrl(b.url) || ''"
            :alt="b.name"
            class="w-3/5 h-3/5 object-contain"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          <span v-if="clicks?.[b.name]" class="absolute top-1 right-1.5 text-[9px] text-white/40 tabular-nums leading-none">{{ clicks[b.name] }}</span>
        </div>
        <span class="text-[11px] text-muted text-center leading-tight line-clamp-2 w-full px-0.5">{{ b.name }}</span>

        <span v-if="edit && !pendingDeleteNames.has(b.name)" class="bookmark-handle absolute top-1 left-1 cursor-grab text-muted select-none text-sm z-20 transition-opacity" :class="dragging ? 'opacity-0' : 'opacity-0 group-hover/bm:opacity-100'">⠿</span>

        <div v-if="edit" class="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-opacity z-10 bg-black/40" :class="dragging ? 'opacity-0' : 'opacity-0 group-hover/bm:opacity-100'">
          <template v-if="pendingDeleteNames.has(b.name)">
            <button
              class="cursor-pointer h-9 px-3 rounded-lg bg-elevated border border-warning/40 flex items-center gap-1.5 text-warning hover:border-warning transition-colors shadow-md shadow-black/30 text-xs font-medium"
              @click="revertBookmark(b.name)"
            >↺ Restore</button>
          </template>
          <template v-else>
            <div class="flex gap-2">
              <button
                class="cursor-pointer w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-muted hover:text-accent-hover hover:border-accent transition-colors shadow-md shadow-black/30"
                @click="openEdit(b)"
              >✎</button>
              <button
                class="cursor-pointer w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-muted hover:text-danger hover:border-danger transition-colors shadow-md shadow-black/30"
                @click="deleteBookmark(b)"
              >✕</button>
            </div>
            <button
              v-if="pendingItems.has(b.name)"
              class="cursor-pointer h-6 px-2 rounded-md bg-elevated border border-warning/40 flex items-center gap-1 text-warning hover:border-warning transition-colors shadow-md shadow-black/30 text-xs"
              @click="revertBookmark(b.name)"
            >↺ Revert</button>
          </template>
        </div>
      </component>
    </VueDraggable>

    <button
      v-if="edit"
      class="cursor-pointer mt-3 w-full rounded-lg border border-dashed border-border hover:border-accent text-muted hover:text-accent-hover text-sm py-2 transition-colors"
      @click="openAdd"
    >+ Add</button>
  </div>

  <BookmarkModal v-if="showModal" :bookmark="editingBookmark" @save="save" @close="showModal = false" />
</template>

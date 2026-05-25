<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LayoutSettings } from './SectionLayoutSettings.vue'

type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[]; layout?: LayoutSettings }

const props = defineProps<{ group: BookmarkGroup; edit: boolean }>()
const emit = defineEmits<{ update: [group: BookmarkGroup]; dirty: []; delete: [] }>()

const visible = ref(false)
onMounted(() => nextTick(() => { visible.value = true }))

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

const bookmarkContainerStyle = computed(() => ({ ...containerStyle.value, alignItems: 'flex-start' }))
const bookmarkItemStyle = computed(() => ({
  ...baseItemStyle.value,
  flex: effective.value.columns ? baseItemStyle.value.flex : '0 0 80px',
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
const { data: config } = useFetch<{ settings?: { bookmarkCounterEnabled?: boolean } }>('/api/config')
const counterEnabled = computed(() => config.value?.settings?.bookmarkCounterEnabled !== false)

async function trackClick(name: string) {
  if (!counterEnabled.value)
    return
  await $fetch('/api/bookmarks/clicks', { method: 'POST', body: { name } })
  await refreshClicks()
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
    const idx = localGroup.value.bookmarks.findIndex(b => b.name === editingBookmark.value!.name)
    if (idx !== -1)
      localGroup.value.bookmarks[idx] = updated
  } else {
    localGroup.value.bookmarks.push(updated)
  }
  onUpdate()
  showModal.value = false
}
</script>

<template>
  <div
    class="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-4 transition-[opacity,transform] duration-400 ease-out"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
  >
    <div class="flex items-center gap-2 mb-4">
      <span v-if="edit" class="section-handle cursor-grab text-muted select-none"><FaIcon icon="grip-vertical" /></span>
      <span class="text-xs font-semibold text-secondary uppercase tracking-widest flex-1">{{ group.name }}</span>
      <template v-if="edit">
        <SectionLayoutSettings v-model="layout" />
        <button class="text-xs text-danger" @click="$emit('delete')">Remove</button>
      </template>
    </div>

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
      <BookmarkItem
        v-for="b in localGroup.bookmarks"
        :key="b.name"
        :style="bookmarkItemStyle"
        :bookmark="b"
        :edit="edit"
        :pending="pendingItems.has(b.name)"
        :pending-delete="pendingDeleteNames.has(b.name)"
        :dragging="dragging"
        :click-count="counterEnabled ? clicks?.[b.name] : undefined"
        @click="trackClick(b.name)"
        @edit="openEdit(b)"
        @delete="deleteBookmark(b)"
        @restore="revertBookmark(b.name)"
      />
    </VueDraggable>

    <button
      v-if="edit"
      class="cursor-pointer mt-3 w-full rounded-lg border border-dashed border-white/30 bg-black/20 backdrop-blur-sm hover:border-accent text-white/60 hover:text-accent-hover text-sm py-2 transition-colors"
      @click="openAdd"
    >+ Add</button>
  </div>

  <BookmarkModal v-if="showModal" :bookmark="editingBookmark" @save="save" @close="showModal = false" />
</template>

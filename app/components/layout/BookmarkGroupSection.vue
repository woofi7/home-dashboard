<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { VueDraggable } from 'vue-draggable-plus'
import { useBookmarkClicksStore } from '~/stores/bookmarkClicks'
import type { LayoutSettings } from './SectionLayoutSettings.vue'

type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[]; layout?: LayoutSettings }

const props = defineProps<{ group: BookmarkGroup; edit: boolean; existingNames?: string[] }>()
const emit = defineEmits<{ update: [group: BookmarkGroup]; dirty: []; delete: [] }>()

const { sectionStyle } = useAppearanceSettings()

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
const collapsed = ref(false)
const { settings } = useGlobalSettings()
const clicksStore = useBookmarkClicksStore()
const { clicks } = storeToRefs(clicksStore)
const counterEnabled = computed(() => settings.value?.bookmarkCounterEnabled !== false)
const autoSortEnabled = computed(() => settings.value?.bookmarkAutoSort === true)

const displayBookmarks = computed(() => {
  if (!autoSortEnabled.value)
    return localGroup.value.bookmarks
  const clks = clicks.value ?? {}
  return [...localGroup.value.bookmarks].sort((a, b) => (clks[b.name] ?? 0) - (clks[a.name] ?? 0))
})

async function trackClick(name: string) {
  if (!counterEnabled.value)
    return
  await clicksStore.increment(name)
}

const editingName = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const draftName = ref('')
const nameError = ref('')

function startRename() {
  draftName.value = localGroup.value.name
  nameError.value = ''
  editingName.value = true
  nextTick(() => nameInput.value?.select())
}

function confirmRename() {
  const trimmed = draftName.value.trim()
  if (!trimmed)
    return
  const others = (props.existingNames ?? []).filter(n => n !== localGroup.value.name)
  if (others.includes(trimmed)) {
    nameError.value = 'Name already used'
    return
  }
  if (trimmed !== localGroup.value.name) {
    localGroup.value.name = trimmed
    onUpdate()
  }
  editingName.value = false
  nameError.value = ''
}

function cancelRename() {
  editingName.value = false
  nameError.value = ''
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
    class="rounded-xl border border-border transition-[opacity,transform] duration-400 ease-out"
    :class="visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'"
    :style="sectionStyle"
  >
    <div class="flex items-center gap-2 px-4 py-2 border-b border-border">
      <span v-if="edit" class="section-handle cursor-grab text-muted select-none rounded p-1 -m-1 hover:bg-elevated hover:text-primary transition-colors"><FaIcon icon="grip-vertical" /></span>
      <template v-if="edit && editingName">
        <input
          ref="nameInput"
          v-model="draftName"
          class="bg-transparent border-b text-xs font-semibold text-secondary uppercase tracking-widest outline-none"
          :class="nameError ? 'border-danger' : 'border-accent'"
          @blur="confirmRename"
          @keydown.enter.prevent="confirmRename"
          @keydown.escape.prevent="cancelRename"
        />
        <span v-if="nameError" class="text-[10px] text-danger ml-1">{{ nameError }}</span>
        <span class="flex-1" />
      </template>
      <template v-else>
        <span class="text-xs font-semibold text-secondary uppercase tracking-widest">{{ group.name }}</span>
        <button v-if="edit" class="text-muted hover:text-primary ml-1" @click="startRename"><FaIcon icon="pencil" class="text-xs" /></button>
        <span class="flex-1" />
      </template>
      <template v-if="edit">
        <SectionLayoutSettings v-model="layout" />
        <button class="text-xs text-danger" @click="$emit('delete')">Remove</button>
      </template>
      <button class="text-muted hover:text-secondary ml-1" @click="collapsed = !collapsed">
        <FaIcon icon="chevron-down" class="text-xs transition-transform" :class="collapsed ? '-rotate-90' : ''" />
      </button>
    </div>

    <div v-show="!collapsed" class="p-4">
      <template v-if="edit">
        <VueDraggable
          v-model="localGroup.bookmarks"
          :group="{ name: 'bookmarks', pull: true, put: true }"
          :animation="300"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          handle=".bookmark-handle"
          item-key="name"
          :style="{ ...bookmarkContainerStyle, minHeight: '48px' }"
          @start="dragging = true"
          @end="dragging = false; onUpdate()"
          @add="onUpdate()"
        >
          <BookmarkItem
            v-for="b in localGroup.bookmarks"
            :key="b.name"
            :style="bookmarkItemStyle"
            :bookmark="b"
            :edit="true"
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
          class="cursor-pointer mt-3 w-full rounded-lg border border-dashed border-border hover:border-accent text-muted hover:text-accent-hover text-sm py-2 transition-colors"
          @click="openAdd"
        >+ Add</button>
      </template>
      <template v-else>
        <div :style="{ ...bookmarkContainerStyle, minHeight: '48px' }">
          <BookmarkItem
            v-for="b in displayBookmarks"
            :key="b.name"
            :style="bookmarkItemStyle"
            :bookmark="b"
            :edit="false"
            :pending="false"
            :pending-delete="false"
            :dragging="false"
            :click-count="counterEnabled ? clicks?.[b.name] : undefined"
            @click="trackClick(b.name)"
          />
        </div>
      </template>
    </div>
  </div>

  <BookmarkModal v-if="showModal" :bookmark="editingBookmark" @save="save" @close="showModal = false" />
</template>

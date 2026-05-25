<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }
type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }
type Config = { services: ServiceGroup[]; bookmarks: BookmarkGroup[]; widgets: Record<string, unknown>[]; settings: Record<string, unknown> }
type SectionEntry = { type: 'service' | 'bookmark'; name: string }

const props = defineProps<{
  sectionOrder: SectionEntry[]
  localConfig: Config
  editActive: boolean
  configLoaded: boolean
}>()

const emit = defineEmits<{
  'update:sectionOrder': [order: SectionEntry[]]
  'update-service-group': [name: string, group: ServiceGroup]
  'update-bookmark-group': [name: string, group: BookmarkGroup]
  'delete-service-group': [name: string]
  'delete-bookmark-group': [name: string]
  'add-service-group': [name: string]
  'add-bookmark-group': [name: string]
  'request-edit': []
  dirty: []
}>()

const localOrder = computed({
  get: () => props.sectionOrder,
  set: (v) => emit('update:sectionOrder', v),
})

function getServiceGroup(name: string) {
  return props.localConfig.services.find(g => g.name === name)
}
function getBookmarkGroup(name: string) {
  return props.localConfig.bookmarks.find(g => g.name === name)
}

// Inline add-group state
type AddMode = 'service' | 'bookmark' | null
const addMode = ref<AddMode>(null)
const addName = ref('')

function startAdd(mode: 'service' | 'bookmark') {
  addMode.value = mode
  addName.value = ''
  nextTick(() => {
    const el = document.getElementById('add-section-input')
    el?.focus()
  })
}

function confirmAdd() {
  const name = addName.value.trim()
  if (!name)
    return
  if (addMode.value === 'service')
    emit('add-service-group', name)
  else if (addMode.value === 'bookmark')
    emit('add-bookmark-group', name)
  addMode.value = null
  addName.value = ''
}

function cancelAdd() {
  addMode.value = null
  addName.value = ''
}

function onAddKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter')
    confirmAdd()
  else if (e.key === 'Escape')
    cancelAdd()
}
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="!configLoaded" class="px-4 md:px-6 pt-6 pb-28 space-y-6">
    <div v-for="i in 3" :key="i" class="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md animate-pulse">
      <div class="h-10 border-b border-white/10 px-4 flex items-center gap-2">
        <div class="h-3 w-24 rounded bg-white/10" />
      </div>
      <div class="p-3 flex flex-wrap gap-2">
        <div v-for="j in 6" :key="j" class="h-16 rounded-lg bg-white/10 flex-1 min-w-[120px]" />
      </div>
    </div>
  </div>

  <!-- Loaded: empty state -->
  <div v-else-if="!sectionOrder.length" class="px-4 md:px-6 pt-6 pb-28">
    <div class="rounded-xl border border-dashed border-white/15 bg-white/3 p-12 flex flex-col items-center gap-4 text-center">
      <p class="text-white/40 text-sm">No sections yet</p>
      <div v-if="!editActive" class="flex flex-col items-center gap-3 mt-2">
        <p class="text-white/30 text-xs">Click Edit to add your first service section or bookmark group.</p>
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          @click="$emit('request-edit')"
        >Edit</button>
      </div>
      <div v-else class="flex flex-col sm:flex-row gap-2 mt-2">
        <button
          class="px-4 py-2 rounded-lg border border-white/30 bg-black/20 backdrop-blur-sm text-sm text-white/60 hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('service')"
        >+ Service section</button>
        <button
          class="px-4 py-2 rounded-lg border border-white/30 bg-black/20 backdrop-blur-sm text-sm text-white/60 hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('bookmark')"
        >+ Bookmark group</button>
      </div>
      <!-- Inline name input -->
      <div v-if="addMode" class="flex items-center gap-2 mt-1">
        <input
          id="add-section-input"
          v-model="addName"
          :placeholder="addMode === 'service' ? 'Section name' : 'Group name'"
          class="px-3 py-1.5 rounded-lg bg-elevated border border-border text-sm text-primary outline-none focus:border-accent w-48"
          @keydown="onAddKeydown"
        />
        <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors" @click="confirmAdd">Add</button>
        <button class="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-primary transition-colors" @click="cancelAdd">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Loaded: sections -->
  <div v-else>
    <VueDraggable
      v-model="localOrder"
      :disabled="!editActive"
      handle=".section-handle"
      :animation="300"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      item-key="name"
      class="px-4 md:px-6 pt-6 space-y-6"
      @end="$emit('dirty')"
    >
      <template v-for="item in sectionOrder" :key="item.type + ':' + item.name">
        <ServiceGroupSection
          v-if="item.type === 'service' && getServiceGroup(item.name)"
          :group="getServiceGroup(item.name)!"
          :edit="editActive"
          @update="$emit('update-service-group', item.name, $event)"
          @dirty="$emit('dirty')"
          @delete="$emit('delete-service-group', item.name)"
        />
        <BookmarkGroupSection
          v-else-if="item.type === 'bookmark' && getBookmarkGroup(item.name)"
          :group="getBookmarkGroup(item.name)!"
          :edit="editActive"
          @update="$emit('update-bookmark-group', item.name, $event)"
          @dirty="$emit('dirty')"
          @delete="$emit('delete-bookmark-group', item.name)"
        />
      </template>
    </VueDraggable>

    <!-- Add section buttons (bottom of list, edit mode only) -->
    <div v-if="editActive" class="px-4 md:px-6 pt-4 pb-28">
      <div v-if="!addMode" class="flex gap-2">
        <button
          class="px-3 py-1.5 rounded-lg border border-dashed border-white/30 bg-black/20 backdrop-blur-sm text-xs text-white/60 hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('service')"
        >+ Service section</button>
        <button
          class="px-3 py-1.5 rounded-lg border border-dashed border-white/30 bg-black/20 backdrop-blur-sm text-xs text-white/60 hover:border-accent hover:text-accent transition-colors"
          @click="startAdd('bookmark')"
        >+ Bookmark group</button>
      </div>
      <div v-else class="flex items-center gap-2">
        <input
          id="add-section-input"
          v-model="addName"
          :placeholder="addMode === 'service' ? 'Section name' : 'Group name'"
          class="px-3 py-1.5 rounded-lg bg-elevated border border-border text-sm text-primary outline-none focus:border-accent w-48"
          @keydown="onAddKeydown"
        />
        <button class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors" @click="confirmAdd">Add</button>
        <button class="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-primary transition-colors" @click="cancelAdd">Cancel</button>
      </div>
    </div>
    <div v-else class="pb-28" />
  </div>
</template>

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
}>()

const emit = defineEmits<{
  'update:sectionOrder': [order: SectionEntry[]]
  'update-service-group': [name: string, group: ServiceGroup]
  'update-bookmark-group': [name: string, group: BookmarkGroup]
  'delete-service-group': [name: string]
  'delete-bookmark-group': [name: string]
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
</script>

<template>
  <div v-if="!sectionOrder.length" class="px-4 md:px-6 pt-6 pb-28 space-y-6">
    <div v-for="i in 3" :key="i" class="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md animate-pulse">
      <div class="h-10 border-b border-white/10 px-4 flex items-center gap-2">
        <div class="h-3 w-24 rounded bg-white/10" />
      </div>
      <div class="p-3 flex flex-wrap gap-2">
        <div v-for="j in 6" :key="j" class="h-16 rounded-lg bg-white/10 flex-1 min-w-[120px]" />
      </div>
    </div>
  </div>
  <VueDraggable
    v-else
    v-model="localOrder"
    :disabled="!editActive"
    handle=".section-handle"
    :animation="300"
    ghost-class="drag-ghost"
    chosen-class="drag-chosen"
    item-key="name"
    class="px-4 md:px-6 pt-6 pb-28 space-y-6"
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
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })
import { VueDraggable } from 'vue-draggable-plus'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }
type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }

const { data: config, refresh } = useFetch('/api/config', { lazy: true })
const { data: background } = useFetch('/api/background', { lazy: true })
const { data: weather } = useFetch('/api/weather', { lazy: true })
const { data: calendar } = useFetch('/api/calendar', { lazy: true })

const now = ref(new Date())
onMounted(() => { setInterval(() => { now.value = new Date() }, 1000) })
const timeStr = computed(() => now.value.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
const dateStr = computed(() => now.value.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
const fullLoaded = ref(false)
if (import.meta.client) {
  watch(() => (background.value as Record<string, string> | null)?.full, (url) => {
    if (!url) return
    const img = new Image()
    img.onload = () => { fullLoaded.value = true }
    img.src = url
  }, { immediate: true })
}

const localConfig = ref<{
  settings: Record<string, unknown>
  services: ServiceGroup[]
  bookmarks: BookmarkGroup[]
  widgets: Record<string, unknown>[]
}>({ services: [], bookmarks: [], widgets: [], settings: {} })

const { active: editActive, dirty, snapshot, enter, exit } = useEditMode()
const { countdown, forceRefresh } = useWidgetRefresh()

const pendingCount = computed(() => {
  if (!editActive.value || !snapshot.value) return 0
  let count = 0
  for (const snapGroup of snapshot.value.services as ServiceGroup[]) {
    const curGroup = localConfig.value.services.find(g => g.name === snapGroup.name)
    if (!curGroup) { count += snapGroup.services.length; continue }
    const cur = new Map(curGroup.services.map(s => [s.name, JSON.stringify(s)]))
    const snap = new Map(snapGroup.services.map(s => [s.name, JSON.stringify(s)]))
    count += curGroup.services.filter(s => !snap.has(s.name) || snap.get(s.name) !== JSON.stringify(s)).length
    count += snapGroup.services.filter(s => !cur.has(s.name)).length
  }
  count += localConfig.value.services.filter(g => !(snapshot.value!.services as ServiceGroup[]).find(sg => sg.name === g.name)).reduce((a, g) => a + g.services.length, 0)
  for (const snapGroup of snapshot.value.bookmarks as BookmarkGroup[]) {
    const curGroup = localConfig.value.bookmarks.find(g => g.name === snapGroup.name)
    if (!curGroup) { count += snapGroup.bookmarks.length; continue }
    const cur = new Map(curGroup.bookmarks.map(b => [b.name, JSON.stringify(b)]))
    const snap = new Map(snapGroup.bookmarks.map(b => [b.name, JSON.stringify(b)]))
    count += curGroup.bookmarks.filter(b => !snap.has(b.name) || snap.get(b.name) !== JSON.stringify(b)).length
    count += snapGroup.bookmarks.filter(b => !cur.has(b.name)).length
  }
  count += localConfig.value.bookmarks.filter(g => !(snapshot.value!.bookmarks as BookmarkGroup[]).find(sg => sg.name === g.name)).reduce((a, g) => a + g.bookmarks.length, 0)
  return count
})

const sectionOrder = ref<Array<{ type: 'service' | 'bookmark'; name: string }>>([])

watch(config, (v) => {
  if (!v || editActive.value) return
  localConfig.value = JSON.parse(JSON.stringify(v))
  sectionOrder.value = buildDefaultOrder()
}, { immediate: true })

function buildDefaultOrder() {
  const saved = localConfig.value.settings?.sectionOrder as Array<{ type: string; name: string }> | undefined
  if (saved?.length) return saved as Array<{ type: 'service' | 'bookmark'; name: string }>
  return [
    ...localConfig.value.services.map((g) => ({ type: 'service' as const, name: g.name })),
    ...localConfig.value.bookmarks.map((g) => ({ type: 'bookmark' as const, name: g.name })),
  ]
}

function getServiceGroup(name: string) {
  return localConfig.value.services.find((g) => g.name === name)
}
function getBookmarkGroup(name: string) {
  return localConfig.value.bookmarks.find((g) => g.name === name)
}

function updateServiceGroup(name: string, updated: ServiceGroup) {
  const idx = localConfig.value.services.findIndex((g) => g.name === name)
  if (idx !== -1) localConfig.value.services[idx] = updated
  dirty.value = true
}

function updateBookmarkGroup(name: string, updated: BookmarkGroup) {
  const idx = localConfig.value.bookmarks.findIndex((g) => g.name === name)
  if (idx !== -1) localConfig.value.bookmarks[idx] = updated
  dirty.value = true
}

function deleteServiceGroup(name: string) {
  localConfig.value.services = localConfig.value.services.filter((g) => g.name !== name)
  sectionOrder.value = sectionOrder.value.filter((s) => !(s.type === 'service' && s.name === name))
  dirty.value = true
}

function deleteBookmarkGroup(name: string) {
  localConfig.value.bookmarks = localConfig.value.bookmarks.filter((g) => g.name !== name)
  sectionOrder.value = sectionOrder.value.filter((s) => !(s.type === 'bookmark' && s.name === name))
  dirty.value = true
}

async function save() {
  const serviceOrder = sectionOrder.value.filter((s) => s.type === 'service').map((s) => s.name)
  const bookmarkOrder = sectionOrder.value.filter((s) => s.type === 'bookmark').map((s) => s.name)

  const orderedServices = serviceOrder
    .map((name) => localConfig.value.services.find((g) => g.name === name))
    .filter(Boolean) as ServiceGroup[]
  const orderedBookmarks = bookmarkOrder
    .map((name) => localConfig.value.bookmarks.find((g) => g.name === name))
    .filter(Boolean) as BookmarkGroup[]

  await Promise.all([
    $fetch('/api/edit/services', { method: 'POST', body: { action: 'reorderGroups', groups: orderedServices } }),
    $fetch('/api/edit/bookmarks', { method: 'POST', body: { action: 'reorderGroups', groups: orderedBookmarks } }),
    $fetch('/api/edit/settings', { method: 'POST', body: { sectionOrder: sectionOrder.value } }),
  ])
  await refresh()
  exit()
}

function handleCancel() {
  if (config.value) localConfig.value = JSON.parse(JSON.stringify(config.value))
  sectionOrder.value = buildDefaultOrder()
  exit()
}

useHead(computed(() => ({ title: (localConfig.value.settings?.title as string) || 'Dashboard' })))
</script>

<template>
  <div class="min-h-screen text-[var(--color-text-primary)] relative">
    <!-- Background: thumb loads first, full fades in on top -->
    <div
      v-if="background?.thumb"
      class="fixed inset-0 -z-10 bg-cover bg-center"
      :style="{ backgroundImage: `url(${background.thumb})` }"
    />
    <div
      v-if="background?.full"
      class="fixed inset-0 -z-10 bg-cover bg-center transition-opacity duration-[1500ms]"
      :class="fullLoaded ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url(${background.full})` }"
    />
    <div v-if="background?.thumb" class="fixed inset-0 -z-10 bg-black/40" />
    <a
      v-if="background?.author"
      :href="background.authorLink"
      target="_blank"
      rel="noopener"
      class="fixed bottom-2 right-2 text-[10px] text-white/30 hover:text-white/60 transition-colors z-10"
    >Photo by {{ background.author }} on Unsplash</a>
    <!-- Header: 3-column grid -->
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 px-4 md:px-6 pt-6 md:pt-8 pb-2 items-start">

      <!-- Left: Today's calendar events -->
      <div class="space-y-1.5 order-2 md:order-1">
        <Transition name="fade" mode="out-in">
        <div v-if="calendar === null" key="cal-ghost" class="space-y-2 animate-pulse">
          <div class="h-2.5 w-8 rounded bg-white/10 mb-3" />
          <div class="h-10 rounded-lg bg-white/10" />
          <div class="h-10 rounded-lg bg-white/10" />
          <div class="h-10 rounded-lg bg-white/10" />
        </div>
        <div v-else key="cal-real">
        <template v-if="(calendar as any)?.authorized">
          <p class="text-[10px] text-white/50 uppercase tracking-widest mb-2">Today</p>
          <!-- All-day events -->
          <a
            v-for="e in (calendar as any).todayAllDay"
            :key="e.id"
            :href="e.url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group"
          >
            <div class="w-1 self-stretch rounded-full bg-purple-400/70 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white/80 font-medium truncate">{{ e.summary }}</p>
              <p class="text-[10px] text-white/55">All day</p>
            </div>
            <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <!-- Timed events -->
          <a
            v-for="e in (calendar as any).todayTimed"
            :key="e.id"
            :href="e.url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/10 text-left hover:border-white/25 transition-colors no-underline group"
          >
            <div class="w-1 self-stretch rounded-full bg-[var(--color-accent)] shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white/80 font-medium truncate">{{ e.summary }}</p>
              <p class="text-[10px] text-white/55">{{ new Date(e.start).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }} – {{ new Date(e.end).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }}</p>
            </div>
            <svg class="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <p v-if="!(calendar as any).todayAllDay.length && !(calendar as any).todayTimed.length" class="text-xs text-white/50 italic">No events today</p>
          <!-- Tomorrow -->
          <template v-if="(calendar as any).tomorrow?.length">
            <p class="text-[10px] text-white/50 uppercase tracking-widest mt-3 mb-2">Tomorrow</p>
            <a
              v-for="e in (calendar as any).tomorrow"
              :key="'tmr-' + e.id"
              :href="e.url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/8 text-left hover:border-white/20 transition-colors no-underline group"
            >
              <div class="w-1 self-stretch rounded-full bg-white/25 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-xs text-white/70 font-medium truncate">{{ e.summary }}</p>
                <p class="text-[10px] text-white/45">{{ e.allDay ? 'All day' : `${new Date(e.start).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${new Date(e.end).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}` }}</p>
              </div>
              <svg class="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </template>
        </template>
        <a v-else-if="(calendar as any)?.authorized === false" href="/api/auth/google" class="text-xs text-white/30 hover:text-white/60 transition-colors">Connect Google Calendar →</a>
        </div>
        </Transition>
      </div>

      <!-- Center: Clock only -->
      <div class="flex flex-col items-center select-none text-center order-1 md:order-2 md:min-w-[280px]">
        <div class="text-[clamp(2.5rem,6vw,5rem)] font-light tracking-widest tabular-nums text-white [text-shadow:0_2px_24px_rgba(0,0,0,1),0_0_60px_rgba(0,0,0,0.8)]">{{ timeStr }}</div>
        <div class="text-sm text-white/80 mt-1 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">{{ dateStr }}</div>
      </div>

      <!-- Right: Weather card -->
      <div class="order-3">
        <Transition name="fade" mode="out-in">
        <div v-if="weather === null" key="wx-ghost" class="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 animate-pulse space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-white/10 shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-6 w-20 rounded-lg bg-white/10" />
              <div class="h-3 w-40 rounded bg-white/10" />
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <div v-for="i in 4" :key="i" class="flex-1 h-16 rounded-lg bg-white/10" />
          </div>
        </div>
        <div v-else key="wx-real" class="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
          <!-- Current conditions -->
          <a :href="(weather as any).url" target="_blank" rel="noopener"
            class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors no-underline group">
            <span class="text-3xl leading-none">{{ (weather as any).icon }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-2xl font-semibold text-white">{{ (weather as any).temp }}°C</span>
                <span class="text-sm text-white/70">{{ (weather as any).description }}</span>
              </div>
              <div class="text-[11px] text-white/55 mt-0.5">
                {{ (weather as any).city }} · Feels {{ (weather as any).feels }}° · 💧{{ (weather as any).humidity }}% · 💨 {{ (weather as any).wind }} km/h
              </div>
            </div>
            <svg class="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <!-- Later today -->
          <div v-if="(weather as any).laterToday?.length" class="border-t border-white/8 px-4 py-2">
            <p class="text-[9px] text-white/45 uppercase tracking-widest mb-2">Later today</p>
            <div class="flex gap-3 justify-between">
              <div
                v-for="h in (weather as any).laterToday"
                :key="h.time"
                class="flex flex-col items-center gap-0.5 text-center flex-1"
              >
                <span class="text-[10px] text-white/55">{{ h.time }}</span>
                <span class="text-base leading-none">{{ h.icon }}</span>
                <span class="text-xs font-medium text-white/80">{{ h.temp }}°</span>
                <span v-if="h.precip > 0" class="text-[9px] text-blue-300/60">{{ h.precip }}%</span>
              </div>
            </div>
          </div>
          <!-- Tomorrow -->
          <div v-if="(weather as any).tomorrow" class="border-t border-white/8 px-4 py-2.5 flex items-center gap-3">
            <p class="text-[9px] text-white/45 uppercase tracking-widest w-14 shrink-0">Tomorrow</p>
            <span class="text-xl leading-none">{{ (weather as any).tomorrow.icon }}</span>
            <span class="text-sm text-white/70">{{ (weather as any).tomorrow.description }}</span>
            <div class="ml-auto flex items-baseline gap-1.5 text-xs shrink-0">
              <span class="text-white/80 font-medium">{{ (weather as any).tomorrow.tempMax }}°</span>
              <span class="text-white/50">/ {{ (weather as any).tomorrow.tempMin }}°</span>
            </div>
            <div v-if="(weather as any).tomorrow.precip > 0" class="text-[10px] text-blue-300/60 shrink-0">{{ (weather as any).tomorrow.precip }}%</div>
          </div>
        </div>
        </Transition>
      </div>

    </div>

    <EditToggle
      :active="editActive"
      :dirty="dirty"
      :pending-count="pendingCount"
      :countdown="countdown"
      @edit="enter(localConfig)"
      @save="save"
      @rollback="handleCancel"
      @refresh="forceRefresh"
    />

    <div v-if="localConfig.widgets?.length" class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 px-4 md:px-6 pt-4">
      <GenericWidget
        v-for="widget in localConfig.widgets"
        :key="(widget as Record<string, unknown>).name as string"
        :widget="widget as Record<string, unknown>"
      />
    </div>

    <!-- Ghost section panels while config loads -->
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

    <!-- Unified draggable section list -->
    <VueDraggable
      v-else
      v-model="sectionOrder"
      :disabled="!editActive"
      handle=".section-handle"
      :animation="300"
      ghost-class="drag-ghost"
      chosen-class="drag-chosen"
      item-key="name"
      class="px-4 md:px-6 pt-6 pb-28 space-y-6"
      @end="dirty = true"
    >
      <template v-for="item in sectionOrder" :key="item.type + ':' + item.name">
        <ServiceGroupSection
          v-if="item.type === 'service' && getServiceGroup(item.name)"
          :group="getServiceGroup(item.name)!"
          :edit="editActive"
          @update="updateServiceGroup(item.name, $event)"
          @dirty="dirty = true"
          @delete="deleteServiceGroup(item.name)"
        />
        <BookmarkGroupSection
          v-else-if="item.type === 'bookmark' && getBookmarkGroup(item.name)"
          :group="getBookmarkGroup(item.name)!"
          :edit="editActive"
          @update="updateBookmarkGroup(item.name, $event)"
          @dirty="dirty = true"
          @delete="deleteBookmarkGroup(item.name)"
        />
      </template>
    </VueDraggable>

  </div>
</template>

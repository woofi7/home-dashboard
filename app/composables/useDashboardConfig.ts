import { storeToRefs } from 'pinia'
import { useConfigStore } from '~/stores/config'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }
type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }
type Config = {
  services: ServiceGroup[]
  bookmarks: BookmarkGroup[]
  widgets: Record<string, unknown>[]
  settings: Record<string, unknown>
}

// Item names present when editing began but gone from the saved payload: these
// were deleted on purpose, so the backend orphan guard must not recover them.
function removedItemNames<G>(original: G[], final: G[], items: (g: G) => Array<{ name: string }>): string[] {
  const finalNames = new Set(final.flatMap(g => items(g).map(i => i.name)))
  const originalNames = new Set(original.flatMap(g => items(g).map(i => i.name)))
  return [...originalNames].filter(n => !finalNames.has(n))
}

export function useDashboardConfig() {
  const { active: editActive, dirty, snapshot, enter, exit } = useEditMode()
  const configStore = useConfigStore()
  const { config } = storeToRefs(configStore)
  const refresh = () => configStore.refresh()
  const configLoaded = computed(() => configStore.loaded)

  const localConfig = ref<Config>({ services: [], bookmarks: [], widgets: [], settings: {} })
  const sectionOrder = ref<Array<{ type: 'service' | 'bookmark'; name: string }>>([])
  const saveError = ref('')

  function buildDefaultOrder() {
    const saved = localConfig.value.settings?.sectionOrder as Array<{ type: string; name: string }> | undefined
    if (saved?.length)
      return saved as Array<{ type: 'service' | 'bookmark'; name: string }>
    return [
      ...localConfig.value.services.map(g => ({ type: 'service' as const, name: g.name })),
      ...localConfig.value.bookmarks.map(g => ({ type: 'bookmark' as const, name: g.name })),
    ]
  }

  watch(config, (v) => {
    if (!v || editActive.value)
      return
    localConfig.value = JSON.parse(JSON.stringify(v))
    sectionOrder.value = buildDefaultOrder()
  }, { immediate: true })

  const pendingCount = computed(() => {
    if (!editActive.value || !snapshot.value)
      return 0
    let count = 0
    for (const snapGroup of snapshot.value.services as ServiceGroup[]) {
      const curGroup = localConfig.value.services.find(g => g.name === snapGroup.name)
      count += curGroup ? countListChanges(snapGroup.services, curGroup.services) : snapGroup.services.length
    }
    count += localConfig.value.services
      .filter(g => !(snapshot.value!.services as ServiceGroup[]).find(sg => sg.name === g.name))
      .reduce((a, g) => a + g.services.length, 0)
    for (const snapGroup of snapshot.value.bookmarks as BookmarkGroup[]) {
      const curGroup = localConfig.value.bookmarks.find(g => g.name === snapGroup.name)
      count += curGroup ? countListChanges(snapGroup.bookmarks, curGroup.bookmarks) : snapGroup.bookmarks.length
    }
    count += localConfig.value.bookmarks
      .filter(g => !(snapshot.value!.bookmarks as BookmarkGroup[]).find(sg => sg.name === g.name))
      .reduce((a, g) => a + g.bookmarks.length, 0)
    return count
  })

  function updateServiceGroup(name: string, updated: ServiceGroup) {
    const idx = localConfig.value.services.findIndex(g => g.name === name)
    if (idx !== -1)
      localConfig.value.services[idx] = updated
    if (updated.name !== name) {
      const orderIdx = sectionOrder.value.findIndex(s => s.type === 'service' && s.name === name)
      if (orderIdx !== -1)
        sectionOrder.value[orderIdx] = { type: 'service', name: updated.name }
    }
    dirty.value = true
  }
  function updateBookmarkGroup(name: string, updated: BookmarkGroup) {
    const idx = localConfig.value.bookmarks.findIndex(g => g.name === name)
    if (idx !== -1)
      localConfig.value.bookmarks[idx] = updated
    if (updated.name !== name) {
      const orderIdx = sectionOrder.value.findIndex(s => s.type === 'bookmark' && s.name === name)
      if (orderIdx !== -1)
        sectionOrder.value[orderIdx] = { type: 'bookmark', name: updated.name }
    }
    dirty.value = true
  }
  function deleteServiceGroup(name: string) {
    localConfig.value.services = localConfig.value.services.filter(g => g.name !== name)
    sectionOrder.value = sectionOrder.value.filter(s => !(s.type === 'service' && s.name === name))
    dirty.value = true
  }
  function deleteBookmarkGroup(name: string) {
    localConfig.value.bookmarks = localConfig.value.bookmarks.filter(g => g.name !== name)
    sectionOrder.value = sectionOrder.value.filter(s => !(s.type === 'bookmark' && s.name === name))
    dirty.value = true
  }
  function addServiceGroup(name: string) {
    localConfig.value.services.push({ name, services: [] })
    sectionOrder.value = [...sectionOrder.value, { type: 'service', name }]
    dirty.value = true
  }
  function addBookmarkGroup(name: string) {
    localConfig.value.bookmarks.push({ name, bookmarks: [] })
    sectionOrder.value = [...sectionOrder.value, { type: 'bookmark', name }]
    dirty.value = true
  }

  async function save() {
    saveError.value = ''
    const serviceOrder = sectionOrder.value.filter(s => s.type === 'service').map(s => s.name)
    const bookmarkOrder = sectionOrder.value.filter(s => s.type === 'bookmark').map(s => s.name)
    const orderedServices = serviceOrder.map(n => localConfig.value.services.find(g => g.name === n)).filter(Boolean) as ServiceGroup[]
    const orderedBookmarks = bookmarkOrder.map(n => localConfig.value.bookmarks.find(g => g.name === n)).filter(Boolean) as BookmarkGroup[]
    const deletedServices = removedItemNames(
      (snapshot.value?.services as ServiceGroup[]) ?? [], orderedServices, g => g.services,
    )
    const deletedBookmarks = removedItemNames(
      (snapshot.value?.bookmarks as BookmarkGroup[]) ?? [], orderedBookmarks, g => g.bookmarks,
    )
    try {
      await Promise.all([
        $fetch('/api/edit/services', { method: 'POST', body: { action: 'reorderGroups', groups: orderedServices, deleted: deletedServices } }),
        $fetch('/api/edit/bookmarks', { method: 'POST', body: { action: 'reorderGroups', groups: orderedBookmarks, deleted: deletedBookmarks } }),
        $fetch('/api/edit/settings', { method: 'POST', body: { sectionOrder: sectionOrder.value } }),
      ])
      await refresh()
      exit()
    } catch (err: unknown) {
      saveError.value = (err as { data?: { message?: string } })?.data?.message ?? (err as Error)?.message ?? 'Save failed'
    }
  }

  function handleCancel() {
    if (config.value)
      localConfig.value = JSON.parse(JSON.stringify(config.value))
    sectionOrder.value = buildDefaultOrder()
    exit()
  }

  return {
    localConfig, sectionOrder, saveError,
    editActive, dirty, enter, exit,
    pendingCount,
    updateServiceGroup, updateBookmarkGroup,
    deleteServiceGroup, deleteBookmarkGroup,
    addServiceGroup, addBookmarkGroup,
    configLoaded,
    save, handleCancel,
  }
}

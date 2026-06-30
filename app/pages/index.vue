<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { applyPalette, getPaletteById } from '~/utils/colorPalettes'
import { useViewStore } from '~/stores/view'
import { useConnectivityStore } from '~/stores/connectivity'
import { useConfigStore } from '~/stores/config'

definePageMeta({ ssr: false })

const viewStore = useViewStore()
const { weather, calendar, background, publictransit } = storeToRefs(viewStore)
const { online } = storeToRefs(useConnectivityStore())
const { config: dashConfig } = storeToRefs(useConfigStore())
useDashboardData()

function widgetEnabled(name: string): boolean {
  const s = dashConfig.value.settings?.[name] as { enabled?: boolean } | undefined
  return s?.enabled !== false
}

type CalTask = { id: string; listId: string; title: string; due?: string; url: string }
const pendingTask = ref<CalTask | null>(null)

function onCompleteTask(task: CalTask) {
  pendingTask.value = task
}

async function confirmCompleteTask() {
  const task = pendingTask.value
  pendingTask.value = null
  if (!task)
    return
  try {
    await viewStore.completeTask(task)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401)
      loginVisible.value = true
  }
}

const {
  localConfig, sectionOrder, saveError,
  editActive, dirty, enter, exit,
  pendingCount,
  updateServiceGroup, updateBookmarkGroup,
  deleteServiceGroup, deleteBookmarkGroup,
  addServiceGroup, addBookmarkGroup,
  configLoaded,
  save, handleCancel,
} = useDashboardConfig()

const { countdown, forceRefresh } = useWidgetRefresh()
const { show: changelogVisible, entry: changelogEntry, dismiss: dismissChangelog } = useChangelog()
const { tokenConfigured, editEnabled, needsLogin, authenticated, logout } = useAuth()
const version = useRuntimeConfig().public.version
const loginVisible = ref(false)
const setupVisible = ref(false)
const leaveConfirmVisible = ref(false)
const pendingRoute = ref('')

onBeforeRouteLeave((to) => {
  if (dirty.value) {
    pendingRoute.value = to.fullPath
    leaveConfirmVisible.value = true
    return false
  }
  exit()
})

function confirmLeave() {
  leaveConfirmVisible.value = false
  exit()
  navigateTo(pendingRoute.value)
}

function handleEdit() {
  if (!online.value)
    return
  if (!tokenConfigured.value) {
    setupVisible.value = true
    return
  }
  if (needsLogin.value) {
    loginVisible.value = true
    return
  }
  enter(localConfig.value)
}
function handleLoginSuccess() {
  loginVisible.value = false
  enter(localConfig.value)
}
function handleSetupSuccess() {
  setupVisible.value = false
  enter(localConfig.value)
}
async function handleLogout() {
  exit()
  await logout()
}

useHead(computed(() => ({ title: (localConfig.value.settings?.title as string) || 'Dashboard' })))

const bgAppearance = computed(() => {
  const bg = localConfig.value.settings?.background as Record<string, unknown> | undefined
  return {
    position: (bg?.position as string) ?? 'center',
    overlay: typeof bg?.overlay === 'number' ? bg.overlay : 40,
    blur: (bg?.blur as string) ?? 'none',
    fadeSpeed: (bg?.fadeSpeed as string) ?? 'normal',
    color: (bg?.color as string) ?? '#0f1117',
  }
})

const { settings: appearanceSettings } = useAppearanceSettings()

watch(() => localConfig.value.settings?.background, (bg) => {
  const b = bg as Record<string, unknown> | undefined
  appearanceSettings.value = {
    sectionStyle: (b?.sectionStyle as string) ?? 'glass',
    cardStyle:    (b?.cardStyle    as string) ?? 'dark',
  }
}, { immediate: true })

watch(
  () => [localConfig.value.settings?.colorPalette, localConfig.value.settings?.customPalette],
  ([id]) => {
    const custom = localConfig.value.settings?.customPalette as Record<string, string> | undefined
    applyPalette(getPaletteById((id as string) ?? 'indigo', custom))
  },
)

onMounted(() => {
  const custom = localConfig.value.settings?.customPalette as Record<string, string> | undefined
  applyPalette(getPaletteById((localConfig.value.settings?.colorPalette as string) ?? 'indigo', custom))
})
</script>

<template>
  <div class="min-h-screen text-primary relative">
    <DashboardBackground :background="background as any" :appearance="bgAppearance" />

    <OfflineBanner />

    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 px-4 md:px-6 pt-6 md:pt-8 pb-2 items-start">
      <CalendarPanel v-if="widgetEnabled('calendar')" :calendar="calendar as any" @complete="onCompleteTask" />
      <div v-else />
      <div class="flex flex-col gap-4 order-1 md:order-2">
        <div><ClockWidget :timezone="(localConfig.settings?.timezone as string) || undefined" /></div>
        <PublicTransitCard v-if="widgetEnabled('publictransit') && publictransit" :data="publictransit as any" />
      </div>
      <WeatherCard v-if="widgetEnabled('weather')" :weather="weather as any" />
    </div>

    <Transition name="fade">
      <div
        v-if="saveError"
        class="fixed bottom-16 md:bottom-20 right-4 md:right-6 z-50 px-4 py-2 rounded-xl bg-danger/90 text-white text-xs backdrop-blur-sm max-w-xs text-right"
      >{{ saveError }}</div>
    </Transition>

    <div class="fixed bottom-2 left-3 z-50 text-white/20 text-[10px] select-none pointer-events-none">
      {{ version }}
    </div>

    <EditToggle
      :active="editActive"
      :dirty="dirty"
      :pending-count="pendingCount"
      :countdown="countdown"
      :locked="needsLogin"
      :offline="!online"
      :authenticated="authenticated"
      @edit="handleEdit"
      @save="save"
      @rollback="handleCancel"
      @refresh="forceRefresh"
      @logout="handleLogout"
    />

    <ChangelogModal v-if="changelogVisible && changelogEntry" :entry="changelogEntry" @close="dismissChangelog" />
    <LoginModal v-if="loginVisible" @success="handleLoginSuccess" @close="loginVisible = false" />
    <SetupTokenModal v-if="setupVisible" @success="handleSetupSuccess" @close="setupVisible = false" />
    <ConfirmModal
      v-if="leaveConfirmVisible"
      message="You have unsaved changes. Leave and discard them?"
      @confirm="confirmLeave"
      @cancel="leaveConfirmVisible = false"
    />
    <ConfirmModal
      v-if="pendingTask"
      :message="`Mark &quot;${pendingTask.title.trim()}&quot; as complete?`"
      confirm-label="Complete"
      cancel-label="Cancel"
      tone="accent"
      @confirm="confirmCompleteTask"
      @cancel="pendingTask = null"
    />

    <div v-if="localConfig.widgets?.length" class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 px-4 md:px-6 pt-4">
      <GenericWidget
        v-for="widget in localConfig.widgets"
        :key="(widget as Record<string, unknown>).name as string"
        :widget="widget as Record<string, unknown>"
      />
    </div>

    <SectionList
      v-model:section-order="sectionOrder"
      :local-config="localConfig"
      :edit-active="editActive"
      :config-loaded="configLoaded"
      @update-service-group="updateServiceGroup"
      @update-bookmark-group="updateBookmarkGroup"
      @delete-service-group="deleteServiceGroup"
      @delete-bookmark-group="deleteBookmarkGroup"
      @add-service-group="addServiceGroup"
      @add-bookmark-group="addBookmarkGroup"
      @request-edit="handleEdit"
      @dirty="dirty = true"
    />
  </div>
</template>

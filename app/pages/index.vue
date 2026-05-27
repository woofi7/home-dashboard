<script setup lang="ts">
import { applyPalette, getPaletteById } from '~/utils/colorPalettes'

definePageMeta({ ssr: false })

const { data: background } = useFetch('/api/background', { lazy: true, server: false })
const { data: weather } = useFetch('/api/weather', { lazy: true, server: false })
const { data: calendar } = useFetch('/api/calendar', { lazy: true, server: false })

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
const { tokenConfigured, editEnabled, needsLogin, logout } = useAuth()
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
  () => localConfig.value.settings?.colorPalette,
  (id) => { applyPalette(getPaletteById((id as string) ?? 'indigo')) },
)

onMounted(() => {
  applyPalette(getPaletteById((localConfig.value.settings?.colorPalette as string) ?? 'indigo'))
})
</script>

<template>
  <div class="min-h-screen text-primary relative">
    <DashboardBackground :background="background as any" :appearance="bgAppearance" />

    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 px-4 md:px-6 pt-6 md:pt-8 pb-2 items-start">
      <CalendarPanel :calendar="calendar as any" />
      <ClockWidget :timezone="(localConfig.settings?.timezone as string) || undefined" />
      <WeatherCard :weather="weather as any" />
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
      @edit="handleEdit"
      @save="save"
      @rollback="handleCancel"
      @refresh="forceRefresh"
      @logout="handleLogout"
    />

    <LoginModal v-if="loginVisible" @success="handleLoginSuccess" @close="loginVisible = false" />
    <SetupTokenModal v-if="setupVisible" @success="handleSetupSuccess" @close="setupVisible = false" />
    <ConfirmModal
      v-if="leaveConfirmVisible"
      message="You have unsaved changes. Leave and discard them?"
      @confirm="confirmLeave"
      @cancel="leaveConfirmVisible = false"
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

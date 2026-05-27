<script setup lang="ts">
definePageMeta({ ssr: false, layout: 'admin', middleware: 'admin' })

watch([() => useAuth().editEnabled.value, () => useAuth().needsLogin.value], ([enabled, locked]) => {
  if (!enabled || locked) navigateTo('/')
})

type PanelState = { isDirty: boolean; saving: boolean; saveError: string; saveSuccess: boolean }

const palettePanel = ref()
const backgroundPanel = ref()

const paletteState = ref<PanelState>({ isDirty: false, saving: false, saveError: '', saveSuccess: false })
const backgroundState = ref<PanelState>({ isDirty: false, saving: false, saveError: '', saveSuccess: false })

const isDirty = computed(() => paletteState.value.isDirty || backgroundState.value.isDirty)
const saving = computed(() => paletteState.value.saving || backgroundState.value.saving)
const saveError = computed(() => paletteState.value.saveError || backgroundState.value.saveError)
const saveSuccess = computed(() => paletteState.value.saveSuccess || backgroundState.value.saveSuccess)

async function save() {
  const saves: Promise<void>[] = []
  if (paletteState.value.isDirty)
    saves.push(palettePanel.value.save())
  if (backgroundState.value.isDirty)
    saves.push(backgroundPanel.value.save())
  await Promise.all(saves)
}

function cancel() {
  palettePanel.value?.cancel()
  backgroundPanel.value?.cancel()
}
</script>

<template>
  <AdminSaveBar
    :is-dirty="isDirty"
    :saving="saving"
    :save-error="saveError"
    :save-success="saveSuccess"
    @save="save"
    @cancel="cancel"
  />
  <div class="px-4 md:px-6 py-6">
    <BackgroundPanel ref="backgroundPanel" @state="backgroundState = $event">
      <ColorPalettePanel ref="palettePanel" @state="paletteState = $event" />
    </BackgroundPanel>
  </div>
</template>

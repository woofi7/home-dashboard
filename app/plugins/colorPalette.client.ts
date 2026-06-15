import { applyPalette, getPaletteById } from '~/utils/colorPalettes'

export default defineNuxtPlugin(async () => {
  try {
    const { settings } = await $fetch<{ settings: Record<string, unknown> }>('/api/config')
    applyPalette(getPaletteById(
      (settings.colorPalette as string) ?? 'indigo',
      settings.customPalette as Record<string, string> | undefined,
    ))
  }
  catch {
    // no settings yet - use default
  }
})

import { applyPalette, getPaletteById } from '~/utils/colorPalettes'

export default defineNuxtPlugin(async () => {
  try {
    const settings = await $fetch<Record<string, unknown>>('/api/admin/settings')
    applyPalette(getPaletteById(
      (settings.colorPalette as string) ?? 'indigo',
      settings.customPalette as Record<string, string> | undefined,
    ))
  }
  catch {
    // no settings yet - use default
  }
})

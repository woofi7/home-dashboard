import { applyPalette, getPaletteById } from '~/utils/colorPalettes'

export default defineNuxtPlugin(async () => {
  try {
    // Read the palette from the public /api/config (credential-stripped) rather
    // than /api/admin/settings, which is now authenticated. This plugin runs
    // for every visitor before login, so it must not hit an admin endpoint.
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

export type AppearanceSettings = {
  sectionStyle: string
  cardStyle: string
}

const SECTION_STYLE_MAP: Record<string, Record<string, string>> = {
  glass:  { backgroundColor: 'color-mix(in srgb, var(--color-surface) 75%, transparent)', backdropFilter: 'blur(12px)' },
  dark:   { backgroundColor: 'var(--color-surface)' },
  darker: { backgroundColor: 'var(--color-base)' },
  none:   { backgroundColor: 'transparent' },
}

const CARD_STYLE_MAP: Record<string, Record<string, string>> = {
  glass:  { backgroundColor: 'color-mix(in srgb, var(--color-elevated) 70%, transparent)', backdropFilter: 'blur(4px)' },
  dark:   { backgroundColor: 'var(--color-elevated)' },
  darker: { backgroundColor: 'var(--color-base)' },
  none:   { backgroundColor: 'transparent' },
}

export function useAppearanceSettings() {
  const settings = useState<AppearanceSettings>('appearance-settings', () => ({
    sectionStyle: 'glass',
    cardStyle: 'dark',
  }))

  const sectionStyle = computed(() => SECTION_STYLE_MAP[settings.value.sectionStyle] ?? SECTION_STYLE_MAP.glass)
  const cardStyle = computed(() => CARD_STYLE_MAP[settings.value.cardStyle] ?? CARD_STYLE_MAP.dark)

  return { settings, sectionStyle, cardStyle }
}

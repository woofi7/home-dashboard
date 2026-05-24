export type AppearanceSettings = {
  sectionStyle: string
  cardStyle: string
}

const SECTION_STYLE_MAP: Record<string, Record<string, string>> = {
  glass:  { backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)' },
  dark:   { backgroundColor: 'rgba(0,0,0,0.5)' },
  darker: { backgroundColor: 'rgba(0,0,0,0.75)' },
  none:   { backgroundColor: 'transparent' },
}

const CARD_STYLE_MAP: Record<string, Record<string, string>> = {
  glass:  { backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' },
  dark:   { backgroundColor: 'rgba(0,0,0,0.6)' },
  darker: { backgroundColor: 'rgba(0,0,0,0.8)' },
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

import type { LayoutSettings } from '~/components/layout/SectionLayoutSettings.vue'

const GAP_MAP = { tight: '0.5rem', normal: '0.75rem', loose: '1.25rem' }

const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

const BASIS_MAP: Record<number, string> = {
  1: '100%',
  2: 'calc(50% - 0.5rem)',
  3: 'calc(33.333% - 0.5rem)',
  4: 'calc(25% - 0.5rem)',
  5: 'calc(20% - 0.5rem)',
  6: 'calc(16.666% - 0.5rem)',
  8: 'calc(12.5% - 0.5rem)',
}

export function useLayoutSettings(settings: Ref<LayoutSettings>) {
  const isMobile = useIsMobile()

  const effective = computed(() => {
    const m = settings.value.mobile
    if (isMobile.value && m) {
      return {
        columns: m.columns ?? settings.value.columns,
        gap: m.gap ?? settings.value.gap,
        justify: m.justify ?? settings.value.justify,
      }
    }
    return settings.value
  })

  const containerStyle = computed(() => ({
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: GAP_MAP[effective.value.gap ?? 'normal'],
    justifyContent: JUSTIFY_MAP[effective.value.justify ?? 'start'],
  }))

  const itemStyle = computed(() => ({
    flex: effective.value.columns
      ? `0 0 ${BASIS_MAP[effective.value.columns] ?? 'calc(25% - 0.5rem)'}`
      : '1 1 180px',
    minWidth: 0,
  }))

  return { containerStyle, itemStyle, effective }
}

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'

const isMobileRef: Ref<boolean> = ref(false)
vi.stubGlobal('useIsMobile', () => isMobileRef)

import { useLayoutSettings } from '../app/composables/useLayoutSettings'
import type { LayoutSettings } from '../app/components/layout/SectionLayoutSettings.vue'

function settings(overrides: Partial<LayoutSettings> = {}): Ref<LayoutSettings> {
  return ref<LayoutSettings>({ columns: 4, gap: 'normal', justify: 'start', ...overrides })
}

describe('useLayoutSettings — containerStyle gap', () => {
  it('tight gap', () => {
    const { containerStyle } = useLayoutSettings(settings({ gap: 'tight' }))
    expect(containerStyle.value.gap).toBe('0.5rem')
  })

  it('normal gap', () => {
    const { containerStyle } = useLayoutSettings(settings({ gap: 'normal' }))
    expect(containerStyle.value.gap).toBe('0.75rem')
  })

  it('loose gap', () => {
    const { containerStyle } = useLayoutSettings(settings({ gap: 'loose' }))
    expect(containerStyle.value.gap).toBe('1.25rem')
  })
})

describe('useLayoutSettings — containerStyle justify', () => {
  it('start → flex-start', () => {
    const { containerStyle } = useLayoutSettings(settings({ justify: 'start' }))
    expect(containerStyle.value.justifyContent).toBe('flex-start')
  })

  it('center → center', () => {
    const { containerStyle } = useLayoutSettings(settings({ justify: 'center' }))
    expect(containerStyle.value.justifyContent).toBe('center')
  })

  it('end → flex-end', () => {
    const { containerStyle } = useLayoutSettings(settings({ justify: 'end' }))
    expect(containerStyle.value.justifyContent).toBe('flex-end')
  })

  it('between → space-between', () => {
    const { containerStyle } = useLayoutSettings(settings({ justify: 'between' }))
    expect(containerStyle.value.justifyContent).toBe('space-between')
  })
})

describe('useLayoutSettings — containerStyle structure', () => {
  it('always sets display flex and flexWrap wrap', () => {
    const { containerStyle } = useLayoutSettings(settings())
    expect(containerStyle.value.display).toBe('flex')
    expect(containerStyle.value.flexWrap).toBe('wrap')
  })
})

describe('useLayoutSettings — itemStyle column basis', () => {
  it('1 column → 100%', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: 1 }))
    expect(itemStyle.value.flex).toContain('100%')
  })

  it('2 columns → ~50%', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: 2 }))
    expect(itemStyle.value.flex).toContain('calc(50%')
  })

  it('3 columns → ~33%', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: 3 }))
    expect(itemStyle.value.flex).toContain('calc(33.333%')
  })

  it('4 columns → ~25%', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: 4 }))
    expect(itemStyle.value.flex).toContain('calc(25%')
  })

  it('6 columns → ~16.6%', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: 6 }))
    expect(itemStyle.value.flex).toContain('calc(16.666%')
  })

  it('no columns → fluid flex-basis 180px', () => {
    const { itemStyle } = useLayoutSettings(settings({ columns: undefined }))
    expect(itemStyle.value.flex).toBe('1 1 180px')
  })

  it('always sets minWidth 0 (truncation guard)', () => {
    const { itemStyle } = useLayoutSettings(settings())
    expect(itemStyle.value.minWidth).toBe(0)
  })
})

describe('useLayoutSettings — mobile override', () => {
  it('uses desktop settings when not mobile', () => {
    isMobileRef.value = false
    const { effective } = useLayoutSettings(settings({
      columns: 4,
      gap: 'normal',
      mobile: { columns: 1, gap: 'tight' },
    }))
    expect(effective.value.columns).toBe(4)
    expect(effective.value.gap).toBe('normal')
  })

  it('applies mobile overrides when on mobile', () => {
    isMobileRef.value = true
    const { effective } = useLayoutSettings(settings({
      columns: 4,
      gap: 'normal',
      mobile: { columns: 1, gap: 'tight' },
    }))
    expect(effective.value.columns).toBe(1)
    expect(effective.value.gap).toBe('tight')
  })

  it('falls back to desktop value for unset mobile fields', () => {
    isMobileRef.value = true
    const { effective } = useLayoutSettings(settings({
      columns: 4,
      gap: 'normal',
      justify: 'center',
      mobile: { columns: 1 },
    }))
    expect(effective.value.columns).toBe(1)
    expect(effective.value.gap).toBe('normal')
    expect(effective.value.justify).toBe('center')
  })

  it('ignores mobile key when no mobile config defined', () => {
    isMobileRef.value = true
    const { effective } = useLayoutSettings(settings({ columns: 4, gap: 'loose' }))
    expect(effective.value.columns).toBe(4)
    expect(effective.value.gap).toBe('loose')
  })

  it('containerStyle reacts to mobile ref change', () => {
    isMobileRef.value = false
    const s = settings({ gap: 'normal', mobile: { gap: 'tight' } })
    const { containerStyle } = useLayoutSettings(s)
    expect(containerStyle.value.gap).toBe('0.75rem')

    isMobileRef.value = true
    expect(containerStyle.value.gap).toBe('0.5rem')

    isMobileRef.value = false
  })
})

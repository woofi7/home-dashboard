import { vi } from 'vitest'
import { ref, computed, watch, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'

// Nuxt state / composables
vi.stubGlobal('useState', (_key: string, init?: () => unknown) => ref(init ? init() : undefined))
vi.stubGlobal('useAppearanceSettings', () => ({
  settings: ref({ sectionStyle: 'glass', cardStyle: 'dark' }),
  sectionStyle: computed(() => ({ backgroundColor: 'color-mix(in srgb, var(--color-surface) 75%, transparent)', backdropFilter: 'blur(12px)' })),
  cardStyle: computed(() => ({ backgroundColor: 'var(--color-elevated)' })),
}))

// Nitro server globals
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => new Error(`${statusCode}: ${message}`))

// Nuxt router globals
vi.stubGlobal('defineNuxtRouteMiddleware', (fn: Function) => fn)
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useRoute', () => ({ path: '/' }))

// Vue primitives (Nuxt auto-imports these; expose them for composable tests)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('watch', watch)
vi.stubGlobal('reactive', reactive)
vi.stubGlobal('nextTick', nextTick)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('onUnmounted', onUnmounted)

// useScrollLock — no-op in tests (document.body exists in node env but happy-dom handles it per-test)
vi.stubGlobal('useScrollLock', vi.fn())

// useIsMobile — return false by default
vi.stubGlobal('useIsMobile', () => ref(false))

// Mock @vueuse/core functions used by components
vi.mock('@vueuse/core', () => ({
  onClickOutside: vi.fn(),
  useEventListener: vi.fn(),
}))

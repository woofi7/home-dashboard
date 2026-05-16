export function useScrollLock() {
  onMounted(() => {
    document.body.style.overflow = 'hidden'
  })
  onUnmounted(() => {
    document.body.style.overflow = ''
  })
}

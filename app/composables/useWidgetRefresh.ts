const INTERVAL = 30

const countdown = ref(INTERVAL)
const refreshKey = ref(0)

let pollTimer: ReturnType<typeof setInterval> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null
let consumers = 0

function start() {
  countdown.value = INTERVAL
  pollTimer = setInterval(() => { refreshKey.value++; countdown.value = INTERVAL }, INTERVAL * 1000)
  tickTimer = setInterval(() => { if (countdown.value > 0) countdown.value-- }, 1000)
}

function stop() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
}

function forceRefresh() {
  refreshKey.value++
  countdown.value = INTERVAL
  stop()
  start()
}

export function useWidgetRefresh() {
  onMounted(() => { if (++consumers === 1) start() })
  onUnmounted(() => { if (--consumers === 0) stop() })
  return { countdown, refreshKey, forceRefresh }
}

import { useConnectivityStore } from '~/stores/connectivity'

export default defineNuxtRouteMiddleware(async () => {
  if (!import.meta.client) return
  const connectivity = useConnectivityStore()
  await connectivity.ping()
  if (!connectivity.online)
    return navigateTo('/')
  const { needsLogin, editEnabled, ready } = useAuth()
  await ready
  if (!editEnabled.value || needsLogin.value)
    return navigateTo('/')
})

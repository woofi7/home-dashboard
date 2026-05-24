export default defineNuxtRouteMiddleware(async () => {
  if (!import.meta.client) return
  const { needsLogin, editEnabled, ready } = useAuth()
  await ready
  if (!editEnabled.value || needsLogin.value)
    return navigateTo('/')
})

type Config = {
  services: unknown[]
  bookmarks: unknown[]
  widgets: unknown[]
  settings: Record<string, unknown>
}

export const useEditMode = () => {
  const active = useState('edit:active', () => false)
  const dirty = useState('edit:dirty', () => false)
  const snapshot = useState<Config | null>('edit:snapshot', () => null)

  function enter(currentConfig: Config) {
    snapshot.value = JSON.parse(JSON.stringify(currentConfig))
    active.value = true
  }

  function rollback(config: Ref<Config>) {
    if (snapshot.value) {
      config.value = JSON.parse(JSON.stringify(snapshot.value))
    }
    dirty.value = false
    active.value = false
    snapshot.value = null
  }

  function exit() {
    active.value = false
    dirty.value = false
    snapshot.value = null
  }

  return { active, dirty, snapshot, enter, rollback, exit }
}

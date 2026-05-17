type ContainerStatus = { state: string; status: string }
type DockerStatus = Record<string, Record<string, ContainerStatus>>

export function resolveContainerState(
  dockerStatus: DockerStatus,
  serviceName: string,
  container?: string,
  server?: string,
): ContainerStatus | null {
  const target = container ?? serviceName.toLowerCase().replace(/\s+/g, '')

  if (server) {
    const serverContainers = dockerStatus[server] ?? {}
    const key = Object.keys(serverContainers).find(
      k => k.toLowerCase().includes(target) || target.includes(k.toLowerCase()),
    )
    return key ? (serverContainers[key] ?? null) : null
  }

  for (const serverContainers of Object.values(dockerStatus)) {
    const key = Object.keys(serverContainers).find(
      k => k.toLowerCase().includes(target) || target.includes(k.toLowerCase()),
    )
    if (key)
      return serverContainers[key] ?? null
  }
  return null
}

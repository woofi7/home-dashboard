import { loadConfig } from '../../utils/config'
import { pingDockerServer } from '../../utils/docker'

type DockerServerConfig = { host?: string; port?: number; socket?: string }

export default defineEventHandler(async () => {
  const configured = loadConfig<Record<string, DockerServerConfig>>('docker.yaml') ?? {}

  const localConfig: DockerServerConfig = configured.local
    ?? (process.env.DOCKER_HOST ? { host: process.env.DOCKER_HOST } : {})

  const toCheck: Record<string, DockerServerConfig> = {
    local: localConfig,
    ...Object.fromEntries(Object.entries(configured).filter(([k]) => k !== 'local')),
  }

  const results = await Promise.all(
    Object.entries(toCheck).map(async ([name, cfg]) => [name, await pingDockerServer(cfg)] as const),
  )

  return Object.fromEntries(results) as Record<string, boolean>
})

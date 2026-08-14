import { loadConfig } from '../../utils/config'

type DockerServerConfig = { host?: string; port?: number; socket?: string; label?: string }

export default defineEventHandler(() => {
  return loadConfig<Record<string, DockerServerConfig>>('docker.yaml') ?? {}
})

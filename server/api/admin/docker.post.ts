import { assertAuth } from '../../utils/adminAuth'
import { writeConfig } from '../../utils/config'
import { clearDockerCache } from '../../utils/docker'

type DockerServerConfig = { host?: string; port?: number; socket?: string; label?: string }

export default defineEventHandler(async (event) => {
  assertAuth(event)
  const body = await readBody<Record<string, DockerServerConfig>>(event)
  writeConfig('docker.yaml', body)
  clearDockerCache()
  return { ok: true }
})

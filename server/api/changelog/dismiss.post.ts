import { writeConfig } from '../../utils/config'

export default defineEventHandler(async (event) => {
  const { version } = await readBody<{ version?: string }>(event)
  if (!version)
    throw createError({ statusCode: 400, message: 'version is required' })

  writeConfig('changelog.yaml', { lastSeenVersion: version })

  return { ok: true }
})

import { loadConfigRaw } from '../../utils/config'
import { CRED_FIELDS } from '../../utils/credentialMerge'

type Service = Record<string, unknown>
type ServiceGroup = { name: string; services: Service[] }

export default defineEventHandler(async (event) => {
  const { group, name } = await readBody<{ group?: string; name?: string }>(event)
  if (!name)
    throw createError({ statusCode: 400, message: 'name is required' })

  const groups = loadConfigRaw<ServiceGroup[]>('services.yaml') ?? []

  // If group is specified, look there first; fall back to scanning all groups
  // (handles case where group was renamed mid-session)
  let service: Service | undefined
  if (group) {
    service = groups.find(g => g.name === group)?.services.find(s => s.name === name)
  }
  if (!service) {
    service = groups.flatMap(g => g.services).find(s => s.name === name)
  }

  if (!service)
    throw createError({ statusCode: 404, message: 'Service not found' })

  const creds: Record<string, string> = {}
  for (const field of CRED_FIELDS) {
    if (service[field] !== undefined && service[field] !== null) {
      creds[field] = String(service[field])
    }
  }
  return creds
})

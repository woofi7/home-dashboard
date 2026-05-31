import { loadConfig, loadConfigRaw, writeConfig } from '../../utils/config'
import { applyGroupAction } from '../../utils/groupCrud'
import { preserveCredentials } from '../../utils/credentialMerge'
import { recoverOrphanedItems } from '../../utils/guardConfig'
import type { Service, ServiceGroup } from '../../types'

function stripEmpty(svc: Service): Service {
  return Object.fromEntries(
    Object.entries(svc).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  ) as Service
}

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return loadConfig<ServiceGroup[]>('services.yaml') ?? []
  }

  const body = await readBody<{
    action: string
    group?: string
    service?: Service
    originalName?: string
    services?: Service[]
    groups?: ServiceGroup[]
    deleted?: string[]
  }>(event)

  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  let updated = applyGroupAction(groups, 'services', {
    action: body.action as Parameters<typeof applyGroupAction>[2]['action'],
    group: body.group,
    item: body.service,
    originalName: body.originalName,
    items: body.services,
    groups: body.groups,
  })

  // For reorderGroups: guard against data loss then restore stripped credentials.
  if (body.action === 'reorderGroups') {
    const raw = loadConfigRaw<ServiceGroup[]>('services.yaml') ?? []
    if (raw.length > 0 && (!body.groups || body.groups.length === 0)) {
      throw createError({ statusCode: 400, statusMessage: 'Refusing to wipe all service groups: incoming list is empty' })
    }
    updated = recoverOrphanedItems<Service>(raw, updated, 'services', body.deleted ?? []) as ServiceGroup[]
    updated = preserveCredentials(raw, updated)
  }

  // Strip empty-string fields so clearing a value (e.g. server) removes it from YAML.
  updated = updated.map(g => ({ ...g, services: g.services.map(stripEmpty) }))

  writeConfig('services.yaml', updated)
  return { ok: true }
})

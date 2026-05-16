import { loadConfig, writeConfig } from '../../utils/config'
import { applyGroupAction } from '../../utils/groupCrud'
import type { Service, ServiceGroup } from '../../types'

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
  }>(event)

  const groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []
  const updated = applyGroupAction(groups, 'services', {
    action: body.action as Parameters<typeof applyGroupAction>[2]['action'],
    group: body.group,
    item: body.service,
    originalName: body.originalName,
    items: body.services,
    groups: body.groups,
  })

  writeConfig('services.yaml', updated)
  return { ok: true }
})

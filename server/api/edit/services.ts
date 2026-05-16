import { loadConfig, writeConfig } from '../../utils/config'

type Service = { name: string; [key: string]: unknown }
type ServiceGroup = { name: string; services: Service[] }

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return loadConfig<ServiceGroup[]>('services.yaml') ?? []
  }

  if (method === 'POST') {
    const body = await readBody<{
      action: 'add' | 'update' | 'delete' | 'reorder' | 'addGroup' | 'deleteGroup' | 'reorderGroups'
      group?: string
      service?: Service
      originalName?: string
      services?: Service[]
      groups?: ServiceGroup[]
    }>(event)

    let groups = loadConfig<ServiceGroup[]>('services.yaml') ?? []

    switch (body.action) {
      case 'addGroup': {
        groups.push({ name: body.group!, services: [] })
        break
      }
      case 'deleteGroup': {
        groups = groups.filter((g) => g.name !== body.group)
        break
      }
      case 'reorderGroups': {
        if (body.groups) groups = body.groups
        break
      }
      case 'add': {
        const target = groups.find((g) => g.name === body.group)
        if (target) target.services.push(body.service!)
        break
      }
      case 'update': {
        const target = groups.find((g) => g.name === body.group)
        if (target) {
          const idx = target.services.findIndex((s) => s.name === body.originalName)
          if (idx !== -1) target.services[idx] = body.service!
        }
        break
      }
      case 'delete': {
        const target = groups.find((g) => g.name === body.group)
        if (target) target.services = target.services.filter((s) => s.name !== body.service?.name)
        break
      }
      case 'reorder': {
        const target = groups.find((g) => g.name === body.group)
        if (target && body.services) target.services = body.services
        break
      }
    }

    writeConfig('services.yaml', groups)
    return { ok: true }
  }
})

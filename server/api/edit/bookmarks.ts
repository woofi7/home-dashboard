import { loadConfig, writeConfig } from '../../utils/config'

type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    return loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? []
  }

  if (method === 'POST') {
    const body = await readBody<{
      action: 'add' | 'update' | 'delete' | 'reorder' | 'addGroup' | 'deleteGroup' | 'reorderGroups'
      group?: string
      bookmark?: Bookmark
      originalName?: string
      bookmarks?: Bookmark[]
      groups?: BookmarkGroup[]
    }>(event)

    let groups = loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? []

    switch (body.action) {
      case 'addGroup': {
        groups.push({ name: body.group!, bookmarks: [] })
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
        if (target) target.bookmarks.push(body.bookmark!)
        break
      }
      case 'update': {
        const target = groups.find((g) => g.name === body.group)
        if (target) {
          const idx = target.bookmarks.findIndex((b) => b.name === body.originalName)
          if (idx !== -1) target.bookmarks[idx] = body.bookmark!
        }
        break
      }
      case 'delete': {
        const target = groups.find((g) => g.name === body.group)
        if (target) target.bookmarks = target.bookmarks.filter((b) => b.name !== body.bookmark?.name)
        break
      }
      case 'reorder': {
        const target = groups.find((g) => g.name === body.group)
        if (target && body.bookmarks) target.bookmarks = body.bookmarks
        break
      }
    }

    writeConfig('bookmarks.yaml', groups)
    return { ok: true }
  }
})

import { loadConfig, writeConfig } from '../../utils/config'
import { applyGroupAction } from '../../utils/groupCrud'
import type { Bookmark, BookmarkGroup } from '../../types'

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? []
  }

  const body = await readBody<{
    action: string
    group?: string
    bookmark?: Bookmark
    originalName?: string
    bookmarks?: Bookmark[]
    groups?: BookmarkGroup[]
  }>(event)

  const groups = loadConfig<BookmarkGroup[]>('bookmarks.yaml') ?? []
  const updated = applyGroupAction(groups, 'bookmarks', {
    action: body.action as Parameters<typeof applyGroupAction>[2]['action'],
    group: body.group,
    item: body.bookmark,
    originalName: body.originalName,
    items: body.bookmarks,
    groups: body.groups,
  })

  writeConfig('bookmarks.yaml', updated)
  return { ok: true }
})

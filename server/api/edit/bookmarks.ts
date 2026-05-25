import { loadConfig, loadConfigRaw, writeConfig } from '../../utils/config'
import { applyGroupAction } from '../../utils/groupCrud'
import { recoverOrphanedItems } from '../../utils/guardConfig'
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
  let updated = applyGroupAction(groups, 'bookmarks', {
    action: body.action as Parameters<typeof applyGroupAction>[2]['action'],
    group: body.group,
    item: body.bookmark,
    originalName: body.originalName,
    items: body.bookmarks,
    groups: body.groups,
  })

  // For reorderGroups: guard against accidental item loss (e.g. drag-and-drop state desync).
  if (body.action === 'reorderGroups') {
    const raw = loadConfigRaw<BookmarkGroup[]>('bookmarks.yaml') ?? []
    if (raw.length > 0 && (!body.groups || body.groups.length === 0)) {
      throw createError({ statusCode: 400, statusMessage: 'Refusing to wipe all bookmark groups: incoming list is empty' })
    }
    updated = recoverOrphanedItems<Bookmark>(raw, updated, 'bookmarks') as BookmarkGroup[]
  }

  writeConfig('bookmarks.yaml', updated)
  return { ok: true }
})

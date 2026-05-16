import { describe, it, expect } from 'vitest'
import { applyGroupAction } from '../server/utils/groupCrud'

type Bookmark = { name: string; url: string; icon?: string }
type BookmarkGroup = { name: string; bookmarks: Bookmark[] }

const base: BookmarkGroup[] = [
  { name: 'Work', bookmarks: [{ name: 'GitHub', url: 'https://github.com' }, { name: 'Jira', url: 'https://jira.example.com' }] },
  { name: 'Media', bookmarks: [{ name: 'YouTube', url: 'https://youtube.com' }] },
]

function groups(): BookmarkGroup[] { return JSON.parse(JSON.stringify(base)) }

describe('applyGroupAction (bookmarks)', () => {
  it('addGroup appends a new empty group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', { action: 'addGroup', group: 'Finance' })
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ name: 'Finance', bookmarks: [] })
  })

  it('deleteGroup removes the named group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', { action: 'deleteGroup', group: 'Media' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Work')
  })

  it('reorderGroups replaces the array', () => {
    const g = groups()
    const result = applyGroupAction(g, 'bookmarks', { action: 'reorderGroups', groups: [g[1], g[0]] })
    expect(result[0].name).toBe('Media')
    expect(result[1].name).toBe('Work')
  })

  it('add pushes a bookmark into the target group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'add', group: 'Work', item: { name: 'Slack', url: 'https://slack.com' },
    })
    expect(result.find(g => g.name === 'Work')!.bookmarks).toHaveLength(3)
    expect(result.find(g => g.name === 'Work')!.bookmarks[2].name).toBe('Slack')
  })

  it('add does not affect other groups', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'add', group: 'Work', item: { name: 'Slack', url: 'https://slack.com' },
    })
    expect(result.find(g => g.name === 'Media')!.bookmarks).toHaveLength(1)
  })

  it('update replaces the bookmark by originalName', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'update', group: 'Work', originalName: 'GitHub', item: { name: 'GitHub', url: 'https://github.com/org' },
    })
    expect(result.find(g => g.name === 'Work')!.bookmarks[0].url).toBe('https://github.com/org')
  })

  it('update is a no-op when originalName not found', () => {
    const g = groups()
    const result = applyGroupAction(g, 'bookmarks', {
      action: 'update', group: 'Work', originalName: 'Missing', item: { name: 'Missing', url: 'http://x' },
    })
    expect(result).toEqual(g)
  })

  it('delete removes the bookmark from the target group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'delete', group: 'Work', item: { name: 'Jira', url: 'https://jira.example.com' },
    })
    expect(result.find(g => g.name === 'Work')!.bookmarks).toHaveLength(1)
    expect(result.find(g => g.name === 'Work')!.bookmarks[0].name).toBe('GitHub')
  })

  it('delete only removes from the target group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'delete', group: 'Media', item: { name: 'YouTube', url: 'https://youtube.com' },
    })
    expect(result.find(g => g.name === 'Work')!.bookmarks).toHaveLength(2)
    expect(result.find(g => g.name === 'Media')!.bookmarks).toHaveLength(0)
  })

  it('reorder replaces the bookmarks array of the target group', () => {
    const result = applyGroupAction(groups(), 'bookmarks', {
      action: 'reorder', group: 'Work', items: [
        { name: 'Jira', url: 'https://jira.example.com' },
        { name: 'GitHub', url: 'https://github.com' },
      ],
    })
    expect(result.find(g => g.name === 'Work')!.bookmarks[0].name).toBe('Jira')
  })

  it('never mutates the original input', () => {
    const input = groups()
    const snapshot = JSON.parse(JSON.stringify(input))
    applyGroupAction(input, 'bookmarks', { action: 'add', group: 'Work', item: { name: 'New', url: 'http://new' } })
    expect(input).toEqual(snapshot)
  })
})

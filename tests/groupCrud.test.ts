import { describe, it, expect } from 'vitest'
import { applyGroupAction } from '../server/utils/groupCrud'

type Item = { name: string; value: number }
type Group = { name: string; items: Item[] }

const base: Group[] = [
  { name: 'A', items: [{ name: 'x', value: 1 }, { name: 'y', value: 2 }] },
  { name: 'B', items: [{ name: 'z', value: 3 }] },
]

function groups(): Group[] { return JSON.parse(JSON.stringify(base)) }

describe('applyGroupAction', () => {
  it('addGroup appends a new empty group', () => {
    const result = applyGroupAction(groups(), 'items', { action: 'addGroup', group: 'C' })
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ name: 'C', items: [] })
  })

  it('deleteGroup removes the named group', () => {
    const result = applyGroupAction(groups(), 'items', { action: 'deleteGroup', group: 'A' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('B')
  })

  it('reorderGroups replaces the array', () => {
    const g = groups()
    const result = applyGroupAction(g, 'items', { action: 'reorderGroups', groups: [g[1], g[0]] })
    expect(result[0].name).toBe('B')
    expect(result[1].name).toBe('A')
  })

  it('add pushes an item into the target group', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'add', group: 'A', item: { name: 'w', value: 4 },
    })
    const a = result.find(g => g.name === 'A')!
    expect(a.items).toHaveLength(3)
    expect(a.items[2]).toEqual({ name: 'w', value: 4 })
  })

  it('add does not affect other groups', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'add', group: 'A', item: { name: 'w', value: 4 },
    })
    expect(result.find(g => g.name === 'B')!.items).toHaveLength(1)
  })

  it('update replaces the item by originalName', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'update', group: 'A', originalName: 'x', item: { name: 'x', value: 99 },
    })
    expect(result.find(g => g.name === 'A')!.items[0].value).toBe(99)
  })

  it('update is a no-op when originalName not found', () => {
    const g = groups()
    const result = applyGroupAction(g, 'items', {
      action: 'update', group: 'A', originalName: 'missing', item: { name: 'missing', value: 0 },
    })
    expect(result).toEqual(g)
  })

  it('delete removes the item from the target group', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'delete', group: 'A', item: { name: 'x', value: 1 },
    })
    const a = result.find(g => g.name === 'A')!
    expect(a.items).toHaveLength(1)
    expect(a.items[0].name).toBe('y')
  })

  it('delete only removes from the target group, not others', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'delete', group: 'B', item: { name: 'z', value: 3 },
    })
    expect(result.find(g => g.name === 'A')!.items).toHaveLength(2)
    expect(result.find(g => g.name === 'B')!.items).toHaveLength(0)
  })

  it('reorder replaces the items array of the target group', () => {
    const result = applyGroupAction(groups(), 'items', {
      action: 'reorder', group: 'A', items: [{ name: 'y', value: 2 }, { name: 'x', value: 1 }],
    })
    expect(result.find(g => g.name === 'A')!.items[0].name).toBe('y')
  })

  it('never mutates the original input', () => {
    const input = groups()
    const snapshot = JSON.parse(JSON.stringify(input))
    applyGroupAction(input, 'items', { action: 'add', group: 'A', item: { name: 'new', value: 5 } })
    expect(input).toEqual(snapshot)
  })
})

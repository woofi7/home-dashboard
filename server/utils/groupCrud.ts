export type CrudAction =
  | 'add' | 'update' | 'delete' | 'reorder'
  | 'addGroup' | 'deleteGroup' | 'reorderGroups'

export type CrudBody<T, G = { name: string }> = {
  action: CrudAction
  group?: string
  item?: T
  originalName?: string
  items?: T[]
  groups?: G[]
}

type AnyGroup = { name: string; [key: string]: unknown }

export function applyGroupAction<T extends { name: string }, G extends AnyGroup>(
  groups: G[],
  itemsKey: string,
  body: CrudBody<T, G>,
): G[] {
  const getItems = (g: G): T[] => (g[itemsKey] as T[] | undefined) ?? []
  const setItems = (g: G, items: T[]): G => ({ ...g, [itemsKey]: items }) as G

  switch (body.action) {
    case 'addGroup':
      return [...groups, { name: body.group!, [itemsKey]: [] } as unknown as G]

    case 'deleteGroup':
      return groups.filter(g => g.name !== body.group)

    case 'reorderGroups':
      return body.groups ?? groups

    case 'add':
      return groups.map(g =>
        g.name !== body.group ? g : setItems(g, [...getItems(g), body.item!]),
      )

    case 'update':
      return groups.map(g => {
        if (g.name !== body.group) return g
        const list = getItems(g)
        const idx = list.findIndex(i => i.name === body.originalName)
        if (idx === -1) return g
        const updated = [...list]
        updated[idx] = body.item!
        return setItems(g, updated)
      })

    case 'delete':
      return groups.map(g =>
        g.name !== body.group ? g : setItems(g, getItems(g).filter(i => i.name !== body.item?.name)),
      )

    case 'reorder':
      return groups.map(g =>
        g.name !== body.group ? g : setItems(g, body.items ?? getItems(g)),
      )

    default:
      return groups
  }
}

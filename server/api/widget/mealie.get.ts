import { widgetEndpoint } from '../../utils/widgetError'
import type { ServiceCredentials } from '../../utils/auth'
import { getOrderedActiveFields } from '../../utils/widget-fields'

import definition from '#shared/widgetDefinitions/mealie'
export const meta = definition

type PagedResult = { total: number }
type RecipePagedResult = { total: number; items: Array<{ name: string }> }

export async function fetchMealie(creds: ServiceCredentials) {
  const { url } = creds
  if (!url)
    return null

  const base = url.replace(/\/$/, '')
  const explore = `${base}/api/explore/groups/home`

  const [recipes, categories, tags] = await Promise.all([
    $fetch<RecipePagedResult>(`${explore}/recipes?page=1&perPage=1&orderBy=createdAt&orderDirection=desc`),
    $fetch<PagedResult>(`${explore}/organizers/categories?page=1&perPage=1`),
    $fetch<PagedResult>(`${explore}/organizers/tags?page=1&perPage=1`),
  ])

  const allFields = [
    { label: 'Recipes',     value: recipes.total },
    { label: 'Last recipe', value: recipes.items[0]?.name ?? '-' },
    { label: 'Categories',  value: categories.total },
    { label: 'Tags',        value: tags.total },
  ]

  return { type: 'mealie', fields: getOrderedActiveFields('mealie', allFields) }
}

export { fetchMealie as fetch }

export default defineEventHandler(event => widgetEndpoint(event, fetchMealie, ['url']))

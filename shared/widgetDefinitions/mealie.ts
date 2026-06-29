import type { WidgetDefinition } from './types'

export default {
  name: 'Mealie',
  authType: 'none',
  fields: [
    { label: 'Recipes',     desc: 'Total number of recipes' },
    { label: 'Last recipe', desc: 'Most recently added recipe' },
    { label: 'Categories',  desc: 'Total recipe categories' },
    { label: 'Tags',        desc: 'Total recipe tags' },
  ],
} satisfies WidgetDefinition

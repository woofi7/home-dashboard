import { createCache } from '../utils/cache'

type IconEntry = { name: string; url: string }
type TreeItem = { path: string; type: string }
type TreeResponse = { tree: TreeItem[] }

const cache = createCache<IconEntry[]>()
const TTL = 60 * 60 * 1000

export default defineEventHandler(() =>
  cache.fetch(async () => {
    // Git Trees API returns all files recursively
    const { tree } = await $fetch<TreeResponse>(
      'https://api.github.com/repos/walkxcode/dashboard-icons/git/trees/main?recursive=1',
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    )
    return tree
      .filter(item => item.type === 'blob' && item.path.startsWith('webp/') && item.path.endsWith('.webp'))
      .map(item => {
        const slug = item.path.replace('webp/', '').replace(/\.webp$/, '')
        return { name: slug, url: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/webp/${slug}.webp` }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, TTL)
)

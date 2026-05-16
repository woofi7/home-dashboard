type IconEntry = { name: string; url: string }
type TreeItem = { path: string; type: string }
type TreeResponse = { tree: TreeItem[] }

let cache: IconEntry[] | null = null
let cacheAt = 0
const TTL = 60 * 60 * 1000 // 1 hour

export default defineEventHandler(async () => {
  if (!cache || Date.now() - cacheAt > TTL) {
    // Git Trees API returns ALL files recursively — no 1000-file cap
    const { tree } = await $fetch<TreeResponse>(
      'https://api.github.com/repos/walkxcode/dashboard-icons/git/trees/main?recursive=1',
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    )

    cache = tree
      .filter((item) => item.type === 'blob' && item.path.startsWith('webp/') && item.path.endsWith('.webp'))
      .map((item) => {
        const slug = item.path.replace('webp/', '').replace(/\.webp$/, '')
        return {
          name: slug,
          url: `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/webp/${slug}.webp`,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    cacheAt = Date.now()
  }

  return cache
})

type MemeCache = { data: MemeData; day: string }
type MemeData = { title: string; url: string; subreddit: string; postUrl: string }

let cache: MemeCache | null = null

function today() { return new Date().toISOString().slice(0, 10) }

export default defineEventHandler(async () => {
  if (cache && cache.day === today()) return cache.data

  const res = await $fetch<{ data: { children: Array<{ data: { title: string; url: string; subreddit: string; permalink: string; post_hint?: string } }> } }>(
    'https://www.reddit.com/r/memes/top.json?t=day&limit=10',
    { headers: { 'User-Agent': 'homepage-dashboard/1.0' } }
  )

  const post = res.data.children.find(c => c.data.post_hint === 'image' || c.data.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  if (!post) throw createError({ statusCode: 404, message: 'No image meme found' })

  const data: MemeData = {
    title: post.data.title,
    url: post.data.url,
    subreddit: post.data.subreddit,
    postUrl: `https://reddit.com${post.data.permalink}`,
  }

  cache = { data, day: today() }
  return data
})

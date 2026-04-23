export async function executeSearchWeb(opts: { query: string; limit?: number }): Promise<{ results: Array<{ title: string; url: string; snippet: string }> }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return { results: [] }
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(opts.query)}&count=${opts.limit ?? 5}`
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } })
  const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } }
  return {
    results: (data.web?.results ?? []).map(r => ({ title: r.title, url: r.url, snippet: r.description })),
  }
}

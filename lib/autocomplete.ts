// Google Autocomplete — public JSON endpoint used by Firefox search bar.
// Returns the real queries users type, no auth, no rate limit in practice.
//
// Response shape: [query, [suggestion1, suggestion2, ...], [], { ... }]

const ENDPOINT = 'https://suggestqueries.google.com/complete/search'

export interface AutocompleteOptions {
  hl?: string      // interface language, default 'es'
  gl?: string      // geolocation, default 'ar'
  timeoutMs?: number  // per-request timeout, default 2500
}

export async function fetchAutocomplete(
  query: string,
  opts: AutocompleteOptions = {}
): Promise<string[]> {
  const { hl = 'es', gl = 'ar', timeoutMs = 2500 } = opts
  const url = `${ENDPOINT}?client=firefox&hl=${hl}&gl=${gl}&ie=utf-8&oe=utf-8&q=${encodeURIComponent(query)}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return []
    const data = await res.json()
    const suggestions = Array.isArray(data?.[1]) ? data[1] : []
    return suggestions.filter((s: unknown): s is string => typeof s === 'string' && s.trim() !== '')
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

// Given the client's industry + audience, build seed queries that surface
// different search intents (informational, commercial, comparison, geo).
export function buildSeeds(industry: string, audience?: string): string[] {
  const ind = industry.trim()
  if (!ind) return []
  const aud = audience?.trim()
  const seeds = [
    ind,
    `cuánto cuesta ${ind}`,
    `mejor ${ind}`,
    `cómo elegir ${ind}`,
    `${ind} Argentina`,
  ]
  if (aud) seeds.splice(1, 0, `${ind} para ${aud}`)
  return seeds.slice(0, 6)
}

// Fan out across seeds, dedupe, strip the seeds themselves from the output,
// and cap the result so we don't blow up the LLM prompt.
export async function collectSuggestions(
  seeds: string[],
  opts?: AutocompleteOptions & { maxResults?: number }
): Promise<string[]> {
  const { maxResults = 40, ...fetchOpts } = opts ?? {}
  if (seeds.length === 0) return []

  const results = await Promise.allSettled(seeds.map(s => fetchAutocomplete(s, fetchOpts)))
  const seedSet = new Set(seeds.map(s => s.toLowerCase()))
  const seen = new Set<string>()
  const out: string[] = []

  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const suggestion of r.value) {
      const key = suggestion.toLowerCase().trim()
      if (!key || seedSet.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push(suggestion)
      if (out.length >= maxResults) return out
    }
  }
  return out
}

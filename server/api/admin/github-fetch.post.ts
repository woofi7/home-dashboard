import { dump as dumpYaml } from 'js-yaml'

type GhFile = { content: string }

const GH_BASE = 'https://api.github.com/repos/gethomepage/homepage/contents'
const GH_HEADERS = { Accept: 'application/vnd.github.v3+json' }

async function ghFile(path: string): Promise<string> {
  const res = await $fetch<GhFile>(`${GH_BASE}/${path}`, { headers: GH_HEADERS })
  return Buffer.from(res.content, 'base64').toString('utf-8')
}

async function ghDir(path: string): Promise<string[]> {
  const res = await $fetch<Array<{ name: string }>>(`${GH_BASE}/${path}`, { headers: GH_HEADERS })
  return res.map((f) => f.name)
}

function parseAuth(widgetJs: string, proxyJs: string): Record<string, unknown> {
  if (widgetJs.includes('genericProxyHandler')) {
    const apiLine = (widgetJs.match(/api:\s*["'`](.+?)["'`]/) ?? [])[1] ?? ''
    if (/[?&]apikey=\{key\}/i.test(apiLine)) return { type: 'query', param: 'apikey', field: 'apiKey' }
    if (/[?&]api_key=\{key\}/i.test(apiLine)) return { type: 'query', param: 'api_key', field: 'apiKey' }
    if (/[?&]auth=\{key\}/i.test(apiLine)) return { type: 'query', param: 'auth', field: 'apiKey' }
    if (/[?&]token=\{key\}/i.test(apiLine)) return { type: 'query', param: 'token', field: 'apiKey' }
    if (apiLine.includes('{key}')) return { type: 'header', header: 'X-Api-Key', field: 'apiKey' }
    return { type: 'header', header: 'X-Api-Key', field: 'apiKey' }
  }
  if (/Bearer\s+\$\{.*?key/i.test(proxyJs) || /Authorization.*Bearer/i.test(proxyJs)) return { type: 'bearer', field: 'apiKey' }
  if (/basicProxyHandler/.test(widgetJs) || /basic\s+auth/i.test(proxyJs)) return { type: 'basic', usernameField: 'username', passwordField: 'password' }
  if (/[?&]apikey=.*key/i.test(proxyJs) || /apikey.*widget\.key/i.test(proxyJs)) return { type: 'query', param: 'apikey', field: 'apiKey' }
  if (/'X-Api-Key'|"X-Api-Key"/.test(proxyJs)) return { type: 'header', header: 'X-Api-Key', field: 'apiKey' }
  if (/widget\.key/.test(proxyJs)) return { type: 'bearer', field: 'apiKey' }
  return { type: 'header', header: 'X-Api-Key', field: 'apiKey' }
}

function parseMappings(js: string): Record<string, { path: string; method: string }> {
  const endpoints: Record<string, { path: string; method: string }> = {}
  const mappingsBlock = (js.match(/mappings:\s*\{([\s\S]*?)\n  \}/) ?? [])[1] ?? ''
  const apiTemplate = (js.match(/api:\s*["'`](.+?)["'`]/) ?? [])[1] ?? ''
  const entryRe = /["'`]?([\w/.-]+)["'`]?\s*:\s*\{[^{}]*endpoint:\s*["'`]([^"'`]+)["'`]/g
  let m
  while ((m = entryRe.exec(mappingsBlock)) !== null) {
    const [, rawName, ep] = m
    const name = rawName.replace(/[/.]/g, '_').replace(/^_+|_+$/g, '')
    const path = apiTemplate
      .replace('{url}', '')
      .replace('{endpoint}', ep)
      .replace(/[?&]\w+=\{key\}/g, '')
      .replace(/[?&]\w+=\{[^}]+\}/g, '')
      || `/${ep}`
    endpoints[name] = { path, method: 'GET' }
  }
  return endpoints
}

function toEpKey(raw: string) {
  return raw.replace(/[/.]/g, '_').replace(/^_+|_+$/g, '')
}

function parseDisplay(jsx: string, endpointNames: string[]): Array<{ label: string; value: string }> {
  // Step 1: Map data variable names → endpoint keys
  // const { data: varName } = useWidgetAPI(widget, "endpointKey")
  const dataVarToEp = new Map<string, string>()
  const apiRe = /const\s*\{\s*data:\s*(\w+)[^}]*\}\s*=\s*useWidgetAPI\(widget,\s*["'`]([\w/.-]+)["'`]\)/g
  let m: RegExpExecArray | null
  while ((m = apiRe.exec(jsx)) !== null) {
    dataVarToEp.set(m[1], toEpKey(m[2]))
  }

  // Step 2: Detect filter variable assignments
  // const filteredVar = sourceVar.filter((x) => x.field === "value")
  const filterVars = new Map<string, { sourceVar: string; field: string; value: string }>()
  const filterRe = /const\s+(\w+)\s*=\s*(\w+)\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\.(\w+)\s*===?\s*["'`]([^"'`]+)["'`]/g
  while ((m = filterRe.exec(jsx)) !== null) {
    filterVars.set(m[1], { sourceVar: m[2], field: m[3], value: m[4] })
  }

  // Step 3: Detect reduce (sum) variable assignments
  // const total = arr.reduce((acc, x) => parseInt(x.field?.subfield) + acc, 0)
  const reduceVars = new Map<string, { sourceVar: string; field: string }>()
  const reduceRe = /const\s+(\w+)\s*=\s*(\w+)\.reduce\([^;]*?(\w+)\.(\w+)\??\.(\w+)/g
  while ((m = reduceRe.exec(jsx)) !== null) {
    reduceVars.set(m[1], { sourceVar: m[2], field: `${m[4]}.${m[5]}` })
  }

  // Step 4: Resolve an expression token to a JSONPath string
  function resolve(expr: string): string {
    const tok = expr.trim()

    // sum via reduce var: totalPodcasts
    const rv = reduceVars.get(tok)
    if (rv) {
      const fv = filterVars.get(rv.sourceVar)
      if (fv) {
        const ep = dataVarToEp.get(fv.sourceVar) ?? fv.sourceVar
        return `sum:$.${ep}[${fv.field}=${fv.value}].${rv.field}`
      }
      const ep = dataVarToEp.get(rv.sourceVar) ?? rv.sourceVar
      return `sum:$.${ep}.${rv.field}`
    }

    // filter.length: filteredVar.length
    const fvMatch = tok.match(/^(\w+)\.length$/)
    if (fvMatch) {
      const fv = filterVars.get(fvMatch[1])
      if (fv) {
        const ep = dataVarToEp.get(fv.sourceVar) ?? fv.sourceVar
        return `$.${ep}[${fv.field}=${fv.value}].length`
      }
    }

    // Direct data access: dataVar.field or dataVar?.field
    const dot = tok.match(/^(\w+)\??\.(\w+)$/)
    if (dot) {
      const [, obj, field] = dot
      const ep = dataVarToEp.get(obj)
      if (ep) return field === 'length' ? `$.${ep}.length` : `$.${ep}.${field}`
    }

    return ''
  }

  // Step 5: Extract Block labels from skeleton (loading state: no value prop)
  const skeletonLabels: string[] = []
  const skeletonRe = /<Block\s+label="([^"]+)"\s*\/>/g
  while ((m = skeletonRe.exec(jsx)) !== null) skeletonLabels.push(m[1])

  // Step 6: Extract Block value expressions
  // value={t("...", { value: EXPR })}  or  value={EXPR}
  // Use a char-by-char scanner to handle nested braces
  const labelValueMap = new Map<string, string>()
  const blockStartRe = /<Block\b/g
  while ((m = blockStartRe.exec(jsx)) !== null) {
    // Find the closing /> by scanning ahead
    let i = m.index + m[0].length
    let label = ''
    let rawValue = ''
    let depth = 0
    let inStr = ''

    while (i < jsx.length) {
      const ch = jsx[i]
      if (!inStr && (ch === '"' || ch === "'")) { inStr = ch; i++; continue }
      if (inStr && ch === inStr && jsx[i - 1] !== '\\') { inStr = ''; i++; continue }
      if (inStr) { i++; continue }

      // Look for label="..."
      if (jsx.slice(i, i + 7) === 'label="') {
        const end = jsx.indexOf('"', i + 7)
        if (end !== -1) { label = jsx.slice(i + 7, end); i = end + 1; continue }
      }

      // Look for value={...}
      if (jsx.slice(i, i + 7) === 'value={') {
        i += 7; depth = 1; let val = ''
        while (i < jsx.length && depth > 0) {
          if (jsx[i] === '{') depth++
          else if (jsx[i] === '}') { depth--; if (depth === 0) break }
          val += jsx[i++]
        }
        rawValue = val
        i++; continue
      }

      if (ch === '/' && jsx[i + 1] === '>') break
      i++
    }

    if (!label || !rawValue) continue

    // Extract the key expression from value: look for `value: EXPR` inside t() or just EXPR
    const innerValue = rawValue.match(/value:\s*([^,}]+)/)?.[1]?.trim() ?? rawValue.trim()
    const path = resolve(innerValue)
    if (path) labelValueMap.set(label, path)
  }

  // Step 7: Build display from skeleton order
  const display: Array<{ label: string; value: string }> = []
  const seen = new Set<string>()
  for (const raw of skeletonLabels) {
    if (seen.has(raw)) continue
    seen.add(raw)
    const shortLabel = raw.split('.').pop()!
    const label = shortLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const value = labelValueMap.get(raw) ?? `$.${endpointNames[0] ?? 'data'}.${shortLabel}`
    display.push({ label, value })
  }

  // Fallback: no skeleton found
  if (display.length === 0) {
    const labelRe = /t\(["'`]widget\.([\w.]+)["'`]\)/g
    while ((m = labelRe.exec(jsx)) !== null && display.length < 4) {
      const shortLabel = m[1].split('.').pop()!
      display.push({
        label: shortLabel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: `$.${endpointNames[0] ?? 'data'}.${shortLabel}`,
      })
    }
  }

  return display.slice(0, 4)
}

export default defineEventHandler(async (event) => {
  const { type } = await readBody<{ type: string }>(event)
  if (!type) throw createError({ statusCode: 400, message: 'type is required' })

  let files: string[]
  try {
    files = await ghDir(`src/widgets/${type}`)
  } catch {
    throw createError({ statusCode: 404, message: `Widget type "${type}" not found in gethomepage/homepage` })
  }

  if (!files.includes('widget.js')) {
    throw createError({ statusCode: 404, message: `No widget.js for type "${type}"` })
  }

  const widgetJs = await ghFile(`src/widgets/${type}/widget.js`)
  const proxyJs = files.includes('proxy.js') ? await ghFile(`src/widgets/${type}/proxy.js`) : ''
  const jsxFile = files.find((f) => f.endsWith('.jsx') && !f.includes('test'))
  const jsx = jsxFile ? await ghFile(`src/widgets/${type}/${jsxFile}`) : ''

  const auth = parseAuth(widgetJs, proxyJs)
  const endpoints = parseMappings(widgetJs)
  const selectedEndpoints = Object.fromEntries(Object.entries(endpoints).slice(0, 3))
  const endpointNames = Object.keys(selectedEndpoints)

  // Detect which endpoints return wrapped arrays (e.g. { libraries: [...] })
  // If the component uses the data variable as an array (.filter/.map/.reduce/.length),
  // the homepage proxy unwraps it — we emit responseKey so our server does the same.
  const arrayDataVars = new Set<string>()
  const arrayUsageRe = /\b(\w+)\.(filter|map|reduce|forEach|find|some|every)\s*\(/g
  let au: RegExpExecArray | null
  while ((au = arrayUsageRe.exec(jsx)) !== null) arrayDataVars.add(au[1])
  // Also catch direct .length on a data var (not chained filter)
  const lengthRe = /\b(\w+)\.length\b/g
  while ((au = lengthRe.exec(jsx)) !== null) arrayDataVars.add(au[1])

  // Map data var names to endpoint keys (same logic as parseDisplay)
  const dataVarToEp = new Map<string, string>()
  const apiRe2 = /const\s*\{\s*data:\s*(\w+)[^}]*\}\s*=\s*useWidgetAPI\(widget,\s*["'`]([\w/.-]+)["'`]\)/g
  let av: RegExpExecArray | null
  while ((av = apiRe2.exec(jsx)) !== null) dataVarToEp.set(av[1], toEpKey(av[2]))

  // Add responseKey to endpoints whose data variable is used as an array
  for (const [varName, epKey] of dataVarToEp) {
    if (arrayDataVars.has(varName) && selectedEndpoints[epKey]) {
      (selectedEndpoints[epKey] as Record<string, unknown>).responseKey = epKey
    }
  }

  const display = parseDisplay(jsx, endpointNames)

  const def = {
    name: type.charAt(0).toUpperCase() + type.slice(1),
    auth,
    endpoints: selectedEndpoints,
    display,
  }

  return { yaml: dumpYaml(def, { lineWidth: 120 }) }
})

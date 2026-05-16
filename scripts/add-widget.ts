#!/usr/bin/env tsx
/**
 * Fetch a single widget definition from gethomepage/homepage and save it to
 * config/custom-widgets/. For bulk management use the Admin panel (/admin).
 *
 * Usage:
 *   npx tsx scripts/add-widget.ts <type>
 *   npx tsx scripts/add-widget.ts --list
 */

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const arg = process.argv[2]?.toLowerCase()

if (!arg || arg === '--help') {
  console.error('Usage: npx tsx scripts/add-widget.ts <widget-type>')
  console.error('       npx tsx scripts/add-widget.ts --list')
  process.exit(1)
}

if (arg === '--list') {
  const out = execSync(
    `gh api repos/gethomepage/homepage/contents/src/widgets --jq '[.[] | select(.type=="dir") | .name] | sort | .[]'`,
    { encoding: 'utf8' },
  )
  console.log('Available widget types:\n')
  console.log(out)
  process.exit(0)
}

const outDir = resolve(import.meta.dirname, '../config/custom-widgets')
mkdirSync(outDir, { recursive: true })

// Delegate to the server-side parser via the dev server
const res = execSync(
  `curl -s -X POST http://localhost:3456/api/admin/github-fetch -H "Content-Type: application/json" -d '{"type":"${arg}"}'`,
  { encoding: 'utf8' },
)

let parsed: { yaml?: string; message?: string }
try { parsed = JSON.parse(res) } catch { console.error('Failed to parse response'); process.exit(1) }

if (!parsed.yaml) {
  console.error(`Error: ${parsed.message ?? 'unknown error'}`)
  process.exit(1)
}

const save = execSync(
  `curl -s -X POST http://localhost:3456/api/admin/widgets -H "Content-Type: application/json" -d ${JSON.stringify(JSON.stringify({ type: arg, yaml: parsed.yaml }))}`,
  { encoding: 'utf8' },
)

const saveResult = JSON.parse(save)
if (saveResult.ok) {
  console.log(`✓ Saved config/custom-widgets/${arg}.yaml`)
  console.log()
  console.log(parsed.yaml)
} else {
  console.error('Save failed:', saveResult)
  process.exit(1)
}

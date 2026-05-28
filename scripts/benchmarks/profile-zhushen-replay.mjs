import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const replayTestPath = 'src/domains/zhushen/engine/simulation-replay-benchmark.test.ts'
const vitestBin = path.join(rootDir, 'node_modules', 'vitest', 'vitest.mjs')
const profileDir = path.join(rootDir, 'scripts', 'benchmarks', 'profiles')
const profileReportPath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-live-replay-profile-report.json')
const replayReportPath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-live-replay-report.json')

if (!fs.existsSync(vitestBin)) {
  console.error('vitest binary not found, run npm install first')
  process.exit(1)
}

fs.mkdirSync(profileDir, { recursive: true })
const profileName = `zhushen-replay-${Date.now()}.cpuprofile`
const profilePath = path.join(profileDir, profileName)

const run = spawnSync(
  process.execPath,
  ['--cpu-prof', `--cpu-prof-name=${profileName}`, `--cpu-prof-dir=${profileDir}`, vitestBin, 'run', replayTestPath],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env },
  },
)

if (run.status !== 0) process.exit(run.status ?? 1)
if (!fs.existsSync(profilePath)) {
  console.error(`profile output not found: ${profilePath}`)
  process.exit(1)
}

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
const nodes = profile.nodes ?? []
const intervalUs =
  Number(profile.samplingInterval) ||
  (Array.isArray(profile.timeDeltas) && profile.timeDeltas.length > 0
    ? profile.timeDeltas.reduce((a, b) => a + b, 0) / profile.timeDeltas.length
    : 1000)

const nodeById = new Map()
for (const node of nodes) nodeById.set(node.id, node)

const childrenMap = new Map()
for (const node of nodes) {
  childrenMap.set(node.id, node.children ?? [])
}

const selfHits = new Map()
for (const node of nodes) selfHits.set(node.id, Number(node.hitCount ?? 0))

const childIds = new Set()
for (const node of nodes) {
  for (const child of node.children ?? []) childIds.add(child)
}
const rootIds = nodes.filter((n) => !childIds.has(n.id)).map((n) => n.id)
if (rootIds.length === 0 && nodes.length > 0) rootIds.push(nodes[0].id)

const totalHits = new Map()
const visited = new Set()
const dfs = (id) => {
  const key = `${id}`
  if (visited.has(key)) return totalHits.get(id) ?? 0
  visited.add(key)
  let sum = selfHits.get(id) ?? 0
  const children = childrenMap.get(id) ?? []
  for (const child of children) sum += dfs(child)
  totalHits.set(id, sum)
  return sum
}
for (const id of rootIds) dfs(id)

const toRow = (id, hits) => {
  const node = nodeById.get(id)
  if (!node) return null
  const fn = node.callFrame ?? {}
  return {
    functionName: fn.functionName || '(anonymous)',
    url: fn.url || '',
    lineNumber: Number(fn.lineNumber ?? 0) + 1,
    selfMs: Number((((selfHits.get(id) ?? 0) * intervalUs) / 1000).toFixed(3)),
    totalMs: Number(((hits * intervalUs) / 1000).toFixed(3)),
    selfHits: selfHits.get(id) ?? 0,
    totalHits: hits,
  }
}

const allRows = []
for (const [id, hits] of totalHits.entries()) {
  const row = toRow(id, hits)
  if (!row) continue
  if (!row.url && row.functionName.startsWith('(')) continue
  allRows.push(row)
}

const grouped = new Map()
for (const row of allRows) {
  const k = `${row.functionName}|${row.url}|${row.lineNumber}`
  const prev = grouped.get(k) ?? { ...row, selfMs: 0, totalMs: 0, selfHits: 0, totalHits: 0 }
  prev.selfMs += row.selfMs
  prev.totalMs += row.totalMs
  prev.selfHits += row.selfHits
  prev.totalHits += row.totalHits
  grouped.set(k, prev)
}
const groupedRows = [...grouped.values()].map((x) => ({
  ...x,
  selfMs: Number(x.selfMs.toFixed(3)),
  totalMs: Number(x.totalMs.toFixed(3)),
}))
const topSelf = [...groupedRows].sort((a, b) => b.selfMs - a.selfMs).slice(0, 15)
const topTotal = [...groupedRows].sort((a, b) => b.totalMs - a.totalMs).slice(0, 15)

let replaySummary = null
if (fs.existsSync(replayReportPath)) {
  const replay = JSON.parse(fs.readFileSync(replayReportPath, 'utf8'))
  replaySummary = {
    durationMs: replay.durationMs,
    exploredStates: replay.exploredStates,
    perfBreakdown: replay.perfBreakdown ?? null,
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  profileFile: path.relative(rootDir, profilePath),
  replaySummary,
  replayHotspots: replaySummary?.perfBreakdown
    ? [
        { key: 'promoEnumMs', ms: replaySummary.perfBreakdown.promoEnumMs },
        { key: 'comboCheckMs', ms: replaySummary.perfBreakdown.comboCheckMs },
        { key: 'routePruneMs', ms: replaySummary.perfBreakdown.routePruneMs },
        { key: 'groupPruneMs', ms: replaySummary.perfBreakdown.groupPruneMs },
        { key: 'scoreRankMs', ms: replaySummary.perfBreakdown.scoreRankMs },
      ].sort((a, b) => b.ms - a.ms)
    : [],
  topSelf,
  topTotal,
}

fs.writeFileSync(profileReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Profile report generated: ${path.relative(rootDir, profileReportPath)}`)

import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const distAssetsDir = path.join(rootDir, 'dist', 'assets')
const budgetPath = path.join(rootDir, 'scripts', 'quality', 'perf-budget.json')
const baselinePath = path.join(rootDir, 'scripts', 'quality', 'perf-baseline.json')
const reportPath = path.join(rootDir, 'scripts', 'quality', 'perf-report.json')

if (!fs.existsSync(distAssetsDir)) {
  console.error('dist/assets not found, run npm run build first')
  process.exit(1)
}
if (!fs.existsSync(budgetPath)) {
  console.error('scripts/quality/perf-budget.json not found')
  process.exit(1)
}

const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'))
const files = fs.readdirSync(distAssetsDir)
const pickLatest = (predicate) => {
  const matched = files.filter(predicate).map((name) => ({ name, mtime: fs.statSync(path.join(distAssetsDir, name)).mtimeMs }))
  matched.sort((a, b) => b.mtime - a.mtime)
  return matched[0]?.name
}
const getSize = (filename) => fs.statSync(path.join(distAssetsDir, filename)).size

const indexJs = pickLatest((name) => name.startsWith('index-') && name.endsWith('.js'))
const indexCss = pickLatest((name) => name.startsWith('index-') && name.endsWith('.css'))
const workerJs = pickLatest((name) => name.includes('.worker-') && name.endsWith('.js'))

if (!indexJs || !indexCss || !workerJs) {
  console.error('required built assets not found in dist/assets')
  process.exit(1)
}

const measures = [
  { key: 'indexJsMaxBytes', name: indexJs, size: getSize(indexJs) },
  { key: 'indexCssMaxBytes', name: indexCss, size: getSize(indexCss) },
  { key: 'workerJsMaxBytes', name: workerJs, size: getSize(workerJs) },
]

const failures = []
const report = {
  generatedAt: new Date().toISOString(),
  assets: {},
  baselineDiff: {},
}
for (const item of measures) {
  const limit = budget.assets[item.key]
  if (typeof limit !== 'number') {
    failures.push(`missing budget key: assets.${item.key}`)
    continue
  }
  const ratio = ((item.size / limit) * 100).toFixed(1)
  console.log(`${item.name}: ${item.size} / ${limit} bytes (${ratio}%)`)
  report.assets[item.key] = { file: item.name, bytes: item.size, budgetBytes: limit, ratio: Number(ratio) }
  if (item.size > limit) failures.push(`${item.name} exceeds budget: ${item.size} > ${limit}`)
}

if (fs.existsSync(baselinePath)) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  for (const item of measures) {
    const baselineBytes = baseline.assets?.[item.key]?.bytes
    if (typeof baselineBytes !== 'number') continue
    const delta = item.size - baselineBytes
    const deltaRatio = Number(((delta / baselineBytes) * 100).toFixed(1))
    report.baselineDiff[item.key] = { baselineBytes, currentBytes: item.size, deltaBytes: delta, deltaRatio }
    console.log(`${item.key} baseline diff: ${delta >= 0 ? '+' : ''}${delta} bytes (${deltaRatio >= 0 ? '+' : ''}${deltaRatio}%)`)
    if (deltaRatio > 10) failures.push(`${item.key} regressed by ${deltaRatio}% vs baseline`)
  }
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

if (failures.length > 0) {
  console.error('Performance budget check failed:')
  for (const msg of failures) console.error(`- ${msg}`)
  process.exit(1)
}

console.log(`Performance budget check passed. Report: ${path.relative(rootDir, reportPath)}`)

import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const reportPath = path.join(rootDir, 'scripts', 'quality', 'perf-report.json')
const baselinePath = path.join(rootDir, 'scripts', 'quality', 'perf-baseline.json')

if (!fs.existsSync(reportPath)) {
  console.error('scripts/quality/perf-report.json not found, run npm run perf:check first')
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
const nextBaseline = {
  assets: {
    indexJsMaxBytes: { bytes: report.assets.indexJsMaxBytes.bytes },
    indexCssMaxBytes: { bytes: report.assets.indexCssMaxBytes.bytes },
    workerJsMaxBytes: { bytes: report.assets.workerJsMaxBytes.bytes },
  },
}

fs.writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`, 'utf8')
console.log(`Updated baseline: ${path.relative(rootDir, baselinePath)}`)

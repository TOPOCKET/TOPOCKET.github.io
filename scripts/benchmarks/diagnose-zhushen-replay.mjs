import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

const replayPath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-engine-replay-calibration-report.json')
const profilePath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-live-replay-profile-report.json')
const historyPath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-live-replay-diagnosis-history.json')
const outPath = path.join(rootDir, 'scripts', 'benchmarks', 'zhushen-live-replay-diagnosis-report.json')

if (!fs.existsSync(replayPath)) {
  console.error('missing replay report: scripts/benchmarks/zhushen-engine-replay-calibration-report.json')
  process.exit(1)
}

const replay = JSON.parse(fs.readFileSync(replayPath, 'utf8'))
const astar = replay.astarBnbMvp ?? replay
const perf = astar.perfBreakdown ?? replay.perfBreakdown ?? {}
const duration = Number(astar.medianMs ?? replay.durationMsMedian ?? astar.roundsMs?.[0] ?? replay.roundsMs?.[0] ?? 0)

const phaseEntries = [
  ['promoEnumMs', Number(perf.promoEnumMs ?? 0)],
  ['comboCheckMs', Number(perf.comboCheckMs ?? 0)],
  ['routePruneMs', Number(perf.routePruneMs ?? 0)],
  ['groupPruneMs', Number(perf.groupPruneMs ?? 0)],
  ['scoreRankMs', Number(perf.scoreRankMs ?? 0)],
]
const phaseShare = phaseEntries.map(([k, v]) => ({
  key: k,
  ms: v,
  ratioVsDuration: duration > 0 ? Number((v / duration).toFixed(4)) : 0,
}))
phaseShare.sort((a, b) => b.ms - a.ms)

const metrics = {
  durationMsMedian: duration,
  exploredStates: Number(astar.exploredStates ?? replay.exploredStates ?? 0),
  prunedByDominance: Number(astar.prunedByDominance ?? replay.prunedByDominance ?? 0),
  comboTried: Number(perf.comboTried ?? 0),
  comboPassed: Number(perf.comboPassed ?? 0),
  routeChecks: Number(perf.routeChecks ?? 0),
  groupChecks: Number(perf.groupChecks ?? 0),
}
metrics.comboPassRate = metrics.comboTried > 0 ? Number((metrics.comboPassed / metrics.comboTried).toFixed(4)) : 0
metrics.groupPerRoute = metrics.routeChecks > 0 ? Number((metrics.groupChecks / metrics.routeChecks).toFixed(4)) : 0
metrics.prunedRatio = metrics.exploredStates > 0 ? Number((metrics.prunedByDominance / metrics.exploredStates).toFixed(4)) : 0

let history = []
if (fs.existsSync(historyPath)) {
  try {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8')).items ?? []
  } catch {
    history = []
  }
}
history.push({
  generatedAt: replay.generatedAt ?? new Date().toISOString(),
  durationMsMedian: metrics.durationMsMedian,
  exploredStates: metrics.exploredStates,
  routeChecks: metrics.routeChecks,
  groupChecks: metrics.groupChecks,
})
if (history.length > 20) history = history.slice(history.length - 20)
fs.writeFileSync(historyPath, `${JSON.stringify({ items: history }, null, 2)}\n`, 'utf8')

const recent = history.slice(-3)
const durations = recent.map((x) => x.durationMsMedian).filter((x) => Number.isFinite(x))
const sorted = [...durations].sort((a, b) => a - b)
const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0
const min = sorted[0] ?? 0
const max = sorted[sorted.length - 1] ?? 0
const volatilityRatio = median > 0 ? Number(((max - min) / median).toFixed(4)) : 0
const volatility =
  durations.length < 3 ? 'insufficient' : volatilityRatio > 0.08 ? 'high' : volatilityRatio > 0.04 ? 'medium' : 'low'

const profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : null
const profileHint = profile?.replayHotspots?.slice(0, 3) ?? []

const strategyHints = []
const top1 = phaseShare[0]?.key
const top2 = phaseShare[1]?.key
if (top1 === 'promoEnumMs' || top1 === 'comboCheckMs' || top2 === 'promoEnumMs' || top2 === 'comboCheckMs') {
  strategyHints.push('优先做“枚举前硬剪枝/上界门禁”，先压 comboTried 与 routeChecks。')
}
if (metrics.groupChecks > metrics.routeChecks * 0.7) {
  strategyHints.push('group 比较仍重，需继续限域候选池，但避免高维护索引结构。')
}
if (volatility === 'high') {
  strategyHints.push('波动高：所有策略以“三轮中位数”决策，不看单轮结果。')
}
if (metrics.comboPassRate > 0.95) {
  strategyHints.push('comboPassRate 过高，组合可行性过滤偏弱，建议增强前置拒绝规则。')
}
if (strategyHints.length === 0) {
  strategyHints.push('当前指标未显示单一瓶颈，建议先扩充样本并对比三轮中位数趋势。')
}

const report = {
  generatedAt: new Date().toISOString(),
  inputReport: path.relative(rootDir, replayPath),
  summary: {
    durationMsMedian: metrics.durationMsMedian,
    volatility,
    volatilityRatio,
    recentDurations: durations,
  },
  phaseShare,
  metrics,
  profileHint,
  strategyHints,
}

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log(`Diagnosis report generated: ${path.relative(rootDir, outPath)}`)
console.log(`Volatility: ${volatility} (${volatilityRatio})`)
console.log(`Top phases: ${phaseShare.slice(0, 3).map((x) => `${x.key}=${x.ms}`).join(', ')}`)

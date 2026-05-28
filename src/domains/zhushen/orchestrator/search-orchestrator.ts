/**
 * @file search-orchestrator 文件说明。
 * @description 诸神搜索的 Worker 编排与并行调度。
 */
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'
import type { SearchProgress, SearchResult, SimulationInput } from '@/domains/zhushen/model/zhushen-model'
import type { ZhushenSearchOrchestratorFactoryPort, ZhushenSearchOrchestratorPort } from '@/domains/zhushen/ports'
import type { ZhushenSearchWorkerResponse } from '../worker/search-worker-contract'

/**
 * 搜索执行器回调集合。
 */
export interface ZhushenSearchOrchestratorCallbacks {
  onProgress: (progress: SearchProgress) => void
}

/**
 * 诸神搜索执行器。
 */
export class ZhushenSearchOrchestrator implements ZhushenSearchOrchestratorPort {
  private searchWorker: Worker | null = null
  private searchReqId = 0
  private parallelWorkers: Worker[] = []
  private readonly callbacks: ZhushenSearchOrchestratorCallbacks

  constructor(callbacks: ZhushenSearchOrchestratorCallbacks) {
    this.callbacks = callbacks
  }

  /**
   * 销毁执行器并终止所有 Worker。
   */
  dispose(): void {
    this.searchWorker?.terminate()
    this.searchWorker = null
    this.parallelWorkers.forEach((w) => w.terminate())
    this.parallelWorkers = []
  }

  /**
   * 执行搜索。
   * @param input 搜索输入。
   * @returns 搜索结果。
   */
  async run(input: SimulationInput): Promise<SearchResult> {
    return this.runParallelSearchInWorkers(input)
  }

  private makeWorker(): Worker {
    return new Worker(new URL('../worker/zhushen-search.worker.ts', import.meta.url), { type: 'module' })
  }

  private runSearchInWorker(input: SimulationInput): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      if (!this.searchWorker) this.searchWorker = this.makeWorker()
      const reqId = ++this.searchReqId
      const onMessage = (event: MessageEvent<ZhushenSearchWorkerResponse>) => {
        if (event.data.id !== reqId) return
        if ('progress' in event.data) {
          this.callbacks.onProgress(event.data.progress)
          return
        }
        this.searchWorker?.removeEventListener('message', onMessage)
        if (event.data.ok && 'result' in event.data) resolve(event.data.result)
        else reject(new Error('error' in event.data ? event.data.error : 'worker search error'))
      }
      this.searchWorker.addEventListener('message', onMessage)
      this.searchWorker.postMessage({ id: reqId, input })
    })
  }

  private async runParallelSearchInWorkers(input: SimulationInput): Promise<SearchResult> {
    const jobIds = input.jobs.map((j) => j.id).filter((id) => id !== input.initialJobId)
    const workerCount = Math.min(Math.max((navigator.hardwareConcurrency || 4) - 1, 2), 4, jobIds.length)
    if (workerCount <= 1 || !input.search || input.search.maxTransfer <= 0 || jobIds.length === 0) return this.runSearchInWorker(input)

    this.parallelWorkers.forEach((w) => w.terminate())
    this.parallelWorkers = []

    const tasksQueue = jobIds.map((id, taskId) => ({ taskId, firstStepJobIds: [id] as string[] }))
    if (tasksQueue.length <= 1) return this.runSearchInWorker(input)

    const progressByTask = new Map<number, SearchProgress>()
    const totalTasks = tasksQueue.length
    const updateAggregateProgress = () => {
      if (progressByTask.size === 0) return
      const rows = [...progressByTask.values()]
      const totalSteps = rows[0]?.totalSteps || 1
      const ratio = rows.reduce((acc, p) => acc + p.step / Math.max(p.totalSteps, 1), 0) / Math.max(totalTasks, 1)
      this.callbacks.onProgress({
        phase: rows.some((p) => p.phase === 'running') ? 'running' : 'completed',
        step: Math.min(totalSteps, Math.max(1, Math.ceil(ratio * totalSteps))),
        totalSteps,
        beamSize: rows.reduce((acc, p) => acc + p.beamSize, 0),
        candidateSize: rows.reduce((acc, p) => acc + p.candidateSize, 0),
        exploredStates: rows.reduce((acc, p) => acc + p.exploredStates, 0),
        prunedByDominance: rows.reduce((acc, p) => acc + p.prunedByDominance, 0),
        poolSize: rows.reduce((acc, p) => acc + p.poolSize, 0),
        compactionCount: rows.reduce((acc, p) => acc + p.compactionCount, 0),
        poolPeak: Math.max(...rows.map((p) => p.poolPeak)),
        stepMs: Math.max(...rows.map((p) => p.stepMs)),
        routeChecks: rows.reduce((acc, p) => acc + p.routeChecks, 0),
        routePrunes: rows.reduce((acc, p) => acc + p.routePrunes, 0),
        groupChecks: rows.reduce((acc, p) => acc + p.groupChecks, 0),
        groupPrunes: rows.reduce((acc, p) => acc + p.groupPrunes, 0),
      })
    }

    const settled: SearchResult[] = []
    const runTask = (worker: Worker, taskId: number, firstStepJobIds: string[]): Promise<SearchResult> =>
      new Promise((resolve, reject) => {
        const reqId = ++this.searchReqId
        const idleTimeoutMs = SEARCH_RUNTIME_CONFIG.parallelWorkerIdleTimeoutMs
        let timeout: ReturnType<typeof setTimeout> | null = null
        const armTimeout = () => {
          if (timeout) clearTimeout(timeout)
          timeout = setTimeout(() => {
            worker.removeEventListener('message', onMessage)
            reject(new Error(`parallel worker timeout task=${taskId}`))
          }, idleTimeoutMs)
        }
        armTimeout()
        const workerInput: SimulationInput = {
          ...input,
          search: {
            ...input.search!,
            firstStepJobIds,
          },
        }
        const onMessage = (event: MessageEvent<ZhushenSearchWorkerResponse>) => {
          if (event.data.id !== reqId) return
          if ('progress' in event.data) {
            armTimeout()
            progressByTask.set(taskId, event.data.progress)
            updateAggregateProgress()
            return
          }
          if (timeout) clearTimeout(timeout)
          worker.removeEventListener('message', onMessage)
          if (event.data.ok && 'result' in event.data) {
            const prev = progressByTask.get(taskId)
            if (prev) {
              progressByTask.set(taskId, { ...prev, phase: 'completed', step: prev.totalSteps })
            } else {
              progressByTask.set(taskId, {
                phase: 'completed',
                step: input.search?.maxTransfer ? input.search.maxTransfer + 1 : 1,
                totalSteps: input.search?.maxTransfer ? input.search.maxTransfer + 1 : 1,
                beamSize: 0,
                candidateSize: 0,
                exploredStates: event.data.result.exploredStates,
                prunedByDominance: event.data.result.prunedByDominance,
                poolSize: 0,
                compactionCount: 0,
                poolPeak: 0,
                stepMs: 0,
                routeChecks: 0,
                routePrunes: 0,
                groupChecks: 0,
                groupPrunes: 0,
              })
            }
            updateAggregateProgress()
            resolve(event.data.result)
          } else reject(new Error('error' in event.data ? event.data.error : 'parallel worker error'))
        }
        worker.addEventListener('message', onMessage)
        worker.postMessage({ id: reqId, input: workerInput })
      })

    const runners = Array.from({ length: workerCount }, () => {
      const worker = this.makeWorker()
      this.parallelWorkers.push(worker)
      return (async () => {
        while (tasksQueue.length > 0) {
          const next = tasksQueue.shift()
          if (!next) break
          const result = await runTask(worker, next.taskId, next.firstStepJobIds)
          settled.push(result)
        }
      })()
    })
    await Promise.all(runners)
    this.parallelWorkers.forEach((w) => w.terminate())
    this.parallelWorkers = []

    const topPlans = settled
      .flatMap((x) => x.topPlans)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((p, idx) => ({ ...p, rank: idx + 1 }))
    return {
      topPlans,
      exploredStates: settled.reduce((acc, x) => acc + x.exploredStates, 0),
      prunedByDominance: settled.reduce((acc, x) => acc + x.prunedByDominance, 0),
    }
  }
}

export const zhushenSearchOrchestratorFactory: ZhushenSearchOrchestratorFactoryPort = {
  create: (callbacks) => new ZhushenSearchOrchestrator(callbacks),
}

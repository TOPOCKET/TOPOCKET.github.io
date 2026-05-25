/**
 * @file zhushen-search.worker 文件说明。
 * @description 诸神搜索 Worker 线程入口。
 */
import { searchZhushenPlans } from '@/domains/zhushen/engine/simulator-core'
import { zhushenSimulationInputSchema } from '@/domains/zhushen/model/zhushen-model'
import { loadZhushenWasmCore } from '@/domains/zhushen/wasm/zhushen-wasm'
import { SEARCH_RUNTIME_CONFIG } from '@/config/search'
import type {
  ZhushenSearchWorkerErrorResponse,
  ZhushenSearchWorkerProgressResponse,
  ZhushenSearchWorkerRequest,
  ZhushenSearchWorkerSuccessResponse,
} from './search-worker-contract'

let wasmCorePromise: Promise<Awaited<ReturnType<typeof loadZhushenWasmCore>>> | null = null

self.onmessage = async (event: MessageEvent<ZhushenSearchWorkerRequest>) => {
  const { id, input } = event.data
  try {
    const parsed = zhushenSimulationInputSchema.parse(input)
    if (!wasmCorePromise) wasmCorePromise = loadZhushenWasmCore()
    const wasmCore = await wasmCorePromise
    const result = await searchZhushenPlans(
      parsed,
      (progress) => {
        const payload: ZhushenSearchWorkerProgressResponse = { id, ok: true, progress }
        self.postMessage(payload)
      },
      { yieldEvery: SEARCH_RUNTIME_CONFIG.workerYieldEvery, wasmCore },
    )
    const payload: ZhushenSearchWorkerSuccessResponse = { id, ok: true, result }
    self.postMessage(payload)
  } catch (error) {
    const payload: ZhushenSearchWorkerErrorResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'worker search error',
    }
    self.postMessage(payload)
  }
}

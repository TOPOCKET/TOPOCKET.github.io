import { searchZhushenPlans, zhushenSimulationInputSchema, type SearchProgress, type SearchResult, type SimulationInput } from '../features/zhushen-simulator'
import { loadZhushenWasmCore } from '../features/zhushen-wasm'

interface SearchWorkerRequest {
  id: number
  input: SimulationInput
}

interface SearchWorkerResponse {
  id: number
  ok: true
  result: SearchResult
}

interface SearchWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

interface SearchWorkerProgressResponse {
  id: number
  ok: true
  progress: SearchProgress
}

let wasmCorePromise: Promise<Awaited<ReturnType<typeof loadZhushenWasmCore>>> | null = null

self.onmessage = async (event: MessageEvent<SearchWorkerRequest>) => {
  const { id, input } = event.data
  try {
    const parsed = zhushenSimulationInputSchema.parse(input)
    if (!wasmCorePromise) wasmCorePromise = loadZhushenWasmCore()
    const wasmCore = await wasmCorePromise
    const result = await searchZhushenPlans(
      parsed,
      (progress) => {
        const payload: SearchWorkerProgressResponse = { id, ok: true, progress }
        self.postMessage(payload)
      },
      { yieldEvery: 2000, wasmCore },
    )
    const payload: SearchWorkerResponse = { id, ok: true, result }
    self.postMessage(payload)
  } catch (error) {
    const payload: SearchWorkerErrorResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'worker search error',
    }
    self.postMessage(payload)
  }
}

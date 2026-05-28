/**
 * @file search-engine
 * @description 诸神搜索双引擎统一入口。
 */
import type { SearchProgress, SearchResult, SimulationInput } from '@/domains/zhushen/model/zhushen-model'
import type { SearchRuntimeOptions } from './simulator-core'
import { searchZhushenPlansByAstarBnbMvp } from './astar-bnb-solver'

type ProgressCallback = (progress: SearchProgress) => void

export const searchZhushenPlansByEngine = async (
  input: SimulationInput,
  onProgress?: ProgressCallback,
  runtime?: SearchRuntimeOptions,
): Promise<SearchResult> => {
  return searchZhushenPlansByAstarBnbMvp(
    {
      ...input,
      search: input.search
        ? {
            ...input.search,
            engine: 'astar_bnb_mvp',
          }
        : input.search,
    },
    onProgress,
    runtime,
  )
}

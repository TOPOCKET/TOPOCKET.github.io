/**
 * @file search-worker-contract 文件说明。
 * @description 诸神搜索 Worker 的请求/响应契约。
 */
import type { SearchProgress, SearchResult, SimulationInput } from '@/domains/zhushen/model/zhushen-model'

/**
 * 搜索 Worker 请求。
 */
export interface ZhushenSearchWorkerRequest {
  id: number
  input: SimulationInput
}

/**
 * 搜索 Worker 成功响应。
 */
export interface ZhushenSearchWorkerSuccessResponse {
  id: number
  ok: true
  result: SearchResult
}

/**
 * 搜索 Worker 失败响应。
 */
export interface ZhushenSearchWorkerErrorResponse {
  id: number
  ok: false
  error: string
}

/**
 * 搜索 Worker 进度响应。
 */
export interface ZhushenSearchWorkerProgressResponse {
  id: number
  ok: true
  progress: SearchProgress
}

/**
 * 搜索 Worker 响应联合类型。
 */
export type ZhushenSearchWorkerResponse =
  | ZhushenSearchWorkerSuccessResponse
  | ZhushenSearchWorkerErrorResponse
  | ZhushenSearchWorkerProgressResponse

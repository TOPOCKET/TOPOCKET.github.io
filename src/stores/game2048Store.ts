/**
 * @file game2048Store 文件说明。
 * @description 按业务域封装本地持久化状态读写接口。
 */
import { z } from 'zod'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'
import type { StoreContract } from './store-contract'

const GRID_SIZE = 4

const boardSchema = z
  .array(z.array(z.number().int().nonnegative()))
  .length(GRID_SIZE)
  .refine((rows) => rows.every((row) => row.length === GRID_SIZE), 'board must be 4x4')

const game2048Schema = z.object({
  board: boardSchema,
  score: z.number().int().nonnegative(),
  best: z.number().int().nonnegative(),
  won: z.boolean(),
  gameOver: z.boolean(),
})

/**
 * Game2048State 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type Game2048State = z.infer<typeof game2048Schema>

const createEmptyBoard = () =>
  Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0))

const defaults: Game2048State = {
  board: createEmptyBoard(),
  score: 0,
  best: 0,
  won: false,
  gameOver: false,
}

const load = (): Game2048State => {
  return loadRecord(storageKeys.game2048V1, game2048Schema, defaults)
}

const save = (value: Game2048State) => {
  saveRecord(storageKeys.game2048V1, game2048Schema.parse(value))
}

const reset = (): Game2048State => {
  const next = { ...defaults, board: createEmptyBoard() }
  save(next)
  return next
}

const createThrottleSave = (waitMs = 300) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (value: Game2048State) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      save(value)
      timer = null
    }, waitMs)
  }
}

/**
 * game2048Store 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const game2048Store = {
  load,
  save,
  reset,
  createThrottleSave,
  defaults,
  createEmptyBoard,
} satisfies StoreContract<Game2048State> & {
  createThrottleSave: (waitMs?: number) => (value: Game2048State) => void
  defaults: Game2048State
  createEmptyBoard: () => number[][]
}

import { z } from 'zod'
import { storageKeys } from '../storage/keys'
import { loadRecord, saveRecord } from '../storage/record'

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

const migrate = (): Game2048State | null => null

const load = (): Game2048State => {
  const fromV1 = loadRecord(storageKeys.game2048V1, game2048Schema, defaults)
  return migrate() ?? fromV1
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

export const game2048Store = {
  load,
  save,
  reset,
  migrate,
  createThrottleSave,
  defaults,
  createEmptyBoard,
}

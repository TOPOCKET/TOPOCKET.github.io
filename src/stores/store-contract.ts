/**
 * @file store-contract 文件说明。
 * @description 统一约束业务域 store 的基础能力契约。
 */

/**
 * StoreContract 接口定义。
 * @remarks 所有业务 store 至少实现 load/save/reset 三个基础能力。
 */
export interface StoreContract<TState, TSaveInput = TState, TResetResult = TState> {
  load: () => TState
  save: (value: TSaveInput) => void
  reset: () => TResetResult
}


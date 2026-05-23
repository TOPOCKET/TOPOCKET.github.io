/**
 * STORAGE_PREFIX 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const STORAGE_PREFIX = 'sopronwitta:'

/**
 * storageKeys 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const storageKeys = {
  prefsV1: 'prefs:v1',
  game2048V1: 'tool:2048:v1',
  linksV1: 'links:v1',
  zhushenCustomV1: 'tool:zhushen:custom:v1',
} as const

/**
 * StorageKey 类型定义。
 * @remarks 该类型用于约束调用边界，变更时请检查上下游类型推断与兼容性。
 */
export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys]

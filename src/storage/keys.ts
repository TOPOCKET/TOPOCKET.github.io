export const STORAGE_PREFIX = 'sopronwitta:'

export const storageKeys = {
  prefsV1: 'prefs:v1',
  game2048V1: 'tool:2048:v1',
  linksV1: 'links:v1',
  zhushenCustomV1: 'tool:zhushen:custom:v1',
} as const

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys]

export const STORAGE_PREFIX = 'sopronwitta:'

export const storageKeys = {
  appPrefsV1: 'prefs:v1',
  linksV1: 'links:v1',
  tacticsV1: 'tool:tactics:v1',
} as const

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys]

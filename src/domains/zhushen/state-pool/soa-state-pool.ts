/**
 * @file soa-state-pool 文件说明。
 * @description 诸神搜索状态池（SoA）及压缩能力。
 */

/**
 * 单条路线最大转职编码长度。
 */
export const MAX_TRANSFER_COUNT = 20

/**
 * 六维向量类型。
 */
export type Vec6 = Float32Array

/**
 * SoA 状态池。
 */
export class SoAStatePool {
  size = 0
  capacity: number
  levels: Uint16Array
  jobIndexes: Uint16Array
  transferCounts: Uint8Array
  visitedMasks: BigUint64Array
  parentIndexes: Int32Array
  promoLevels: Uint16Array
  promoJobIndexes: Int16Array
  promoEquipIndexes: Int16Array
  promoSkillIndexes: Int16Array
  routeHashes: Uint32Array
  lastPromoLevels: Uint16Array
  promoLevelCodes: Uint16Array
  growth: Float32Array

  constructor(initialCapacity = 4096) {
    this.capacity = initialCapacity
    this.levels = new Uint16Array(initialCapacity)
    this.jobIndexes = new Uint16Array(initialCapacity)
    this.transferCounts = new Uint8Array(initialCapacity)
    this.visitedMasks = new BigUint64Array(initialCapacity)
    this.parentIndexes = new Int32Array(initialCapacity)
    this.promoLevels = new Uint16Array(initialCapacity)
    this.promoJobIndexes = new Int16Array(initialCapacity)
    this.promoEquipIndexes = new Int16Array(initialCapacity)
    this.promoSkillIndexes = new Int16Array(initialCapacity)
    this.routeHashes = new Uint32Array(initialCapacity)
    this.lastPromoLevels = new Uint16Array(initialCapacity)
    this.promoLevelCodes = new Uint16Array(initialCapacity * MAX_TRANSFER_COUNT)
    this.growth = new Float32Array(initialCapacity * 6)
  }

  private ensureCapacity(): void {
    if (this.size < this.capacity) return
    const nextCap = this.capacity * 2
    const grow = <T extends ArrayBufferView>(ctor: { new (size: number): T }, oldBuf: T, length: number): T => {
      const next = new ctor(length)
      ;(next as unknown as { set(data: T, offset?: number): void }).set(oldBuf, 0)
      return next
    }
    this.levels = grow(Uint16Array, this.levels, nextCap)
    this.jobIndexes = grow(Uint16Array, this.jobIndexes, nextCap)
    this.transferCounts = grow(Uint8Array, this.transferCounts, nextCap)
    this.visitedMasks = grow(BigUint64Array, this.visitedMasks, nextCap)
    this.parentIndexes = grow(Int32Array, this.parentIndexes, nextCap)
    this.promoLevels = grow(Uint16Array, this.promoLevels, nextCap)
    this.promoJobIndexes = grow(Int16Array, this.promoJobIndexes, nextCap)
    this.promoEquipIndexes = grow(Int16Array, this.promoEquipIndexes, nextCap)
    this.promoSkillIndexes = grow(Int16Array, this.promoSkillIndexes, nextCap)
    this.routeHashes = grow(Uint32Array, this.routeHashes, nextCap)
    this.lastPromoLevels = grow(Uint16Array, this.lastPromoLevels, nextCap)
    this.promoLevelCodes = grow(Uint16Array, this.promoLevelCodes, nextCap * MAX_TRANSFER_COUNT)
    this.growth = grow(Float32Array, this.growth, nextCap * 6)
    this.capacity = nextCap
  }

  push(
    level: number,
    jobIndex: number,
    transferCount: number,
    visitedMask: bigint,
    parentIndex: number,
    promoLevel: number,
    promoJobIndex: number,
    promoEquipIndex: number,
    promoSkillIndex: number,
    routeHash: number,
    growthVec: Vec6,
  ): number {
    this.ensureCapacity()
    const i = this.size++
    this.levels[i] = level
    this.jobIndexes[i] = jobIndex
    this.transferCounts[i] = transferCount
    this.visitedMasks[i] = visitedMask
    this.parentIndexes[i] = parentIndex
    this.promoLevels[i] = promoLevel
    this.promoJobIndexes[i] = promoJobIndex
    this.promoEquipIndexes[i] = promoEquipIndex
    this.promoSkillIndexes[i] = promoSkillIndex
    this.routeHashes[i] = routeHash >>> 0
    this.lastPromoLevels[i] = promoLevel > 0 ? promoLevel : parentIndex >= 0 ? this.lastPromoLevels[parentIndex] : 0
    const codeBase = i * MAX_TRANSFER_COUNT
    if (parentIndex >= 0) {
      const pBase = parentIndex * MAX_TRANSFER_COUNT
      for (let t = 0; t < MAX_TRANSFER_COUNT; t += 1) this.promoLevelCodes[codeBase + t] = this.promoLevelCodes[pBase + t]
    } else {
      for (let t = 0; t < MAX_TRANSFER_COUNT; t += 1) this.promoLevelCodes[codeBase + t] = 0
    }
    if (promoLevel > 0 && transferCount > 0 && transferCount <= MAX_TRANSFER_COUNT) this.promoLevelCodes[codeBase + transferCount - 1] = promoLevel
    const base = i * 6
    for (let k = 0; k < 6; k += 1) this.growth[base + k] = growthVec[k]
    return i
  }

  fillGrowth(index: number, out: Vec6): void {
    const base = index * 6
    for (let k = 0; k < 6; k += 1) out[k] = this.growth[base + k]
  }

  geGrowth(aIndex: number, bIndex: number): boolean {
    const aBase = aIndex * 6
    const bBase = bIndex * 6
    for (let k = 0; k < 6; k += 1) if (this.growth[aBase + k] < this.growth[bBase + k]) return false
    return true
  }

  appendGrowthTo(index: number, out: Vec6): void {
    const base = index * 6
    for (let k = 0; k < 6; k += 1) out[k] += this.growth[base + k]
  }

  discardLastIf(index: number): void {
    if (index === this.size - 1) this.size -= 1
  }

  release(index: number): void {
    void index
  }
}

/**
 * 压缩状态池，仅保留 beam 及其祖先链。
 * @param pool 原状态池。
 * @param beam 当前 beam。
 * @param vecFactory 向量工厂函数。
 * @returns 压缩后的状态池与 beam。
 */
export const compactStatePool = (pool: SoAStatePool, beam: number[], vecFactory: () => Vec6): { pool: SoAStatePool; beam: number[] } => {
  if (beam.length === 0 || pool.size === 0) return { pool, beam }
  const keep = new Uint8Array(pool.size)
  const stack = [...beam]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (cur < 0 || cur >= pool.size) continue
    if (keep[cur] === 1) continue
    keep[cur] = 1
    const p = pool.parentIndexes[cur]
    if (p >= 0) stack.push(p)
  }
  let keepCount = 0
  for (let i = 0; i < keep.length; i += 1) keepCount += keep[i]
  if (keepCount === pool.size) return { pool, beam }

  const newPool = new SoAStatePool(Math.max(keepCount + 64, 256))
  const map = new Int32Array(pool.size)
  map.fill(-1)
  const tmpGrowth = vecFactory()
  for (let old = 0; old < pool.size; old += 1) {
    if (keep[old] === 0) continue
    pool.fillGrowth(old, tmpGrowth)
    const oldParent = pool.parentIndexes[old]
    const newParent = oldParent >= 0 ? map[oldParent] : -1
    const created = newPool.push(
      pool.levels[old],
      pool.jobIndexes[old],
      pool.transferCounts[old],
      pool.visitedMasks[old],
      newParent,
      pool.promoLevels[old],
      pool.promoJobIndexes[old],
      pool.promoEquipIndexes[old],
      pool.promoSkillIndexes[old],
      pool.routeHashes[old],
      tmpGrowth,
    )
    map[old] = created
  }
  const newBeam = beam.map((idx) => map[idx]).filter((idx) => idx >= 0)
  return { pool: newPool, beam: newBeam }
}


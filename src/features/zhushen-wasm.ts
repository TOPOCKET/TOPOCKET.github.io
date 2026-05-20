export interface ZhushenWasmCore {
  scoreBatch: (
    stats: Float32Array,
    stateCount: number,
    mode: number,
    weights?: [number, number, number, number, number, number],
  ) => Float32Array
  pruneFlags: (batchStats: Float32Array, candidate: Float32Array) => { domByBatch: Uint8Array; domByCandidate: Uint8Array }
  routePruneFlags: (
    batchCodes: Uint16Array,
    batchStats: Float32Array,
    codeWidth: number,
    transferCount: number,
    candidateCode: Uint16Array,
    candidate: Float32Array,
  ) => { domByBatch: Uint8Array; domByCandidate: Uint8Array }
  comboPassFlags: (
    panel: Float32Array,
    equipStats: Float32Array,
    equipCount: number,
    skillStats: Float32Array,
    skillCount: number,
    require: Float32Array,
  ) => Uint8Array
}

interface CoreExports {
  memory: WebAssembly.Memory
  score_batch: (
    statsPtr: number,
    stateCount: number,
    mode: number,
    w0: number,
    w1: number,
    w2: number,
    w3: number,
    w4: number,
    w5: number,
    outPtr: number,
  ) => void
  prune_flags: (batchPtr: number, n: number, candPtr: number, outByPtr: number, outCandPtr: number) => void
  route_prune_flags: (
    batchCodesPtr: number,
    batchStatsPtr: number,
    n: number,
    codeWidth: number,
    transferCount: number,
    candCodePtr: number,
    candStatsPtr: number,
    outByPtr: number,
    outCandPtr: number,
  ) => void
  combo_pass_flags: (
    panelPtr: number,
    equipsPtr: number,
    equipN: number,
    skillsPtr: number,
    skillN: number,
    requirePtr: number,
    outPtr: number,
  ) => void
  __heap_base: WebAssembly.Global
}

export const loadZhushenWasmCore = async (): Promise<ZhushenWasmCore | null> => {
  try {
    const resp = await fetch('/wasm/zhushen_core.wasm')
    if (!resp.ok) return null
    const bytes = await resp.arrayBuffer()
    const { instance } = await WebAssembly.instantiate(bytes, {})
    const exports = instance.exports as unknown as CoreExports
    const memory = exports.memory
    let heap = Number(exports.__heap_base.value)
    const alignUp = (value: number, align: number): number => (value + align - 1) & ~(align - 1)
    const alloc = (bytesLen: number, align = 8): number => {
      heap = alignUp(heap, align)
      const ptr = heap
      heap += bytesLen
      const needPages = Math.ceil(heap / 65536)
      const curPages = memory.buffer.byteLength / 65536
      if (needPages > curPages) memory.grow(needPages - curPages)
      return ptr
    }
    const scoreBatch: ZhushenWasmCore['scoreBatch'] = (stats, stateCount, mode, weights) => {
      const statBytes = stats.byteLength
      const outBytes = stateCount * 4
      const statsPtr = alloc(statBytes, 4)
      const outPtr = alloc(outBytes, 4)
      new Float32Array(memory.buffer, statsPtr, stats.length).set(stats)
      const w = weights ?? [1, 1, 1, 1, 1, 1]
      exports.score_batch(statsPtr, stateCount, mode, w[0], w[1], w[2], w[3], w[4], w[5], outPtr)
      return new Float32Array(memory.buffer, outPtr, stateCount).slice()
    }
    const pruneFlags: ZhushenWasmCore['pruneFlags'] = (batchStats, candidate) => {
      const n = Math.floor(batchStats.length / 6)
      const batchPtr = alloc(batchStats.byteLength, 4)
      const candPtr = alloc(candidate.byteLength, 4)
      const outByPtr = alloc(n, 8)
      const outCandPtr = alloc(n, 8)
      new Float32Array(memory.buffer, batchPtr, batchStats.length).set(batchStats)
      new Float32Array(memory.buffer, candPtr, 6).set(candidate)
      exports.prune_flags(batchPtr, n, candPtr, outByPtr, outCandPtr)
      return {
        domByBatch: new Uint8Array(memory.buffer, outByPtr, n).slice(),
        domByCandidate: new Uint8Array(memory.buffer, outCandPtr, n).slice(),
      }
    }
    const routePruneFlags: ZhushenWasmCore['routePruneFlags'] = (batchCodes, batchStats, codeWidth, transferCount, candidateCode, candidate) => {
      const n = Math.floor(batchStats.length / 6)
      const codePtr = alloc(batchCodes.byteLength, 2)
      const statsPtr = alloc(batchStats.byteLength, 4)
      const candCodePtr = alloc(candidateCode.byteLength, 2)
      const candStatsPtr = alloc(candidate.byteLength, 4)
      const outByPtr = alloc(n, 8)
      const outCandPtr = alloc(n, 8)
      new Uint16Array(memory.buffer, codePtr, batchCodes.length).set(batchCodes)
      new Float32Array(memory.buffer, statsPtr, batchStats.length).set(batchStats)
      new Uint16Array(memory.buffer, candCodePtr, candidateCode.length).set(candidateCode)
      new Float32Array(memory.buffer, candStatsPtr, candidate.length).set(candidate)
      exports.route_prune_flags(codePtr, statsPtr, n, codeWidth, transferCount, candCodePtr, candStatsPtr, outByPtr, outCandPtr)
      return {
        domByBatch: new Uint8Array(memory.buffer, outByPtr, n).slice(),
        domByCandidate: new Uint8Array(memory.buffer, outCandPtr, n).slice(),
      }
    }
    const comboPassFlags: ZhushenWasmCore['comboPassFlags'] = (panel, equipStats, equipCount, skillStats, skillCount, require) => {
      const panelPtr = alloc(panel.byteLength, 4)
      const equipsPtr = alloc(equipStats.byteLength, 4)
      const skillsPtr = alloc(skillStats.byteLength, 4)
      const reqPtr = alloc(require.byteLength, 4)
      const outPtr = alloc(equipCount * skillCount, 8)
      new Float32Array(memory.buffer, panelPtr, 6).set(panel)
      new Float32Array(memory.buffer, equipsPtr, equipStats.length).set(equipStats)
      new Float32Array(memory.buffer, skillsPtr, skillStats.length).set(skillStats)
      new Float32Array(memory.buffer, reqPtr, 6).set(require)
      exports.combo_pass_flags(panelPtr, equipsPtr, equipCount, skillsPtr, skillCount, reqPtr, outPtr)
      return new Uint8Array(memory.buffer, outPtr, equipCount * skillCount).slice()
    }
    return { scoreBatch, pruneFlags, routePruneFlags, comboPassFlags }
  } catch {
    return null
  }
}

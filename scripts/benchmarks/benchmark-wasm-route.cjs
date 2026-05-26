const fs = require('fs')
const path = require('path')

const wasmPath = path.resolve(__dirname, '..', '..', 'public', 'wasm', 'zhushen_core.wasm')

const ge6 = (a, b, ia, ib) => {
  for (let k = 0; k < 6; k += 1) if (a[ia + k] < b[ib + k]) return false
  return true
}

const now = () => Number(process.hrtime.bigint()) / 1e6

;(async () => {
  const bytes = fs.readFileSync(wasmPath)
  const { instance } = await WebAssembly.instantiate(bytes, {})
  const e = instance.exports
  const memory = e.memory
  let heap = Number(e.__heap_base.value)
  const alignUp = (v, a) => (v + a - 1) & ~(a - 1)
  const alloc = (n, a = 8) => {
    heap = alignUp(heap, a)
    const p = heap
    heap += n
    const needPages = Math.ceil(heap / 65536)
    const curPages = memory.buffer.byteLength / 65536
    if (needPages > curPages) memory.grow(needPages - curPages)
    return p
  }

  const N = 20000
  const codeWidth = 20
  const transferCount = 6
  const batchCodes = new Uint16Array(N * codeWidth)
  const batchStats = new Float32Array(N * 6)
  const candCode = new Uint16Array(codeWidth)
  const candStats = new Float32Array(6)

  for (let i = 0; i < N; i += 1) {
    const c = i * codeWidth
    for (let j = 0; j < transferCount; j += 1) batchCodes[c + j] = 1 + Math.floor(Math.random() * 150)
    const g = i * 6
    for (let k = 0; k < 6; k += 1) batchStats[g + k] = Math.random() * 800
  }
  for (let j = 0; j < transferCount; j += 1) candCode[j] = 1 + Math.floor(Math.random() * 150)
  for (let k = 0; k < 6; k += 1) candStats[k] = Math.random() * 800

  const jsStart = now()
  const jsOut = new Uint8Array(N)
  for (let i = 0; i < N; i += 1) {
    const c = i * codeWidth
    const g = i * 6
    let noLater = true
    for (let j = 0; j < transferCount; j += 1) if (batchCodes[c + j] > candCode[j]) { noLater = false; break }
    if (noLater && ge6(batchStats, candStats, g, 0)) jsOut[i] = 1
  }
  const jsMs = now() - jsStart

  const codesPtr = alloc(batchCodes.byteLength, 2)
  const statsPtr = alloc(batchStats.byteLength, 4)
  const candCodePtr = alloc(candCode.byteLength, 2)
  const candStatsPtr = alloc(candStats.byteLength, 4)
  const outByPtr = alloc(N, 8)
  const outCandPtr = alloc(N, 8)
  new Uint16Array(memory.buffer, codesPtr, batchCodes.length).set(batchCodes)
  new Float32Array(memory.buffer, statsPtr, batchStats.length).set(batchStats)
  new Uint16Array(memory.buffer, candCodePtr, candCode.length).set(candCode)
  new Float32Array(memory.buffer, candStatsPtr, candStats.length).set(candStats)

  const wasmStart = now()
  e.route_prune_flags(codesPtr, statsPtr, N, codeWidth, transferCount, candCodePtr, candStatsPtr, outByPtr, outCandPtr)
  const wasmMs = now() - wasmStart

  const wasmOut = new Uint8Array(memory.buffer, outByPtr, N)
  let same = true
  for (let i = 0; i < N; i += 1) {
    if (wasmOut[i] !== jsOut[i]) { same = false; break }
  }
  console.log(`route_prune_flags N=${N} js=${jsMs.toFixed(2)}ms wasm=${wasmMs.toFixed(2)}ms same=${same}`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

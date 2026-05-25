interface BlobMotionConfig {
  count?: number
  fitContainer?: boolean
}

export interface BlobMotionPreset {
  tint: Record<string, string>
  blobs: Record<string, string>[]
}

const hashOf = (text: string) => {
  let value = 0
  for (let i = 0; i < text.length; i += 1) value = (value * 33 + text.charCodeAt(i)) % 1000003
  return value
}

const pickInRange = (seed: string, tag: string, min: number, range: number) => min + (hashOf(`${tag}|${seed}|${tag.length}`) % range)

const pickPoint = (seed: string, tag: string, minX: number, rangeX: number, minY: number, rangeY: number) => ({
  x: pickInRange(seed, `${tag}-x`, minX, rangeX),
  y: pickInRange(seed, `${tag}-y`, minY, rangeY),
})

const pushApart = (
  point: { x: number; y: number },
  anchor: { x: number; y: number },
  minDist: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) => {
  const dx = point.x - anchor.x
  const dy = point.y - anchor.y
  const dist = Math.hypot(dx, dy)
  if (dist >= minDist) return point
  const safeDist = dist > 0.001 ? dist : 1
  const factor = minDist / safeDist
  const nextX = Math.round(anchor.x + dx * factor)
  const nextY = Math.round(anchor.y + dy * factor)
  return {
    x: Math.max(minX, Math.min(maxX, nextX)),
    y: Math.max(minY, Math.min(maxY, nextY)),
  }
}

export const createTintVars = (seed: string) => {
  const base = hashOf(`${seed}:hue`)
  const hue = base % 360
  const hueAlt = (hue + 22) % 360
  const tintAngle = 130 + (hashOf(`${seed}:tint-angle`) % 80)
  return {
    '--card-hue': `${hue}`,
    '--card-hue-alt': `${hueAlt}`,
    '--card-tint-angle': `${tintAngle}deg`,
  } as Record<string, string>
}

export const createBlobVars = (seed: string, config: BlobMotionConfig = {}) =>
  Array.from({ length: config.count ?? 3 }, (_, i) => {
    const fitContainer = config.fitContainer ?? false
    const key = `${seed}:b${i}`
    const hueShift = -28 + (hashOf(`${key}:h`) % 57)
    const size = fitContainer ? 30 + (hashOf(`${key}:size`) % 16) : 36 + (hashOf(`${key}:size`) % 24)
    const opacity = (fitContainer ? 0.2 : 0.22) + (hashOf(`${key}:op`) % 25) / 100
    const duration = (fitContainer ? 14 : 11) + (hashOf(`${key}:dur`) % 12)
    const delay = -((hashOf(`${key}:delay`) % 90) / 10)
    const rangeX = fitContainer ? 101 : 157
    const rangeY = fitContainer ? 101 : 149
    const minX = fitContainer ? 0 : -28
    const minY = fitContainer ? 0 : -24
    const maxX = minX + rangeX - 1
    const maxY = minY + rangeY - 1
    const minPointDist = fitContainer ? 22 : 28
    const orbitBias = ((i + 1) * 19) % (fitContainer ? 23 : 31)

    let start = pickPoint(key, 'start', minX, rangeX, minY, rangeY)
    let mid = pickPoint(key, 'mid', minX, rangeX, minY, rangeY)
    let end = pickPoint(key, 'end', minX, rangeX, minY, rangeY)
    start = { x: Math.max(minX, Math.min(maxX, start.x + orbitBias)), y: Math.max(minY, Math.min(maxY, start.y - orbitBias)) }
    mid = { x: Math.max(minX, Math.min(maxX, mid.x - orbitBias)), y: Math.max(minY, Math.min(maxY, mid.y + orbitBias)) }
    end = {
      x: Math.max(minX, Math.min(maxX, end.x + Math.round(orbitBias * 0.5))),
      y: Math.max(minY, Math.min(maxY, end.y + Math.round(orbitBias * 0.5))),
    }
    mid = pushApart(mid, start, minPointDist, minX, maxX, minY, maxY)
    end = pushApart(end, start, minPointDist, minX, maxX, minY, maxY)
    end = pushApart(end, mid, minPointDist * 0.9, minX, maxX, minY, maxY)

    return {
      '--blob-size': `${size}%`,
      '--blob-opacity': `${opacity}`,
      '--blob-hue-shift': `${hueShift}`,
      '--blob-duration': `${duration}s`,
      '--blob-delay': `${delay}s`,
      '--blob-sx': `${start.x}`,
      '--blob-sy': `${start.y}`,
      '--blob-mx': `${mid.x}`,
      '--blob-my': `${mid.y}`,
      '--blob-ex': `${end.x}`,
      '--blob-ey': `${end.y}`,
    } as Record<string, string>
  })

export const createCardMotionPreset = (seed: string): BlobMotionPreset => ({
  tint: createTintVars(seed),
  blobs: createBlobVars(seed, { count: 5, fitContainer: true }),
})

export const createPanelMotionPreset = (seed: string): BlobMotionPreset => ({
  tint: createTintVars(seed),
  blobs: createBlobVars(seed, { count: 5, fitContainer: true }),
})

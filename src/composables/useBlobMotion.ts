export interface BlobMotionConfig {
  count?: number
  fitContainer?: boolean
}

export interface BlobMotionPreset {
  tint: Record<string, string>
  blobs: Record<string, string>[]
}

const hashOf = (text: string) => {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 33 + text.charCodeAt(i)) % 1000003
  }
  return value
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

export const createBlobVars = (seed: string, config: BlobMotionConfig = {}) => {
  const count = config.count ?? 3
  const fitContainer = config.fitContainer ?? false

  return Array.from({ length: count }, (_, i) => {
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

    const sx = minX + (hashOf(`${key}:sx`) % rangeX)
    const sy = minY + (hashOf(`${key}:sy`) % rangeY)
    const mx = minX + (hashOf(`${key}:mx`) % rangeX)
    const my = minY + (hashOf(`${key}:my`) % rangeY)
    const ex = minX + (hashOf(`${key}:ex`) % rangeX)
    const ey = minY + (hashOf(`${key}:ey`) % rangeY)

    return {
      '--blob-size': `${size}%`,
      '--blob-opacity': `${opacity}`,
      '--blob-hue-shift': `${hueShift}`,
      '--blob-duration': `${duration}s`,
      '--blob-delay': `${delay}s`,
      '--blob-sx': `${sx}%`,
      '--blob-sy': `${sy}%`,
      '--blob-mx': `${mx}%`,
      '--blob-my': `${my}%`,
      '--blob-ex': `${ex}%`,
      '--blob-ey': `${ey}%`,
      '--panel-p1x': `${sx}%`,
      '--panel-p1y': `${sy}%`,
      '--panel-p2x': `${mx}%`,
      '--panel-p2y': `${my}%`,
      '--panel-p3x': `${ex}%`,
      '--panel-p3y': `${ey}%`,
    } as Record<string, string>
  })
}

export const createCardMotionPreset = (seed: string): BlobMotionPreset => ({
  tint: createTintVars(seed),
  blobs: createBlobVars(seed, { count: 3, fitContainer: false }),
})

export const createPanelMotionPreset = (seed: string): BlobMotionPreset => ({
  tint: createTintVars(seed),
  blobs: createBlobVars(seed, { count: 3, fitContainer: true }),
})

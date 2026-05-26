import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const srcDir = path.join(rootDir, 'src')

const importPattern = /from\s+['"]([^'"]+)['"]/g

const errors = []

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (!/\.(ts|tsx|js|jsx|vue|mjs|cjs)$/.test(entry.name)) continue
    checkFile(fullPath)
  }
}

const getDomainNameFromPath = (filePath) => {
  const normalized = filePath.split(path.sep).join('/')
  const marker = '/src/domains/'
  const idx = normalized.indexOf(marker)
  if (idx < 0) return null
  const rest = normalized.slice(idx + marker.length)
  const parts = rest.split('/')
  if (parts[0] === 'games') return parts[1] ? `games/${parts[1]}` : null
  return parts[0] ?? null
}

const resolveAliasDomain = (importPath) => {
  if (!importPath.startsWith('@domains/')) return null
  const rest = importPath.slice('@domains/'.length)
  const parts = rest.split('/')
  if (parts[0] === 'games') return parts[1] ? `games/${parts[1]}` : null
  return parts[0] ?? null
}

const isCrossDomainDeepImport = (currentDomain, importPath) => {
  if (!importPath.startsWith('@domains/')) return false
  const targetDomain = resolveAliasDomain(importPath)
  if (!targetDomain || targetDomain === currentDomain) return false
  const expectedFacade = `@domains/${targetDomain}`
  return importPath !== expectedFacade
}

const checkFile = (filePath) => {
  const relPath = path.relative(rootDir, filePath).split(path.sep).join('/')
  const content = fs.readFileSync(filePath, 'utf8')
  const currentDomain = getDomainNameFromPath(filePath)
  const isSharedFile = relPath.startsWith('src/shared/')

  for (const match of content.matchAll(importPattern)) {
    const importPath = match[1]
    if (isSharedFile && importPath.startsWith('@domains/')) {
      errors.push(`${relPath}: shared layer must not depend on domains (${importPath})`)
    }
    if (currentDomain && isCrossDomainDeepImport(currentDomain, importPath)) {
      const targetDomain = resolveAliasDomain(importPath)
      errors.push(`${relPath}: cross-domain import must use facade @domains/${targetDomain} (${importPath})`)
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('src directory not found')
  process.exit(1)
}

walk(srcDir)

if (errors.length > 0) {
  console.error('Architecture boundary check failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Architecture boundary check passed.')

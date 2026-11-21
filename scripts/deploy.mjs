// Builds the app and publishes dist/ to the gh-pages branch (GitHub Pages serves it).
// Usage: npm run deploy
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = cmd => execSync(cmd, { encoding: 'utf8' }).trim()

const root = process.cwd()
const remote = out('git remote get-url origin')
const name = out('git config user.name')
const email = out('git config user.email')

run('npx vite build', root)
const dist = path.join(root, 'dist')
fs.writeFileSync(path.join(dist, '.nojekyll'), '') // serve files as-is

fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true })
run('git init -q -b gh-pages', dist)
run(`git config user.name "${name}"`, dist)
run(`git config user.email "${email}"`, dist)
run('git add -A', dist)
run(`git commit -q -m "Deploy ${new Date().toISOString()}"`, dist)
run(`git push -f -q "${remote}" gh-pages`, dist)
fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true })
console.log('\nDeployed. Live in about a minute at your GitHub Pages address.')

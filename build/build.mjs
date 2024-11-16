import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const run = command => execSync(command, { stdio: 'inherit' })
const resolve = file => path.join(import.meta.dirname, '../packages/html-diff', file)
const p = resolve('tsconfig.json')
const outDir = resolve('dist-ts')
const c = path.join(import.meta.dirname, 'rollup.config.mjs')
const distDir = resolve('dist')

fs.rmSync(distDir, { recursive: true, force: true })
run(`tsc -p ${p} --outDir ${outDir} -d --emitDeclarationOnly`)
run(`rollup -c ${c}`)
fs.rmSync(outDir, { recursive: true, force: true })

process.on('exit', exitCode => {
  if (exitCode === 1) {
    fs.rmSync(distDir, { recursive: true, force: true })
    fs.rmSync(outDir, { recursive: true, force: true })
  }
})

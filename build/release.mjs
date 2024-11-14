import chalk from 'chalk'
import { execSync } from 'child_process'
import enquirer from 'enquirer'
import fs from 'fs'
import path from 'path'
import semver from 'semver'

const { prompt } = enquirer
const run = command => execSync(command, { stdio: 'inherit' })
const stepLog = msg => console.log(chalk.cyan(msg))
const errorLog = msg => console.log(chalk.red(`\nError: ${msg}`))
const successLog = msg => console.log(chalk.green(msg))

// ensure no staged files before commit
if (execSync('git diff --staged').length) {
  errorLog('There has some changes to be committed')
  process.exit(1)
}

const resolve = file => path.join(import.meta.dirname, '../packages/html-diff', file)
const pkgPath = resolve('package.json')
const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const { name: pkgName, version: currentVersion } = pkgJson
let targetVersion

const { level } = await prompt({
  type: 'select',
  name: 'level',
  message: 'Select release level',
  choices: ['prerelease', 'patch', 'prepatch', 'minor', 'preminor', 'major', 'premajor']
    .map(level => {
      const options = undefined
      // prerelease level use beta identifier default
      const identifier = level.startsWith('pre') ? 'beta' : undefined
      return `${level} (${semver.inc(currentVersion, level, options, identifier)})`
    })
    .concat(['custom']),
})

if (level === 'custom') {
  targetVersion = (
    await prompt({
      type: 'input',
      name: 'version',
      message: 'Input custom version',
      initial: currentVersion,
    })
  ).version
} else {
  targetVersion = level.match(/\(([^)]*)\)/)[1]
}

if (!semver.valid(targetVersion)) {
  errorLog(`Invalid target version: ${targetVersion}`)
  process.exit(1)
}

const { tag } = await prompt({
  type: 'select',
  name: 'tag',
  message: 'Select npm dist-tag type',
  choices: ['latest', 'beta', 'next'],
})

const { yes: tagOk } = await prompt({
  type: 'confirm',
  name: 'yes',
  message: `Releasing v${targetVersion} with the "${tag}" tag. Confirm?`,
})

if (!tagOk) {
  process.exit()
}

// check targetVersion (should be larger than current released version)
const viewCmd = `npm v ${pkgName} dist-tags.${tag}`
try {
  const curVersion = execSync(viewCmd, {
    stdio: ['pipe', 'pipe', 'inherit'],
  })
    .toString()
    .trim()
  if (targetVersion === curVersion || semver.lt(targetVersion, curVersion)) {
    errorLog(`The target version ${targetVersion} must be larger than ${curVersion}.`)
    process.exit(1)
  }
} catch (e) {
  // Maybe 404 not found, should publish manually at 1st time
  // npm publish . --access public --tag latest
  errorLog(e.message)
  process.exit(1)
}

// run tests before release
stepLog('\nRunning tests...')
run('pnpm run test')

// Build the package.
stepLog('\nBuilding the package...')
run('pnpm run build')

// Publish the package.
stepLog('\nPublishing the package...')
pkgJson.version = targetVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n')
run(`cd packages/html-diff && npm publish . --access public --tag ${tag}`)

// Commit changes to the Git.
stepLog('\nCommitting changes...')
run('git add packages/html-diff/package.json')
run(`git commit -m "release: v${targetVersion}"`)

// Push to GitHub.
stepLog('\nPushing to GitHub...')
run(`git tag v${targetVersion}`)
run(`git push origin refs/tags/v${targetVersion}`)

successLog(`\nReleased successfully at v${targetVersion}`)
process.exit()

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import chalk from 'chalk'
import semver from 'semver'
import enquirer from 'enquirer'

const { prompt } = enquirer
const run = (command) => execSync(command, { stdio: 'inherit' })
const stepLog = (msg) => console.log(chalk.cyan(msg))
const errorLog = (msg) => console.log(chalk.red(`\nError: ${msg}`))
const successLog = (msg) => console.log(chalk.green(msg))

// ensure no staged files before commit
if (execSync('git diff --staged').length) {
  errorLog('There has some changes to be committed')
  process.exit()
}

const RELEASE_LEVELS = ['prerelease', 'patch', 'prepatch', 'minor', 'preminor', 'major', 'premajor']
const NPM_DIST_TAGS = ['latest', 'beta', 'next']

const publishPkgPath = path.resolve('package.npm.json')
const projectPkgPath = path.resolve('package.json')
const temporaryPath = path.resolve('package.tmp.json')
const parsedPkgJson = JSON.parse(fs.readFileSync(publishPkgPath, 'utf-8'))
const { name: pkgName, version: currentVersion } = parsedPkgJson
let targetVersion

const { level } = await prompt({
  type: 'select',
  name: 'level',
  message: 'Select release level',
  choices: RELEASE_LEVELS.map(level => {
    const options = undefined
    // prerelease level use beta identifier default
    const identifier = level.startsWith('pre') ? 'beta' : undefined
    return `${level} (${semver.inc(currentVersion, level, options, identifier)})`
  }).concat(['custom']),
})

if (level === 'custom') {
  targetVersion = (await prompt({
    type: 'input',
    name: 'version',
    message: 'Input custom version',
    initial: currentVersion,
  })).version
} else {
  targetVersion = level.match(/\(([^)]*)\)/)[1]
}

if (!semver.valid(targetVersion, undefined)) {
  errorLog(`Invalid target version: ${targetVersion}`)
  process.exit()
}

const { tag } = await prompt({
  type: 'select',
  name: 'tag',
  message: 'Select npm dist-tag type',
  choices: NPM_DIST_TAGS,
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
try {
  const currentReleasedVersion = execSync(`npm v ${pkgName} dist-tags.${tag}`, { stdio: 'ignore' }).toString().trim()
  if (targetVersion === currentReleasedVersion || semver.lt(targetVersion, targetVersion, undefined)) {
    errorLog(`The target version ${targetVersion} must be larger than ${currentReleasedVersion}.`)
    process.exit()
  }
} catch (e) {
  // Maybe not found, continue
}

// run tests before release
stepLog('\nRunning tests...')
run('jest --clearCache')
run('jest --bail')

// Build the package.
stepLog('\nBuilding the package...')
run('pnpm run build')

// Publish the package.
stepLog('\nPublishing the package...')
parsedPkgJson.version = targetVersion
fs.writeFileSync(publishPkgPath, JSON.stringify(parsedPkgJson, null, 2) + '\n')
fs.renameSync(projectPkgPath, temporaryPath)
fs.renameSync(publishPkgPath, projectPkgPath)
run(`npm publish . --access public --tag ${tag}`)
fs.renameSync(projectPkgPath, publishPkgPath)
fs.renameSync(temporaryPath, projectPkgPath)

// Commit changes to the Git.
stepLog('\nCommitting changes...')
run('git add package.npm.json')
run(`git commit -m "release: v${targetVersion}"`)

// Push to GitHub.
stepLog('\nPushing to GitHub...')
run(`git tag v${targetVersion}`)
run(`git push origin refs/tags/v${targetVersion}`)
// run('git push')

successLog(`\nReleased successfully at v${targetVersion}`)
process.exit()

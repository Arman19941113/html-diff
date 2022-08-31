import fs from 'fs'
import path from 'path'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
import rollupPostcss from 'rollup-plugin-postcss'
import postcssPresetEnv from 'postcss-preset-env'
import postcssNested from 'postcss-nested'
import cssnano from 'cssnano'

const npmPkgPath = path.resolve('package.npm.json')
const npmPkg = JSON.parse(fs.readFileSync(npmPkgPath, 'utf-8'))
const pkgName = npmPkg.name
const outputName = pkgName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')

const devTasks = {
  input: 'src/index.ts',
  external: ['vue'],
  output: [
    {
      name: outputName,
      file: 'dist/index.global.js',
      format: 'iife',
      globals: { vue: 'Vue' },
    },
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
    },
  ],
  plugins: [
    nodeResolve(),
    typescript(),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('development'),
      },
    }),
  ],
}

const prodTasks = {
  input: 'src/index.ts',
  external: ['vue'],
  output: [
    {
      name: outputName,
      file: 'dist/index.global.prod.js',
      format: 'iife',
      globals: { vue: 'Vue' },
    },
    {
      file: 'dist/index.cjs.prod.js',
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.prod.js',
      format: 'es',
    },
  ],
  plugins: [
    nodeResolve(),
    typescript(),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    }),
    terser(),
  ],
}

const styleTask = {
  input: 'src/index.css',
  output: {
    file: 'dist/index.css',
    format: 'es',
  },
  plugins: [
    rollupPostcss({
      extract: true,
      plugins: [
        postcssNested,
        postcssPresetEnv({
          stage: 0,
        }),
        cssnano,
      ],
    }),
  ],
}

export default [
  devTasks,
  prodTasks,
  styleTask,
]

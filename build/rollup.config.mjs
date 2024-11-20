import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import path from 'path'
import postcssNested from 'postcss-nested'
import postcssPresetEnv from 'postcss-preset-env'
import { dts } from 'rollup-plugin-dts'
import rollupPostcss from 'rollup-plugin-postcss'

const resolve = file => path.join(import.meta.dirname, '../packages/html-diff', file)

const dtsTask = {
  input: resolve('dist-ts/src/index.d.ts'),
  output: {
    file: resolve('dist/index.d.ts'),
    format: 'es',
  },
  plugins: [dts()],
}

const mjsTask = {
  input: resolve('src/index.ts'),
  output: {
    file: resolve('dist/index.mjs'),
    format: 'es',
  },
  plugins: [
    typescript({
      tsconfig: resolve('tsconfig.json'),
      compilerOptions: {
        'removeComments': true,
      },
    }), nodeResolve(),
  ],
}

const cssTask = {
  input: resolve('src/index.css'),
  output: {
    file: resolve('dist/index.css'),
    format: 'es',
  },
  plugins: [
    rollupPostcss({
      extract: true,
      plugins: [
        postcssNested, postcssPresetEnv({
          stage: 2,
          enableClientSidePolyfills: true,
          browsers: '> 0.5%, last 2 versions, not dead',
        }),
      ],
    }),
  ],
}

export default [dtsTask, mjsTask, cssTask]

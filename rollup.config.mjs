import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

import rollupPostcss from 'rollup-plugin-postcss'
import postcssPresetEnv from 'postcss-preset-env'
import postcssNested from 'postcss-nested'
import cssnano from 'cssnano'

const plugins = [
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  }),
  typescript({
    compilerOptions: {
      removeComments: true,
    },
  }),
  nodeResolve(),
]

const browserTask = {
  input: 'src/index.ts',
  output: {
    name: 'HtmlDiff',
    file: 'dist/index.global.js',
    format: 'iife',
    plugins: [terser()],
  },
  plugins,
}

const jsTasks = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
    },
  ],
  plugins,
}

const cssTask = {
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
  browserTask,
  jsTasks,
  cssTask,
]

import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
import rollupPostcss from 'rollup-plugin-postcss'
import postcssNested from 'postcss-nested'
import cssnano from 'cssnano'

const bundlerTasks = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.esm-bundler.js',
    format: 'es',
  },
  plugins: [
    typescript(),
  ],
}

const normalTasks = {
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
  plugins: [
    typescript({
      compilerOptions: {
        removeComments: true,
      },
    }),
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    }),
  ],
}

const iifeTasks = {
  input: 'src/index.ts',
  output: {
    name: 'HtmlDiff',
    file: 'dist/index.iife.js',
    format: 'iife',
  },
  plugins: [
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
        cssnano,
      ],
    }),
  ],
}

export default [
  bundlerTasks,
  normalTasks,
  iifeTasks,
  styleTask,
]

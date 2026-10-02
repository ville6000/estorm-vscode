// Builds the extension (out/), the bundled language server (out/server.mjs)
// and the shared preview page (media/). Flags: --watch, --production.
import { rmSync } from 'node:fs';
import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

const common = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
};

const builds = [
  {
    ...common,
    entryPoints: ['src/extension.ts'],
    outfile: 'out/extension.js',
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
  },
  {
    ...common,
    entryPoints: ['src/server.ts'],
    outfile: 'out/server.mjs',
    platform: 'node',
    format: 'esm',
    target: 'node20',
  },
  {
    ...common,
    entryPoints: {
      preview: 'preview/main.ts',
      ...(production ? {} : { dev: 'preview/dev.ts' }),
    },
    outdir: 'media',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
  },
  {
    ...common,
    entryPoints: { preview: 'preview/style.css' },
    outdir: 'media',
  },
];

for (const dir of ['out', 'media']) rmSync(dir, { recursive: true, force: true });

if (watch) {
  for (const options of builds) await (await esbuild.context(options)).watch();
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
}

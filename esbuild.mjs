// Builds the extension (out/) and the bundled language server
// (out/server.mjs), and copies estorm's preview page into media/.
// Flags: --watch, --production.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
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
];

for (const dir of ['out', 'media']) rmSync(dir, { recursive: true, force: true });

// The page every editor shows, built by estorm (see its EDITORS.md).
const embed = dirname(createRequire(import.meta.url).resolve('@villev/estorm/embed/preview.js'));
mkdirSync('media');
for (const file of ['preview.js', 'preview.css']) cpSync(join(embed, file), join('media', file));

if (watch) {
  for (const options of builds) await (await esbuild.context(options)).watch();
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
}

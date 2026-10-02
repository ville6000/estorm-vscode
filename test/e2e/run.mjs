// Runs test/e2e/suite.cjs inside VS Code, with the extension loaded from
// this folder. Uses VS Code from VSCODE_PATH, the usual macOS install, or a
// downloaded copy; VSCODE_VERSION (e.g. 1.91.0, or "min" for the oldest in
// engines.vscode) downloads that version instead. A fresh profile each
// time, so your own setup is untouched.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mac = '/Applications/Visual Studio Code.app/Contents/MacOS/Code';
const min = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).engines.vscode.replace(/^\D+/, '');
const version = process.env.VSCODE_VERSION === 'min' ? min : process.env.VSCODE_VERSION;
const vscodeExecutablePath = version ? undefined : (process.env.VSCODE_PATH ?? (existsSync(mac) ? mac : undefined));

await runTests({
  vscodeExecutablePath,
  version,
  extensionDevelopmentPath: root,
  extensionTestsPath: join(root, 'test/e2e/suite.cjs'),
  launchArgs: [
    join(root, 'test/grammar'),
    '--disable-extensions',
    '--skip-welcome',
    '--user-data-dir',
    mkdtempSync(join(tmpdir(), 'estorm-e2e-')),
  ],
});

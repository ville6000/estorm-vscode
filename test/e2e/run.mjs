// Runs test/e2e/suite.cjs inside VS Code, with the extension loaded from
// this folder. Uses VS Code from VSCODE_PATH, the usual macOS install, or a
// downloaded copy. A fresh profile each time, so your own setup is untouched.
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mac = '/Applications/Visual Studio Code.app/Contents/MacOS/Code';
const vscodeExecutablePath = process.env.VSCODE_PATH ?? (existsSync(mac) ? mac : undefined);

await runTests({
  vscodeExecutablePath,
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

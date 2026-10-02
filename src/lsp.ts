/**
 * Runs `estorm lsp` for .estorm files: semantic tokens, parse errors and
 * lint warnings, and highlights of the event under the cursor. By default
 * the server bundled in out/server.mjs runs on VS Code's own Node.js.
 */
import * as vscode from 'vscode';
import { LanguageClient, TransportKind, type ServerOptions } from 'vscode-languageclient/node';

/** Splits a command line into words, honouring single and double quotes. */
export function words(command: string): string[] {
  return [...command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}

function serverOptions(context: vscode.ExtensionContext): ServerOptions {
  const custom = vscode.workspace.getConfiguration('estorm').get<string>('server.command', '').trim();
  if (custom === '') {
    return {
      module: context.asAbsolutePath('out/server.mjs'),
      transport: TransportKind.stdio,
    };
  }
  const [command = '', ...args] = words(custom);
  // No transport: stdio without the --stdio argument, which `estorm lsp` rejects.
  return {
    command,
    args,
    options: { cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath, shell: process.platform === 'win32' },
  };
}

export class Server implements vscode.Disposable {
  private client: LanguageClient | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async start(): Promise<void> {
    this.client = new LanguageClient('estorm', 'estorm', serverOptions(this.context), {
      documentSelector: [{ language: 'estorm' }],
    });
    await this.client.start();
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async stop(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    if (client?.isRunning()) await client.stop();
  }

  dispose(): void {
    void this.stop();
  }
}

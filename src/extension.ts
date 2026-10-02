import * as vscode from 'vscode';
import { Server } from './lsp.ts';
import { Previews } from './preview.ts';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const previews = new Previews(context);
  const server = new Server(context);

  context.subscriptions.push(
    previews,
    server,
    vscode.window.registerWebviewPanelSerializer('estorm.preview', previews),
    vscode.commands.registerCommand('estorm.openPreview', (uri?: vscode.Uri) => previews.show(uri, false)),
    vscode.commands.registerCommand('estorm.openPreviewToSide', (uri?: vscode.Uri) => previews.show(uri, true)),
    vscode.commands.registerCommand('estorm.restartServer', () => server.restart()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('estorm.server')) void server.restart();
    }),
  );

  try {
    await server.start();
  } catch (e) {
    void vscode.window.showErrorMessage(
      `estorm: the language server didn't start: ${e instanceof Error ? e.message : e}`,
    );
  }
}

export function deactivate(): Promise<void> | undefined {
  return undefined;
}

/**
 * Live previews of .estorm files, one webview per file. The board is
 * rendered here with estorm and sent to the shared page in preview/ (see
 * preview/PROTOCOL.md), which shows it and reports clicks on stickies.
 */
import { ParseError, render } from '@villev/estorm';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ToHost, ToPage } from '../preview/protocol.ts';

const VIEW_TYPE = 'estorm.preview';
const DELAY_MS = 150;

/** Kept by the page so the preview can be restored when VS Code restarts. */
interface State {
  uri: string;
}

function nonce(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class Preview {
  private readonly disposables: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    readonly panel: vscode.WebviewPanel,
    readonly uri: vscode.Uri,
    media: vscode.Uri,
    onDispose: () => void,
  ) {
    const { webview } = panel;
    webview.options = { enableScripts: true, localResourceRoots: [media] };
    panel.title = `Preview ${path.basename(uri.fsPath)}`;
    panel.iconPath = vscode.Uri.joinPath(media, '..', 'icons', 'estorm.svg');

    const n = nonce();
    webview.html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${n}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(media, 'preview.css'))}">
</head>
<body>
<script nonce="${n}">
  const vscode = acquireVsCodeApi();
  window.estormHost = { post: (msg) => vscode.postMessage(msg), setState: (state) => vscode.setState(state) };
</script>
<script nonce="${n}" src="${webview.asWebviewUri(vscode.Uri.joinPath(media, 'preview.js'))}"></script>
</body>
</html>`;

    this.disposables.push(
      webview.onDidReceiveMessage((msg: ToHost) => this.receive(msg)),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === uri.toString()) this.schedule();
      }),
      panel.onDidDispose(() => {
        clearTimeout(this.timer);
        for (const d of this.disposables) d.dispose();
        onDispose();
      }),
    );
  }

  private send(msg: ToPage): void {
    void this.panel.webview.postMessage(msg);
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.update(), DELAY_MS);
  }

  async update(): Promise<void> {
    let text: string;
    try {
      text = (await vscode.workspace.openTextDocument(this.uri)).getText();
    } catch {
      this.send({ type: 'error', line: 0, message: `cannot read ${path.basename(this.uri.fsPath)}` });
      return;
    }
    try {
      this.send({ type: 'render', svg: render(text) });
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;
      this.send({ type: 'error', line: e.line, message: e.message });
    }
  }

  private async receive(msg: ToHost): Promise<void> {
    switch (msg.type) {
      case 'ready':
        this.send({ type: 'state', state: { uri: this.uri.toString() } satisfies State });
        await this.update();
        break;
      case 'reveal':
        await this.reveal(msg.line);
        break;
    }
  }

  /** Shows LINE (1-based) in an editor beside the preview, selecting the line. */
  private async reveal(line: number): Promise<void> {
    const document = await vscode.workspace.openTextDocument(this.uri);
    const at = Math.min(Math.max(line - 1, 0), document.lineCount - 1);
    const { range } = document.lineAt(at);
    const start = range.start.translate(0, document.lineAt(at).firstNonWhitespaceCharacterIndex);
    const shown = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === this.uri.toString());
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn: shown?.viewColumn ?? vscode.ViewColumn.One,
      selection: new vscode.Selection(start, range.end),
    });
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}

export class Previews implements vscode.WebviewPanelSerializer<State>, vscode.Disposable {
  private readonly open = new Map<string, Preview>();
  private readonly media: vscode.Uri;

  constructor(context: vscode.ExtensionContext) {
    this.media = vscode.Uri.joinPath(context.extensionUri, 'media');
  }

  /** Opens or reveals the preview of URI (default: the active .estorm editor's file). */
  show(uri: vscode.Uri | undefined, toSide: boolean): void {
    const target = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!target) {
      void vscode.window.showInformationMessage('Open an .estorm file to preview it.');
      return;
    }
    const column = toSide ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;
    const existing = this.open.get(target.toString());
    if (existing) {
      existing.panel.reveal(column, toSide);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      'Preview',
      { viewColumn: column, preserveFocus: toSide },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [this.media] },
    );
    this.attach(panel, target);
  }

  async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: State | undefined): Promise<void> {
    if (!state?.uri) {
      panel.dispose();
      return;
    }
    this.attach(panel, vscode.Uri.parse(state.uri));
  }

  private attach(panel: vscode.WebviewPanel, uri: vscode.Uri): void {
    const key = uri.toString();
    this.open.set(key, new Preview(panel, uri, this.media, () => this.open.delete(key)));
  }

  dispose(): void {
    for (const preview of this.open.values()) preview.panel.dispose();
  }
}

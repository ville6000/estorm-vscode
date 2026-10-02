// End-to-end checks inside VS Code: the bundled language server answers,
// and the preview opens. Run by run.mjs.
const assert = require('node:assert/strict');
const path = require('node:path');
const vscode = require('vscode');

const folder = path.join(__dirname, '..', 'grammar');

/** Retries CHECK until it returns something truthy, or fails after a while. */
async function until(what, check, ms = 15000) {
  const end = Date.now() + ms;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

const tests = {
  async 'opens .estorm files as estorm'() {
    const doc = await vscode.workspace.openTextDocument(path.join(folder, 'checkout.estorm'));
    assert.equal(doc.languageId, 'estorm');
  },

  async 'colours with semantic tokens from the server'() {
    const doc = await vscode.workspace.openTextDocument(path.join(folder, 'checkout.estorm'));
    await vscode.window.showTextDocument(doc);
    const legend = await until('a token legend', () =>
      vscode.commands.executeCommand('vscode.provideDocumentSemanticTokensLegend', doc.uri),
    );
    assert.ok(legend.tokenTypes.includes('event'));
    const tokens = await until('semantic tokens', async () => {
      const t = await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', doc.uri);
      return t?.data.length ? t : undefined;
    });
    assert.ok(tokens.data.length > 50);
  },

  async 'reports parse errors as you type'() {
    const doc = await vscode.workspace.openTextDocument({
      language: 'estorm',
      content: 'Customer: Order -> Ordered\n',
    });
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((e) => e.insert(new vscode.Position(1, 0), '  then ->\n'));
    const diagnostics = await until('a diagnostic', () => {
      const d = vscode.languages.getDiagnostics(doc.uri);
      return d.length ? d : undefined;
    });
    assert.equal(diagnostics[0].range.start.line, 1);
    assert.equal(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
    assert.equal(diagnostics[0].source, 'estorm');
  },

  async 'highlights every mention of the event under the cursor'() {
    const doc = await vscode.workspace.openTextDocument(path.join(folder, 'checkout.estorm'));
    const line = doc
      .getText()
      .split('\n')
      .findIndex((l) => l.startsWith('when PaymentCaptured'));
    const highlights = await until('highlights', () =>
      vscode.commands.executeCommand('vscode.executeDocumentHighlights', doc.uri, new vscode.Position(line, 7)),
    );
    assert.equal(highlights.length, 3);
  },

  async 'opens the preview beside the file'() {
    const doc = await vscode.workspace.openTextDocument(path.join(folder, 'checkout.estorm'));
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand('estorm.openPreviewToSide');
    const tab = await until('a preview tab', () =>
      vscode.window.tabGroups.all
        .flatMap((g) => g.tabs)
        .find((t) => t.input instanceof vscode.TabInputWebview && t.input.viewType.endsWith('estorm.preview')),
    );
    assert.equal(tab.label, 'Preview checkout.estorm');
    assert.equal(tab.group.viewColumn, vscode.ViewColumn.Two);

    // Opening it again reveals the same preview.
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await vscode.commands.executeCommand('estorm.openPreviewToSide');
    const previews = vscode.window.tabGroups.all.flatMap((g) => g.tabs).filter((t) => t.label === tab.label);
    assert.equal(previews.length, 1);
  },

  async 'runs another server from estorm.server.command'() {
    const cli = path.join(__dirname, '..', '..', 'node_modules', '@villev', 'estorm', 'dist', 'cli.js');
    const config = vscode.workspace.getConfiguration('estorm');
    await config.update('server.command', `node "${cli}" lsp`, vscode.ConfigurationTarget.Global);
    try {
      const doc = await vscode.workspace.openTextDocument({ language: 'estorm', content: 'Customer: Order\n' });
      await vscode.window.showTextDocument(doc);
      const diagnostics = await until('a diagnostic from the other server', () => {
        const d = vscode.languages.getDiagnostics(doc.uri);
        return d.length ? d : undefined;
      });
      assert.equal(diagnostics[0].source, 'estorm');
    } finally {
      await config.update('server.command', undefined, vscode.ConfigurationTarget.Global);
    }
  },
};

exports.run = async function run() {
  const failures = [];
  for (const [name, test] of Object.entries(tests)) {
    try {
      await test();
      console.log(`  ✔ ${name}`);
    } catch (e) {
      console.log(`  ✖ ${name}\n    ${e.stack ?? e}`);
      failures.push(name);
    }
  }
  if (failures.length) throw new Error(`${failures.length} of ${Object.keys(tests).length} failed`);
};

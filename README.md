# estorm for VS Code

Support for [estorm](https://github.com/ville6000/estorm) boards (`.estorm`),
a plain-text notation for Event Storming.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/villev.estorm)](https://marketplace.visualstudio.com/items?itemName=villev.estorm)

Install from the
[Marketplace](https://marketplace.visualstudio.com/items?itemName=villev.estorm),
or run `ext install villev.estorm` in Quick Open (<kbd>Ctrl/Cmd</kbd>+<kbd>P</kbd>).

- Each part of a line coloured like the sticky it becomes
- Parse errors and modelling warnings as you type
- Every mention of the event under the cursor highlighted
- Completion of keywords, and of events, aggregates, externals and actors
  already on the board
- Live preview of the board beside the text: **estorm: Open Preview to the
  Side** (<kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> <kbd>V</kbd>) or the button in
  the editor title. Click a sticky to jump to its line; zoom with the
  toolbar or <kbd>Ctrl/Cmd</kbd> + wheel.
- Line comments with `#`

Colours come from a TextMate grammar at once, then from `estorm lsp`,
estorm's language server, which also reports errors, highlights events and
completes names.
The server is bundled and runs on VS Code's own Node.js: nothing to install.

## Colours

Sticky types map to common scopes, so most themes colour them. To use the
sticky colours of the board instead:

```jsonc
"editor.semanticTokenColorCustomizations": {
  "[Default Light Modern]": {
    "rules": {
      "command:estorm": "#1864ab",
      "event:estorm": { "foreground": "#a33b0b" },
      "schedule:estorm": "#6741d9",
      "external:estorm": { "italic": true },
      "hotspot:estorm": "#c92a2a",
      "rule:estorm": "#946800",
      "section:estorm": { "bold": true }
    }
  }
}
```

Token types: `actor`, `command`, `aggregate`, `external`, `event`,
`readModel`, `schedule`, `hotspot`, `rule`, `section`, plus the standard
`comment`, `keyword` and `operator`.

## Settings

| Setting                 | Default | Does                                                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `estorm.server.command` | empty   | Command for another language server, run in the workspace folder, e.g. `node /path/to/estorm/src/cli.ts lsp` |

## Development

Needs Node.js 22.18 or later.

```sh
npm install
npm run build      # out/ (extension, bundled server) and media/ (preview)
npm run watch
npm run check      # typecheck, prettier, grammar tests
npm run test:e2e   # in VS Code: server, diagnostics, highlights, preview
npm run test:e2e:min  # the same in the oldest VS Code in engines.vscode
npm run package    # estorm-<version>.vsix
```

Press <kbd>F5</kbd> in VS Code to run the extension in a new window
(`.vscode/launch.json`).

| Path                              | Does                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- |
| `syntaxes/estorm.tmLanguage.json` | TextMate grammar, same tokens as estorm's `src/highlight.ts`           |
| `src/lsp.ts`                      | starts `estorm lsp`                                                    |
| `src/preview.ts`                  | preview webviews: renders the board, jumps to clicked lines            |
| `preview/`                        | the preview page, shared with other editors; see `preview/PROTOCOL.md` |
| `test/e2e/`                       | end-to-end tests in a real VS Code (local install, or downloaded)      |
| `test/parity.test.mjs`            | the grammar must tokenize `test/grammar/*.estorm` like estorm itself   |

Token types must match `TOKEN_TYPES` in estorm's `src/lsp.ts`, and grammar
scopes must match `semanticTokenScopes` in `package.json`.

`preview/index.html` shows the preview page in a plain browser, with a text
box standing in for the editor (after `npm run build`).

## Releasing

1. Add the version's changes to `CHANGELOG.md` under `## <version>`
2. `npm version patch` (or `minor`, `major`): bumps `package.json`, commits
   and tags `v<version>`
3. `git push --follow-tags`

The tag runs `.github/workflows/publish.yml`: checks, publishes to the
Marketplace with the `VSCE_PAT` secret and creates a GitHub release with the
`.vsix` and the changelog section.

## License

[MIT](LICENSE)

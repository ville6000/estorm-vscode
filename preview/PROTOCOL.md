# The preview page

`preview/` is the live preview UI, written once for every editor that can
show a web page: VS Code's webview now, a JetBrains JCEF browser next. It
uses no editor API. `npm run build` writes it to `media/preview.js` and
`media/preview.css`; an editor ships those two files.

The page draws the board it is sent, keeps the last good board (dimmed)
under an error bar while the text doesn't parse, zooms (toolbar or
Ctrl/Cmd + wheel), and asks the editor to show a sticky's line when it is
clicked. The editor parses and renders; the page never sees the text.

## Hosting it

The page builds its own DOM, so the host's HTML only loads the files and
defines `window.estormHost` before `preview.js` runs:

```html
<link rel="stylesheet" href="preview.css" />
<script>
  window.estormHost = {
    post(msg) {
      /* to the editor */
    },
    setState(state) {
      /* optional */
    },
  };
</script>
<script src="preview.js"></script>
```

`preview/index.html` with `preview/dev.ts` is such a host in a plain browser.
VS Code's is in `src/preview.ts`.

## Messages

Types are in `protocol.ts`.

Editor → page, with `window.postMessage(msg, '*')`:

| Message                                            | Meaning                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `{ type: 'render', svg: string }`                  | New board, from estorm's `render()`; clears the error     |
| `{ type: 'error', line: number, message: string }` | `ParseError`'s line and message; last board stays, dimmed |
| `{ type: 'state', state: unknown }`                | Passed to `estormHost.setState`, for restoring later      |

Page → editor, through `window.estormHost.post(msg)`:

| Message                            | Meaning                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `{ type: 'ready' }`                | Listening; send the board. Sent again after a page reload. |
| `{ type: 'reveal', line: number }` | A sticky, lane or the error bar was clicked; 1-based line  |

## In JetBrains IDEs (to do)

- `JBCefBrowser` loads HTML that inlines `preview.css` and `preview.js` from
  the plugin's resources (or serves them from a `CefResourceHandler`).
- `window.estormHost.post` calls a `JBCefJSQuery`:
  `post: (msg) => <query.inject("JSON.stringify(msg)")>`; the handler
  parses the JSON, and on `reveal` moves the caret to the line.
- Board updates: render in the IDE with `npx @villev/estorm render <file> -o -`,
  or add a `textDocument/preview`-style request to `estorm lsp`, then
  `browser.cefBrowser.executeJavaScript("postMessage(" + json + ", '*')", ...)`.
- Theme variables in `style.css` fall back to light colours; a JetBrains host
  can define `--vscode-*` variables (or the page's own `--bg`, `--fg`, …) to
  follow the IDE theme.

/**
 * Messages between the preview page and the editor hosting it. The page
 * knows nothing about the editor, so the same build runs in a VS Code
 * webview and in a JetBrains JCEF browser. See PROTOCOL.md.
 */

/** Editor -> page, delivered with window.postMessage. */
export type ToPage =
  /** A new diagram; replaces the shown one and clears any error. */
  | { type: 'render'; svg: string }
  /** The text doesn't parse (LINE 0: not tied to a line); the last diagram stays, dimmed. */
  | { type: 'error'; line: number; message: string }
  /** Opaque state the page keeps for the editor, e.g. to restore after a reload. */
  | { type: 'state'; state: unknown };

/** Page -> editor, through window.estormHost.post. */
export type ToHost =
  /** The page is listening; send the diagram. */
  | { type: 'ready' }
  /** A sticky or lane was clicked: show its 1-based source line. */
  | { type: 'reveal'; line: number };

/** What the editor provides as window.estormHost before the page script runs. */
export interface Host {
  post(msg: ToHost): void;
  /** Keeps state across reloads, where the editor supports it. */
  setState?(state: unknown): void;
}

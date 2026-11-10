# Changelog

## 0.4.0

- estorm 0.21: go to definition from an event to the steps that produce it,
  and rename of events, aggregates, externals and actors everywhere on the
  board; a policy sticky grows to fit its label
- The preview page now comes with estorm, shared with the JetBrains plugin

## 0.3.0

- estorm 0.16: `when` reacts to a comma-separated list of events, and a
  chain can end in several events, stacked in one column on the board

## 0.2.1

- estorm 0.14: a schedule ends at the last colon on its line, brackets are
  rejected inside aggregate and external names, and `when` events match
  whole names on broken lines

## 0.2.0

- estorm 0.13: boards have a legend of sticky colours and arrows, and
  sections are drawn as horizontal swimlanes on one time axis
- Preview: drag to pan; zoom with Ctrl/Cmd + wheel or a pinch, around the
  pointer, up to 400%; click a section's name to fit it
- Preview lists every parse error, not only the first

## 0.1.1

- README: how to install from the Marketplace

## 0.1.0

- Syntax highlighting: TextMate grammar and `estorm lsp` semantic tokens
- Parse errors, lint warnings, event highlights and completion from
  `estorm lsp`, bundled
- Live preview with click-to-line and zoom

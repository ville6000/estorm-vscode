// The TextMate grammar must colour every line like estorm's own tokenizer
// (src/highlight.ts), which the language server and the browser editor use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vsctm from 'vscode-textmate';
import oniguruma from 'vscode-oniguruma';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
// Not in the package's exports, so imported by path.
const { tokenize } = await import(new URL('node_modules/@villev/estorm/dist/highlight.js', root));

/** tokenize() kinds as the grammar's scopes, without the .estorm suffix. */
const SCOPE = {
  comment: 'comment.line.number-sign',
  keyword: 'keyword.control',
  arrow: 'keyword.operator.arrow',
  punct: 'punctuation.separator.colon',
  section: 'markup.heading.section',
  actor: 'variable.other.actor',
  command: 'entity.name.function.command',
  aggregate: 'entity.name.type.aggregate',
  external: 'support.class.external',
  event: 'string.unquoted.event',
  'read-model': 'entity.other.attribute-name.read-model',
  schedule: 'constant.language.schedule',
  hotspot: 'markup.deleted.hotspot',
  rule: 'markup.quote.rule',
};

const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
await oniguruma.loadWASM(wasm);
const registry = new vsctm.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (sources) => new oniguruma.OnigScanner(sources),
    createOnigString: (s) => new oniguruma.OnigString(s),
  }),
  loadGrammar: async () =>
    vsctm.parseRawGrammar(readFileSync(new URL('syntaxes/estorm.tmLanguage.json', root), 'utf8'), 'estorm.json'),
});
const grammar = await registry.loadGrammar('source.estorm');

/** [scope, text] per run of one estorm scope, whitespace trimmed, like tokenize(). */
function grammarTokens(line) {
  const out = [];
  for (const t of grammar.tokenizeLine(line, vsctm.INITIAL).tokens) {
    const scope = t.scopes.findLast((s) => s.endsWith('.estorm') && s !== 'source.estorm');
    if (!scope) continue;
    // keyword.control.then.estorm -> keyword.control
    const name = Object.values(SCOPE).find((s) => scope.startsWith(s + '.'));
    const text = line.slice(t.startIndex, t.endIndex);
    const last = out.at(-1);
    if (last && last.name === name && last.end === t.startIndex) {
      last.text += text;
      last.end = t.endIndex;
    } else {
      out.push({ name, text, end: t.endIndex });
    }
  }
  return out.map(({ name, text }) => [name, text.trim()]).filter(([, text]) => text !== '');
}

const expected = (line) => tokenize(line).map((t) => [SCOPE[t.kind], line.slice(t.from, t.to)]);

const dir = new URL('grammar/', import.meta.url);
for (const file of readdirSync(dir).filter((f) => f.endsWith('.estorm'))) {
  test(file, () => {
    readFileSync(new URL(file, dir), 'utf8')
      .split(/\r?\n/)
      .forEach((line, n) => assert.deepEqual(grammarTokens(line), expected(line), `line ${n + 1}: ${line}`));
  });
}

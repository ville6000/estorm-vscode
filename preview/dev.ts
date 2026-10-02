/**
 * A stand-in editor for preview/index.html: an iframe-free host that renders
 * a text box with estorm and sends the result to the page, the way the
 * VS Code and JetBrains hosts do.
 */
import { ParseError, render } from '@villev/estorm';
import type { ToPage } from './protocol.ts';

const EXAMPLE = `== Sales ==
{Shopping cart}
Customer: Place order -> (Order) -> OrderPlaced
  after 30 minutes unless PaymentCaptured
    then Cancel unpaid order -> (Order) -> OrderCancelled

== Payments ==
when OrderPlaced
  then Charge card -> [Payment provider] -> PaymentCaptured
  ! What if the charge succeeds but our callback times out?
`;

const editor = Object.assign(document.createElement('textarea'), { value: EXAMPLE, spellcheck: false });
editor.style.cssText = 'position:fixed;left:8px;bottom:8px;width:360px;height:200px;z-index:1;font:12px monospace';

const send = (msg: ToPage) => window.postMessage(msg, '*');

function update(): void {
  try {
    send({ type: 'render', svg: render(editor.value) });
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    send({ type: 'error', line: e.line, message: e.message });
  }
}

window.estormHost = {
  post(msg) {
    console.log('page ->', msg);
    if (msg.type === 'ready') update();
    if (msg.type === 'reveal') {
      const lines = editor.value.split('\n');
      const from = lines.slice(0, msg.line - 1).join('\n').length + (msg.line > 1 ? 1 : 0);
      editor.focus();
      editor.setSelectionRange(from, from + (lines[msg.line - 1]?.length ?? 0));
    }
  },
};

document.addEventListener('DOMContentLoaded', () => document.body.append(editor));
editor.addEventListener('input', update);

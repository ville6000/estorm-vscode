/**
 * The live preview page: shows the board the editor sends, keeps the last
 * good one (dimmed) while the text doesn't parse, zooms, and asks the editor
 * to show a sticky's line when it is clicked. Builds its own DOM, so a host
 * only has to load preview.css, define window.estormHost and load this.
 */
import type { Host, PreviewError, ToPage } from './protocol.ts';

declare global {
  interface Window {
    estormHost?: Host;
  }
}

const host: Host = window.estormHost ?? { post: (msg) => console.log('estorm preview:', msg) };

const ZOOMS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2, 3];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) {
  return Object.assign(document.createElement(tag), props);
}

const board = element('div', { className: 'board' });
const diagram = element('div', { className: 'diagram' });
const errors = element('div', { className: 'errors', hidden: true });
const zoomOut = element('button', { type: 'button', title: 'Zoom out', textContent: '−' });
const zoomLabel = element('button', { type: 'button', title: 'Actual size', className: 'zoom' });
const zoomIn = element('button', { type: 'button', title: 'Zoom in', textContent: '+' });
const fit = element('button', { type: 'button', title: 'Fit to width', textContent: 'Fit' });
const toolbar = element('div', { className: 'toolbar' });
toolbar.append(zoomOut, zoomLabel, zoomIn, fit);
board.append(diagram);
document.body.append(board, toolbar, errors);

/** A zoom factor, or 'fit' to scale the board to the width of the page. */
let zoom: number | 'fit' = 'fit';

const svgElement = () => diagram.querySelector('svg');
const naturalWidth = () => Number(svgElement()?.getAttribute('width')) || 0;
/** Padding around the board, in .diagram in style.css. */
const PADDING = 16;
const currentScale = () => {
  if (zoom !== 'fit') return zoom;
  const room = board.clientWidth - 2 * PADDING;
  return naturalWidth() > 0 ? Math.min(1, room / naturalWidth()) : 1;
};

function applyZoom(): void {
  const svg = svgElement();
  if (svg) {
    svg.style.width = `${naturalWidth() * currentScale()}px`;
    svg.style.height = 'auto';
  }
  zoomLabel.textContent = `${Math.round(currentScale() * 100)}%`;
  fit.classList.toggle('active', zoom === 'fit');
}

/** Zooms to SCALE, keeping the board point under (X, Y) in the viewport where it is. */
function zoomTo(scale: number, x = board.clientWidth / 2, y = board.clientHeight / 2): void {
  const before = currentScale();
  const px = (board.scrollLeft + x) / before;
  const py = (board.scrollTop + y) / before;
  zoom = scale;
  applyZoom();
  board.scrollLeft = px * scale - x;
  board.scrollTop = py * scale - y;
}

function step(direction: 1 | -1): number {
  const now = currentScale();
  const next = direction > 0 ? ZOOMS.find((z) => z > now + 0.001) : ZOOMS.findLast((z) => z < now - 0.001);
  return next ?? now;
}

zoomIn.addEventListener('click', () => zoomTo(step(1)));
zoomOut.addEventListener('click', () => zoomTo(step(-1)));
zoomLabel.addEventListener('click', () => zoomTo(1));
fit.addEventListener('click', () => {
  zoom = 'fit';
  applyZoom();
});
board.addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = board.getBoundingClientRect();
    zoomTo(step(e.deltaY < 0 ? 1 : -1), e.clientX - rect.left, e.clientY - rect.top);
  },
  { passive: false },
);
window.addEventListener('resize', applyZoom);

diagram.addEventListener('click', (e) => {
  const line = Number((e.target as Element).closest('[data-line]')?.getAttribute('data-line'));
  if (line > 0) host.post({ type: 'reveal', line });
});
errors.addEventListener('click', (e) => {
  const line = Number((e.target as Element).closest('[data-line]')?.getAttribute('data-line'));
  if (line > 0) host.post({ type: 'reveal', line });
});

/** Lists LIST in the error bar, each error a button that shows its line. */
function showErrors(list: PreviewError[]): void {
  errors.replaceChildren(
    ...list.map(({ line, message }) => {
      const button = element('button', {
        type: 'button',
        textContent: line > 0 ? `line ${line}: ${message}` : message,
      });
      button.dataset.line = String(line);
      return button;
    }),
  );
  errors.hidden = list.length === 0;
}

window.addEventListener('message', (e: MessageEvent<ToPage>) => {
  const msg = e.data;
  switch (msg?.type) {
    case 'render':
      diagram.innerHTML = msg.svg;
      diagram.classList.remove('stale');
      showErrors([]);
      applyZoom();
      break;
    case 'errors':
      showErrors(msg.errors);
      diagram.classList.add('stale');
      break;
    case 'state':
      host.setState?.(msg.state);
      break;
  }
});

applyZoom();
host.post({ type: 'ready' });

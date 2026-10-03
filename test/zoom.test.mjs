// The preview's zoom arithmetic (preview/zoom.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boardAt,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  scrollFor,
  wheelFactor,
  zoomStep,
  zoomToFitArea,
} from '../preview/zoom.ts';

test('steps between levels, and from a level in between, as after fitting', () => {
  assert.equal(zoomStep(1, 1), 1.25);
  assert.equal(zoomStep(0.9, 1), 1.25);
  assert.equal(zoomStep(0.9, -1), 0.8);
  assert.equal(zoomStep(4, 1), 4);
  assert.equal(zoomStep(5, -1), 3);
});

test('fits an area by its tighter side, up to 200%', () => {
  assert.equal(zoomToFitArea(1000, 300, 1000, 600), 0.5);
  assert.equal(zoomToFitArea(5000, 5000, 100, 100), 2);
});

test('keeps free zoom between 10% and 400%', () => {
  assert.equal(clampZoom(0.01), MIN_ZOOM);
  assert.equal(clampZoom(9), MAX_ZOOM);
  assert.equal(clampZoom(1.1), 1.1);
});

test('maps between scroll and board points, at any zoom', () => {
  // 50 px into a pane scrolled by 200, with 16 px padding.
  assert.equal(boardAt(200, 50, 1, 16), 234);
  assert.equal(boardAt(200, 50, 2, 16), 117);
  assert.equal(scrollFor(234, 50, 1, 16), 200);
  assert.equal(scrollFor(boardAt(200, 50, 1.25, 16), 50, 1.25, 16), 200);
});

test('zooms in on wheel up, out on wheel down, by at most a step at a time', () => {
  assert.ok(wheelFactor(-100) > 1);
  assert.ok(wheelFactor(100) < 1);
  assert.equal(wheelFactor(1000), wheelFactor(100));
  assert.ok(wheelFactor(-4) < wheelFactor(-100));
});

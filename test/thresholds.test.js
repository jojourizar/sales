import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivePercentileThresholds } from '../lib/thresholds.js';

test('derives strategic and mid cutoffs from deal values', () => {
  const values = Array.from({ length: 100 }, (_, i) => (i + 1) * 1000);
  const t = derivePercentileThresholds(values, 0.8, 0.5);
  assert.ok(t.strategic >= 79000 && t.strategic <= 81000, `strategic ~80000, got ${t.strategic}`);
  assert.ok(t.mid >= 49000 && t.mid <= 51000, `mid ~50000, got ${t.mid}`);
  assert.ok(t.strategic > t.mid);
});

test('ignores non-positive and non-numeric values', () => {
  const t = derivePercentileThresholds([0, -5, null, 'x', 10000, 20000, 30000], 0.8, 0.5);
  assert.ok(t.strategic > 0 && t.mid > 0 && t.strategic >= t.mid);
});

test('returns null thresholds when there is no usable data', () => {
  const t = derivePercentileThresholds([0, null, -1], 0.8, 0.5);
  assert.equal(t.strategic, null);
  assert.equal(t.mid, null);
});

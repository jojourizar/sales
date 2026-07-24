import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMotion } from '../lib/classify.js';

const rubric = {
  motion_rank: { smb: 0, mid: 1, strategic: 2 },
  value_floors_eur: { strategic: 250000, mid: 40000 },
  strategic_segment_values: ['Public Sector', 'Banking']
};

test('value alone decides the motion', () => {
  assert.equal(classifyMotion({ segment: null }, { value_eur: 300000 }, rubric).motion, 'strategic');
  assert.equal(classifyMotion({ segment: null }, { value_eur: 100000 }, rubric).motion, 'mid');
  assert.equal(classifyMotion({ segment: null }, { value_eur: 5000 }, rubric).motion, 'smb');
});

test('a configured strategic segment raises the motion regardless of value', () => {
  const r = classifyMotion({ segment: 'Public Sector' }, { value_eur: 5000 }, rubric);
  assert.equal(r.motion, 'strategic');
  assert.ok(r.reasons.some(x => x.toLowerCase().includes('segment')));
});

test('the segment override only raises, never lowers', () => {
  const r = classifyMotion({ segment: 'Public Sector' }, { value_eur: 900000 }, rubric);
  assert.equal(r.motion, 'strategic');
});

test('boundaries: at floor is that band, one below is lower', () => {
  assert.equal(classifyMotion({ segment: null }, { value_eur: 250000 }, rubric).motion, 'strategic');
  assert.equal(classifyMotion({ segment: null }, { value_eur: 249999 }, rubric).motion, 'mid');
  assert.equal(classifyMotion({ segment: null }, { value_eur: 40000 }, rubric).motion, 'mid');
  assert.equal(classifyMotion({ segment: null }, { value_eur: 39999 }, rubric).motion, 'smb');
});

test('no usable value falls back to smb and reports it', () => {
  const r = classifyMotion({ segment: null }, { value_eur: null, currency: 'JPY' }, rubric);
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'no_value');
  assert.ok(r.uncertainty.some(u => u.code === 'value_unusable'));
});

test('segment match ignores case and surrounding whitespace', () => {
  const r = classifyMotion({ segment: '  public sector ' }, { value_eur: 5000 }, rubric);
  assert.equal(r.motion, 'strategic');
});

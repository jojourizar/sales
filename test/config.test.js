import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// These tests load the REAL config files on purpose: a recalibration of the
// rubric must never ship a self contradictory config.
const here = dirname(fileURLToPath(import.meta.url));
const configDir = join(here, '..', 'config');
const fieldMap = JSON.parse(readFileSync(join(configDir, 'field-map.json'), 'utf8'));
const rubric = JSON.parse(readFileSync(join(configDir, 'rubric.json'), 'utf8'));

test('motion_by_tier is gone: TIER is no longer the classification spine', () => {
  assert.equal(rubric.motion_by_tier, undefined);
  assert.equal(typeof rubric.tier_raises, 'object');
});

test('every key in tier_raises is a tier that tier_enum can produce', () => {
  const tiers = Object.values(fieldMap.tier_enum).map(String);
  const keys = Object.keys(rubric.tier_raises);
  assert.ok(keys.length > 0);
  for (const k of keys) {
    assert.ok(tiers.includes(k), `tier_raises["${k}"] is not a value of tier_enum`);
  }
});

test('every motion in tier_raises exists in motion_rank', () => {
  for (const [tier, motion] of Object.entries(rubric.tier_raises)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(rubric.motion_rank, motion),
      `motion "${motion}" (tier ${tier}) is missing from motion_rank`
    );
  }
});

test('only TIER 0 raises the motion', () => {
  assert.deepEqual(rubric.tier_raises, { 0: 'strategic' });
});

test('the rubric keeps every other block the recalibration must not touch', () => {
  for (const key of [
    'fx_to_eur', 'motion_rank', 'value_floors_eur', 'inference_hectares',
    'inference_revenue_band', 'stage', 'stage_order', 'strategic_segment_ids',
    'max_plausible_hectares'
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(rubric, key), `rubric lost "${key}"`);
  }
});

test('the strategic value floor is above the mid floor', () => {
  assert.ok(rubric.value_floors_eur.strategic > rubric.value_floors_eur.mid);
});

test('the strategic hectares threshold is above the mid threshold', () => {
  assert.ok(rubric.inference_hectares.strategic > rubric.inference_hectares.mid);
});

test('advanced_order is at or after post_discovery_order', () => {
  assert.ok(rubric.stage.advanced_order >= rubric.stage.post_discovery_order);
});

test('every stage_order value is a positive number', () => {
  const entries = Object.entries(rubric.stage_order);
  assert.ok(entries.length > 0);
  for (const [id, order] of entries) {
    assert.equal(typeof order, 'number', `stage_order["${id}"] is not a number`);
    assert.ok(order > 0, `stage_order["${id}"] is not positive`);
  }
});

test('the euro rate in the fx table is exactly 1', () => {
  assert.equal(rubric.fx_to_eur.EUR, 1);
});

test('strategic_segment_ids lives in the rubric and holds numbers', () => {
  const ids = rubric.strategic_segment_ids;
  assert.ok(Array.isArray(ids), 'strategic_segment_ids must be an array');
  assert.ok(ids.length > 0, 'strategic_segment_ids must not be empty');
  for (const id of ids) assert.equal(typeof id, 'number');
});

test('max_plausible_hectares is a positive number above the strategic threshold', () => {
  assert.equal(typeof rubric.max_plausible_hectares, 'number');
  assert.ok(rubric.max_plausible_hectares > rubric.inference_hectares.strategic);
});

// Hygiene block: a recalibration of the weights must never leave a motion
// unable to score (division by zero) or leave an item without a label.
test('rubric.hygiene.items is a non-empty object', () => {
  assert.equal(typeof rubric.hygiene.items, 'object');
  assert.ok(Object.keys(rubric.hygiene.items).length > 0);
});

test('every hygiene item has a label and numeric non-negative weights for every motion', () => {
  for (const [key, item] of Object.entries(rubric.hygiene.items)) {
    assert.equal(typeof item.label, 'string', `hygiene item "${key}" has no label`);
    assert.ok(item.label.length > 0, `hygiene item "${key}" has an empty label`);
    assert.equal(typeof item.weights, 'object', `hygiene item "${key}" has no weights`);
    for (const motion of ['smb', 'mid', 'strategic']) {
      const w = item.weights[motion];
      assert.equal(typeof w, 'number', `hygiene item "${key}" weight for ${motion} is not a number`);
      assert.ok(w >= 0, `hygiene item "${key}" weight for ${motion} is negative`);
    }
  }
});

test('every motion has at least one hygiene item with a positive weight', () => {
  for (const motion of ['smb', 'mid', 'strategic']) {
    const total = Object.values(rubric.hygiene.items)
      .reduce((sum, item) => sum + (Number(item.weights[motion]) || 0), 0);
    assert.ok(total > 0, `motion "${motion}" has zero total hygiene weight: would divide by zero`);
  }
});

test('regional_intel_label_id is a number', () => {
  assert.equal(typeof rubric.regional_intel_label_id, 'number');
});

test('touch_benchmark has a coherent block for every motion', () => {
  const tb = rubric.touch_benchmark;
  assert.equal(typeof tb, 'object');
  for (const motion of ['smb', 'mid', 'strategic']) {
    const b = tb[motion];
    assert.equal(typeof b, 'object', `touch_benchmark is missing "${motion}"`);
    for (const k of ['quarter_min', 'quarter_max', 'multithread_min']) {
      assert.equal(typeof b[k], 'number', `touch_benchmark["${motion}"].${k} is not a number`);
    }
    assert.ok(b.quarter_min <= b.quarter_max, `touch_benchmark["${motion}"] has quarter_min > quarter_max`);
    assert.ok(b.multithread_min >= 1, `touch_benchmark["${motion}"].multithread_min must be at least 1`);
  }
});

test('rubric.hygiene.grades is a non-empty array covering min: 0', () => {
  const grades = rubric.hygiene.grades;
  assert.ok(Array.isArray(grades));
  assert.ok(grades.length > 0);
  for (const g of grades) {
    assert.equal(typeof g.min, 'number', `grade entry ${JSON.stringify(g)} has a non-numeric min`);
    assert.equal(typeof g.grade, 'string', `grade entry ${JSON.stringify(g)} has a non-string grade`);
  }
  assert.ok(grades.some(g => g.min === 0), 'no grade entry covers the floor (min: 0)');
});

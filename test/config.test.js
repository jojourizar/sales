import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveConfig, CONCEPTS } from '../lib/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaults = JSON.parse(readFileSync(join(here, '..', 'config', 'defaults.json'), 'utf8'));

test('defaults.json is coherent', () => {
  for (const m of ['smb', 'mid', 'strategic']) {
    assert.ok(m in defaults.motion_rank, `motion_rank has ${m}`);
    assert.ok(defaults.touch_benchmark[m], `touch_benchmark has ${m}`);
    const sum = Object.values(defaults.hygiene.items).reduce((a, it) => a + it.weights[m], 0);
    assert.ok(sum > 0, `hygiene weights for ${m} sum > 0`);
  }
  assert.equal(defaults.fx_to_eur.EUR, 1);
  assert.ok(defaults.hygiene.grades.some(g => g.min === 0));
});

test('resolveConfig marks a mapped concept available and an unmapped one not', () => {
  const user = {
    pipeline_id: 1, stage_order: { '12': 5 }, value_floors_eur: { strategic: 250000, mid: 40000 },
    strategic_segment_values: [],
    field_map: { deal: { economic_buyer: 'KEY_EB', decision_process: null, identify_pain: null, account_intel: null }, org: { segment: 'KEY_SEG' } }
  };
  const cfg = resolveConfig(defaults, user);
  assert.equal(cfg.available.economic_buyer, true);
  assert.equal(cfg.available.decision_process, false);
  assert.equal(cfg.available.org_segment, true);
  assert.equal(cfg.fieldMap.deal.economic_buyer, 'KEY_EB');
  assert.equal(cfg.available.value, true);
  assert.equal(cfg.available.contact_person, true);
});

test('CONCEPTS lists every optional mappable concept', () => {
  assert.deepEqual(
    new Set(CONCEPTS),
    new Set(['economic_buyer', 'decision_process', 'identify_pain', 'account_intel', 'org_segment'])
  );
});

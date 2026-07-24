import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMotion } from '../lib/classify.js';

const rubric = {
  tier_raises: { '0': 'strategic' },
  motion_rank: { smb: 0, mid: 1, strategic: 2 },
  value_floors_eur: { strategic: 250000, mid: 40000 },
  inference_hectares: { strategic: 50000, mid: 5000 },
  inference_revenue_band: { strategic: 4, mid: 3 },
  max_plausible_hectares: 2000000,
  regional_intel_label_id: 346,
  strategic_segment_ids: [40, 334, 335]
};
const strategicSegmentIds = [40, 334, 335];

// R1: the value of life is the spine.
test('the deal value alone decides the base motion', () => {
  const org = { tier: 2, segment_ids: [97], total_hectares: 8000 };
  const r = classifyMotion(org, { value_eur: 100000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'mid');
  assert.equal(r.basis, 'value');
  assert.deepEqual(r.uncertainty, []);
});

// R2: the Palo Gordo regression. Under the old rubric this was strategic.
test('a TIER 1 org with a 20.700 EUR deal is smb, not strategic', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 2000 };
  const r = classifyMotion(org, { value_eur: 20700 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'value');
});

test('a TIER 1 org with a 300.000 EUR deal is strategic by value, not by tier', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 300000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.ok(r.reasons.some(x => x.includes('valor de vida')));
  assert.ok(!r.reasons.some(x => x.includes('TIER 1')));
});

test('a TIER 0 org raises to strategic even on a tiny deal', () => {
  const org = { tier: 0, tier_raw: 36, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 5000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.ok(r.reasons.some(x => x.includes('TIER 0')));
});

test('TIER 2 and TIER 3 have no effect on a 100.000 EUR deal', () => {
  for (const [tier, raw] of [[2, 38], [3, 39]]) {
    const org = { tier, tier_raw: raw, segment_ids: [97], total_hectares: 100 };
    const r = classifyMotion(org, { value_eur: 100000 }, rubric, strategicSegmentIds);
    assert.equal(r.motion, 'mid', `TIER ${tier} must not move the motion`);
    assert.ok(!r.reasons.some(x => x.includes('TIER')), `TIER ${tier} must not justify anything`);
  }
});

test('a TIER 1 org with a 300.000 EUR deal is not lowered by the tier', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 3680000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
});

// R3: the segment override survives untouched.
test('government segment forces strategic even on low value', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [40], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 5000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.ok(r.reasons.some(x => x.includes('segmento')));
});

test('banks and insurers also force strategic', () => {
  for (const id of [334, 335]) {
    const org = { tier: 3, tier_raw: 39, segment_ids: [id], total_hectares: 100 };
    const r = classifyMotion(org, { value_eur: 1000 }, rubric, strategicSegmentIds);
    assert.equal(r.motion, 'strategic', `segment ${id} must force strategic`);
  }
});

test('the segment list falls back to the rubric when not passed', () => {
  const r = classifyMotion({ tier: 3, segment_ids: [40], total_hectares: 100 }, { value_eur: 5000 }, rubric);
  assert.equal(r.motion, 'strategic');
});

// R4: overrides only raise.
test('the segment override never lowers a strategic value', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [40], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 900000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
});

test('the tier raise never lowers a mid value below mid', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 60000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'mid');
});

// R1: boundaries of the new spine.
test('a value exactly at the strategic floor classifies strategic', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [97], total_hectares: 100 };
  assert.equal(classifyMotion(org, { value_eur: 250000 }, rubric, strategicSegmentIds).motion, 'strategic');
});

test('one euro below the strategic floor is mid', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [97], total_hectares: 100 };
  assert.equal(classifyMotion(org, { value_eur: 249999 }, rubric, strategicSegmentIds).motion, 'mid');
});

test('a value exactly at the mid floor classifies mid', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [97], total_hectares: 100 };
  assert.equal(classifyMotion(org, { value_eur: 40000 }, rubric, strategicSegmentIds).motion, 'mid');
});

test('one euro below the mid floor is smb', () => {
  const org = { tier: 3, tier_raw: 39, segment_ids: [97], total_hectares: 100 };
  assert.equal(classifyMotion(org, { value_eur: 39999 }, rubric, strategicSegmentIds).motion, 'smb');
});

// R5: fallback when the value cannot carry the classification.
test('a null value_eur falls back to the size inference and is reported', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 60000 };
  const r = classifyMotion(org, { value_eur: null, currency: 'MXN', value_native: 9000000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.equal(r.basis, 'size_inference');
  const u = r.uncertainty.find(x => x.code === 'currency_unsupported');
  assert.ok(u, 'expected a currency_unsupported entry');
  assert.ok(u.detail.includes('MXN'));
  assert.ok(!r.reasons.some(x => x.includes('valor de vida')));
});

test('a value of zero falls back to the size inference', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 200, annual_revenue_band: null };
  const r = classifyMotion(org, { value_eur: 0, currency: 'EUR' }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'size_inference');
  assert.deepEqual(r.uncertainty, []);
});

test('the overrides still apply on top of the size fallback', () => {
  const org = { tier: 0, tier_raw: 36, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 0, currency: 'EUR' }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.equal(r.basis, 'size_inference');
});

test('the size fallback still honours the hectares ceiling', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 34000000, annual_revenue_band: null };
  const r = classifyMotion(org, { value_eur: null, currency: 'MXN' }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb', 'garbage hectares must not buy a strategic motion');
  assert.equal(r.basis, 'size_inference');
  const u = r.uncertainty.find(x => x.code === 'hectares_implausible');
  assert.ok(u, 'expected a hectares_implausible entry');
  assert.ok(u.detail.includes('34000000'));
});

test('hectares exactly at the ceiling are still used by the fallback', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 2000000 };
  const r = classifyMotion(org, { value_eur: null, currency: 'MXN' }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'strategic');
  assert.ok(!r.uncertainty.some(x => x.code === 'hectares_implausible'));
});

test('the value decides the motion, and implausible hectares are still flagged as hygiene', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 34000000 };
  const r = classifyMotion(org, { value_eur: 10000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb', 'the value classifies the deal, not the hectares');
  assert.equal(r.basis, 'value');
  // The garbage hectares did not touch the motion, but they are still reported
  // as a data-hygiene note so the seller knows the record is wrong.
  const u = r.uncertainty.find(x => x.code === 'hectares_implausible');
  assert.ok(u, 'implausible hectares must be flagged even on the value path');
  assert.ok(u.detail.includes('34000000'));
});

// Regional Intel deals legitimately span an entire region, so millions of
// hectares are correct, not a data error, and must not be flagged.
test('a Regional Intel deal does not flag implausible hectares', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 34000000 };
  const r = classifyMotion(org, { value_eur: 10000, label_ids: [327, 346] }, rubric, strategicSegmentIds);
  assert.ok(!r.uncertainty.some(x => x.code === 'hectares_implausible'),
    'Regional Intel covers a whole region: millions of hectares are natural');
});

test('a non Regional Intel deal still flags implausible hectares', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 34000000 };
  const r = classifyMotion(org, { value_eur: 10000, label_ids: [327] }, rubric, strategicSegmentIds);
  assert.ok(r.uncertainty.some(x => x.code === 'hectares_implausible'),
    'a single company with 34M hectares is still garbage data');
});

// R6: basis replaces tier_inferred.
test('tier_inferred no longer exists in the verdict', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 60000 };
  const r = classifyMotion(org, { value_eur: 20000 }, rubric, strategicSegmentIds);
  assert.ok(!('tier_inferred' in r), 'tier_inferred must be gone');
  assert.equal(r.basis, 'value');
});

// R7: data hygiene is reported, but never classifies.
test('an empty TIER is a hygiene note and does not change the motion', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [97], total_hectares: 60000 };
  const r = classifyMotion(org, { value_eur: 20000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.ok(r.missing_fields.includes('org_tier'));
  assert.ok(!r.missing_fields.includes('Tamaño de la Empresa'));
});

test('an organization with no segment reports org_segment as missing', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 20000 }, rubric, strategicSegmentIds);
  assert.ok(r.missing_fields.includes('org_segment'));
});

test('an organization with a segment does not report org_segment', () => {
  const org = { tier: 1, tier_raw: 37, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 20000 }, rubric, strategicSegmentIds);
  assert.ok(!r.missing_fields.includes('org_segment'));
});

test('an empty organization reports both hygiene holes without throwing', () => {
  const org = { tier: null, tier_raw: null, segment_ids: [], total_hectares: null };
  const r = classifyMotion(org, { value_eur: 1000, currency: 'EUR' }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.ok(r.missing_fields.includes('org_tier'));
  assert.ok(r.missing_fields.includes('org_segment'));
});

test('an unrecognised TIER is reported without claiming the field is empty', () => {
  const org = { tier: null, tier_raw: 99, segment_ids: [97], total_hectares: 60000 };
  const r = classifyMotion(org, { value_eur: 1000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.deepEqual(r.missing_fields, []);
  const u = r.uncertainty.find(x => x.code === 'tier_unrecognised');
  assert.ok(u, 'expected a tier_unrecognised entry');
  assert.ok(u.detail.includes('99'));
  assert.ok(!r.reasons.some(x => x.includes('vacío')));
});

test('a recognised TIER outside tier_raises is neither a raise nor an error', () => {
  const org = { tier: 2, tier_raw: 38, segment_ids: [97], total_hectares: 100 };
  const r = classifyMotion(org, { value_eur: 1000 }, rubric, strategicSegmentIds);
  assert.equal(r.motion, 'smb');
  assert.deepEqual(r.uncertainty, []);
  assert.deepEqual(r.missing_fields, []);
});

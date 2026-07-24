import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEur, extractDeal, extractOrg } from '../lib/normalize.js';

const fx = { EUR: 1, USD: 0.92, BRL: 0.16 };
const fieldMap = {
  deal: {
    economic_buyer: 'EB', decision_process: 'DP', identify_pain: 'IP',
    account_intel: 'AI', deal_hectares: 'DH', sales_cycle: 'SC', account_executive: 'AE'
  },
  org: { tier: 'T', segment: 'SEG', total_hectares: 'TH', tech_level: 'TL', sales_region: 'SR' },
  tier_enum: { '36': 0, '37': 1, '38': 2, '39': 3 },
  strategic_segment_ids: [40, 334, 335]
};

test('toEur converts using the fx table', () => {
  assert.equal(toEur(1000, 'EUR', fx), 1000);
  assert.equal(toEur(1000, 'USD', fx), 920);
  assert.equal(toEur(1000000, 'BRL', fx), 160000);
});

test('toEur returns null for unknown currency', () => {
  assert.equal(toEur(1000, 'GBP', fx), null);
});

test('extractDeal reads standard and custom fields', () => {
  const raw = {
    id: 33364, title: 'BR - Governo de RS', value: 23000000, currency: 'BRL',
    acv: 23000000, arr: 0, mrr: 0, stage_id: 273, person_id: null, org_id: 17588,
    custom_fields: { EB: null, DP: null, IP: null, AI: null, DH: 34000000 }
  };
  const d = extractDeal(raw, fieldMap, fx);
  assert.equal(d.id, 33364);
  assert.equal(d.stage_id, 273);
  assert.equal(d.has_contact_person, false);
  assert.equal(d.economic_buyer, null);
  assert.equal(d.deal_hectares, 34000000);
  // value_eur uses the max of value/acv/arr/mrr
  assert.equal(d.value_eur, Math.round(23000000 * 0.16));
});

test('extractDeal marks has_contact_person true when person_id present', () => {
  const raw = { id: 1, value: 0, currency: 'EUR', acv: 90000, arr: 0, mrr: 0, stage_id: 268, person_id: 43867, org_id: 5, custom_fields: {} };
  const d = extractDeal(raw, fieldMap, fx);
  assert.equal(d.has_contact_person, true);
  assert.equal(d.value_eur, 90000);
});

test('extractOrg maps tier enum and segment ids', () => {
  const raw = {
    id: 17588, name: 'Governo RS',
    people_count: 0,
    custom_fields: { T: 36, SEG: [40], TH: 500000, TL: 34 }
  };
  const o = extractOrg(raw, fieldMap);
  assert.equal(o.tier, 0);
  assert.deepEqual(o.segment_ids, [40]);
  assert.equal(o.total_hectares, 500000);
  assert.equal(o.people_count, 0);
});

test('extractOrg tolerates missing tier and segment', () => {
  const raw = { id: 1, name: 'X', people_count: 3, custom_fields: {} };
  const o = extractOrg(raw, fieldMap);
  assert.equal(o.tier, null);
  assert.deepEqual(o.segment_ids, []);
});

test('extractOrg maps an absent people_count to null, not zero', () => {
  const raw = { id: 17588, name: 'Governo RS', custom_fields: { T: 36 } };
  const o = extractOrg(raw, fieldMap);
  assert.equal(o.people_count, null);
});

test('extractOrg keeps an explicit zero people_count as zero', () => {
  const o = extractOrg({ id: 1, name: 'X', people_count: 0, custom_fields: {} }, fieldMap);
  assert.equal(o.people_count, 0);
});

test('extractOrg tolerates a missing organization', () => {
  const o = extractOrg(undefined, fieldMap);
  assert.equal(o.id, null);
  assert.equal(o.name, '');
  assert.equal(o.tier, null);
  assert.equal(o.tier_raw, null);
  assert.deepEqual(o.segment_ids, []);
  assert.equal(o.people_count, null);
});

test('extractOrg keeps an unrecognised TIER value in tier_raw', () => {
  const o = extractOrg({ id: 1, name: 'X', custom_fields: { T: 99 } }, fieldMap);
  assert.equal(o.tier, null);
  assert.equal(o.tier_raw, 99);
});

test('extractDeal tolerates a missing deal and missing custom_fields', () => {
  const d = extractDeal(undefined, fieldMap, fx);
  assert.equal(d.id, null);
  assert.equal(d.stage_id, null);
  assert.equal(d.economic_buyer, null);
  const d2 = extractDeal({ id: 7, currency: 'EUR', value: 10 }, fieldMap, fx);
  assert.equal(d2.value_eur, 10);
  assert.equal(d2.identify_pain, null);
});

test('extractDeal carries status and is_archived', () => {
  const raw = { id: 1, value: 0, currency: 'EUR', stage_id: 268, status: 'lost', is_archived: true, custom_fields: {} };
  const d = extractDeal(raw, fieldMap, fx);
  assert.equal(d.status, 'lost');
  assert.equal(d.is_archived, true);
  const d2 = extractDeal({ id: 2, currency: 'EUR', custom_fields: {} }, fieldMap, fx);
  assert.equal(d2.status, null);
  assert.equal(d2.is_archived, false);
});

test('extractDeal leaves value_eur null for an unsupported currency', () => {
  const d = extractDeal({ id: 3, value: 500000, currency: 'MXN', custom_fields: {} }, fieldMap, fx);
  assert.equal(d.value_eur, null);
  assert.equal(d.currency, 'MXN');
});

test('extractDeal carries the deal label_ids', () => {
  const d = extractDeal({ id: 1, currency: 'EUR', label_ids: [327, 346], custom_fields: {} }, fieldMap, fx);
  assert.deepEqual(d.label_ids, [327, 346]);
});

test('extractDeal defaults label_ids to an empty array when absent', () => {
  const d = extractDeal({ id: 1, currency: 'EUR', custom_fields: {} }, fieldMap, fx);
  assert.deepEqual(d.label_ids, []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEur, extractDeal, extractOrg } from '../lib/normalize.js';

const fx = { EUR: 1, USD: 0.92, BRL: 0.16 };
const fieldMap = {
  deal: { economic_buyer: 'EB', decision_process: 'DP', identify_pain: 'IP', account_intel: 'AI' },
  org: { segment: 'SEG' }
};

test('toEur converts and returns null on unknown currency', () => {
  assert.equal(toEur(1000, 'USD', fx), 920);
  assert.equal(toEur(1000, 'JPY', fx), null);
});

test('extractDeal reads mapped custom fields and standard value', () => {
  const raw = { id: 1, title: 'Acme', value: 300000, currency: 'EUR', acv: 300000, arr: 0, mrr: 0,
    stage_id: 12, person_id: 5, org_id: 9, status: 'open', is_archived: false,
    custom_fields: { EB: 'Jane (CFO)', DP: null, IP: 'slow reporting', AI: null } };
  const d = extractDeal(raw, fieldMap, fx);
  assert.equal(d.economic_buyer, 'Jane (CFO)');
  assert.equal(d.identify_pain, 'slow reporting');
  assert.equal(d.has_contact_person, true);
  assert.equal(d.value_eur, 300000);
  assert.equal(d.status, 'open');
});

test('extractDeal tolerates unmapped concepts (null keys) and missing payload', () => {
  const fm = { deal: { economic_buyer: null, decision_process: null, identify_pain: null, account_intel: null }, org: { segment: null } };
  const d = extractDeal({ id: 2, value: 0, acv: 5000, currency: 'EUR', stage_id: 12, custom_fields: {} }, fm, fx);
  assert.equal(d.economic_buyer, null);
  assert.equal(d.value_eur, 5000);
  const d2 = extractDeal(null, fm, fx);
  assert.equal(d2.value_eur, null);
});

test('extractOrg reads the mapped segment and standard people_count', () => {
  const o = extractOrg({ id: 9, name: 'Acme', people_count: 4, custom_fields: { SEG: 'Public Sector' } }, fieldMap);
  assert.equal(o.segment, 'Public Sector');
  assert.equal(o.people_count, 4);
  const o2 = extractOrg({ id: 9, name: 'Acme', custom_fields: {} }, fieldMap);
  assert.equal(o2.people_count, null);
  assert.equal(o2.segment, null);
});

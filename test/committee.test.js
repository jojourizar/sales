import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommittee } from '../lib/committee.js';

const openDeal = (over = {}) => ({
  economic_buyer: null, decision_process: null, identify_pain: null,
  account_intel: null, has_contact_person: false, status: 'open', is_archived: false,
  ...over
});
const advanced = (over = {}) => ({ motion: 'strategic', stage_order: 8, advanced_order: 8, ...over });

test('flags every gap when MEDDIC fields and contacts are empty', () => {
  const r = evaluateCommittee(openDeal(), { people_count: 0 }, advanced());
  assert.equal(r.present.economic_buyer, false);
  assert.equal(r.present.contact_person, false);
  assert.ok(r.gaps.includes('economic_buyer'));
  assert.ok(r.gaps.includes('decision_process'));
  assert.ok(r.gaps.includes('contact_person'));
  // strategic + advanced stage + gaps => critical
  assert.equal(r.critical, true);
});

test('gaps are stable keys, never Pipedrive labels', () => {
  const r = evaluateCommittee(openDeal(), { people_count: 0 }, advanced());
  for (const g of r.gaps) assert.match(g, /^[a-z_]+$/);
});

test('no critical flag for smb even with gaps', () => {
  const r = evaluateCommittee(openDeal(), { people_count: 0 }, advanced({ motion: 'smb' }));
  assert.equal(r.critical, false);
});

test('full coverage yields no gaps', () => {
  const deal = openDeal({
    economic_buyer: 'Maria Silva (CFO)', decision_process: 'Comité de compras trimestral',
    identify_pain: 'Predicción de zafra', account_intel: 'Grupo con 3 usinas', has_contact_person: true
  });
  const r = evaluateCommittee(deal, { people_count: 4 }, advanced());
  assert.deepEqual(r.gaps, []);
  assert.deepEqual(r.uncertainty, []);
  assert.equal(r.critical, false);
});

test('strategic with gaps but early stage is not critical yet', () => {
  const deal = openDeal({ identify_pain: 'algo', has_contact_person: true });
  const r = evaluateCommittee(deal, { people_count: 1 }, advanced({ stage_order: 5 }));
  assert.equal(r.critical, false);
  assert.ok(r.gaps.length > 0);
});

// R2: unknown people_count
test('unknown people_count is not a gap and does not make a deal critical', () => {
  // The only would be gap here is contact_person: everything else is filled.
  const deal = openDeal({
    economic_buyer: 'Ana Duarte (CFO)', decision_process: 'Comité mensual',
    identify_pain: 'Estimación de zafra', account_intel: 'Tres unidades',
    has_contact_person: false
  });
  const r = evaluateCommittee(deal, { people_count: null }, advanced());
  assert.equal(r.present.contact_person, null);
  assert.deepEqual(r.gaps, []);
  assert.equal(r.critical, false);
  assert.ok(r.uncertainty.some(u => u.code === 'people_count_unknown'));
});

test('unknown people_count still allows critical when a real gap exists', () => {
  const deal = openDeal({
    economic_buyer: null, decision_process: 'Comité mensual',
    identify_pain: 'Estimación de zafra', account_intel: 'Tres unidades',
    has_contact_person: false
  });
  const r = evaluateCommittee(deal, { people_count: null }, advanced());
  assert.deepEqual(r.gaps, ['economic_buyer']);
  assert.equal(r.critical, true);
  assert.ok(r.uncertainty.some(u => u.code === 'people_count_unknown'));
});

test('a linked person makes contact_person true regardless of people_count', () => {
  const r = evaluateCommittee(openDeal({ has_contact_person: true }), { people_count: null }, advanced());
  assert.equal(r.present.contact_person, true);
  assert.deepEqual(r.uncertainty, []);
});

test('an explicit people_count of zero is a real gap', () => {
  const r = evaluateCommittee(openDeal(), { people_count: 0 }, advanced());
  assert.equal(r.present.contact_person, false);
  assert.ok(r.gaps.includes('contact_person'));
  assert.deepEqual(r.uncertainty, []);
});

// R4: closed and archived deals
test('a lost deal is never critical despite gaps', () => {
  const r = evaluateCommittee(openDeal({ status: 'lost' }), { people_count: 0 }, advanced());
  assert.ok(r.gaps.length > 0);
  assert.equal(r.critical, false);
});

test('a won deal is never critical despite gaps', () => {
  const r = evaluateCommittee(openDeal({ status: 'won' }), { people_count: 0 }, advanced());
  assert.equal(r.critical, false);
});

test('an archived open deal is never critical despite gaps', () => {
  const r = evaluateCommittee(openDeal({ is_archived: true }), { people_count: 0 }, advanced());
  assert.ok(r.gaps.length > 0);
  assert.equal(r.critical, false);
});

// R5: unknown stage
test('an unknown stage order cannot be critical', () => {
  const r = evaluateCommittee(openDeal(), { people_count: 0 }, advanced({ stage_order: null }));
  assert.ok(r.gaps.length > 0);
  assert.equal(r.critical, false);
});

// R1: missing organization
test('a missing organization does not throw and leaves contact_person unknown', () => {
  const r = evaluateCommittee(openDeal(), null, advanced());
  assert.equal(r.present.contact_person, null);
  assert.ok(!r.gaps.includes('contact_person'));
});

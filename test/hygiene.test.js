import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHygiene } from '../lib/hygiene.js';

const cfg = {
  items: {
    value:            { label: 'Deal value',      weights: { smb: 2, mid: 2, strategic: 2 } },
    identify_pain:    { label: 'Pain identified',  weights: { smb: 2, mid: 2, strategic: 2 } },
    contact_person:   { label: 'Contact person',   weights: { smb: 2, mid: 2, strategic: 1 } },
    economic_buyer:   { label: 'Economic buyer',   weights: { smb: 0, mid: 1, strategic: 3 } },
    decision_process: { label: 'Decision process', weights: { smb: 0, mid: 1, strategic: 3 } },
    account_intel:    { label: 'Account intel',    weights: { smb: 0, mid: 1, strategic: 2 } },
    org_segment:      { label: 'Segment',          weights: { smb: 1, mid: 1, strategic: 2 } }
  },
  grades: [ { min: 90, grade: 'A' }, { min: 75, grade: 'B' }, { min: 50, grade: 'C' }, { min: 25, grade: 'D' }, { min: 0, grade: 'E' } ]
};
const all = { economic_buyer: true, decision_process: true, identify_pain: true, account_intel: true, org_segment: true };

test('full strategic account scores 100 A', () => {
  const deal = { value_eur: 300000, identify_pain: 'x', economic_buyer: 'e', decision_process: 'd', account_intel: 'a', has_contact_person: true };
  const org = { segment: 'Public Sector', people_count: 3 };
  const r = evaluateHygiene(deal, org, 'strategic', cfg, all);
  assert.equal(r.score, 100);
  assert.equal(r.grade, 'A');
});

test('an unavailable concept leaves the denominator, it does not count as missing', () => {
  const avail = { ...all, decision_process: false, account_intel: false };
  const deal = { value_eur: 300000, identify_pain: 'x', economic_buyer: 'e', decision_process: null, account_intel: null, has_contact_person: true };
  const org = { segment: 'Public Sector', people_count: 3 };
  const r = evaluateHygiene(deal, org, 'strategic', cfg, avail);
  assert.ok(!r.missing.some(m => m.key === 'decision_process'));
  assert.equal(r.score, 100); // everything available is filled
});

test('missing items are ordered by weight desc', () => {
  const deal = { value_eur: 300000, identify_pain: null, economic_buyer: null, decision_process: null, account_intel: null, has_contact_person: false };
  const org = { segment: null, people_count: 0 };
  const r = evaluateHygiene(deal, org, 'strategic', cfg, all);
  assert.equal(r.missing[0].key, 'economic_buyer'); // weight 3
  assert.ok(r.score < 40);
});

test('an unknown contact is excluded from the score, not counted missing', () => {
  const deal = { value_eur: 300000, identify_pain: 'x', economic_buyer: 'e', decision_process: 'd', account_intel: 'a', has_contact_person: false };
  const org = { segment: 'Public Sector', people_count: null };
  const r = evaluateHygiene(deal, org, 'strategic', cfg, all);
  assert.ok(!r.missing.some(m => m.key === 'contact_person'));
  assert.ok(!r.present.some(m => m.key === 'contact_person'));
  assert.equal(r.score, 100);
});

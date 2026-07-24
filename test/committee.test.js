import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommittee } from '../lib/committee.js';

const allAvailable = { economic_buyer: true, decision_process: true, identify_pain: true, account_intel: true };

test('mapped but empty fields are gaps; full coverage has none', () => {
  const empty = evaluateCommittee(
    { economic_buyer: null, decision_process: null, identify_pain: null, account_intel: null, has_contact_person: false },
    { people_count: 0 }, { motion: 'strategic', stage_order: 8, advanced_order: 8, available: allAvailable });
  assert.ok(empty.gaps.includes('economic_buyer'));
  assert.equal(empty.critical, true);

  const full = evaluateCommittee(
    { economic_buyer: 'Jane', decision_process: 'RFP', identify_pain: 'X', account_intel: 'Y', has_contact_person: true },
    { people_count: 3 }, { motion: 'strategic', stage_order: 8, advanced_order: 8, available: allAvailable });
  assert.deepEqual(full.gaps, []);
  assert.equal(full.critical, false);
});

test('an unavailable concept is not a gap and is reported once', () => {
  const avail = { economic_buyer: true, decision_process: false, identify_pain: false, account_intel: false };
  const r = evaluateCommittee(
    { economic_buyer: null, decision_process: null, identify_pain: null, account_intel: null, has_contact_person: true },
    { people_count: 1 }, { motion: 'strategic', stage_order: 8, advanced_order: 8, available: avail });
  assert.ok(r.gaps.includes('economic_buyer'));
  assert.ok(!r.gaps.includes('decision_process'));
  assert.ok(r.unavailable.includes('decision_process'));
});

test('closed or non-strategic deals are never critical', () => {
  const gaps = { economic_buyer: null, decision_process: null, identify_pain: null, account_intel: null, has_contact_person: false };
  assert.equal(evaluateCommittee(gaps, { people_count: 0 }, { motion: 'smb', stage_order: 8, advanced_order: 8, available: allAvailable }).critical, false);
});

test('an unknown stage (null order) is never critical', () => {
  const gaps = { economic_buyer: null, decision_process: null, identify_pain: null, account_intel: null, has_contact_person: false };
  const r = evaluateCommittee(gaps, { people_count: 0 }, { motion: 'strategic', stage_order: null, advanced_order: 8, available: { economic_buyer: true, decision_process: true, identify_pain: true, account_intel: true } });
  assert.equal(r.critical, false);
});

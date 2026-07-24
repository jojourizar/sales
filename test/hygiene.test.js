import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHygiene } from '../lib/hygiene.js';

// A literal mirroring config/rubric.json's hygiene block, so these tests do
// not depend on future rubric tuning. config.test.js separately guards the
// invariants of the real file.
const cfg = {
  items: {
    value:            { label: 'Valor / ACV del deal',         weights: { smb: 2, mid: 2, strategic: 2 } },
    identify_pain:    { label: 'Pain identificado',             weights: { smb: 2, mid: 2, strategic: 2 } },
    contact_person:   { label: 'Persona de contacto',           weights: { smb: 2, mid: 2, strategic: 1 } },
    deal_hectares:    { label: 'Hectáreas de la oportunidad',   weights: { smb: 1, mid: 1, strategic: 1 } },
    economic_buyer:   { label: 'Economic Buyer',                weights: { smb: 0, mid: 1, strategic: 3 } },
    decision_process: { label: 'Decision Process',              weights: { smb: 0, mid: 1, strategic: 3 } },
    account_intel:    { label: 'Account Intel',                 weights: { smb: 0, mid: 1, strategic: 2 } },
    org_tier:         { label: 'Tamaño de la Empresa',          weights: { smb: 1, mid: 1, strategic: 1 } },
    org_segment:      { label: 'Segmento de la organización',   weights: { smb: 1, mid: 1, strategic: 2 } },
    org_hectares:     { label: 'Hectáreas totales de la organización', weights: { smb: 1, mid: 1, strategic: 1 } },
    tech_level:       { label: 'Nivel de tecnificación',        weights: { smb: 1, mid: 1, strategic: 1 } }
  },
  grades: [
    { min: 90, grade: 'A' },
    { min: 75, grade: 'B' },
    { min: 50, grade: 'C' },
    { min: 25, grade: 'D' },
    { min: 0,  grade: 'E' }
  ]
};

const fullDeal = (over = {}) => ({
  value_eur: 300000,
  identify_pain: 'Predicción de zafra',
  has_contact_person: true,
  deal_hectares: 5000,
  economic_buyer: 'Maria Silva (CFO)',
  decision_process: 'Comité de compras trimestral',
  account_intel: 'Grupo con 3 usinas',
  ...over
});

const fullOrg = (over = {}) => ({
  tier: 0,
  segment_ids: [40],
  total_hectares: 12000,
  tech_level: 3,
  people_count: 4,
  ...over
});

const emptyDeal = {
  value_eur: null, identify_pain: null, has_contact_person: false,
  deal_hectares: null, economic_buyer: null, decision_process: null, account_intel: null
};

const emptyOrg = {
  tier: null, segment_ids: [], total_hectares: null, tech_level: null, people_count: null
};

// 1. A fully filled strategic deal scores 100, grade A.
test('a fully filled strategic deal scores 100 and grade A', () => {
  const r = evaluateHygiene(fullDeal(), fullOrg(), 'strategic', cfg);
  assert.equal(r.score, 100);
  assert.equal(r.grade, 'A');
  assert.deepEqual(r.missing, []);
});

// 2. Same field set minus economic_buyer/decision_process: materially lower,
// and both appear in missing, economic_buyer (weight 3) at/near the top.
test('emptying economic_buyer and decision_process drops the strategic score and surfaces both gaps', () => {
  const r = evaluateHygiene(
    fullDeal({ economic_buyer: null, decision_process: null }),
    fullOrg(),
    'strategic',
    cfg
  );
  assert.ok(r.score < 100);
  // max_weight for strategic = 19, earned = 13 => round(13/19*100) = 68.
  assert.equal(r.score, 68);
  const keys = r.missing.map(m => m.key);
  assert.ok(keys.includes('economic_buyer'));
  assert.ok(keys.includes('decision_process'));
  assert.equal(r.missing[0].key, 'economic_buyer');
});

// 3. SMB deal scores 100 even with economic_buyer/decision_process/account_intel
// empty, because those items are weight 0 for smb and must not appear as gaps.
test('smb is not penalised for weight-0 committee fields', () => {
  const r = evaluateHygiene(
    fullDeal({ economic_buyer: null, decision_process: null, account_intel: null }),
    fullOrg(),
    'smb',
    cfg
  );
  assert.equal(r.score, 100);
  assert.equal(r.grade, 'A');
  const keys = r.missing.map(m => m.key);
  assert.ok(!keys.includes('economic_buyer'));
  assert.ok(!keys.includes('decision_process'));
  assert.ok(!keys.includes('account_intel'));
});

// 4. A completely empty deal and org scores 0 and grade E, for any motion.
test('a completely empty deal and org scores 0 and grade E for every motion', () => {
  for (const motion of ['smb', 'mid', 'strategic']) {
    const r = evaluateHygiene(emptyDeal, emptyOrg, motion, cfg);
    assert.equal(r.score, 0, `motion ${motion}`);
    assert.equal(r.grade, 'E', `motion ${motion}`);
    assert.deepEqual(r.present, [], `motion ${motion}`);
  }
});

// 5. contact_person presence rules.
test('contact_person counts as present via org.people_count even with no linked person', () => {
  const r = evaluateHygiene(
    fullDeal({ has_contact_person: false }),
    fullOrg({ people_count: 2 }),
    'strategic',
    cfg
  );
  assert.ok(!r.missing.some(m => m.key === 'contact_person'));
});

test('contact_person counts as present via has_contact_person even when people_count is 0', () => {
  const r = evaluateHygiene(
    fullDeal({ has_contact_person: true }),
    fullOrg({ people_count: 0 }),
    'strategic',
    cfg
  );
  assert.ok(!r.missing.some(m => m.key === 'contact_person'));
});

// 6. missing is sorted by weight descending.
test('missing is sorted by weight descending', () => {
  const r = evaluateHygiene(
    fullDeal({ economic_buyer: null, account_intel: null }),
    fullOrg({ total_hectares: null }),
    'strategic',
    cfg
  );
  assert.deepEqual(r.missing.map(m => m.key), ['economic_buyer', 'account_intel', 'org_hectares']);
  assert.deepEqual(r.missing.map(m => m.weight), [3, 2, 1]);
});

// 7. Tolerates null deal/org.
test('evaluateHygiene(null, null, ...) does not throw and returns a valid shape', () => {
  const r = evaluateHygiene(null, null, 'smb', cfg);
  assert.equal(r.score, 0);
  assert.equal(r.grade, 'E');
  assert.deepEqual(r.present, []);
  assert.ok(Array.isArray(r.missing));
  assert.equal(typeof r.max_weight, 'number');
  assert.equal(typeof r.earned_weight, 'number');
});

// 8. Grade boundaries, via a dedicated cfg with two items summing to 100 per motion.
test('grade boundaries', () => {
  const boundaryCfg = (a, b) => ({
    items: {
      value:         { label: 'A', weights: { smb: a, mid: a, strategic: a } },
      identify_pain: { label: 'B', weights: { smb: b, mid: b, strategic: b } }
    },
    grades: cfg.grades
  });
  const filledValueOnly = { value_eur: 1000, identify_pain: null };

  const cases = [
    [90, 10, 90, 'A'],
    [89, 11, 89, 'B'],
    [75, 25, 75, 'B'],
    [50, 50, 50, 'C'],
    [25, 75, 25, 'D'],
    [24, 76, 24, 'E']
  ];
  for (const [a, b, expectedScore, expectedGrade] of cases) {
    const r = evaluateHygiene(filledValueOnly, {}, 'smb', boundaryCfg(a, b));
    assert.equal(r.score, expectedScore, `weights ${a}/${b}`);
    assert.equal(r.grade, expectedGrade, `weights ${a}/${b}`);
  }

  const zero = evaluateHygiene({ value_eur: null, identify_pain: null }, {}, 'smb', boundaryCfg(90, 10));
  assert.equal(zero.score, 0);
  assert.equal(zero.grade, 'E');
});

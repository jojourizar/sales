import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyze } from '../lib/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, '..', 'lib', 'cli.js');

function run(fixture) {
  const out = execFileSync('node', [cli, join(here, 'fixtures', fixture)], { encoding: 'utf8' });
  return JSON.parse(out);
}

function fixture(name) {
  return JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));
}

const codes = r => r.uncertainty.map(u => u.code);

test('governo-rs reports poor hygiene listing the committee gaps', () => {
  const r = run('governo-rs.json');
  assert.ok(r.hygiene);
  assert.equal(typeof r.hygiene.score, 'number');
  assert.equal(typeof r.hygiene.grade, 'string');
  const labels = r.hygiene.missing.map(m => m.label);
  assert.ok(labels.includes('Economic Buyer'));
});

test('governo-rs classifies strategic with critical committee gaps', () => {
  const r = run('governo-rs.json');
  assert.equal(r.motion, 'strategic');
  // 3.680.000 EUR: the value alone already puts it at strategic, and the
  // Public Institutions segment confirms it.
  assert.equal(r.basis, 'value');
  assert.equal(r.committee.critical, true);
  assert.ok(r.committee.gaps.includes('Economic Buyer'));
  assert.ok(r.committee.gaps.includes('Decision Process'));
  assert.ok(r.committee.gaps.includes('Identify Pain'));
  assert.ok(r.committee.gaps.includes('Account Intel'));
  // The CRM did not report contacts, so this is not counted as a gap.
  assert.ok(!r.committee.gaps.includes('Persona de contacto'));
  assert.equal(r.committee.present.contact_person, null);
  assert.ok(codes(r).includes('people_count_unknown'));
  // Governo RS is a Regional Intel deal (label 346), and Regional Intel covers a
  // whole state, so its 34 million hectares are natural, not garbage: the
  // implausible-hectares check must NOT fire for it.
  assert.ok(!codes(r).includes('hectares_implausible'));
  assert.ok(r.missing_fields.includes('Tamaño de la Empresa'));
  assert.ok(!r.missing_fields.includes('Segmento de la organización'));
});

test('governo-rs exposes the strategic touch benchmark in the verdict', () => {
  const r = run('governo-rs.json');
  assert.deepEqual(r.touch_benchmark, { quarter_min: 8, quarter_max: 12, multithread_min: 3 });
});

// Grupo Caeté is a TIER 1 org with a 32.000 EUR deal: transactional.
test('grupo-caete classifies smb, the tier no longer raising it', () => {
  const r = run('grupo-caete.json');
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'value');
  assert.equal(r.value_eur, 32000);
  assert.ok(!('tier_inferred' in r), 'tier_inferred must be gone from the verdict');
});

// Ingenio Palo Gordo is a single Guatemalan mill: a 20.700 EUR TIER 1 deal.
test('consultora classifies smb and is not critical', () => {
  const r = run('consultora-smb.json');
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'value');
  assert.equal(r.value_eur, 20700);
  assert.equal(r.committee.critical, false);
});

test('a clean fixture carries no uncertainty', () => {
  const r = run('consultora-smb.json');
  assert.deepEqual(r.uncertainty, []);
});

// R7: shape of the uncertainty channel
test('every uncertainty entry has a machine code and a human detail', () => {
  const r = run('governo-rs.json');
  assert.ok(Array.isArray(r.uncertainty));
  for (const u of r.uncertainty) {
    assert.equal(typeof u.code, 'string');
    assert.match(u.code, /^[a-z_]+$/);
    assert.equal(typeof u.detail, 'string');
    assert.ok(u.detail.length > 10);
  }
});

// R1: missing organization
test('a deal with no organization does not throw and reports org_missing', () => {
  const { deal } = fixture('grupo-caete.json');
  const r = analyze({ ...deal, org_id: null }, undefined);
  assert.ok(codes(r).includes('org_missing'));
  // Without an org there is no TIER and no segment, so the deal value carries
  // the whole verdict and both holes are reported.
  assert.equal(r.motion, 'smb');
  assert.equal(r.basis, 'value');
  assert.ok(r.missing_fields.includes('Tamaño de la Empresa'));
  assert.ok(r.missing_fields.includes('Segmento de la organización'));
  assert.ok(codes(r).includes('people_count_unknown'));
});

// R7: the Governo de Goiás hole. An empty org record silently disables the
// government override, so the missing segment has to be visible.
test('an organization with no segment reports the hole in Spanish', () => {
  const { deal, org } = fixture('governo-rs.json');
  const segKey = 'b3c338aafa4d72f52ffa78c427f26489906946ad';
  const blank = { ...org, custom_fields: { ...org.custom_fields, [segKey]: null } };
  const r = analyze(deal, blank);
  assert.ok(r.missing_fields.includes('Segmento de la organización'));
  assert.ok(!r.missing_fields.includes('org_segment'));
});

// R3: unsupported currency
test('an unsupported currency yields a null value and says so', () => {
  const { deal, org } = fixture('governo-rs.json');
  const r = analyze({ ...deal, currency: 'MXN' }, org);
  assert.equal(r.value_eur, null);
  assert.equal(r.currency, 'MXN');
  // No usable value, so the base falls back to size and says so.
  assert.equal(r.basis, 'size_inference');
  const u = r.uncertainty.find(x => x.code === 'currency_unsupported');
  assert.ok(u);
  assert.ok(u.detail.includes('MXN'));
  assert.ok(!r.reasons.some(x => x.includes('umbral')));
});

// R4: closed and archived deals
test('a lost deal is not critical despite gaps', () => {
  const { deal, org } = fixture('governo-rs.json');
  const r = analyze({ ...deal, status: 'lost' }, org);
  assert.equal(r.status, 'lost');
  assert.ok(r.committee.gaps.length > 0);
  assert.equal(r.committee.critical, false);
});

test('an archived deal is not critical despite gaps', () => {
  const { deal, org } = fixture('governo-rs.json');
  const r = analyze({ ...deal, is_archived: true }, org);
  assert.equal(r.is_archived, true);
  assert.ok(r.committee.gaps.length > 0);
  assert.equal(r.committee.critical, false);
});

test('a deal that does not report its status says so instead of going quiet', () => {
  const { deal, org } = fixture('governo-rs.json');
  const { status, ...noStatus } = deal;
  const r = analyze(noStatus, org);
  assert.equal(r.status, null);
  assert.equal(r.committee.critical, false);
  assert.ok(codes(r).includes('status_unknown'));
});

// R5: unknown stage
test('an unknown stage is null, not zero, and blocks the critical flag', () => {
  const { deal, org } = fixture('governo-rs.json');
  const r = analyze({ ...deal, stage_id: 999 }, org);
  assert.equal(r.stage_order, null);
  assert.equal(r.post_discovery, null);
  assert.equal(r.committee.critical, false);
  const u = r.uncertainty.find(x => x.code === 'stage_unknown');
  assert.ok(u);
  assert.ok(u.detail.includes('999'));
});

// R6: TIER present but unrecognised
test('an unrecognised TIER is reported without claiming the field is empty', () => {
  const { deal, org } = fixture('grupo-caete.json');
  const tierKey = '5f94a680a30cff78522a7634337049c7669a389b';
  const raw = { ...org, custom_fields: { ...org.custom_fields, [tierKey]: 99 } };
  const r = analyze(deal, raw);
  assert.ok(!r.missing_fields.includes('Tamaño de la Empresa'));
  const u = r.uncertainty.find(x => x.code === 'tier_unrecognised');
  assert.ok(u);
  assert.ok(u.detail.includes('99'));
});

// R8: labels are resolved at the presentation boundary
test('the verdict speaks Spanish labels, not stable keys', () => {
  const r = run('governo-rs.json');
  assert.ok(!r.committee.gaps.includes('economic_buyer'));
  assert.ok(!r.missing_fields.includes('org_tier'));
});

// R9: the strategic segment list is read from the rubric
test('a public institution segment forces strategic on a low value deal', () => {
  const { deal, org } = fixture('consultora-smb.json');
  const segKey = 'b3c338aafa4d72f52ffa78c427f26489906946ad';
  const raw = { ...org, custom_fields: { ...org.custom_fields, [segKey]: [40] } };
  const r = analyze(deal, raw);
  assert.equal(r.motion, 'strategic');
  assert.ok(r.reasons.some(x => x.includes('segmento')));
});

// R10: injectable config
test('analyze accepts an injected rubric without touching disk', () => {
  const { deal, org } = fixture('consultora-smb.json');
  const rubric = JSON.parse(readFileSync(join(here, '..', 'config', 'rubric.json'), 'utf8'));
  const base = analyze(deal, org);
  assert.equal(base.motion, 'smb');
  // Drop the mid floor below this deal's value and the motion must rise.
  const candidate = { ...rubric, value_floors_eur: { strategic: 250000, mid: 1000 } };
  const tuned = analyze(deal, org, { rubric: candidate });
  assert.equal(tuned.motion, 'mid');
  // The injected rubric must not leak into later calls.
  assert.equal(analyze(deal, org).motion, 'smb');
});

test('an injected field map changes how custom fields are read', () => {
  const { deal, org } = fixture('consultora-smb.json');
  const fieldMap = JSON.parse(readFileSync(join(here, '..', 'config', 'field-map.json'), 'utf8'));
  const broken = { ...fieldMap, deal: { ...fieldMap.deal, identify_pain: 'nope' } };
  const r = analyze(deal, org, { fieldMap: broken });
  assert.equal(r.committee.present.identify_pain, false);
});

// R11: the entry point guard must not fire on importers
test('importing the module from another entry script does not run main', () => {
  const script = join(here, 'helpers', 'report-cli.js');
  const out = execFileSync('node', [script], { encoding: 'utf8' });
  assert.equal(out.trim(), 'imported-without-running-main');
});

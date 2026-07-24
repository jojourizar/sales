import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/cli.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fx = name => JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8'));

test('enterprise government fixture: strategic and critical with committee gaps', () => {
  const { user, deal, org } = fx('enterprise-gov.json');
  const r = analyze(deal, org, user);
  assert.equal(r.motion, 'strategic');
  assert.equal(r.committee.critical, true);
  assert.ok(r.committee.gaps.includes('economic_buyer'));
  assert.ok(r.touch_benchmark.quarter_min === 8);
  assert.ok(r.hygiene.score < 50);
});

test('smb single fixture: smb and not critical', () => {
  const { user, deal, org } = fx('smb-single.json');
  const r = analyze(deal, org, user);
  assert.equal(r.motion, 'smb');
  assert.equal(r.committee.critical, false);
});

test('missing user config throws a clear setup message', () => {
  const { deal, org } = fx('smb-single.json');
  assert.throws(() => analyze(deal, org, null), /setup/i);
});

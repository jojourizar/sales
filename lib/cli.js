// Glue: loads shipped defaults, resolves them against the user config, runs
// normalize + classify + committee + hygiene, and emits the verdict.
// Usage: node lib/cli.js <path-to-json with {user, deal, org}>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { resolveConfig } from './config.js';
import { extractDeal, extractOrg } from './normalize.js';
import { classifyMotion } from './classify.js';
import { evaluateCommittee } from './committee.js';
import { evaluateHygiene } from './hygiene.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaults = JSON.parse(readFileSync(join(here, '..', 'config', 'defaults.json'), 'utf8'));

function loadUserConfig() {
  try { return JSON.parse(readFileSync(join(here, '..', 'config', 'user-config.json'), 'utf8')); }
  catch { return null; }
}

export function analyze(rawDeal, rawOrg, userConfig) {
  if (!userConfig) {
    throw new Error('No user config found. Run /setup first to map this Pipedrive instance.');
  }
  const cfg = resolveConfig(defaults, userConfig);
  const deal = extractDeal(rawDeal, cfg.fieldMap, cfg.rubric.fx_to_eur);
  const org = extractOrg(rawOrg, cfg.fieldMap);
  const cls = classifyMotion(org, deal, cfg.rubric);
  const stage_order = cfg.rubric.stage_order[String(deal.stage_id)] ?? null;
  const committee = evaluateCommittee(deal, org, {
    motion: cls.motion, stage_order, advanced_order: cfg.rubric.stage.advanced_order, available: cfg.available
  });
  const hygiene = evaluateHygiene(deal, org, cls.motion, cfg.rubric.hygiene, cfg.available);
  return {
    deal_id: deal.id, title: deal.title, motion: cls.motion, basis: cls.basis,
    reasons: cls.reasons, value_eur: deal.value_eur, currency: deal.currency,
    status: deal.status, is_archived: deal.is_archived, stage_id: deal.stage_id, stage_order,
    post_discovery: stage_order == null ? null : stage_order >= cfg.rubric.stage.post_discovery_order,
    committee, hygiene,
    touch_benchmark: cfg.rubric.touch_benchmark[cls.motion] ?? null,
    uncertainty: cls.uncertainty
  };
}

function main() {
  const path = process.argv[2];
  if (!path) { console.error('Usage: node lib/cli.js <path.json with {deal, org}>'); process.exit(2); }
  const input = JSON.parse(readFileSync(path, 'utf8'));
  const user = input.user || loadUserConfig();
  console.log(JSON.stringify(analyze(input.deal, input.org, user), null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

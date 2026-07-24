// Glue: reads raw {deal, org} from a JSON file and emits the verdict.
// Usage: node lib/cli.js <path-to-json>
// This is the presentation boundary: it is the only module that turns the
// stable keys used inside the logic into the Spanish labels a seller reads.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { extractDeal, extractOrg } from './normalize.js';
import { classifyMotion } from './classify.js';
import { evaluateCommittee } from './committee.js';
import { evaluateHygiene } from './hygiene.js';

const here = dirname(fileURLToPath(import.meta.url));
const defaultFieldMap = JSON.parse(readFileSync(join(here, '..', 'config', 'field-map.json'), 'utf8'));
const defaultRubric = JSON.parse(readFileSync(join(here, '..', 'config', 'rubric.json'), 'utf8'));

const LABELS = {
  org_tier: 'Tamaño de la Empresa',
  org_segment: 'Segmento de la organización',
  economic_buyer: 'Economic Buyer',
  decision_process: 'Decision Process',
  identify_pain: 'Identify Pain',
  account_intel: 'Account Intel',
  contact_person: 'Persona de contacto'
};

const label = key => LABELS[key] ?? key;

export function analyze(rawDeal, rawOrg, config = {}) {
  const fieldMap = config.fieldMap ?? defaultFieldMap;
  const rubric = config.rubric ?? defaultRubric;
  // The segment list is a business rule, so it belongs to the rubric. The
  // field map is still read as a fallback for older configs.
  const strategicSegmentIds =
    rubric.strategic_segment_ids ?? fieldMap.strategic_segment_ids ?? [];

  const uncertainty = [];

  const deal = extractDeal(rawDeal, fieldMap, rubric.fx_to_eur);
  const org = extractOrg(rawOrg, fieldMap);
  if (rawOrg == null) {
    uncertainty.push({
      code: 'org_missing',
      detail: 'El deal no tiene organización vinculada: no se pudieron evaluar TIER, segmento ni contactos de la organización.'
    });
  }

  if (deal.status == null) {
    uncertainty.push({
      code: 'status_unknown',
      detail: 'El deal no informa su estado (open, won o lost): por prudencia no se marca como crítico.'
    });
  }

  const cls = classifyMotion(org, deal, rubric, strategicSegmentIds);
  uncertainty.push(...cls.uncertainty);

  // An unmapped stage is unknown, never order zero.
  const stageKey = deal.stage_id == null ? null : String(deal.stage_id);
  const stage_order = (stageKey == null ? null : rubric.stage_order[stageKey]) ?? null;
  if (stage_order == null) {
    uncertainty.push({
      code: 'stage_unknown',
      detail: `La etapa ${deal.stage_id ?? 'no informada'} no está en la rúbrica: no se pudo situar el deal en el pipeline, así que no se evaluó la criticidad.`
    });
  }

  const committee = evaluateCommittee(deal, org, {
    motion: cls.motion,
    stage_order,
    advanced_order: rubric.stage.advanced_order
  });
  uncertainty.push(...committee.uncertainty);

  const hygiene = evaluateHygiene(deal, org, cls.motion, rubric.hygiene);

  return {
    deal_id: deal.id,
    title: deal.title,
    motion: cls.motion,
    basis: cls.basis,
    reasons: cls.reasons,
    missing_fields: cls.missing_fields.map(label),
    value_eur: deal.value_eur,
    currency: deal.currency,
    status: deal.status,
    is_archived: deal.is_archived,
    stage_id: deal.stage_id,
    stage_order,
    post_discovery: stage_order == null ? null : stage_order >= rubric.stage.post_discovery_order,
    committee: {
      present: committee.present,
      gaps: committee.gaps.map(label),
      critical: committee.critical
    },
    hygiene,
    touch_benchmark: rubric.touch_benchmark ? (rubric.touch_benchmark[cls.motion] ?? null) : null,
    uncertainty
  };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Uso: node lib/cli.js <ruta-al-json con {deal, org}>');
    process.exit(2);
  }
  const input = JSON.parse(readFileSync(path, 'utf8'));
  const result = analyze(input.deal, input.org);
  console.log(JSON.stringify(result, null, 2));
}

// Run main only when this file is the entry point, never on import.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

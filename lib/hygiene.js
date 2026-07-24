// Scores lead hygiene: how completely and correctly the deal and its
// organization are registered in the CRM. Pure: no I/O, no Pipedrive
// knowledge beyond the clean domain field names normalize.js produces.
// Labels and weights live in the injected hygieneConfig; this module never
// hardcodes a Spanish label.

function filled(v) {
  return v != null && String(v).trim() !== '';
}

function contactPersonPresent(deal, org) {
  if (deal.has_contact_person === true) return true;
  return Number(org.people_count) > 0;
}

// One presence check per item key. Keys are the stable domain names shared
// with committee.js and normalize.js, not UI labels.
const PRESENCE = {
  value: deal => deal.value_eur != null && Number(deal.value_eur) > 0,
  identify_pain: deal => filled(deal.identify_pain),
  contact_person: contactPersonPresent,
  deal_hectares: deal => deal.deal_hectares != null && Number(deal.deal_hectares) > 0,
  economic_buyer: deal => filled(deal.economic_buyer),
  decision_process: deal => filled(deal.decision_process),
  account_intel: deal => filled(deal.account_intel),
  org_tier: (deal, org) => org.tier != null,
  org_segment: (deal, org) => Array.isArray(org.segment_ids) && org.segment_ids.length > 0,
  org_hectares: (deal, org) => org.total_hectares != null && Number(org.total_hectares) > 0,
  tech_level: (deal, org) => org.tech_level != null
};

function gradeFor(score, grades) {
  // Sort defensively: correctness must not depend on the config's ordering.
  const sorted = [...(grades || [])].sort((a, b) => b.min - a.min);
  for (const g of sorted) {
    if (score >= g.min) return g.grade;
  }
  return sorted.length ? sorted[sorted.length - 1].grade : 'E';
}

export function evaluateHygiene(deal, org, motion, hygieneConfig) {
  const d = deal || {};
  const o = org || {};
  const items = (hygieneConfig && hygieneConfig.items) || {};
  const grades = (hygieneConfig && hygieneConfig.grades) || [];

  let max_weight = 0;
  let earned_weight = 0;
  const present = [];
  const missing = [];

  for (const [key, item] of Object.entries(items)) {
    const weight = Number(item.weights && item.weights[motion]) || 0;
    // Weight 0 means this item does not apply to this motion: it is neither
    // required nor counted, so it must never surface in present or missing.
    if (weight <= 0) continue;

    max_weight += weight;
    const check = PRESENCE[key];
    const isPresent = typeof check === 'function' ? Boolean(check(d, o)) : false;
    const entry = { key, label: item.label, weight };
    if (isPresent) {
      earned_weight += weight;
      present.push(entry);
    } else {
      missing.push(entry);
    }
  }

  // Stable sort: ties keep the config's item order.
  missing.sort((a, b) => b.weight - a.weight);

  const score = max_weight === 0 ? 100 : Math.round((earned_weight / max_weight) * 100);
  const grade = gradeFor(score, grades);

  return { score, grade, max_weight, earned_weight, present, missing };
}

// Lead readiness score, weighted by motion. An item that is not available
// (concept not mapped) is excluded from the denominator entirely.

function filled(v) { return v != null && String(v).trim() !== ''; }

function isPresent(key, deal, org) {
  switch (key) {
    case 'value': return deal.value_eur != null && Number(deal.value_eur) > 0;
    case 'contact_person': return deal.has_contact_person === true || (Number(org.people_count) || 0) > 0;
    case 'org_segment': return filled(org.segment);
    default: return filled(deal[key]);
  }
}

function gradeFor(score, grades) {
  for (const g of grades) if (score >= g.min) return g.grade;
  return grades[grades.length - 1].grade;
}

// available covers optional concepts; value and contact_person are always on.
export function evaluateHygiene(deal, org, motion, hygieneConfig, available) {
  const av = available || {};
  const always = new Set(['value', 'contact_person']);
  let max = 0, earned = 0;
  const present = [], missing = [];

  for (const [key, item] of Object.entries(hygieneConfig.items)) {
    const weight = item.weights[motion] || 0;
    if (weight <= 0) continue;
    if (!always.has(key) && av[key] === false) continue; // unavailable: excluded
    max += weight;
    const row = { key, label: item.label, weight };
    if (isPresent(key, deal, org)) { earned += weight; present.push(row); }
    else missing.push(row);
  }

  missing.sort((a, b) => b.weight - a.weight);
  const score = max === 0 ? 100 : Math.round((earned / max) * 100);
  return { score, grade: gradeFor(score, hygieneConfig.grades), max_weight: max, earned_weight: earned, present, missing };
}

// Resolves the shipped defaults against the user's generated config, and
// reports which optional concepts are available (mapped) for this instance.

// Optional concepts a user maps in /setup. Standard fields (value, stage,
// contact_person) are always available and are not listed here.
export const CONCEPTS = ['economic_buyer', 'decision_process', 'identify_pain', 'account_intel', 'org_segment'];

function validateFloors(floors) {
  const s = floors && Number(floors.strategic);
  const m = floors && Number(floors.mid);
  if (!Number.isFinite(s) || !Number.isFinite(m) || s <= 0 || m <= 0 || s < m) {
    throw new Error('Invalid value thresholds in user config (value_floors_eur must have positive strategic >= mid). Run /setup to configure this Pipedrive instance.');
  }
}

export function resolveConfig(defaults, user) {
  validateFloors(user.value_floors_eur);
  const dealMap = (user.field_map && user.field_map.deal) || {};
  const orgMap = (user.field_map && user.field_map.org) || {};

  const available = { value: true, contact_person: true };
  for (const c of CONCEPTS) {
    const key = c === 'org_segment' ? orgMap.segment : dealMap[c];
    available[c] = key != null && key !== '';
  }

  return {
    available,
    fieldMap: {
      deal: {
        economic_buyer: dealMap.economic_buyer ?? null,
        decision_process: dealMap.decision_process ?? null,
        identify_pain: dealMap.identify_pain ?? null,
        account_intel: dealMap.account_intel ?? null
      },
      org: { segment: orgMap.segment ?? null }
    },
    rubric: {
      fx_to_eur: defaults.fx_to_eur,
      motion_rank: defaults.motion_rank,
      stage: defaults.stage,
      hygiene: defaults.hygiene,
      touch_benchmark: defaults.touch_benchmark,
      stage_order: user.stage_order || {},
      value_floors_eur: user.value_floors_eur,
      strategic_segment_values: user.strategic_segment_values || []
    }
  };
}

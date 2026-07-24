// Applies the rubric to clean objects. Knows nothing about Pipedrive.
// Spine: the deal value. Optional override: a configured strategic segment.

function raise(current, candidate, rubric) {
  return rubric.motion_rank[candidate] > rubric.motion_rank[current] ? candidate : current;
}

function motionFromValue(v, rubric) {
  const value = Number(v);
  if (value >= rubric.value_floors_eur.strategic) return 'strategic';
  if (value >= rubric.value_floors_eur.mid) return 'mid';
  return 'smb';
}

export function classifyMotion(org, deal, rubric) {
  const o = org || {};
  const d = deal || {};
  const reasons = [];
  const uncertainty = [];

  const v = d.value_eur;
  const usableValue = v != null && Number(v) > 0;

  let motion;
  let basis;
  if (usableValue) {
    basis = 'value';
    motion = motionFromValue(v, rubric);
    reasons.push(`deal value ${v} EUR classifies the account as ${motion}`);
  } else {
    // No convertible value: cannot size the deal. Default to the safest low
    // motion and report it, rather than guessing.
    basis = 'no_value';
    motion = 'smb';
    uncertainty.push({
      code: 'value_unusable',
      detail: `The deal has no usable value in ${d.currency ?? 'an unknown currency'}, so it could not be sized. Defaulted to SMB.`
    });
    reasons.push('no usable deal value: defaulted to smb');
  }

  const segs = (rubric.strategic_segment_values || []).map(s => String(s).trim().toLowerCase());
  if (o.segment != null && segs.includes(String(o.segment).trim().toLowerCase())) {
    motion = raise(motion, 'strategic', rubric);
    reasons.push(`segment "${o.segment}" is configured as a committee sale: forces strategic`);
  }

  return { motion, basis, reasons, uncertainty };
}

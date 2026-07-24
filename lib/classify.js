// Applies the rubric to clean objects. Knows nothing about Pipedrive.
// Emits stable keys, never UI labels. The presentation layer resolves them.

// Returns the hectares usable for inference, or null when the recorded value
// is above the plausibility ceiling and must not be trusted.
function usableHectares(org, rubric) {
  const ha = Number(org.total_hectares);
  if (!Number.isFinite(ha) || ha <= 0) return 0;
  const ceiling = Number(rubric.max_plausible_hectares);
  if (Number.isFinite(ceiling) && ha > ceiling) return null;
  return ha;
}

function inferTier(ha, org, rubric) {
  const hectares = Number(ha) || 0;
  const band = Number(org.annual_revenue_band) || 0;
  if (hectares >= rubric.inference_hectares.strategic || band >= rubric.inference_revenue_band.strategic) return 'strategic';
  if (hectares >= rubric.inference_hectares.mid || band >= rubric.inference_revenue_band.mid) return 'mid';
  return 'smb';
}

function raise(current, candidate, rubric) {
  return rubric.motion_rank[candidate] > rubric.motion_rank[current] ? candidate : current;
}

// The base motion straight from the value of life: the classification spine.
function motionFromValue(v, rubric) {
  const value = Number(v);
  if (value >= rubric.value_floors_eur.strategic) return 'strategic';
  if (value >= rubric.value_floors_eur.mid) return 'mid';
  return 'smb';
}

export function classifyMotion(org, deal, rubric, strategicSegmentIds) {
  const o = org || {};
  const d = deal || {};
  const segmentIds = strategicSegmentIds || rubric.strategic_segment_ids || [];
  const tierRaises = rubric.tier_raises || {};
  const reasons = [];
  const missing_fields = [];
  const uncertainty = [];

  // 1. Base from the value of life. TIER encodes geographic reach, not buying
  // complexity, so it cannot be the spine.
  const v = d.value_eur;
  if (v == null) {
    uncertainty.push({
      code: 'currency_unsupported',
      detail: `No hay tipo de cambio para la divisa ${d.currency ?? 'desconocida'}: el valor no se convirtió a euros y no se pudo clasificar por valor.`
    });
  }
  const usableValue = v != null && Number(v) > 0;

  let motion;
  let basis;
  if (usableValue) {
    basis = 'value';
    motion = motionFromValue(v, rubric);
    reasons.push(`valor de vida ${v} EUR: clasifica la cuenta como ${motion}`);
  } else {
    // 1b. Fallback: no usable value, so size is the only signal left.
    basis = 'size_inference';
    motion = inferTier(usableHectares(o, rubric), o, rubric);
    reasons.push(`sin importe utilizable en el deal: motion inferido a ${motion} por tamaño (hectáreas/revenue)`);
  }

  // Data hygiene: implausible hectares are worth flagging even when the value
  // spine classified the deal and the hectares were never consulted. Regional
  // Intel deals are the exception: that product covers an entire region, so
  // millions of hectares are natural and correct, not a data error.
  const rawHectares = Number(o.total_hectares);
  const hectaresCeiling = Number(rubric.max_plausible_hectares);
  const isRegionalIntel = (d.label_ids || []).includes(rubric.regional_intel_label_id);
  if (!isRegionalIntel && Number.isFinite(rawHectares) && Number.isFinite(hectaresCeiling) && rawHectares > hectaresCeiling) {
    uncertainty.push({
      code: 'hectares_implausible',
      detail: `Las hectáreas registradas (${o.total_hectares}) superan el máximo plausible de ${rubric.max_plausible_hectares}: dato probablemente erróneo, no se usó para clasificar.`
    });
  }

  // 2. Segment override: government, banks and insurers are committee sales.
  const isStrategicSegment = (o.segment_ids || []).some(id => segmentIds.includes(id));
  if (isStrategicSegment) {
    motion = raise(motion, 'strategic', rubric);
    reasons.push('segmento Public Institutions/Banks/Insurers: fuerza motion estratégico');
  }

  // 3. TIER override: only a genuine multinational raises the motion. TIER 1, 2
  // and 3 have no effect. An absent or unrecognised TIER is data hygiene, not a
  // classification event.
  if (o.tier != null) {
    const raised = tierRaises[String(o.tier)];
    if (raised) {
      motion = raise(motion, raised, rubric);
      reasons.push(`TIER ${o.tier} (organización internacional): fuerza motion estratégico`);
    }
  } else if (o.tier_raw != null) {
    // A value present but outside the enum is a different problem from an
    // empty field, and deserves a different, truthful message.
    uncertainty.push({
      code: 'tier_unrecognised',
      detail: `El valor de TIER de la organización (${o.tier_raw}) no está en la rúbrica: no se pudo comprobar si es una cuenta internacional.`
    });
  } else {
    missing_fields.push('org_tier');
  }

  // 4. An organization with no segment at all silently disables the segment
  // override, so the hole has to be visible.
  if ((o.segment_ids || []).length === 0) missing_fields.push('org_segment');

  return { motion, basis, reasons, missing_fields, uncertainty };
}

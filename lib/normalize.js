// Translates raw Pipedrive payloads into clean objects.
// Only source of knowledge about Pipedrive's shape.

export function toEur(value, currency, fx) {
  const rate = fx[currency];
  if (rate == null) return null;
  return Math.round(Number(value) * rate);
}

function bestValue(raw) {
  // ARR comes back as 0 on many deals, so take the largest value measure.
  return Math.max(
    Number(raw.value) || 0,
    Number(raw.acv) || 0,
    Number(raw.arr) || 0,
    Number(raw.mrr) || 0
  );
}

export function extractDeal(raw, fieldMap, fx) {
  const r = raw || {};
  const cf = r.custom_fields || {};
  const dm = fieldMap.deal;
  const value = bestValue(r);
  return {
    id: r.id ?? null,
    title: r.title || '',
    stage_id: r.stage_id ?? null,
    org_id: r.org_id ?? null,
    person_id: r.person_id ?? null,
    has_contact_person: r.person_id != null,
    // Pipedrive sends both on every deal. If they are absent we were not told,
    // so status stays null and the deal is not treated as actionable.
    status: r.status ?? null,
    is_archived: r.is_archived === true,
    currency: r.currency || null,
    label_ids: Array.isArray(r.label_ids) ? r.label_ids : [],
    value_native: value,
    value_eur: toEur(value, r.currency, fx),
    deal_hectares: cf[dm.deal_hectares] ?? null,
    economic_buyer: cf[dm.economic_buyer] ?? null,
    decision_process: cf[dm.decision_process] ?? null,
    identify_pain: cf[dm.identify_pain] ?? null,
    account_intel: cf[dm.account_intel] ?? null
  };
}

export function extractOrg(raw, fieldMap) {
  const r = raw || {};
  const cf = r.custom_fields || {};
  const om = fieldMap.org;
  // tier_raw keeps the value as recorded, so a caller can tell an empty field
  // from a value the enum does not recognise.
  const tier_raw = cf[om.tier] ?? null;
  const tier = tier_raw != null && fieldMap.tier_enum[String(tier_raw)] != null
    ? fieldMap.tier_enum[String(tier_raw)]
    : null;
  const segRaw = cf[om.segment];
  const segment_ids = Array.isArray(segRaw) ? segRaw : (segRaw != null ? [segRaw] : []);
  return {
    id: r.id ?? null,
    name: r.name || '',
    tier,
    tier_raw,
    segment_ids,
    total_hectares: cf[om.total_hectares] ?? null,
    tech_level: cf[om.tech_level] ?? null,
    annual_revenue_band: r.annual_revenue ?? null,
    employee_count: r.employee_count ?? null,
    // Pipedrive omits people_count unless it is explicitly requested, so an
    // absent key means unknown, never zero.
    people_count: r.people_count ?? null
  };
}

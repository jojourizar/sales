// Translates raw Pipedrive payloads into clean objects.
// The only module that knows Pipedrive's shape. Field keys come from the
// resolved fieldMap; an unmapped concept has a null key and yields null.

export function toEur(value, currency, fx) {
  const rate = fx[currency];
  if (rate == null) return null;
  return Math.round(Number(value) * rate);
}

function bestValue(raw) {
  return Math.max(Number(raw.value) || 0, Number(raw.acv) || 0, Number(raw.arr) || 0, Number(raw.mrr) || 0);
}

function readKey(cf, key) {
  return key ? (cf[key] ?? null) : null;
}

export function extractDeal(raw, fieldMap, fx) {
  const r = raw || {};
  const cf = r.custom_fields || {};
  const dm = fieldMap.deal || {};
  const value = bestValue(r);
  return {
    id: r.id,
    title: r.title || '',
    stage_id: r.stage_id,
    org_id: r.org_id,
    person_id: r.person_id ?? null,
    has_contact_person: r.person_id != null,
    currency: r.currency || null,
    value_native: value,
    value_eur: toEur(value, r.currency, fx),
    status: r.status ?? null,
    is_archived: r.is_archived ?? false,
    economic_buyer: readKey(cf, dm.economic_buyer),
    decision_process: readKey(cf, dm.decision_process),
    identify_pain: readKey(cf, dm.identify_pain),
    account_intel: readKey(cf, dm.account_intel)
  };
}

export function extractOrg(raw, fieldMap) {
  const r = raw || {};
  const cf = r.custom_fields || {};
  const om = fieldMap.org || {};
  return {
    id: r.id,
    name: r.name || '',
    segment: readKey(cf, om.segment),
    people_count: r.people_count ?? null
  };
}

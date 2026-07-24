// Evaluates buying-committee coverage from the clean deal object.
// A concept the user did not map is "unavailable": not a gap, reported once.
// Emits stable keys; the presentation layer resolves labels.

function filled(v) { return v != null && String(v).trim() !== ''; }

const FIELDS = ['economic_buyer', 'decision_process', 'identify_pain', 'account_intel'];

export function evaluateCommittee(deal, org, ctx) {
  const available = ctx.available || {};
  const present = {};
  const gaps = [];
  const unavailable = [];

  for (const f of FIELDS) {
    if (available[f] === false) { unavailable.push(f); continue; }
    const ok = filled(deal[f]);
    present[f] = ok;
    if (!ok) gaps.push(f);
  }

  // contact_person is a standard signal, always evaluated.
  const contactOk = deal.has_contact_person === true || (Number(org.people_count) || 0) > 0;
  const contactUnknown = deal.has_contact_person !== true && org.people_count == null;
  if (contactUnknown) {
    present.contact_person = null;
  } else {
    present.contact_person = contactOk;
    if (!contactOk) gaps.push('contact_person');
  }

  const critical =
    ctx.motion === 'strategic' &&
    Number(ctx.stage_order) >= Number(ctx.advanced_order) &&
    gaps.length > 0;

  return { present, gaps, unavailable, critical };
}

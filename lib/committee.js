// Evaluates buying committee coverage from the clean deal and org objects.
// Pure: no I/O and no Pipedrive labels, only stable keys.

function filled(v) {
  return v != null && String(v).trim() !== '';
}

// true = there is a contact, false = confirmed none, null = we cannot tell.
function contactPerson(deal, org) {
  if (deal.has_contact_person === true) return true;
  const count = org == null ? null : org.people_count;
  if (count == null) return null;
  return Number(count) > 0;
}

export function evaluateCommittee(deal, org, ctx) {
  const uncertainty = [];
  const present = {
    economic_buyer: filled(deal.economic_buyer),
    decision_process: filled(deal.decision_process),
    identify_pain: filled(deal.identify_pain),
    account_intel: filled(deal.account_intel),
    contact_person: contactPerson(deal, org)
  };

  if (present.contact_person === null) {
    uncertainty.push({
      code: 'people_count_unknown',
      detail: 'No se pudo determinar si la organización tiene contactos: el deal no tiene persona vinculada y el CRM no devolvió el número de personas. No cuenta como hueco.'
    });
  }

  // Only an explicit false is a gap. Unknown never counts as one.
  const gaps = Object.keys(present).filter(k => present[k] === false);

  // Critical: strategic motion, a known advanced stage, a real gap, and a deal
  // that is still actionable (open and not archived).
  const actionable = deal.status === 'open' && deal.is_archived !== true;
  const stageKnown = ctx.stage_order != null;
  const critical =
    actionable &&
    stageKnown &&
    ctx.motion === 'strategic' &&
    Number(ctx.stage_order) >= Number(ctx.advanced_order) &&
    gaps.length > 0;

  return { present, gaps, critical, uncertainty };
}

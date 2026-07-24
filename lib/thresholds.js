// Proposes value cutoffs from a sample of deal values, so setup does not force
// the user to invent thresholds. Pure: no I/O.

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

export function derivePercentileThresholds(values, strategicPct = 0.8, midPct = 0.5) {
  const clean = (values || [])
    .map(Number)
    .filter(v => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (clean.length === 0) return { strategic: null, mid: null };
  const strategic = percentile(clean, strategicPct);
  let mid = percentile(clean, midPct);
  if (mid > strategic) mid = strategic;
  return { strategic, mid };
}

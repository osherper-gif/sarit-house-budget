// utils/scheduleUtils.js
// Pure date/cascade logic for the Delay Simulator.
// No React, no LocalStorage — fully testable in isolation.

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (isoDate, days) => {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10); // keep "YYYY-MM-DD" shape
};

export const diffDays = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / DAY_MS);

export const formatHe = (isoDate) =>
  new Date(isoDate).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * getContractorEnd — resolves an end date whether the contractor stores
 * an explicit estimatedEndDate or only a durationDays.
 */
export const getContractorEnd = (c) =>
  c.estimatedEndDate ?? addDays(c.estimatedStartDate, c.durationDays ?? 7);

/**
 * simulateDelay
 * Given the full contractors array, the id of the delayed contractor and a
 * delay in days, returns a NEW array (never mutates) where:
 *   - the delayed contractor's end date is pushed by `delayDays`
 *   - every downstream contractor (later start in the sorted sequence)
 *     has BOTH start and end shifted by `delayDays`
 *   - shifted rows are flagged with `_shifted: true` and carry
 *     `_originalStart` / `_originalEnd` so the UI can render a diff.
 *
 * Downstream = any contractor whose estimatedStartDate is strictly after
 * the delayed contractor's start (ties broken by array order). This matches
 * a sequential Gantt-lite model without needing an explicit dependency graph.
 */
export function simulateDelay(contractors, delayedId, delayDays) {
  if (!delayDays || delayDays <= 0) return contractors.map((c) => ({ ...c }));

  const withDates = contractors.filter((c) => c.estimatedStartDate);
  const sorted = [...withDates].sort(
    (a, b) =>
      new Date(a.estimatedStartDate) - new Date(b.estimatedStartDate) ||
      contractors.indexOf(a) - contractors.indexOf(b)
  );
  const delayedIdx = sorted.findIndex((c) => c.id === delayedId);
  if (delayedIdx === -1) return contractors.map((c) => ({ ...c }));

  const downstreamIds = new Set(sorted.slice(delayedIdx + 1).map((c) => c.id));

  return contractors.map((c) => {
    if (c.id === delayedId) {
      const originalEnd = getContractorEnd(c);
      return {
        ...c,
        estimatedEndDate: addDays(originalEnd, delayDays),
        _shifted: true,
        _delaySource: true,
        _originalStart: c.estimatedStartDate,
        _originalEnd: originalEnd,
      };
    }
    if (downstreamIds.has(c.id)) {
      const originalEnd = getContractorEnd(c);
      return {
        ...c,
        estimatedStartDate: addDays(c.estimatedStartDate, delayDays),
        estimatedEndDate: addDays(originalEnd, delayDays),
        _shifted: true,
        _originalStart: c.estimatedStartDate,
        _originalEnd: originalEnd,
      };
    }
    return { ...c };
  });
}

/** Latest end date across the (possibly simulated) plan. */
export function getProjectCompletion(contractors) {
  const ends = contractors
    .filter((c) => c.estimatedStartDate)
    .map((c) => getContractorEnd(c));
  if (!ends.length) return null;
  return ends.reduce((max, d) => (new Date(d) > new Date(max) ? d : max));
}

/** Strips simulation flags before committing a plan back to the context. */
export const commitSimulation = (simulated) =>
  simulated.map(
    ({ _shifted, _delaySource, _originalStart, _originalEnd, ...clean }) =>
      clean
  );

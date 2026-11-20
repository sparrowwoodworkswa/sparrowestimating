// Construction cost escalation, from the Escalation tab of the Sparrow Cost Database (cost-database/escalation.csv).
// Factor = compounded annual rates from the cost year to the current year. Update each January.
export const CURRENT_YEAR = 2026;
const RATES: Record<number, number> = { 2023: 0.01, 2024: 0.05, 2025: 0.035, 2026: 0.038 };

export function escalationFactor(year: number | null | undefined): number {
  if (!year || year >= CURRENT_YEAR) return 1;
  let f = 1;
  for (let y = year + 1; y <= CURRENT_YEAR; y++) f *= 1 + (RATES[y] ?? 0.04);
  return f;
}

export const toCurrent = (amount: number, year: number | null | undefined) => amount * escalationFactor(year);

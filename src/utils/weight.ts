export function roundToQuarterKg(value: number): number {
  return Math.round(value * 4) / 4;
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value.toFixed(2)).toString();
}

export function formatWeightValue(weightKg: number): string {
  return formatNumber(roundToQuarterKg(weightKg));
}

export function formatWeightKg(weightKg: number): string {
  return `${formatWeightValue(weightKg)} kg`;
}

export function formatWeightRangeValues(minWeightKg: number, maxWeightKg: number): string {
  const minStr = formatWeightValue(minWeightKg);
  const maxStr = formatWeightValue(maxWeightKg);
  return minStr === maxStr ? maxStr : `${minStr}–${maxStr}`;
}

export function formatWeightRangeKg(minWeightKg: number, maxWeightKg: number): string {
  return `${formatWeightRangeValues(minWeightKg, maxWeightKg)} kg`;
}

export function formatDeltaKg(deltaKg: number): string {
  const val = roundToQuarterKg(deltaKg);
  if (Math.abs(val) < 0.01) return '0';
  const sign = val > 0 ? '+' : '';
  return `${sign}${formatNumber(val)}`;
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getMondayOfIsoWeek(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

export function getIsoWeekId(isoMonday: string): string {
  const [year, month, day] = isoMonday.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

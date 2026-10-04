const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isIsoDate(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
export function addCalendarDays(value: string, days: number): string {
  if (!isIsoDate(value)) throw new Error('Enter a valid calendar date.');
  if (!Number.isInteger(days) || days < 0 || days > 3650)
    throw new Error('Payment term must be between 0 and 3650 days.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

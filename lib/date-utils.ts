import { EthDateTime } from 'ethiopian-calendar-date-converter';

/**
 * Attempts to parse a DD/MM/YYYY string and returns a combined Gregorian and Ethiopian date
 * in the format "DD/MM/YYYY | DD/MM/YYYY".
 * If the date is already combined or invalid, it returns the original string.
 */
export function formatDualDate(dateStr: string | undefined): string {
  if (!dateStr || dateStr === '——/——/————') return '——/——/————';

  // If it already contains a pipe, assume it's already dual-formatted
  if (dateStr.includes('|')) {
    return dateStr;
  }

  const parts = dateStr.split(/[-/.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0].trim(), 10);
    let month = parseInt(parts[1].trim(), 10);
    let year = parseInt(parts[2].trim(), 10);

    if (month > 12 && day <= 12) {
      const temp = month;
      month = day;
      day = temp;
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && month <= 12 && day <= 31) {
      try {
        const eurDate = new Date(year, month - 1, day);
        const ethDate = EthDateTime.fromEuropeanDate(eurDate);

        const ethDay = String(ethDate.date).padStart(2, '0');
        const ethMonth = String(ethDate.month).padStart(2, '0');
        const ethYear = ethDate.year;

        const gDay = String(day).padStart(2, '0');
        const gMonth = String(month).padStart(2, '0');

        return `${gDay}/${gMonth}/${year} | ${ethDay}/${ethMonth}/${ethYear}`;
      } catch {
        return dateStr;
      }
    }
  }

  return dateStr;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Fallback if not YYYY-MM-DD
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${MONTHS_ID[monthIdx]} ${year}`;
  }
  return dateStr;
}

export function formatIndonesianDateRange(startStr: string, endStr: string): string {
  if (!startStr) return '';
  if (!endStr || startStr === endStr) {
    return formatIndonesianDate(startStr);
  }
  
  const startParts = startStr.split('-');
  const endParts = endStr.split('-');
  
  if (startParts.length !== 3 || endParts.length !== 3) {
    return `${startStr} s.d. ${endStr}`;
  }
  
  const startYear = startParts[0];
  const startMonthIdx = parseInt(startParts[1], 10) - 1;
  const startDay = parseInt(startParts[2], 10);
  
  const endYear = endParts[0];
  const endMonthIdx = parseInt(endParts[1], 10) - 1;
  const endDay = parseInt(endParts[2], 10);
  
  if (startYear === endYear) {
    if (startMonthIdx === endMonthIdx) {
      return `${startDay} - ${endDay} ${MONTHS_ID[startMonthIdx]} ${startYear}`;
    } else {
      return `${startDay} ${MONTHS_ID[startMonthIdx]} - ${endDay} ${MONTHS_ID[endMonthIdx]} ${startYear}`;
    }
  } else {
    return `${startDay} ${MONTHS_ID[startMonthIdx]} ${startYear} - ${endDay} ${MONTHS_ID[endMonthIdx]} ${endYear}`;
  }
}

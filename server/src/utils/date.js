const TIMEZONE = 'Asia/Kolkata';

function getTodayIST() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function isFutureDate(dateStr) {
  const todayIST = getTodayIST();
  return dateStr > todayIST;
}

module.exports = {
  getTodayIST,
  isValidDateFormat,
  isFutureDate,
  TIMEZONE,
};

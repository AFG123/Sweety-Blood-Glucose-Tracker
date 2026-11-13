function getDailyRange(dateStr) {
  return {
    startDate: dateStr,
    endDate: dateStr,
  };
}

function getMonthToDateRange(dateStr) {
  const [year, month] = dateStr.split('-');
  return {
    startDate: `${year}-${month}-01`,
    endDate: dateStr,
  };
}

function getPreviousMonthRange(dateStr) {
  const [yearNum, monthNum] = dateStr.split('-').map(Number);

  let prevYear = yearNum;
  let prevMonth = monthNum - 1;

  if (prevMonth === 0) {
    prevYear -= 1;
    prevMonth = 12;
  }

  const prevMonthStr = String(prevMonth).padStart(2, '0');
  const startDate = `${prevYear}-${prevMonthStr}-01`;

  // Day 0 of the following month returns the last day of prevMonth
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
  const lastDayStr = String(lastDay).padStart(2, '0');
  const endDate = `${prevYear}-${prevMonthStr}-${lastDayStr}`;

  return {
    startDate,
    endDate,
  };
}

module.exports = {
  getDailyRange,
  getMonthToDateRange,
  getPreviousMonthRange,
};

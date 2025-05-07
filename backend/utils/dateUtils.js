const calculatePeriodDates = (period) => {
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);

  switch (period) {
    case 'Weekly':
      startDate.setDate(now.getDate() - now.getDay()); // Start of current week
      endDate.setDate(startDate.getDate() + 6); // End of current week
      break;
    case 'Monthly':
      startDate.setDate(1); // Start of current month
      endDate.setMonth(now.getMonth() + 1);
      endDate.setDate(0); // Last day of current month
      break;
    case 'Quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate.setMonth(quarter * 3);
      startDate.setDate(1);
      endDate.setMonth((quarter + 1) * 3);
      endDate.setDate(0);
      break;
    case 'Yearly':
      startDate.setMonth(0);
      startDate.setDate(1);
      endDate.setMonth(11);
      endDate.setDate(31);
      break;
    default:
      throw new Error('Invalid period');
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

module.exports = {
  calculatePeriodDates
}; 
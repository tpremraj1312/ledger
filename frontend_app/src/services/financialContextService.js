import api from '../api/axios';

/**
 * Fetch the unified financial context from the backend.
 * @param {Object} filters - filters like startDate, endDate, period.
 * @param {AbortSignal} signal - optional abort signal.
 */
export const fetchFinancialContext = async (filters = {}, signal) => {
  const response = await api.get('/api/financial/context', {
    params: filters,
    signal,
  });
  return response.data;
};

/**
 * Copy previous month budget.
 */
export const copyPreviousBudget = async (month, year) => {
  const response = await api.post('/api/budgets/copy-previous', { month, year });
  return response.data;
};

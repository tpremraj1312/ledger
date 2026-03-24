import api from '../api/axios';

/**
 * Service for Tax Optimizer related API calls
 */
export const getFullAnalysis = async () => {
  try {
    const response = await api.get('/api/tax/full-analysis');
    return response.data;
  } catch (error) {
    console.error('Error fetching tax analysis:', error);
    throw error;
  }
};

/**
 * Simulates tax savings based on hypothetical additional investments
 * @param {Object} additionalInvestments - Key-value pair of section and amount
 * @example { '80C': 50000, '80D': 15000 }
 */
export const simulateInvestment = async (additionalInvestments) => {
  try {
    const response = await api.post('/api/tax/simulate', {
      additionalInvestments
    });
    return response.data;
  } catch (error) {
    console.error('Error simulating tax savings:', error);
    throw error;
  }
};

export default {
  getFullAnalysis,
  simulateInvestment
};

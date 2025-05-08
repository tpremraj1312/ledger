import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2 } from 'lucide-react';
import axios from 'axios';

const InvestmentsView = () => {
  const [form, setForm] = useState({
    amount: '',
    riskLevel: 'Low',
    investmentType: 'SIP',
    durationYears: ''
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);

  const getAuthToken = () => localStorage.getItem('token');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelectedPlan(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/investments`,
        form,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('Investment API error:', err);
      setError(err.response?.data?.message || 'Failed to get investment plans.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Get Investment Recommendations</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            name="amount"
            placeholder="Investment Amount (₹)"
            value={form.amount}
            onChange={handleChange}
            required
            className="border rounded p-2"
          />
          <select name="riskLevel" value={form.riskLevel} onChange={handleChange} className="border rounded p-2">
            <option value="Low">Low Risk</option>
            <option value="Moderate">Moderate Risk</option>
            <option value="High">High Risk</option>
          </select>
          <select name="investmentType" value={form.investmentType} onChange={handleChange} className="border rounded p-2">
            <option value="SIP">SIP</option>
            <option value="Lump Sum">Lump Sum</option>
          </select>
          <input
            type="number"
            name="durationYears"
            placeholder="Duration (Years)"
            value={form.durationYears}
            onChange={handleChange}
            required
            className="border rounded p-2"
          />
          <button
            type="submit"
            className="col-span-1 md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5 inline" /> : 'Get Plans'}
          </button>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* Recommendation Cards and Detail Box */}
      {recommendations.length > 0 && (
        <>
          {/* Card Grid */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Top 5 Investment Plans</h3>
              <Brain className="text-blue-500" size={24} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((option, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPlan(option)}
                  className="cursor-pointer border rounded-xl p-4 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800">{option.planName}</h4>
                      <span className="text-green-500 font-semibold">{option.expectedReturns}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-xs mb-3">
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">{option.investmentType}</span>
                      <span
                        className={`px-2 py-1 rounded-full ${
                          option.risk === 'Low'
                            ? 'bg-green-100 text-green-600'
                            : option.risk === 'Moderate'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {option.risk} Risk
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-blue-500 text-right pt-2 border-t mt-2">Click to see more</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detail Box */}
          {selectedPlan && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-lg mt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-semibold text-blue-700">{selectedPlan.planName}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Expected Returns: <strong>{selectedPlan.expectedReturns}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Risk Level: <strong>{selectedPlan.risk}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Investment Type: <strong>{selectedPlan.investmentType}</strong>
                  </p>
                  <p className="text-gray-800 mt-4">{selectedPlan.description}</p>
                  <p className="text-sm text-gray-500 mt-2">Recommended for: {selectedPlan.recommendedFor}</p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Close
                </button>
              </div>
              <div className="mt-4">
                <a
                  href={selectedPlan.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2"
                >
                  Invest Now
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvestmentsView;

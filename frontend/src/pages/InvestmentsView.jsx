import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Loader2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

// Helper Function
const getAuthToken = () => localStorage.getItem('token');

// Subcomponents
const Header = () => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
        aria-label="Go back"
      >
        <ArrowLeft size={16} />
        Back
      </button>
      <h2 className="text-2xl font-semibold text-gray-800">Investment Planner</h2>
    </div>
  </div>
);

const InvestmentForm = ({ form, handleChange, handleSubmit, loading, error }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 backdrop-blur-sm">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Get Investment Recommendations</h3>
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Investment Amount (₹) *</label>
        <input
          type="number"
          name="amount"
          id="amount"
          placeholder="Enter amount"
          value={form.amount}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Investment amount"
        />
      </div>
      <div>
        <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-700 mb-1">Risk Level *</label>
        <select
          name="riskLevel"
          id="riskLevel"
          value={form.riskLevel}
          onChange={handleChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Risk level"
        >
          <option value="Low">Low Risk</option>
          <option value="Moderate">Moderate Risk</option>
          <option value="High">High Risk</option>
        </select>
      </div>
      <div>
        <label htmlFor="investmentType" className="block text-sm font-medium text-gray-700 mb-1">Investment Type *</label>
        <select
          name="investmentType"
          id="investmentType"
          value={form.investmentType}
          onChange={handleChange}
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Investment type"
        >
          <option value="SIP">SIP</option>
          <option value="Lump Sum">Lump Sum</option>
        </select>
      </div>
      <div>
        <label htmlFor="durationYears" className="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
        <input
          type="number"
          name="durationYears"
          id="durationYears"
          placeholder="Enter years"
          value={form.durationYears}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Investment duration"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`col-span-1 sm:col-span-2 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors duration-200 ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        aria-label="Get investment plans"
      >
        {loading && <Loader2 className="animate-spin h-5 w-5" />}
        {loading ? 'Loading...' : 'Get Plans'}
      </button>
    </form>
    {error && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-red-500 text-sm mt-3 bg-red-50 p-2 rounded"
      >
        {error}
      </motion.p>
    )}
  </div>
);

const RecommendationCard = ({ option, index, setSelectedPlan }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    whileHover={{ scale: 1.02 }}
    onClick={() => setSelectedPlan(option)}
    className="cursor-pointer bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 backdrop-blur-sm flex flex-col justify-between"
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && setSelectedPlan(option)}
    aria-label={`Select ${option.planName}`}
  >
    <div>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800">{option.planName}</h4>
        <span className="text-green-600 font-semibold">{option.expectedReturns}</span>
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
    <p className="text-sm text-blue-500 text-right pt-2 border-t">View Details</p>
  </motion.div>
);

const DetailsPanel = ({ selectedPlan, setSelectedPlan }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm backdrop-blur-sm"
  >
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
        aria-label="Close details"
      >
        Close
      </button>
    </div>
    <div className="mt-4">
      <a
        href={selectedPlan.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        aria-label={`Invest in ${selectedPlan.planName}`}
      >
        Invest Now
      </a>
    </div>
  </motion.div>
);

// Main Component
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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
      <Header />
      <InvestmentForm
        form={form}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
      {recommendations.length > 0 && (
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Top Investment Plans</h3>
              <Brain className="text-blue-500" size={20} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((option, index) => (
                <RecommendationCard
                  key={index}
                  option={option}
                  index={index}
                  setSelectedPlan={setSelectedPlan}
                />
              ))}
            </div>
          </div>
          {selectedPlan && (
            <div className="mt-4">
              <DetailsPanel selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestmentsView;
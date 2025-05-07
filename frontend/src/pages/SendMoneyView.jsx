// src/pages/SendMoneyView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Send, ArrowLeft } from 'lucide-react'; // Added ArrowLeft for back navigation

// Helper function for formatting currency (reuse if available globally)
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getAuthToken = () => localStorage.getItem("token");

const SendMoneyView = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipientIdentifier: '', // We'll use email as the identifier
    amount: '',
    senderAccountId: '',
    upiPin: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user's accounts for the sender account dropdown
  const fetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setError(''); // Clear previous errors
    const token = getAuthToken();
    if (!token) {
      setError("Authentication error. Please log in again.");
      setIsLoadingAccounts(false);
      return;
    }
    try {
      const response = await axios.get("http://localhost:5000/api/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data || []);
      // Optionally set default sender account if only one exists or based on primary
      if (response.data?.length > 0) {
         const primary = response.data.find(acc => acc.isPrimary) || response.data[0];
         setFormData(prev => ({ ...prev, senderAccountId: primary._id }));
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err.response?.data?.message || "Could not load your accounts.");
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear errors on input change
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Basic Client-side validation
    const { recipientIdentifier, amount, senderAccountId, upiPin } = formData;
    if (!recipientIdentifier || !amount || !senderAccountId || !upiPin) {
      setError("Please fill in all fields.");
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!/^\d{4}$|^\d{6}$/.test(upiPin)) {
      setError("UPI PIN must be 4 or 6 digits.");
      return;
    }
    // Basic email format check
     if (!/\S+@\S+\.\S+/.test(recipientIdentifier)) {
         setError("Please enter a valid recipient email address.");
         return;
     }


    setIsSubmitting(true);
    const token = getAuthToken();
    if (!token) {
      setError("Authentication error. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/transfer/send",
        {
          recipientIdentifier, // Sending email
          amount: parseFloat(amount),
          senderAccountId,
          upiPin,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(response.data.message || "Transfer successful!");
      // Optionally clear form or navigate after success
      setFormData({
         recipientIdentifier: '', amount: '', senderAccountId: formData.senderAccountId, upiPin: '' // Keep selected account
      });
      // Maybe navigate back to dashboard after a delay?
      // setTimeout(() => navigate('/dashboard'), 2000);

    } catch (err) {
      console.error("Transfer error:", err);
      setError(err.response?.data?.message || "Transfer failed. Please check details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6">
         {/* Back Button */}
         <button onClick={() => navigate(-1)} className="flex items-center text-sm text-gray-600 hover:text-blue-600 mb-4">
            <ArrowLeft size={16} className="mr-1" /> Back
         </button>

        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Send Money</h2>

        {error && (
          <div className="flex items-center bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-4 text-sm">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded-md mb-4 text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Recipient Identifier (Email) */}
          <div>
            <label htmlFor="recipientIdentifier" className="block text-sm font-medium text-gray-700 mb-1">Recipient's Email</label>
            <input
              id="recipientIdentifier"
              name="recipientIdentifier"
              type="email"
              placeholder="Enter recipient's email address"
              value={formData.recipientIdentifier}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter amount to send"
              value={formData.amount}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sender Account Selection */}
          <div>
            <label htmlFor="senderAccountId" className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
            <select
              id="senderAccountId"
              name="senderAccountId"
              value={formData.senderAccountId}
              onChange={handleChange}
              required
              disabled={isLoadingAccounts || accounts.length === 0}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              {isLoadingAccounts ? (
                <option>Loading accounts...</option>
              ) : accounts.length === 0 ? (
                <option>No accounts found</option>
              ) : (
                <>
                  <option value="" disabled={formData.senderAccountId !== ''}>-- Select Account --</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.bankName} (...{acc.accountNumber?.slice(-4)}) - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* UPI PIN */}
          <div>
            <label htmlFor="upiPin" className="block text-sm font-medium text-gray-700 mb-1">Your UPI PIN</label>
            <input
              id="upiPin"
              name="upiPin"
              type="password"
              placeholder="Enter 4 or 6 digit PIN"
              value={formData.upiPin}
              onChange={handleChange}
              required
              maxLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoadingAccounts || accounts.length === 0}
            className={`w-full flex items-center justify-center ${
              isSubmitting || isLoadingAccounts || accounts.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            } text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          >
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send size={18} className="mr-2" />}
            {isSubmitting ? 'Sending...' : 'Send Money'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendMoneyView;
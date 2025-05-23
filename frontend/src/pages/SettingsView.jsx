import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SettingsView = () => {
  // State for user profile
  const [user, setUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // State for budget preferences
  const [budgetPrefs, setBudgetPrefs] = useState({
    defaultPeriod: 'Monthly',
    defaultType: 'expense',
  });

  // State for form errors and success messages
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Replace with actual user ID or retrieve from auth context
        const response = await axios.get('/api/users/me');
        setUser({
          username: response.data.username,
          email: response.data.email,
          password: '',
          confirmPassword: '',
        });
      } catch (err) {
        setErrors({ general: 'Failed to load user data' });
      }
    };
    fetchUserData();
  }, []);

  // Handle input changes for user profile
  const handleUserChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Handle input changes for budget preferences
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setBudgetPrefs((prev) => ({ ...prev, [name]: value }));
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    if (!user.username.trim()) newErrors.username = 'Username is required';
    if (!user.email.match(/\S+@\S+\.\S+/)) newErrors.email = 'Invalid email address';
    if (user.password && user.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (user.password && user.password !== user.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    const formErrors = validateForm();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Prepare data to send (only include password if provided)
      const updateData = {
        username: user.username,
        email: user.email,
        ...(user.password && { password: user.password }),
        // Include budget preferences if needed by backend
        budgetPreferences: budgetPrefs,
      };

      // Update user data via API
      await axios.patch('/api/users/me', updateData);
      setSuccessMessage('Settings updated successfully!');
      // Clear password fields
      setUser((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Failed to update settings' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Settings</h1>

        {/* General Error/Success Messages */}
        {errors.general && <p className="text-red-500 mb-4">{errors.general}</p>}
        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}

        {/* User Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={user.username}
              onChange={handleUserChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={user.email}
              onChange={handleUserChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={user.password}
              onChange={handleUserChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave blank to keep current password"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={user.confirmPassword}
              onChange={handleUserChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Budget Preferences */}
          <div>
            <h2 className="text-lg font-semibold mt-6 mb-2">Budget Preferences</h2>
            <div>
              <label htmlFor="defaultPeriod" className="block text-sm font-medium text-gray-700">
                Default Budget Period
              </label>
              <select
                id="defaultPeriod"
                name="defaultPeriod"
                value={budgetPrefs.defaultPeriod}
                onChange={handleBudgetChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div className="mt-4">
              <label htmlFor="defaultType" className="block text-sm font-medium text-gray-700">
                Default Budget Type
              </label>
              <select
                id="defaultType"
                name="defaultType"
                value={budgetPrefs.defaultType}
                onChange={handleBudgetChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full p-2 mt-4 text-white rounded-md ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsView;
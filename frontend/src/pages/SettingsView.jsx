// src/pages/SettingsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { User, CreditCard, Bell, Lock, PlusCircle, Star, Trash2, Loader2, CheckCircle, XCircle, Eye, EyeOff, Settings } from 'lucide-react'; // Added Settings

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const getAuthToken = () => localStorage.getItem("token");

const SettingsView = ({ accounts, refreshAccounts, isLoadingAccounts, accountsError }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    const token = getAuthToken();
    
    if (!token) {
      setProfileError("Authentication required. Please log in.");
      setIsLoadingProfile(false);
      return;
    }

    try {
      const response = await axios.get("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserInfo(response.data);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setProfileError(err.response?.data?.message || "Failed to load profile data.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSetPrimary = async (accountId) => {
    setIsProcessingAction(true);
    setActionError('');
    const token = getAuthToken();
    
    if (!token) {
      setActionError("Authentication required. Please log in.");
      setIsProcessingAction(false);
      return;
    }

    try {
      await axios.patch(
        `http://localhost:5000/api/accounts/${accountId}/set-primary`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshAccounts(); // Refresh the accounts list
    } catch (err) {
      console.error("Error setting primary account:", err);
      setActionError(err.response?.data?.message || "Failed to set primary account.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }

    setIsProcessingAction(true);
    setActionError('');
    const token = getAuthToken();
    
    if (!token) {
      setActionError("Authentication required. Please log in.");
      setIsProcessingAction(false);
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/accounts/${accountId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshAccounts(); // Refresh the accounts list
    } catch (err) {
      console.error("Error deleting account:", err);
      setActionError(err.response?.data?.message || "Failed to delete account.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordChangeError('');
    setPasswordChangeSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    const { currentPassword, newPassword, confirmNewPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordChangeError('All password fields are required.'); return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.'); return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match.'); return;
    }

    setIsChangingPassword(true);
    const token = getAuthToken();
    if (!token) { setPasswordChangeError("Authentication error."); setIsChangingPassword(false); return; }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordChangeSuccess(response.data.message || 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      console.error("Change password error:", err);
      setPasswordChangeError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-3xl font-bold text-gray-900 flex items-center">
        <Settings className="mr-2 h-8 w-8 text-blue-600" /> Settings
      </h2>

      {actionError && (
        <div className="flex items-center bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md">
          <XCircle className="h-5 w-5 mr-2" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
          <User className="mr-2 h-6 w-6 text-indigo-500" /> Profile
        </h3>
        {isLoadingProfile ? (
          <div className="flex items-center text-gray-500">
            <Loader2 className="animate-spin h-5 w-5 mr-2" /> Loading profile...
          </div>
        ) : profileError ? (
          <p className="text-red-600 text-sm">{profileError}</p>
        ) : userInfo ? (
          <div className="grid grid-cols-1 gap-3 text-gray-700">
            <p><span className="font-medium text-indigo-600">Username:</span> {userInfo.username}</p>
            <p><span className="font-medium text-indigo-600">Email:</span> {userInfo.email}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Could not load profile information.</p>
        )}
      </div>

      {/* Linked Bank Accounts */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2 sm:mb-0">
            <CreditCard className="mr-2 h-6 w-6 text-blue-500" /> Linked Bank Accounts
          </h3>
          <Link
            to="/add-account"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center shadow-sm"
          >
            <PlusCircle size={18} className="mr-2" /> Add Account
          </Link>
        </div>
        {isLoadingAccounts ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : accountsError ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p>{accountsError}</p>
          </div>
        ) : accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <div key={account._id} className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-semibold text-gray-800 flex items-center">
                      {account.bankName}
                      {account.isPrimary && (
                        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Star size={12} className="mr-1" /> Primary
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Account ...{account.accountNumber?.slice(-4)}</p>
                    <p className="text-md text-gray-900 font-medium">{formatCurrency(account.balance)}</p>
                  </div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => handleSetPrimary(account._id)}
                    disabled={account.isPrimary || isProcessingAction}
                    className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      account.isPrimary
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    <Star size={16} className="mr-1" /> Set Primary
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account._id)}
                    disabled={isProcessingAction || accounts.length <= 1}
                    className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No bank accounts linked yet.</p>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
          <Lock className="mr-2 h-6 w-6 text-gray-600" /> Security
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
          {passwordChangeError && (
            <div className="flex items-center bg-red-50 text-red-700 p-2 rounded-md">
              <XCircle className="h-5 w-5 mr-2" /> {passwordChangeError}
            </div>
          )}
          {passwordChangeSuccess && (
            <div className="flex items-center bg-green-50 text-green-700 p-2 rounded-md">
              <CheckCircle className="h-5 w-5 mr-2" /> {passwordChangeSuccess}
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
            >
              {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Min. 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordInputChange}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Retype new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isChangingPassword ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Notifications Placeholder */}
      <div className="bg-gray-50 rounded-xl shadow-md p-6 opacity-75">
        <h3 className="text-xl font-semibold text-gray-700 flex items-center mb-4">
          <Bell className="mr-2 h-6 w-6 text-gray-500" /> Notifications
        </h3>
        <p className="text-gray-600 text-sm">Notification preferences coming soon...</p>
      </div>
    </div>
  );
};

export default SettingsView;
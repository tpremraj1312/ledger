import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Settings, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Notification = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      setError('');
      try {
        const response = await axios.get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setNotifications(response.data);
      } catch (error) {
        setError('Failed to fetch notifications. Please try again.');
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch user settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoadingSettings(true);
      setError('');
      try {
        const response = await axios.get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setNotificationsEnabled(response.data.notificationsEnabled);
      } catch (error) {
        setError('Failed to fetch user settings. Please try again.');
        console.error('Error fetching user settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchUserSettings();
  }, []);

  // Toggle notification settings
  const toggleNotifications = async () => {
    setIsLoadingSettings(true);
    setError('');
    try {
      const response = await axios.patch('http://localhost:5000/api/notifications/toggle', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNotificationsEnabled(response.data.notificationsEnabled);
    } catch (error) {
      setError('Failed to update notification settings. Please try again.');
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    setIsRefreshing(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('http://localhost:5000/api/notifications/refresh', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNotifications(response.data.notifications);
      setSuccess(response.data.message);
      setTimeout(() => setSuccess(''), 5000); // Clear success message after 5s
    } catch (error) {
      setError('Failed to refresh notifications. Please try again.');
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-blue-600" />
        Notifications
      </h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'list'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          } transition-colors duration-200`}
        >
          Notification List
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'settings'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          } transition-colors duration-200`}
        >
          Settings
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50/80 text-green-600 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50/80 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'list' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100/50 p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Your Notifications</h3>
                <button
                  onClick={refreshNotifications}
                  disabled={isRefreshing}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200 ${
                    isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isRefreshing ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                  Refresh Notifications
                </button>
              </div>
              {isLoadingNotifications ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No notifications available. Try refreshing to check past transactions.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notification) => (
                    <li
                      key={notification._id}
                      className={`p-4 rounded-lg shadow-sm ${
                        notification.read ? 'bg-gray-50' : 'bg-red-50/80'
                      } transition-all duration-200 hover:shadow-md`}
                    >
                      <p className="text-gray-800 font-medium">{notification.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100/50 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Notification Settings
              </h3>
              {isLoadingSettings ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                </div>
              ) : (
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={toggleNotifications}
                    disabled={isLoadingSettings}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 font-medium">
                    Enable Budget Exceed Notifications
                  </span>
                </label>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Notification;
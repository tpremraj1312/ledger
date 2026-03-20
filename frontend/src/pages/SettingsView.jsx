import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import SettingsLayout from '../components/settings/SettingsLayout';
import ProfileSection from '../components/settings/ProfileSection';
import SecuritySection from '../components/settings/SecuritySection';
import FamilySettingsSection from '../components/settings/FamilySettingsSection';
import FinanceTaxSettingsSection from '../components/settings/FinanceTaxSettingsSection';
import AISettingsSection from '../components/settings/AISettingsSection';
import GamificationSettingsSection from '../components/settings/GamificationSettingsSection';
import NotificationsPrivacySection from '../components/settings/NotificationsPrivacySection';
import AppInvestmentSettingsSection from '../components/settings/AppInvestmentSettingsSection';
import DangerZoneSection from '../components/settings/DangerZoneSection';
import { motion, AnimatePresence } from 'framer-motion';

const SettingsView = () => {
  const { user, updateProfile, updateSettings, refreshUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} updateProfile={updateProfile} />;
      case 'security':
        return <SecuritySection />;
      case 'family':
        return <FamilySettingsSection user={user} refreshUser={refreshUser} />;
      case 'financial':
      case 'tax':
        return <FinanceTaxSettingsSection user={user} updateSettings={updateSettings} />;
      case 'investment':
      case 'preferences':
        return <AppInvestmentSettingsSection user={user} updateSettings={updateSettings} />;
      case 'gamification':
        return <GamificationSettingsSection user={user} updateSettings={updateSettings} />;
      case 'ai':
        return <AISettingsSection user={user} updateSettings={updateSettings} />;
      case 'notifications':
      case 'privacy':
        return <NotificationsPrivacySection user={user} updateSettings={updateSettings} />;
      case 'danger':
        return <DangerZoneSection logout={logout} />;
      default:
        return <ProfileSection user={user} updateProfile={updateProfile} />;
    }
  };

  return (
    <div className="p-4 lg:p-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <SettingsLayout
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </SettingsLayout>
      </div>
    </div>
  );
};

export default SettingsView;
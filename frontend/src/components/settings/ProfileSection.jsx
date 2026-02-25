import React, { useState } from 'react';
import { Camera, Mail, Phone, MapPin, Globe, Clock, Landmark, User, Save, Loader2, CheckCircle2 } from 'lucide-react';

const ProfileSection = ({ user, updateProfile }) => {
    const [formData, setFormData] = useState({
        fullName: user?.profile?.fullName || user?.username || '',
        phoneNumber: user?.profile?.phoneNumber || '',
        bio: user?.profile?.bio || '',
        currency: user?.profile?.preferredCurrency || 'INR',
        timezone: user?.profile?.timezone || 'UTC+5:30',
        country: user?.profile?.country || 'India',
        financialYear: user?.profile?.financialYear || 'FY2025-26',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await updateProfile(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Update profile error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Profile Management</h3>
                <p className="text-gray-500">Update your personal information and application-wide regional settings.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
                            {formData.fullName?.charAt(0) || 'U'}
                        </div>
                        <button
                            type="button"
                            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            <Camera size={16} />
                        </button>
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="font-bold text-gray-900 text-lg">{formData.fullName || 'New User'}</p>
                        <p className="text-sm text-gray-500 mb-2">{user?.email}</p>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            Personal Account
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            placeholder="e.g. John Doe"
                        />
                    </div>

                    {/* Email (Read Only) */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-400 flex items-center gap-2">
                            <Mail size={16} />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={user?.email}
                            readOnly
                            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                        />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            Phone Number
                        </label>
                        <input
                            type="text"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Globe size={16} className="text-gray-400" />
                            Country
                        </label>
                        <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Landmark size={16} className="text-gray-400" />
                            Preferred Currency
                        </label>
                        <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        >
                            <option value="INR">Indian Rupee (₹)</option>
                            <option value="USD">US Dollar ($)</option>
                            <option value="EUR">Euro (€)</option>
                            <option value="GBP">British Pound (£)</option>
                        </select>
                    </div>

                    {/* Timezone */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            Time Zone
                        </label>
                        <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        >
                            <option value="UTC+5:30">India (UTC+5:30)</option>
                            <option value="UTC+0:00">UTC (Universal Time)</option>
                            <option value="UTC-5:00">EST (New York)</option>
                            <option value="UTC-8:00">PST (Los Angeles)</option>
                        </select>
                    </div>

                    {/* Financial Year */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Landmark size={16} className="text-gray-400" />
                            Financial Year
                        </label>
                        <select
                            value={formData.financialYear}
                            onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        >
                            <option value="FY2024-25">FY 2024-25</option>
                            <option value="FY2025-26">FY 2025-26</option>
                            <option value="FY2026-27">FY 2026-27</option>
                        </select>
                        <p className="text-[10px] text-gray-400 font-medium">Affects Tax Advisor module visibility.</p>
                    </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Bio / About Me</label>
                    <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        placeholder="Tell us about your financial goals..."
                    />
                </div>

                <div className="pt-4 flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
                        >
                            <CheckCircle2 size={18} />
                            Profile updated!
                        </motion.div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ProfileSection;

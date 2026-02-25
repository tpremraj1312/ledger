import User from '../models/user.js';
import bcrypt from 'bcryptjs';

/**
 * Get current user settings and profile
 */
export const getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
    try {
        const { fullName, phoneNumber, bio, avatar, currency, timezone, country, financialYear } = req.body;

        const update = {
            'profile.fullName': fullName,
            'profile.phoneNumber': phoneNumber,
            'profile.bio': bio,
            'profile.avatar': avatar,
            'profile.preferredCurrency': currency,
            'profile.timezone': timezone,
            'profile.country': country,
            'profile.financialYear': financialYear,
            'username': fullName || undefined // Sync username with full name if provided
        };

        // Filter out undefined
        Object.keys(update).forEach(key => update[key] === undefined && delete update[key]);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
};

/**
 * Update granular preferences
 */
export const updatePreferences = async (req, res) => {
    try {
        const { category, preferences } = req.body;
        // category can be 'notifications', 'financial', 'tax', etc.
        if (!category || !preferences) {
            return res.status(400).json({ message: 'Category and preferences are required' });
        }

        const update = {};
        for (const [key, value] of Object.entries(preferences)) {
            update[`settings.${category}.${key}`] = value;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: update },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update preferences', error: error.message });
    }
};

/**
 * Export all user data as JSON
 */
export const exportData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        // In a real app, we'd also aggregate transactions, investments, etc.
        // For now, exporting user profile and settings
        const exportFile = {
            exportedAt: new Date(),
            user: {
                username: user.username,
                email: user.email,
                profile: user.profile,
                settings: user.settings,
                createdAt: user.createdAt
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=user_data_export.json');
        res.send(JSON.stringify(exportFile, null, 2));
    } catch (error) {
        res.status(500).json({ message: 'Export failed' });
    }
};

/**
 * Delete account (Soft delete placeholder)
 */
export const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Password is required for deletion' });
        }

        const user = await User.findById(req.user._id).select('+password');
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Soft delete: just mark or rename
        await User.findByIdAndUpdate(req.user._id, {
            username: `deleted_user_${req.user._id}`,
            email: `deleted_${Date.now()}_${user.email}`,
            'profile.bio': 'Account Deleted',
            'settings.gamification.enabled': false
        });

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete account' });
    }
};

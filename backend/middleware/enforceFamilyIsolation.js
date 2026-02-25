import FamilyGroup from '../models/FamilyGroup.js';
import mongoose from 'mongoose';

/**
 * requireFamily Middleware
 * 
 * Derives familyId from req.user.currentFamilyId (NEVER from URL params).
 * Verifies the user is an active member of that family.
 * Attaches req.familyGroup (full document) and req.familyRole (user's role string).
 * 
 * Must be used AFTER authMiddleware.
 */
const requireFamily = async (req, res, next) => {
    try {
        const familyId = req.user?.currentFamilyId;

        if (!familyId) {
            return res.status(403).json({ message: 'No active family. Please create or join a family first.' });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(familyId)) {
            return res.status(400).json({ message: 'Invalid family ID format.' });
        }

        // Single atomic query: find family where user is a member
        const familyGroup = await FamilyGroup.findOne({
            _id: familyId,
            isActive: true,
            'members.user': req.user._id,
        });

        if (!familyGroup) {
            return res.status(403).json({
                message: 'Access denied. You are not an active member of this family group.',
            });
        }

        // Extract the user's role
        const memberRecord = familyGroup.members.find(
            (m) => m.user.toString() === req.user._id.toString()
        );

        if (!memberRecord) {
            return res.status(403).json({
                message: 'Access denied. You are no longer a member of this family group.',
            });
        }

        req.familyGroup = familyGroup;
        req.familyRole = memberRecord.role;

        next();
    } catch (error) {
        console.error('requireFamily middleware error:', error);
        return res.status(500).json({ message: 'Security check failed.' });
    }
};

export default requireFamily;

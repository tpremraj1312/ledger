import express from 'express';
import RecurringExpense from '../models/RecurringExpense.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/recurring
 * Get all recurring expenses for the user
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const recurring = await RecurringExpense.find({ user: userId }).sort({ createdAt: -1 });
        res.json(recurring);
    } catch (error) {
        console.error('Error fetching recurring expenses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * POST /api/recurring
 * Create a new recurring expense
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { amount, category, description, frequency, startDate, isEssential } = req.body;
        const userId = req.user._id;

        if (!amount || !category || !frequency) {
            return res.status(400).json({ message: 'Please provide amount, category, and frequency' });
        }

        const nextOccurrence = new Date(startDate || Date.now());

        const FamilyGroup = (await import('../models/FamilyGroup.js')).default;
        const activeGroup = await FamilyGroup.findOne({
            'members.userId': userId,
            isActive: true,
        });

        const recurringData = {
            user: userId,
            amount,
            category,
            description,
            frequency,
            startDate: startDate || Date.now(),
            nextOccurrence,
            isEssential: isEssential !== undefined ? isEssential : true
        };

        if (activeGroup) {
            recurringData.familyGroupId = activeGroup._id;
        }

        const newRecurring = new RecurringExpense(recurringData);

        await newRecurring.save();
        res.status(201).json(newRecurring);
    } catch (error) {
        console.error('Error creating recurring expense:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * PUT /api/recurring/:id
 * Update a recurring expense (pause, change details)
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { amount, category, description, frequency, status, isEssential } = req.body;
        const recurring = await RecurringExpense.findById(req.params.id);

        if (!recurring) {
            return res.status(404).json({ message: 'Recurring expense not found' });
        }

        if (recurring.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (amount) recurring.amount = amount;
        if (category) recurring.category = category;
        if (description !== undefined) recurring.description = description;
        if (frequency) recurring.frequency = frequency;
        if (status) recurring.status = status;
        if (isEssential !== undefined) recurring.isEssential = isEssential;

        await recurring.save();
        res.json(recurring);
    } catch (error) {
        console.error('Error updating recurring expense:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

/**
 * DELETE /api/recurring/:id
 * Delete a recurring expense
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const recurring = await RecurringExpense.findById(req.params.id);

        if (!recurring) {
            return res.status(404).json({ message: 'Recurring expense not found' });
        }

        if (recurring.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await recurring.deleteOne();
        res.json({ message: 'Recurring expense deleted' });
    } catch (error) {
        console.error('Error deleting recurring expense:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;

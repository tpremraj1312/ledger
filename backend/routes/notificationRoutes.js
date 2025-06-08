import express from 'express';
import Notification from '../models/notification.js'; // Adjust path if needed
import User from '../models/user.js'; // Adjust path if needed
import Transaction from '../models/transaction.js'; // Adjust path if needed
import Budget from '../models/budget.js'; // Adjust path if needed
import authMiddleware from '../middleware/authMiddleware.js'; // Adjust path if needed

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  console.log('GET /api/notifications called for user:', req.user._id); // Debug log
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    console.log('Notifications found:', notifications); // Debug log
    res.json(notifications);
  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle notification preference
router.patch('/toggle', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.notificationsEnabled = !user.notificationsEnabled;
    await user.save();
    res.json({ notificationsEnabled: user.notificationsEnabled });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/toggle:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Refresh notifications for all transactions
router.post('/refresh', authMiddleware, async (req, res) => {
  console.log('POST /api/notifications/refresh called for user:', req.user._id); // Debug log
  try {
    const userId = req.user._id;

    // Fetch user's budgets
    const budgets = await Budget.find({ user: userId, type: 'expense' });
    if (!budgets.length) {
      return res.status(200).json({ message: 'No expense budgets found for user', notifications: [] });
    }

    // Fetch all debit transactions for the user
    const transactions = await Transaction.find({ user: userId, type: 'debit' }).sort({ date: -1 });

    // Fetch existing notifications to avoid duplicates
    const existingNotifications = await Notification.find({ user: userId });
    const existingTransactionIds = existingNotifications.map(n => n.transaction.toString());

    const newNotifications = [];

    // Process each budget
    for (const budget of budgets) {
      // Group transactions by budget period
      const periodTransactions = {};
      for (const transaction of transactions) {
        if (transaction.category !== budget.category) continue;

        const transactionDate = new Date(transaction.date);
        let periodKey;

        // Determine the period key based on budget period
        switch (budget.period) {
          case 'Monthly':
            periodKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
            break;
          case 'Yearly':
            periodKey = `${transactionDate.getFullYear()}`;
            break;
          case 'Quarterly':
            periodKey = `${transactionDate.getFullYear()}-Q${Math.floor(transactionDate.getMonth() / 3)}`;
            break;
          case 'Weekly':
            const startOfWeek = new Date(transactionDate);
            startOfWeek.setDate(transactionDate.getDate() - transactionDate.getDay());
            periodKey = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth()}-${startOfWeek.getDate()}`;
            break;
          default:
            continue;
        }

        if (!periodTransactions[periodKey]) {
          periodTransactions[periodKey] = [];
        }
        periodTransactions[periodKey].push(transaction);
      }

      // Check each period for budget exceedance
      for (const periodKey in periodTransactions) {
        const periodTxns = periodTransactions[periodKey];
        const totalSpent = periodTxns.reduce((sum, txn) => sum + txn.amount, 0);

        if (totalSpent > budget.amount) {
          // Create notifications for transactions in this period that don't have one
          for (const transaction of periodTxns) {
            if (!existingTransactionIds.includes(transaction._id.toString())) {
              const notification = new Notification({
                user: userId,
                message: `Budget exceeded for ${budget.category} in ${periodKey}! Spent ${totalSpent.toFixed(2)} exceeds budget of ${budget.amount.toFixed(2)}.`,
                transaction: transaction._id,
                read: false,
                createdAt: transaction.date // Use transaction date for historical accuracy
              });
              newNotifications.push(notification);
              existingTransactionIds.push(transaction._id.toString()); // Prevent duplicates in same run
            }
          }
        }
      }
    }

    // Save new notifications
    if (newNotifications.length > 0) {
      await Notification.insertMany(newNotifications);
    }

    // Fetch updated notifications
    const updatedNotifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      message: `Added ${newNotifications.length} new notifications`,
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error in POST /api/notifications/refresh:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
import Budget from '../models/budget.js';
import Transaction from '../models/transaction.js';
import User from '../models/user.js';

// GET /admin/transactions
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /admin/budgets
export const getAllBudgets = async (req, res) => {
  try {
    console.log("Fetching budgets...");
    const budgets = await Budget.find().populate('user', 'name email');
    console.log("Budgets with populated users:", budgets);
    res.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a user and all their budgets and transactions
export const deleteUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Budget.deleteMany({ user: userId });
    await Transaction.deleteMany({ user: userId });

    res.status(200).json({ message: 'User and related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a transaction by ID
export const deleteTransactionById = async (req, res) => {
  const txnId = req.params.id;

  try {
    const txn = await Transaction.findByIdAndDelete(txnId);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });

    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a budget by ID
export const deleteBudgetById = async (req, res) => {
  const budgetId = req.params.id;

  try {
    const budget = await Budget.findByIdAndDelete(budgetId);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

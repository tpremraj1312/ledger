import User from '../models/user.js';
import Budget from '../models/budget.js';
import Transaction from '../models/transaction.js';

export const getUserDetailsById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const budgets = await Budget.find({ user: userId });
    const transactions = await Transaction.find({ user: userId });

    res.status(200).json({
      user,
      budgets,
      transactions
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // remove passwords
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

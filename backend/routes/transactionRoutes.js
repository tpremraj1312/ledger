import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { parseBillWithGemini } from '../utils/billParser.js';
import authMiddleware from '../middleware/authMiddleware.js';
import Transaction from '../models/transaction.js';
import budgetCheckMiddleware from '../middleware/budgetCheckMiddleware.js';
import Notification from '../models/notification.js';

const router = express.Router();

// Configure Multer for file upload (memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
  },
});

// --- Add a New Transaction (Handles Manual and Bill Scan) ---
// Route: POST /api/transactions
// Access: Private
router.post('/', authMiddleware, budgetCheckMiddleware, async (req, res) => {
  const { type, amount: amountInput, category, description, source = 'manual', date } = req.body;
  const userId = req.user._id;

  console.log('POST /api/transactions - userId:', userId);
  console.log('POST /api/transactions - request body:', req.body);

  // --- Input Parsing and Validation ---
  const amount = parseFloat(amountInput);
  if (isNaN(amount) || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ message: 'Invalid amount (must be a positive number)' });
  }

  if (!type || !category) {
    return res.status(400).json({ message: 'Missing required fields: type, amount, category' });
  }

  if (type !== 'debit' && type !== 'credit') {
    return res.status(400).json({ message: 'Invalid transaction type (must be debit or credit)' });
  }

  if (source !== 'manual' && source !== 'billscan') {
    return res.status(400).json({ message: 'Invalid source (must be manual or billscan)' });
  }

  if (source === 'manual' && !date) {
    return res.status(400).json({ message: 'Date is required for manual transactions' });
  }

  // Validate category
  const normalizedCategory = category.trim();
  if (!normalizedCategory) {
    return res.status(400).json({ message: 'Category cannot be empty' });
  }

  let transactionDate;
  if (date) {
    transactionDate = new Date(date);
    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format provided' });
    }
  } else if (source !== 'manual') {
    transactionDate = new Date();
  } else {
    return res.status(400).json({ message: 'Date is required for manual transactions' });
  }

  try {
    const { withTransaction } = await import('../utils/transactionWrapper.js');
    const FamilyGroup = (await import('../models/FamilyGroup.js')).default;

    const result = await withTransaction(async (session) => {
      // --- Check if user is in an active family ---
      // --- Check if user is in an active family ---
      const activeGroup = await FamilyGroup.findOne({
        'members.user': userId,
        isActive: true,
      }).session(session);

      let role = null;

      if (activeGroup) {
        // Find member safely – skip entries without user
        const memberRecord = activeGroup.members.find(m => {
          // Guard against missing/undefined user
          return m?.user && m.user.toString() === userId.toString();
        });

        role = memberRecord?.role || null;

        // Optional: log bad data so you can clean it later
        if (activeGroup.members.some(m => !m?.user)) {
          console.warn(`FamilyGroup ${activeGroup._id} has members without user!`);
        }
      }

      // VIEWER role Cannot create any transaction in a family group
      if (activeGroup && role === 'VIEWER') {
        throw new Error('VIEWER_RESTRICTION: Viewers cannot create transactions in a family group.');
      }

      const txData = {
        user: userId,
        type,
        amount,
        category: normalizedCategory,
        description: (description || '').replace(/<[^>]*>/g, ''),
        status: 'completed',
        source,
        date: transactionDate,
        isDeleted: false,
      };

      // --- AUTO-TAGGING LOGIC ---
      if (activeGroup) {
        txData.familyGroupId = activeGroup._id;
        txData.mode = 'FAMILY';
        txData.spentBy = userId;
      } else {
        txData.mode = 'PERSONAL';
      }

      const newTransaction = new Transaction(txData);

      console.log('POST /api/transactions - saving transaction:', newTransaction);
      await newTransaction.save({ session });

      // Create notification if budget was exceeded
      let notification = null;
      if (req.budgetNotification) {
        const Notification = (await import('../models/notification.js')).default;
        notification = new Notification({
          user: req.budgetNotification.user,
          message: req.budgetNotification.message,
          transaction: newTransaction._id,
        });
        await notification.save({ session });
        console.log('POST /api/transactions - notification created:', notification.message);
      }

      // --- GAMIFICATION HOOKS ---
      const { processEvent, GAMIFICATION_EVENTS } = await import('../services/gamificationEngine.js');
      const gamificationResults = await processEvent(userId, GAMIFICATION_EVENTS.TRANSACTION_ADDED, { transaction: newTransaction }, session);

      // --- TAX OPTIMIZATION HOOKS ---
      const { processTaxEvent, TAX_EVENTS } = await import('../services/taxEngine/taxOptimizationEngine.js');
      const taxResults = await processTaxEvent(userId, TAX_EVENTS.TRANSACTION_ADDED, { transaction: newTransaction }, session);

      // --- GOAL TRACKING HOOK ---
      const { recalculateGoalProgress } = await import('../services/goalService.js');
      await recalculateGoalProgress(userId, session);

      return { newTransaction, notification, gamificationResults, taxResults };
    });

    const { newTransaction, notification, gamificationResults, taxResults } = result;

    // Log transaction creation
    console.log('New transaction created:', {
      userId,
      type,
      amount,
      category: normalizedCategory,
      source,
      date: transactionDate,
      transactionId: newTransaction._id,
    });

    // --- Respond ---
    res.status(201).json({
      message: 'Transaction recorded successfully',
      transaction: newTransaction,
      notification: notification ? {
        _id: notification._id,
        message: notification.message,
        transaction: notification.transaction,
        createdAt: notification.createdAt,
        read: notification.read
      } : null,
      gamificationResults
    });

  } catch (err) {
    console.error('POST /api/transactions - error:', err);
    if (err.message.startsWith('VIEWER_RESTRICTION')) {
      return res.status(403).json({ message: err.message });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Transaction validation failed', errors: messages });
    }
    res.status(500).json({ message: 'Failed to record transaction', error: err.message });
  }
});

// --- Get Transactions for Logged-in User ---
// Route: GET /api/transactions
// Access: Private
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user._id;
  const { type, category, startDate, endDate, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    const query = { user: userId, isDeleted: false };

    if (type && (type === 'debit' || type === 'credit' || type === 'all')) {
      if (type !== 'all') {
        query.type = type;
      }
    }

    if (category && category !== 'All') {
      const normalizedCategory = category.trim();
      query.$or = [
        { category: normalizedCategory },
        { 'categories.category': normalizedCategory }
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.date.$lte = endOfDay;
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const totalTransactions = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalTransactions / parseInt(limit, 10));

    // Log retrieved transactions for debugging
    console.log('Retrieved transactions:', {
      userId,
      query,
      transactionCount: transactions.length,
      totalTransactions,
    });

    res.status(200).json({
      transactions,
      pagination: {
        currentPage: parseInt(page, 10),
        totalPages,
        totalTransactions,
        limit: parseInt(limit, 10),
      }
    });

  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Failed to fetch transactions', error: err.message });
  }
});

// --- Scan a Bill and Create Transaction ---
// Route: POST /api/billscan
// Access: Private
router.post('/billscan', authMiddleware, upload.single('bill'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user._id;
    const parsedData = await parseBillWithGemini(req.file);

    // Validate parsed data
    if (
      !parsedData ||
      !parsedData.totalAmount ||
      !parsedData.date ||
      !parsedData.storeName ||
      !Array.isArray(parsedData.categories) ||
      parsedData.categories.length === 0
    ) {
      return res.status(400).json({ message: 'Incomplete or unrecognized bill data' });
    }

    // Validate transaction type
    const transactionType = parsedData.transactionType || 'debit';
    if (transactionType !== 'debit' && transactionType !== 'credit') {
      return res.status(400).json({ message: 'Invalid transaction type in parsed bill data' });
    }

    // Determine dominant category
    let dominantCategory = transactionType === 'credit' ? 'Refund' : 'Other';
    let maxTotal = 0;
    parsedData.categories.forEach((cat) => {
      const normalizedCat = cat.category.trim() || 'Other';
      if ((cat.categoryTotal || 0) > maxTotal) {
        maxTotal = cat.categoryTotal;
        dominantCategory = normalizedCat;
      } else if (cat.categoryTotal === maxTotal && dominantCategory === 'Other') {
        dominantCategory = normalizedCat;
      }
    });

    // Map parsed categories to transaction schema
    const transactionCategories = parsedData.categories.map((cat) => ({
      category: cat.category.trim() || 'Other',
      isNonEssential: cat.isNonEssential || false,
      categoryTotal: cat.categoryTotal || 0,
      items: cat.items.map((item) => ({
        name: item.name || 'Unknown Item',
        price: item.price || 0,
        quantity: item.quantity || 1,
      })),
    }));

    // Create transaction
    const newTransaction = new Transaction({
      user: userId,
      type: transactionType,
      amount: parsedData.totalAmount,
      category: dominantCategory,
      description: `Bill from ${parsedData.storeName}`,
      date: new Date(parsedData.date),
      source: 'billscan',
      categories: transactionCategories,
      status: 'completed',
    });

    await newTransaction.save();

    // Log billscan transaction
    console.log('New billscan transaction created:', {
      userId,
      type: transactionType,
      amount: parsedData.totalAmount,
      category: dominantCategory,
      source: 'billscan',
      date: newTransaction.date,
      transactionId: newTransaction._id,
    });

    // Prepare response
    const responseCategories = parsedData.categories.map((cat) => {
      const itemsByName = {};
      cat.items.forEach((item) => {
        if (!itemsByName[item.name]) {
          itemsByName[item.name] = {
            price: item.price || 0,
            quantity: item.quantity || 1,
          };
        } else {
          itemsByName[item.name].quantity += item.quantity || 1;
        }
      });
      return {
        category: cat.category.trim() || 'Other',
        isNonEssential: cat.isNonEssential,
        categoryTotal: cat.categoryTotal || 0,
        items: itemsByName,
      };
    });

    return res.status(201).json({
      message: 'Bill scanned and transaction recorded successfully',
      transaction: {
        id: newTransaction._id,
        amount: newTransaction.amount,
        category: newTransaction.category,
        description: newTransaction.description,
        date: newTransaction.date,
        type: newTransaction.type,
        categories: responseCategories,
      },
    });

  } catch (err) {
    console.error('Bill Scan Error:', err);
    return res.status(500).json({ message: 'Failed to scan and save bill', error: err.message });
  }
});

// --- Delete a Transaction ---
// Route: DELETE /api/transactions/:id
// Access: Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Ensure user owns the transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Role-based check if it's a family transaction
    if (transaction.familyGroupId) {
      const FamilyGroup = (await import('../models/FamilyGroup.js')).default;
      const group = await FamilyGroup.findOne({ _id: transaction.familyGroupId, isActive: true });
      if (group) {
        const member = group.members.find(m => m.user && m.user.toString() === req.user._id.toString());
        const role = member ? member.role : null;

        if (role === 'VIEWER') {
          return res.status(403).json({ message: 'Viewers cannot delete transactions.' });
        }
      }
    }

    await transaction.deleteOne();

    // --- GAMIFICATION & TAX HOOKS (On Delete) ---
    try {
      const { processEvent, GAMIFICATION_EVENTS } = await import('../services/gamificationEngine.js');
      const { processTaxEvent, TAX_EVENTS } = await import('../services/taxEngine/taxOptimizationEngine.js');
      
      const gamificationResults = await processEvent(req.user._id, GAMIFICATION_EVENTS.TRANSACTION_DELETED, { transaction });
      const taxResults = await processTaxEvent(req.user._id, TAX_EVENTS.TRANSACTION_DELETED, { transaction });
      
      return res.json({ message: 'Transaction removed', gamificationResults, taxResults });
    } catch (err) { console.error(err); }
    // ----------------------------------------

    // Fallback if hooks fail
    res.json({ message: 'Transaction removed' });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- Delete All Transactions ---
// Route: DELETE /api/transactions/all
// Access: Private
router.delete('/all/delete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    await Transaction.deleteMany({ user: userId });
    res.json({ message: 'All transactions deleted successfully' });
  } catch (err) {
    console.error('Error deleting all transactions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- Update a Transaction ---
// Route: PUT /api/transactions/:id
// Access: Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { category, description, isNonEssential } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Ensure user owns the transaction
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Role-based check if it's a family transaction
    if (transaction.familyGroupId) {
      const FamilyGroup = (await import('../models/FamilyGroup.js')).default;
      const group = await FamilyGroup.findOne({ _id: transaction.familyGroupId, isActive: true });
      if (group) {
        const member = group.members.find(m => m.user && m.user.toString() === req.user._id.toString());
        const role = member ? member.role : null;

        if (role === 'VIEWER') {
          return res.status(403).json({ message: 'Viewers cannot edit transactions.' });
        }
      }
    }

    // Update fields
    if (category) transaction.category = category;
    if (description) transaction.description = description;
    if (isNonEssential !== undefined) transaction.isNonEssential = isNonEssential; // If schema supports it directly on Tx

    // If transaction has sub-categories (billscan), update them if needed? 
    // For now, assuming we are just updating the main category for single-category bank txs.

    await transaction.save();

    // --- GAMIFICATION & TAX HOOKS (On Edit) ---
    try {
      const { processEvent, GAMIFICATION_EVENTS } = await import('../services/gamificationEngine.js');
      const { processTaxEvent, TAX_EVENTS } = await import('../services/taxEngine/taxOptimizationEngine.js');
      
      const gamificationResults = await processEvent(req.user._id, GAMIFICATION_EVENTS.TRANSACTION_UPDATED, { transaction });
      const taxResults = await processTaxEvent(req.user._id, TAX_EVENTS.TRANSACTION_UPDATED, { transaction });
      
      return res.json({ ...transaction.toObject(), gamificationResults, taxResults });
    } catch (err) { console.error(err); }
    // -------------------------------------

    // Fallback if hooks fail
    res.json(transaction);
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
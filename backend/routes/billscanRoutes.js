import express from 'express';
import multer from 'multer';
import { parseBillWithGemini, parseBankStatementWithGemini } from '../utils/billParser.js';
import authMiddleware from '../middleware/authMiddleware.js';
import Transaction from '../models/transaction.js';

const router = express.Router();

// Valid categories as per transaction schema
const validCategories = [
  'Groceries',
  'Junk Food (Non-Essential)',
  'Clothing',
  'Stationery',
  'Medicine',
  'Personal Care',
  'Household Items',
  'Electronics',
  'Entertainment',
  'Transportation',
  'Utilities',
  'Education',
  'Dining Out',
  'Fees/Taxes',
  'Salary',
  'Refund',
  'Business',
  'Other',
];

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, JPG, and PDF are allowed.`), false);
    }
  }
});

// @route   POST /api/billscan
// @desc    Upload a bill or bank statement and process it
// @access  Private
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('bill')(req, res, (err) => {
    if (err) {
      console.error('[BillScan] Multer error:', err.message);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[BillScan] Request received. File present:', !!req.file);
    if (req.file) {
      console.log('[BillScan] File details:', { mimetype: req.file.mimetype, size: req.file.size, originalname: req.file.originalname });
    }
    if (!req.file) {
      console.error('[BillScan] No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { scanType } = req.body; // 'bill' or 'statement'
    const userId = req.user._id;

    if (scanType === 'statement') {
      const parsedData = await parseBankStatementWithGemini(req.file);

      if (!parsedData || !parsedData.transactions || !Array.isArray(parsedData.transactions)) {
        return res.status(400).json({ message: 'Failed to parse bank statement or no transactions found.' });
      }

      const transactions = [];
      const savedTransactions = [];

      for (const tx of parsedData.transactions) {
        let category = tx.category;
        let isNonEssential = false;

        if (!validCategories.includes(category) && category !== 'Unknown') {
          category = 'Unknown';
        }

        if (['Junk Food (Non-Essential)', 'Entertainment', 'Dining Out'].includes(category)) {
          isNonEssential = true;
        }

        const newTransaction = new Transaction({
          user: userId,
          type: tx.type, // 'credit' or 'debit'
          amount: tx.amount,
          category: category,
          description: tx.description,
          date: new Date(), // Override parsed date so it shows up exactly now
          source: 'billscan',
          status: 'completed'
        });

        const savedTx = await newTransaction.save();
        savedTransactions.push(savedTx);

        // --- GAMIFICATION HOOKS (per transaction in statement) ---
        try {
          const { addXP, checkStreak } = await import('../services/xpService.js');
          const { checkMissionProgress } = await import('../services/missionService.js');

          if (tx.type === 'debit') {
            await checkMissionProgress(userId, savedTx);
          }
          await addXP(userId, 1, 'statement_sync'); // Small XP per record
        } catch (gamiErr) {
          console.error('Gamification hook error (statement):', gamiErr);
        }
      }

      try {
        const { checkStreak } = await import('../services/xpService.js');
        await checkStreak(userId);
      } catch (err) { }

      return res.status(201).json({
        message: 'Bank statement processed successfully',
        transactions: savedTransactions,
        type: 'statement'
      });
    }
    else {
      // ──────────────── Bill Scan Logic ────────────────

      // Parse the bill using Gemini
      const parsedData = await parseBillWithGemini(req.file);
      console.log('[BillScan] Gemini parsed data:', JSON.stringify(parsedData, null, 2));

      // Validate parsed data
      if (
        !parsedData ||
        !parsedData.totalAmount ||
        !parsedData.date ||
        !parsedData.storeName ||
        !Array.isArray(parsedData.categories) ||
        parsedData.categories.length === 0
      ) {
        console.error('[BillScan] Validation failed. Parsed data summary:', {
          hasParsedData: !!parsedData,
          totalAmount: parsedData?.totalAmount,
          date: parsedData?.date,
          storeName: parsedData?.storeName,
          hasCategories: Array.isArray(parsedData?.categories),
          categoriesLength: parsedData?.categories?.length
        });
        return res.status(400).json({
          message: 'Incomplete or unrecognized bill data. Ensure the bill includes total amount, date, store name, and categorized items.',
          debug: {
            totalAmount: parsedData?.totalAmount || null,
            date: parsedData?.date || null,
            storeName: parsedData?.storeName || null,
            categoriesCount: parsedData?.categories?.length || 0
          }
        });
      }

      // Validate date
      const transactionDate = new Date(parsedData.date);
      if (isNaN(transactionDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format in parsed bill data' });
      }

      // Validate transaction type
      const transactionType = parsedData.transactionType || 'debit';
      if (transactionType !== 'debit' && transactionType !== 'credit') {
        return res.status(400).json({
          message: 'Invalid transaction type in parsed bill data. Must be "debit" or "credit".'
        });
      }

      // Prepare category totals (no hardcoding!)
      const adjustedCategories = parsedData.categories.map(cat => ({
        ...cat,
        categoryTotal: cat.categoryTotal || 0,
      }));

      // Calculate total amount from categories
      const adjustedTotalAmount = adjustedCategories.reduce((sum, cat) => sum + (cat.categoryTotal || 0), 0);
      
      console.log(`Final Total Amount: ${adjustedTotalAmount} calculated from ${adjustedCategories.length} categories`);

      // Determine the dominant category
      let dominantCategory = transactionType === 'credit' ? 'Refund' : 'Other';
      let maxTotal = 0;
      adjustedCategories.forEach((cat) => {
        const normalizedCat = validCategories.includes(cat.category) ? cat.category : 'Other';
        if ((cat.categoryTotal || 0) > maxTotal) {
          maxTotal = cat.categoryTotal;
          dominantCategory = normalizedCat;
        } else if (cat.categoryTotal === maxTotal && dominantCategory === 'Other') {
          dominantCategory = normalizedCat;
        }
      });

      // Map adjusted categories to transaction schema
      const transactionCategories = adjustedCategories.map((cat) => ({
        category: validCategories.includes(cat.category) ? cat.category : 'Other',
        isNonEssential: cat.isNonEssential || false,
        categoryTotal: cat.categoryTotal || 0,
        items: cat.items.map((item) => ({
          name: item.name || 'Unknown Item',
          price: item.price || 0,
          quantity: item.quantity || 1,
        })),
      }));

      // Create a new transaction
      const transaction = new Transaction({
        user: userId,
        type: transactionType,
        amount: adjustedTotalAmount,
        category: dominantCategory,
        description: `Bill from ${parsedData.storeName}`,
        date: new Date(), // Override parsed date so it shows up exactly now
        source: 'billscan',
        categories: transactionCategories,
        status: 'completed',
      });

      await transaction.save();

      // --- GAMIFICATION HOOKS (Bill Scan) ---
      try {
        const { addXP, checkStreak } = await import('../services/xpService.js');
        const { checkBadges } = await import('../services/badgeService.js');
        const { checkChallengeProgress } = await import('../services/challengeService.js');
        const { checkMissionProgress } = await import('../services/missionService.js');

        await addXP(userId, 5, 'bill_scanned');
        await checkStreak(userId);
        await checkBadges(userId);
        await checkChallengeProgress(userId, transaction);
        await checkMissionProgress(userId, transaction);
      } catch (gamiErr) {
        console.error('Gamification hook error (billscan):', gamiErr);
      }

      // Log transaction creation
      console.log('New billscan transaction created:', {
        userId,
        type: transactionType,
        amount: adjustedTotalAmount,
        category: dominantCategory,
        source: 'billscan',
        date: transactionDate,
        transactionId: transaction._id,
        categories: transactionCategories,
      });

      // Prepare response with adjusted categories
      const responseCategories = adjustedCategories.map((cat) => {
        const itemsByName = {};
        cat.items.forEach((item) => {
          const itemName = item.name || 'Unknown Item';
          if (!itemsByName[itemName]) {
            itemsByName[itemName] = {
              price: item.price || 0,
              quantity: item.quantity || 1,
            };
          } else {
            itemsByName[itemName].quantity += item.quantity || 1;
          }
        });
        return {
          category: validCategories.includes(cat.category) ? cat.category : 'Other',
          isNonEssential: cat.isNonEssential || false,
          categoryTotal: cat.categoryTotal || 0,
          items: itemsByName,
        };
      });

      res.status(201).json({
        message: 'Bill scanned and transaction recorded successfully',
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          type: transaction.type,
          categories: responseCategories,
        },
      });
    }
  }
  catch (error) {
    console.error('Error processing bill:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Transaction validation failed', errors: messages });
    }

    res.status(500).json({
      message: 'Error processing bill',
      error: error.message,
    });
  }
});

// Helper function for currency formatting (for error messages)
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default router;
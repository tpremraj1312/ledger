import express from 'express';
import SmsTransaction from '../models/SmsTransaction.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── POST /api/sms/sync ─────────────────────────────────────────────────────
// Bulk sync parsed SMS transactions from device to cloud
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: 'No transactions to sync' });
    }

    const results = {
      synced: 0,
      duplicates: 0,
      errors: 0,
    };

    for (const tx of transactions) {
      try {
        await SmsTransaction.findOneAndUpdate(
          { user: req.user._id, smsHash: tx.smsHash },
          {
            user: req.user._id,
            smsHash: tx.smsHash,
            rawSms: tx.rawSms,
            sender: tx.sender || '',
            transactionType: tx.transactionType,
            amount: tx.amount,
            merchant: tx.merchant,
            category: tx.category,
            date: new Date(tx.date),
            accountType: tx.accountType || 'bank',
            accountNumber: tx.accountNumber,
            balance: tx.balance,
            reference: tx.reference,
            riskScore: tx.riskScore || 0,
            riskLevel: tx.riskLevel || 'low',
            riskReasons: tx.riskReasons || [],
            markedSafe: tx.markedSafe || false,
            parsedAt: new Date(tx.parsedAt),
            syncedAt: new Date(),
          },
          { upsert: true, new: true }
        );
        results.synced++;
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
        } else {
          results.errors++;
          console.error('[SMS Sync] Error syncing transaction:', err.message);
        }
      }
    }

    res.json({
      message: 'Sync complete',
      ...results,
    });
  } catch (err) {
    console.error('[SMS Sync] Bulk sync error:', err);
    res.status(500).json({ message: 'Sync failed' });
  }
});

// ─── GET /api/sms/history ───────────────────────────────────────────────────
// Fetch paginated SMS parsing history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const riskLevel = req.query.riskLevel; // Optional filter

    const query = { user: req.user._id };
    if (riskLevel && ['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
      query.riskLevel = riskLevel;
    }

    const [transactions, total] = await Promise.all([
      SmsTransaction.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SmsTransaction.countDocuments(query),
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[SMS History] Error:', err);
    res.status(500).json({ message: 'Failed to fetch SMS history' });
  }
});

// ─── PUT /api/sms/risk-threshold ────────────────────────────────────────────
// Update user's custom risk threshold (stored on user profile or a settings doc)
router.put('/risk-threshold', authMiddleware, async (req, res) => {
  try {
    const { threshold } = req.body;

    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
      return res.status(400).json({ message: 'Threshold must be 0-100' });
    }

    // Store on user document or a settings collection
    // For now, return acknowledgment — threshold is primarily managed on-device
    res.json({
      message: 'Threshold updated',
      threshold,
    });
  } catch (err) {
    console.error('[SMS Threshold] Error:', err);
    res.status(500).json({ message: 'Failed to update threshold' });
  }
});

// ─── DELETE /api/sms/:smsHash ───────────────────────────────────────────────
router.delete('/:smsHash', authMiddleware, async (req, res) => {
  try {
    const result = await SmsTransaction.findOneAndDelete({
      user: req.user._id,
      smsHash: req.params.smsHash,
    });

    if (!result) {
      return res.status(404).json({ message: 'SMS transaction not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('[SMS Delete] Error:', err);
    res.status(500).json({ message: 'Failed to delete' });
  }
});

export default router;

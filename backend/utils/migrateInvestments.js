/**
 * Migration Utility — Convert existing Investment records to InvestmentTransaction entries.
 * 
 * Run once: node --experimental-modules utils/migrateInvestments.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Investment from '../models/Investment.js';
import InvestmentTransaction from '../models/InvestmentTransaction.js';
import { rebuildSnapshot } from '../services/portfolioEngine.js';

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const investments = await Investment.find({});
        console.log(`Found ${investments.length} existing investment records to migrate`);

        let migrated = 0;
        let skipped = 0;

        for (const inv of investments) {
            const idemKey = `MIGRATE_${inv._id.toString()}`;

            // Check if already migrated
            const existing = await InvestmentTransaction.findOne({ idempotencyKey: idemKey });
            if (existing) {
                skipped++;
                continue;
            }

            const txn = new InvestmentTransaction({
                user: inv.user,
                txnType: 'BUY',
                assetType: inv.assetType,
                name: inv.name,
                symbol: inv.symbol,
                quantity: inv.quantity,
                price: inv.buyPrice,
                totalAmount: inv.investedAmount || (inv.quantity * inv.buyPrice),
                txnDate: inv.buyDate || inv.createdAt,
                fees: 0,
                notes: inv.notes || `Migrated from legacy Investment record ${inv._id}`,
                idempotencyKey: idemKey,
            });

            await txn.save();
            migrated++;
        }

        console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped (already migrated)`);

        // Rebuild snapshots for all affected users
        const userIds = [...new Set(investments.map(i => i.user.toString()))];
        console.log(`Rebuilding snapshots for ${userIds.length} users...`);

        for (const userId of userIds) {
            try {
                await rebuildSnapshot(userId);
                console.log(`  ✓ Snapshot rebuilt for user ${userId}`);
            } catch (err) {
                console.error(`  ✗ Snapshot rebuild failed for user ${userId}:`, err.message);
            }
        }

        console.log('All done!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();

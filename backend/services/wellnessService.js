import WellnessScore from '../models/WellnessScore.js';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';

/**
 * 5-metric wellness scoring engine (max 100 points):
 *   Savings Rate        — 25 pts
 *   Budget Adherence    — 25 pts
 *   Overspending Freq   — 20 pts
 *   Expense Distribution — 15 pts
 *   Consistency          — 15 pts
 */
export const calculateWellnessScore = async (userId) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let activeGroup = null;
        try {
            const FamilyGroup = (await import('../models/FamilyGroup.js')).default;
            activeGroup = await FamilyGroup.findOne({
                'members.user': userId,
                isActive: true,
            });
        } catch (importErr) {
            console.error('Dynamic import of FamilyGroup failed:', importErr);
        }

        const query = {
            user: userId,
            isDeleted: false,
            date: { $gte: startOfMonth }
        };

        const transactions = await Transaction.find(query);

        const income = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
        const debitTx = transactions.filter(t => t.type === 'debit');

        // ---------- 1. Savings Rate (25 pts) ----------
        let savingsRate = 0;
        let savingsScore = 0;
        if (income > 0) {
            savingsRate = (income - expense) / income;
            if (savingsRate >= 0.3) savingsScore = 25;
            else if (savingsRate >= 0.2) savingsScore = 20;
            else if (savingsRate >= 0.1) savingsScore = 15;
            else if (savingsRate >= 0) savingsScore = 8;
            else savingsScore = 0;
        }

        // ---------- 2. Budget Adherence (25 pts) ----------
        let budgetAdherence = 0;
        let budgetScore = 12; // default if no budgets set
        try {
            const budgets = await Budget.find({ user: userId });
            if (budgets.length > 0) {
                const categorySpend = {};
                debitTx.forEach(t => {
                    const cat = (t.category || '').toLowerCase();
                    categorySpend[cat] = (categorySpend[cat] || 0) + t.amount;
                });

                let underCount = 0;
                for (const b of budgets) {
                    const cat = (b.category || '').toLowerCase();
                    const spent = categorySpend[cat] || 0;
                    if (spent <= b.amount) underCount++;
                }
                budgetAdherence = budgets.length > 0 ? underCount / budgets.length : 0;
                budgetScore = Math.round(budgetAdherence * 25);
            }
        } catch (_) { /* Budget model may not exist yet */ }

        // ---------- 3. Overspending Frequency (20 pts) ----------
        // Count days with > 1 expense over ₹2000 single transaction
        const bigSpendDays = new Set();
        debitTx.filter(t => t.amount > 2000).forEach(t => {
            bigSpendDays.add(new Date(t.date).toDateString());
        });
        const daysSoFar = now.getDate();
        const overspendRatio = bigSpendDays.size / Math.max(daysSoFar, 1);
        let overspendScore = 20;
        if (overspendRatio > 0.5) overspendScore = 0;
        else if (overspendRatio > 0.3) overspendScore = 8;
        else if (overspendRatio > 0.1) overspendScore = 14;

        // ---------- 4. Expense Distribution (15 pts) ----------
        // Penalize if > 60% spend is in one category
        const categoryTotals = {};
        debitTx.forEach(t => {
            const cat = t.category || 'Other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        });
        const cats = Object.values(categoryTotals);
        const maxCat = Math.max(...cats, 0);
        const diversityRatio = expense > 0 ? maxCat / expense : 0;
        let distributionScore = 15;
        if (diversityRatio > 0.6) distributionScore = 5;
        else if (diversityRatio > 0.45) distributionScore = 10;

        // ---------- 5. Consistency (15 pts) ----------
        // Active transaction days / days elapsed
        const activeDays = new Set();
        transactions.forEach(t => activeDays.add(new Date(t.date).toDateString()));
        const consistencyRatio = activeDays.size / Math.max(daysSoFar, 1);
        let consistencyScore = 0;
        if (consistencyRatio >= 0.6) consistencyScore = 15;
        else if (consistencyRatio >= 0.4) consistencyScore = 10;
        else if (consistencyRatio >= 0.2) consistencyScore = 5;

        // ---------- Total ----------
        const score = Math.min(100, Math.max(0,
            savingsScore + budgetScore + overspendScore + distributionScore + consistencyScore
        ));

        let label = 'Average';
        if (score >= 80) label = 'Excellent';
        else if (score >= 60) label = 'Good';
        else if (score < 40) label = 'Poor';

        // ---------- Tips ----------
        const tips = [];
        if (savingsRate < 0.2) tips.push('Try to save at least 20% of your income this month.');
        if (budgetAdherence < 0.7) tips.push('You\'re exceeding budgets in some categories. Review your spending limits.');
        if (overspendRatio > 0.2) tips.push('Reduce large single transactions (>₹2000) to improve your score.');
        if (diversityRatio > 0.5) tips.push('Your spending is concentrated. Diversify expenses for better balance.');
        if (consistencyRatio < 0.3) tips.push('Log transactions daily to build consistency and awareness.');
        if (tips.length === 0) tips.push('Great job! Keep maintaining your financial discipline. 🎯');

        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const result = await WellnessScore.findOneAndUpdate(
            { user: userId, month, year },
            {
                score,
                label,
                metrics: {
                    savingsRate: Math.round(savingsRate * 100) / 100,
                    budgetAdherence: Math.round(budgetAdherence * 100) / 100,
                    overspendingFrequency: Math.round((1 - overspendRatio) * 100) / 100,
                    expenseDistribution: Math.round((1 - diversityRatio) * 100) / 100,
                    consistency: Math.round(consistencyRatio * 100) / 100,
                },
                tips,
                calculatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return result;
    } catch (error) {
        console.error('Wellness Calc Error:', error);
        return { score: 50, label: 'Average', metrics: {}, tips: [] };
    }
};

export const getWellnessHistory = async (userId) => {
    return WellnessScore.find({ user: userId }).sort({ year: -1, month: -1 }).limit(12);
};

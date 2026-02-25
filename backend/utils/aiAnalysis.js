import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// Valid transaction categories
const validTransactionCategories = [
  'Groceries', 'Junk Food (Non-Essential)', 'Clothing', 'Stationery', 'Medicine',
  'Personal Care', 'Household Items', 'Electronics', 'Entertainment', 'Transportation',
  'Utilities', 'Education', 'Dining Out', 'Fees/Taxes', 'Salary', 'Refund', 'Business', 'Other'
];

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const defaultAnalysis = {
  budgetVsExpenses: 'No expenses or budgets found for the selected period. Please add data to generate analysis.',
  spendingPatterns: 'No patterns identified due to lack of data.',
  recommendations: 'Start by adding transactions and budgets.',
  visualizationData: { expenseBreakdown: [], weeklySpending: [] }
};

const mapBudgetCategory = (category) => validTransactionCategories.includes(category) ? category : 'Other';

const isBudgetInPeriod = (budget, startDate, endDate) => {
  const budgetDate = budget.createdAt || new Date();
  const period = budget.period || 'Monthly';
  let budgetStart, budgetEnd;

  switch (period) {
    case 'Weekly':
      budgetStart = new Date(budgetDate);
      budgetStart.setDate(budgetStart.getDate() - budgetStart.getDay());
      budgetEnd = new Date(budgetStart); budgetEnd.setDate(budgetEnd.getDate() + 6);
      break;
    case 'Monthly':
      budgetStart = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
      budgetEnd = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0);
      break;
    case 'Quarterly':
      const q = Math.floor(budgetDate.getMonth() / 3);
      budgetStart = new Date(budgetDate.getFullYear(), q * 3, 1);
      budgetEnd = new Date(budgetDate.getFullYear(), (q + 1) * 3, 0);
      break;
    case 'Yearly':
      budgetStart = new Date(budgetDate.getFullYear(), 0, 1);
      budgetEnd = new Date(budgetDate.getFullYear(), 11, 31);
      break;
    default:
      budgetStart = budgetDate; budgetEnd = budgetDate;
  }
  return budgetEnd >= startDate && budgetStart <= endDate;
};

export const generateAIAnalysis = async (userId, { startDate, endDate, category }) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error('Invalid user ID');

    // Force Current Month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const finalStart = startDate ? new Date(startDate) : startOfMonth;
    const finalEnd = endDate ? new Date(endDate) : endOfMonth;

    // Cap at current month
    const cappedStart = finalStart < startOfMonth ? startOfMonth : finalStart;
    const cappedEnd = finalEnd > endOfMonth ? endOfMonth : finalEnd;

    const txQuery = { user: userId, type: 'debit', date: { $gte: cappedStart, $lte: cappedEnd } };
    if (category && category !== 'All') txQuery.category = category;

    const transactions = await Transaction.find(txQuery).lean();

    const budgetQuery = { user: userId, type: 'expense' };
    if (category && category !== 'All') budgetQuery.category = category;
    let budgets = await Budget.find(budgetQuery).lean();
    budgets = budgets.filter(b => isBudgetInPeriod(b, cappedStart, cappedEnd));

    if (transactions.length === 0 && budgets.length === 0) return defaultAnalysis;

    const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const expenseByCategory = transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

    // Percentages
    const expenseBreakdown = Object.entries(expenseByCategory).map(([cat, amount]) => ({
      category: cat,
      percentage: totalExpenses > 0 ? parseFloat(((amount / totalExpenses) * 100).toFixed(2)) : 0,
      amount
    }));

    // Weekly Trends
    const weeklySpending = transactions.reduce((acc, tx) => {
      const d = new Date(tx.date); d.setDate(d.getDate() - d.getDay());
      const k = d.toISOString().split('T')[0];
      acc[k] = (acc[k] || 0) + tx.amount;
      return acc;
    }, {});
    const weeklySpendingData = Object.entries(weeklySpending).map(([week, amount]) => ({ weekStart: week, amount }));

    const prompt = `
Analyze Indian Rupee (₹) finances.
Data:
- Total: ${formatCurrency(totalExpenses)} / Budget: ${formatCurrency(totalBudget)}
- Categories: ${JSON.stringify(expenseBreakdown)}
- Weekly: ${JSON.stringify(weeklySpendingData)}
- Filters: ${cappedStart.toDateString()} to ${cappedEnd.toDateString()}, Category: ${category || 'All'}

Return JSON: { budgetVsExpenses, spendingPatterns, recommendations, visualizationData: { expenseBreakdown, weeklySpending } }
Accurate, professional, actionable. Use ₹.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const cleaned = jsonMatch ? jsonMatch[1] : text;
    const analysis = JSON.parse(cleaned);

    analysis.visualizationData = analysis.visualizationData || { expenseBreakdown, weeklySpending: weeklySpendingData };
    return analysis;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return defaultAnalysis;
  }
};
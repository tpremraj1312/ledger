import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';

// Helper function for currency formatting
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Main comparison function
export const generateBudgetComparison = async (userId, { startDate, endDate, category }) => {
  try {
    // Build query for transactions
    const transactionQuery = { user: userId, type: 'debit' };
    if (startDate) {
      transactionQuery.date = { $gte: new Date(startDate) };
    }
    if (endDate) {
      transactionQuery.date = {
        ...transactionQuery.date,
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }
    if (category && category !== 'All') {
      transactionQuery.category = category;
    }

    // Fetch transactions
    const transactions = await Transaction.find(transactionQuery).lean();

    // Build query for budgets
    const budgetQuery = { user: userId, type: 'expense' };
    if (category && category !== 'All') {
      budgetQuery.category = category;
    }

    // Fetch budgets
    const budgets = await Budget.find(budgetQuery).lean();

    // Aggregate expenses by category
    const expenseByCategory = transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

    // Aggregate budgets by category
    const budgetByCategory = budgets.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + b.amount;
      return acc;
    }, {});

    // Combine categories from both expenses and budgets
    const allCategories = [...new Set([...Object.keys(expenseByCategory), ...Object.keys(budgetByCategory)])];

    // Prepare comparison data
    const comparisonData = allCategories.map(cat => ({
      category: cat,
      budget: budgetByCategory[cat] || 0,
      expense: expenseByCategory[cat] || 0,
      budgetFormatted: formatCurrency(budgetByCategory[cat] || 0),
      expenseFormatted: formatCurrency(expenseByCategory[cat] || 0),
      difference: (budgetByCategory[cat] || 0) - (expenseByCategory[cat] || 0),
      differenceFormatted: formatCurrency((budgetByCategory[cat] || 0) - (expenseByCategory[cat] || 0)),
      status: (expenseByCategory[cat] || 0) > (budgetByCategory[cat] || 0) ? 'Over Budget' : 'Under Budget',
    }));

    // Calculate totals
    const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

    return {
      comparison: comparisonData,
      totals: {
        totalExpenses,
        totalBudget,
        totalExpensesFormatted: formatCurrency(totalExpenses),
        totalBudgetFormatted: formatCurrency(totalBudget),
        totalDifference: totalBudget - totalExpenses,
        totalDifferenceFormatted: formatCurrency(totalBudget - totalExpenses),
      },
    };
  } catch (error) {
    console.error('Error generating budget comparison:', error);
    throw new Error(error.message || 'Failed to generate budget comparison');
  }
};
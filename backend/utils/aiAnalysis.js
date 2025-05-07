import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import Transaction from '../models/transaction.js';
import Budget from '../models/budget.js';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Valid transaction categories as per transaction schema
const validTransactionCategories = [
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

// Helper function for currency formatting
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Default analysis for empty data or parsing failures
const defaultAnalysis = {
  budgetVsExpenses: 'No expenses or budgets found for the selected period or category. Please add transactions and budgets to generate an analysis.',
  spendingPatterns: 'No spending patterns can be identified due to lack of transaction data.',
  recommendations: 'Start by adding transactions and setting budgets to receive personalized financial insights.',
  visualizationData: {
    expenseBreakdown: [],
    weeklySpending: []
  }
};

// Helper function to map custom budget categories to valid transaction categories
const mapBudgetCategory = (category) => {
  return validTransactionCategories.includes(category) ? category : 'Other';
};

// Helper function to determine if a budget applies to the analysis period
const isBudgetInPeriod = (budget, startDate, endDate) => {
  const budgetDate = budget.createdAt || new Date();
  const period = budget.period || 'Monthly';
  let budgetStart, budgetEnd;

  switch (period) {
    case 'Weekly':
      budgetStart = new Date(budgetDate);
      budgetStart.setDate(budgetStart.getDate() - budgetStart.getDay());
      budgetEnd = new Date(budgetStart);
      budgetEnd.setDate(budgetEnd.getDate() + 6);
      break;
    case 'Monthly':
      budgetStart = new Date(budgetDate.getFullYear(), budgetDate.getMonth(), 1);
      budgetEnd = new Date(budgetDate.getFullYear(), budgetDate.getMonth() + 1, 0);
      break;
    case 'Quarterly':
      const quarter = Math.floor(budgetDate.getMonth() / 3);
      budgetStart = new Date(budgetDate.getFullYear(), quarter * 3, 1);
      budgetEnd = new Date(budgetDate.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'Yearly':
      budgetStart = new Date(budgetDate.getFullYear(), 0, 1);
      budgetEnd = new Date(budgetDate.getFullYear(), 11, 31);
      break;
    default:
      budgetStart = new Date(budgetDate);
      budgetEnd = new Date(budgetDate);
  }

  const analysisStart = startDate ? new Date(startDate) : new Date(0);
  const analysisEnd = endDate ? new Date(endDate) : new Date(8640000000000000);
  return budgetEnd >= analysisStart && budgetStart <= analysisEnd;
};

// Main analysis function
export const generateAIAnalysis = async (userId, { startDate, endDate, category }) => {
  try {
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId:', userId);
      throw new Error('Invalid user ID');
    }

    // Validate category
    if (category && category !== 'All' && !validTransactionCategories.includes(category)) {
      console.error('Invalid category:', category);
      throw new Error(`Invalid category. Must be one of: ${validTransactionCategories.join(', ')}`);
    }

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
    console.log('Fetching transactions with query:', JSON.stringify(transactionQuery, null, 2));
    const transactions = await Transaction.find(transactionQuery).lean();
    console.log('Transactions found:', transactions.length);

    // Build query for budgets
    const budgetQuery = { user: userId, type: 'expense' };
    if (category && category !== 'All') {
      budgetQuery.category = category;
    }

    // Fetch budgets
    console.log('Fetching budgets with query:', JSON.stringify(budgetQuery, null, 2));
    let budgets = await Budget.find(budgetQuery).lean();
    console.log('Budgets found:', budgets.length);

    // Filter budgets by period
    budgets = budgets.filter(budget => isBudgetInPeriod(budget, startDate, endDate));
    console.log('Budgets after period filter:', budgets.length);

    // Check for empty data
    if (transactions.length === 0 && budgets.length === 0) {
      console.log('No transactions or budgets found, returning default analysis');
      return defaultAnalysis;
    }

    // Aggregate data
    const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const expenseByCategory = transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    const budgetByCategory = budgets.reduce((acc, b) => {
      const mappedCategory = mapBudgetCategory(b.category);
      acc[mappedCategory] = (acc[mappedCategory] || 0) + b.amount;
      return acc;
    }, {});
    const originalBudgetByCategory = budgets.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + b.amount;
      return acc;
    }, {});

    // Calculate percentage breakdown for expenses
    const expensePercentages = Object.entries(expenseByCategory).reduce((acc, [cat, amount]) => {
      acc[cat] = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(2) : 0;
      return acc;
    }, {});

    // Identify top spending categories
    const sortedExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({ category, amount, percentage: expensePercentages[category] }));

    // Detect outliers (transactions > 2 standard deviations above mean)
    const amounts = transactions.map(tx => tx.amount);
    const mean = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 0;
    const variance = amounts.length > 0
      ? amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const outliers = transactions
      .filter(tx => tx.amount > mean + 2 * stdDev)
      .map(tx => ({
        category: tx.category,
        amount: tx.amount,
        date: new Date(tx.date).toLocaleDateString('en-IN'),
        description: tx.description || 'N/A',
      }));

    // Analyze temporal trends (e.g., weekly spending)
    const weeklySpending = transactions.reduce((acc, tx) => {
      const weekStart = new Date(tx.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      acc[weekKey] = (acc[weekKey] || 0) + tx.amount;
      return acc;
    }, {});

    // Prepare visualization data
    const expenseBreakdown = Object.entries(expensePercentages).map(([category, percentage]) => ({
      category,
      percentage: parseFloat(percentage),
      amount: expenseByCategory[category] || 0
    }));
    const weeklySpendingData = Object.entries(weeklySpending).map(([week, amount]) => ({
      weekStart: week,
      amount
    }));

    // Prepare data for Gemini API
    const prompt = `
You are an expert financial analyst providing a detailed, professional, and user-friendly analysis for a user in Indian Rupees (₹). Your goal is to deliver deep, actionable insights that are easy to understand, supported by specific examples and quantitative details.

**Financial Data:**
- Total Expenses: ${formatCurrency(totalExpenses)}
- Total Budget: ${formatCurrency(totalBudget)}
- Expenses by Category (with percentage):
  ${JSON.stringify(
    Object.entries(expenseByCategory).map(([cat, amount]) => ({
      category: cat,
      amount: formatCurrency(amount),
      percentage: `${expensePercentages[cat]}%`,
    })),
    null,
    2
  )}
- Budgets by Category (mapped to valid transaction categories):
  ${JSON.stringify(
    Object.entries(budgetByCategory).map(([cat, amount]) => ({
      category: cat,
      amount: formatCurrency(amount),
    })),
    null,
    2
  )}
- Original Budgets by Category (including custom categories):
  ${JSON.stringify(
    Object.entries(originalBudgetByCategory).map(([cat, amount]) => ({
      category: cat,
      amount: formatCurrency(amount),
    })),
    null,
    2
  )}
- Top Spending Categories:
  ${JSON.stringify(
    sortedExpenses.map(s => ({
      category: s.category,
      amount: formatCurrency(s.amount),
      percentage: `${s.percentage}%`,
    })),
    null,
    2
  )}
- Outlier Transactions (Unusually High):
  ${JSON.stringify(outliers, null, 2)}
- Weekly Spending Trends:
  ${JSON.stringify(
    Object.entries(weeklySpending).map(([week, amount]) => ({
      weekStart: week,
      amount: formatCurrency(amount),
    })),
    null,
    2
  )}
- Filters:
  - Start Date: ${startDate || 'Not specified'}
  - End Date: ${endDate || 'Not specified'}
  - Category: ${category || 'All'}
- Valid Transaction Categories: ${validTransactionCategories.join(', ')}
- Note: Budget categories may include custom values not in the valid transaction categories list. These have been mapped to 'Other' for expense comparisons.

**Instructions:**
Provide a JSON object with the following fields:
1. **budgetVsExpenses**: Compare total expenses to total budget, specifying if the user is over or under budget by how much (in ₹ and %). Identify categories with significant overspending (>10% over budget) or underspending (<50% of budget), including exact amounts and percentages. Suggest why overspending might be occurring (e.g., discretionary spending, unexpected costs). Note any custom budget categories and their mapping to 'Other'.
2. **spendingPatterns**: Analyze dominant spending categories (with percentages), weekly spending trends (e.g., peak weeks, consistency), and outliers. Provide specific examples (e.g., highest transaction, peak spending week) and explain their impact on financial health. Highlight any unusual patterns (e.g., spikes, low spending weeks).
3. **recommendations**: Offer 3-5 actionable, personalized recommendations to improve financial health. Examples: reduce spending in specific categories (with target amounts), reallocate unspent budget to savings, review outliers for discretionary spending, set stricter budgets for volatile categories, or adjust custom budget categories to align with transaction categories. Include potential savings (in ₹) and reference specific data points.
4. **visualizationData**: Include data for frontend charts:
   - expenseBreakdown: Array of { category, percentage, amount } for a pie chart.
   - weeklySpending: Array of { weekStart, amount } for a line chart.

**Output Requirements:**
- Return a JSON object wrapped in triple backticks (\`\`\`json ... \`\`\`).
- Ensure valid JSON with no trailing commas, comments, or extra text.
- Use Indian Rupees (₹) with commas (e.g., ₹1,23,456.78).
- Each text field (budgetVsExpenses, spendingPatterns, recommendations) should be 6-8 sentences, professional, clear, and engaging.
- If data is limited, provide general advice based on available information.

**Example Output:**
\`\`\`json
{
  "budgetVsExpenses": "Your total expenses of ₹50,000 exceed your ₹40,000 budget by ₹10,000 (25%). Dining overspent by ₹3,000 (30% over ₹10,000 budget), likely due to frequent restaurant visits. Transport underspent by ₹2,000 (40% of ₹5,000 budget), indicating efficient travel habits.",
  "spendingPatterns": "Dining dominates at 40% (₹20,000), with a ₹10,000 outlier on 15-Apr-2025. Weekly spending peaked at ₹15,000 in the week of 10-Apr-2025 due to entertainment costs. Groceries remain stable at 30% (₹15,000).",
  "recommendations": "Reduce dining expenses by ₹5,000 next month to align with your budget, saving ₹60,000 annually. Reallocate ₹1,000 from transport to savings. Review the ₹10,000 dining outlier to avoid impulse spending. Set a weekly dining cap of ₹2,000.",
  "visualizationData": {
    "expenseBreakdown": [
      { "category": "Dining", "percentage": 40, "amount": 20000 },
      { "category": "Groceries", "percentage": 30, "amount": 15000 }
    ],
    "weeklySpending": [
      { "weekStart": "2025-04-07", "amount": 12000 },
      { "weekStart": "2025-04-14", "amount": 15000 }
    ]
  }
}
\`\`\`
    `;

    // Call Gemini API
    console.log('Calling Gemini API with prompt length:', prompt.length);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    console.log('Raw Gemini API response:', text);

    // Clean and parse response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    let cleanedText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    console.log('Cleaned response text:', cleanedText);

    if (!cleanedText || !cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
      console.error('Invalid JSON format in cleaned response');
      return defaultAnalysis;
    }

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
      if (!analysis.budgetVsExpenses || !analysis.spendingPatterns || !analysis.recommendations || !analysis.visualizationData) {
        console.error('Missing required fields in parsed response:', analysis);
        return defaultAnalysis;
      }
      // Ensure visualizationData has expected structure
      analysis.visualizationData = {
        expenseBreakdown: analysis.visualizationData.expenseBreakdown || expenseBreakdown,
        weeklySpending: analysis.visualizationData.weeklySpending || weeklySpendingData
      };
    } catch (err) {
      console.error('Gemini API parsing error:', err.message, 'Cleaned response:', cleanedText);
      return defaultAnalysis;
    }

    console.log('Parsed analysis:', analysis);
    return analysis;
  } catch (error) {
    console.error('Error generating AI analysis:', error.message);
    throw new Error(error.message || 'Failed to generate AI analysis');
  }
};
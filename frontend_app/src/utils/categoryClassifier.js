/**
 * Category Classifier — Rule-Based Transaction Classification
 * 
 * Maps merchants and keywords to spending categories using a deterministic
 * dictionary. No AI — pure keyword matching.
 * 
 * Extensible: add new entries to CATEGORY_RULES to expand coverage.
 */

// ─── Category Definitions ───────────────────────────────────────────────────

export const CATEGORIES = {
  FOOD: 'Food & Dining',
  SHOPPING: 'Shopping',
  TRANSPORT: 'Transport',
  GROCERIES: 'Groceries',
  BILLS: 'Bills & Utilities',
  ENTERTAINMENT: 'Entertainment',
  HEALTH: 'Health & Medical',
  EDUCATION: 'Education',
  TRAVEL: 'Travel',
  FUEL: 'Fuel',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  INVESTMENT: 'Investment',
  INSURANCE: 'Insurance',
  GAMBLING: 'Gambling',
  UNKNOWN: 'Unknown',
};

// ─── Category Keyword Rules ─────────────────────────────────────────────────
// Each category has: keywords (merchant names / descriptors), and patterns (regex)

const CATEGORY_RULES = [
  {
    category: CATEGORIES.FOOD,
    keywords: [
      'swiggy', 'zomato', 'dominos', 'mcdonalds', 'kfc', 'pizza hut',
      'burger king', 'starbucks', 'cafe coffee day', 'ccd', 'subway',
      'dunkin', 'haldirams', 'barbeque nation', 'restaurant', 'food',
      'dining', 'eat', 'biryani', 'dine', 'chai', 'tea', 'juice',
      'bakery', 'cake', 'ice cream', 'baskin robbins', 'dosa', 'mess',
      'canteen', 'tiffin', 'blinkit food', 'eatsure', 'box8',
    ],
    patterns: [/\b(?:swiggy|zomato|food\s*order|restaurant)\b/i],
  },
  {
    category: CATEGORIES.SHOPPING,
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'snapdeal',
      'nykaa', 'tatacliq', 'croma', 'reliance digital', 'vijay sales',
      'shoppers stop', 'lifestyle', 'westside', 'pantaloons', 'h&m',
      'zara', 'uniqlo', 'decathlon', 'dmall', 'mall', 'mart',
      'store', 'shop', 'retail', 'electronics', 'mobile', 'laptop',
      'purchase', 'buy', 'order', 'jiomart', 'firstcry', 'lenskart',
    ],
    patterns: [/\b(?:amazon|flipkart|myntra|shopping|purchase)\b/i],
  },
  {
    category: CATEGORIES.TRANSPORT,
    keywords: [
      'uber', 'ola', 'rapido', 'meru', 'ola money', 'uber cash',
      'metro', 'bus', 'railway', 'irctc', 'redbus', 'cab', 'taxi',
      'auto', 'rickshaw', 'ride', 'trip', 'commute', 'toll',
      'parking', 'namma yatri', 'bluestar',
    ],
    patterns: [/\b(?:uber|ola|rapido|metro|irctc|cab|taxi)\b/i],
  },
  {
    category: CATEGORIES.GROCERIES,
    keywords: [
      'bigbasket', 'blinkit', 'zepto', 'dunzo', 'grofers', 'jiomart',
      'dmart', 'reliance fresh', 'more supermarket', 'star bazaar',
      'spencer', 'nature basket', 'grocery', 'vegetables', 'fruits',
      'milk', 'dairy', 'supermarket', 'kirana', 'provision',
      'instamart', 'swiggy instamart',
    ],
    patterns: [/\b(?:bigbasket|blinkit|zepto|grocery|supermarket)\b/i],
  },
  {
    category: CATEGORIES.BILLS,
    keywords: [
      'electricity', 'electric', 'water bill', 'gas bill', 'broadband',
      'internet', 'wifi', 'mobile recharge', 'dth', 'tata sky',
      'airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'postpaid',
      'prepaid', 'recharge', 'bill payment', 'utility', 'municipal',
      'emi', 'loan', 'rent', 'maintenance', 'society', 'insurance premium',
      'credit card bill', 'netflix', 'spotify', 'hotstar', 'subscription',
    ],
    patterns: [/\b(?:bill\s*pay|recharge|electricity|broadband|emi)\b/i],
  },
  {
    category: CATEGORIES.ENTERTAINMENT,
    keywords: [
      'netflix', 'hotstar', 'prime video', 'disney', 'spotify',
      'apple music', 'youtube premium', 'zee5', 'sonyliv', 'voot',
      'movie', 'cinema', 'pvr', 'inox', 'multiplex', 'bookmyshow',
      'game', 'gaming', 'playstation', 'xbox', 'steam', 'concert',
      'ticket', 'event', 'amusement', 'park', 'club',
    ],
    patterns: [/\b(?:netflix|spotify|movie|cinema|pvr|bookmyshow)\b/i],
  },
  {
    category: CATEGORIES.HEALTH,
    keywords: [
      'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine',
      'apollo', 'medplus', 'netmeds', 'pharmeasy', '1mg', 'practo',
      'lab', 'diagnostic', 'pathology', 'dental', 'eye', 'health',
      'gym', 'fitness', 'yoga', 'wellness', 'cult.fit', 'curefit',
    ],
    patterns: [/\b(?:hospital|pharmacy|medical|doctor|apollo)\b/i],
  },
  {
    category: CATEGORIES.EDUCATION,
    keywords: [
      'school', 'college', 'university', 'tuition', 'coaching',
      'course', 'udemy', 'coursera', 'unacademy', 'byju', 'whitehat',
      'exam', 'fee', 'education', 'book', 'stationery', 'library',
      'upgrad', 'simplilearn', 'vedantu', 'toppr',
    ],
    patterns: [/\b(?:school|college|tuition|course|education)\b/i],
  },
  {
    category: CATEGORIES.TRAVEL,
    keywords: [
      'makemytrip', 'goibibo', 'cleartrip', 'yatra', 'easemytrip',
      'hotel', 'resort', 'oyo', 'airbnb', 'booking.com', 'trivago',
      'flight', 'airline', 'indigo', 'air india', 'spicejet', 'vistara',
      'train', 'travel', 'tour', 'visa', 'passport',
    ],
    patterns: [/\b(?:makemytrip|hotel|flight|airline|travel)\b/i],
  },
  {
    category: CATEGORIES.FUEL,
    keywords: [
      'petrol', 'diesel', 'fuel', 'iocl', 'bpcl', 'hpcl',
      'indian oil', 'bharat petroleum', 'hp petrol', 'shell',
      'petrol pump', 'gas station', 'cng', 'ev charging',
    ],
    patterns: [/\b(?:petrol|diesel|fuel|iocl|bpcl|hpcl)\b/i],
  },
  {
    category: CATEGORIES.INCOME,
    keywords: [
      'salary', 'wages', 'stipend', 'bonus', 'incentive',
      'freelance', 'payment received', 'income', 'dividend',
      'interest credited', 'rent received', 'refund',
    ],
    patterns: [/\b(?:salary|credited|received|refund|interest\s*credit)\b/i],
  },
  {
    category: CATEGORIES.TRANSFER,
    keywords: [
      'transfer', 'neft', 'imps', 'rtgs', 'upi', 'self transfer',
      'fund transfer', 'sent to', 'received from',
    ],
    patterns: [/\b(?:neft|imps|rtgs|fund\s*transfer|self\s*transfer)\b/i],
  },
  {
    category: CATEGORIES.INVESTMENT,
    keywords: [
      'mutual fund', 'sip', 'zerodha', 'groww', 'upstox', 'angelone',
      'share', 'stock', 'equity', 'nse', 'bse', 'demat',
      'fixed deposit', 'fd', 'ppf', 'nps', 'gold', 'bond',
    ],
    patterns: [/\b(?:mutual\s*fund|sip|zerodha|groww|stock|demat)\b/i],
  },
  {
    category: CATEGORIES.INSURANCE,
    keywords: [
      'insurance', 'lic', 'policybazaar', 'hdfc life', 'icici prudential',
      'max life', 'sbi life', 'term plan', 'premium', 'policy',
    ],
    patterns: [/\b(?:insurance|lic|premium|policy)\b/i],
  },
  {
    category: CATEGORIES.GAMBLING,
    keywords: [
      'dream11', 'mpl', 'winzo', 'rummy', 'poker', 'bet',
      'casino', 'gambling', 'lottery', 'fantasy', 'stake',
    ],
    patterns: [/\b(?:dream11|mpl|rummy|poker|bet|casino|gambling)\b/i],
  },
];

/**
 * Classify a transaction into a category based on merchant name and raw SMS text.
 * 
 * Priority:
 * 1. Exact keyword match in merchant name
 * 2. Pattern match in full SMS text
 * 3. Keyword match in full SMS text
 * 4. Fallback: Credit → Income, else Unknown
 * 
 * @param {string} merchant - Extracted merchant name
 * @param {string} rawSms - Full SMS text
 * @param {string} transactionType - 'debit' or 'credit'
 * @returns {string} Category name
 */
export const classifyTransaction = (merchant, rawSms, transactionType = 'debit') => {
  const merchantLower = (merchant || '').toLowerCase();
  const smsLower = (rawSms || '').toLowerCase();

  // Pass 1: Check merchant name against keywords (highest confidence)
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (merchantLower.includes(keyword)) {
        return rule.category;
      }
    }
  }

  // Pass 2: Check full SMS text against regex patterns
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns) {
      for (const pattern of rule.patterns) {
        if (pattern.test(rawSms)) {
          return rule.category;
        }
      }
    }
  }

  // Pass 3: Check full SMS text against keywords (lower confidence)
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (smsLower.includes(keyword)) {
        return rule.category;
      }
    }
  }

  // Pass 4: Fallback — credits are likely Income, debits are Unknown
  if (transactionType === 'credit') {
    return CATEGORIES.INCOME;
  }

  return CATEGORIES.UNKNOWN;
};

/**
 * Get the risk weight for a given category.
 * Higher weight = more suspicious spending.
 * 
 * @param {string} category
 * @returns {number} Risk weight (0–1)
 */
export const getCategoryRiskWeight = (category) => {
  const RISK_WEIGHTS = {
    [CATEGORIES.GAMBLING]: 1.0,
    [CATEGORIES.UNKNOWN]: 0.7,
    [CATEGORIES.ENTERTAINMENT]: 0.3,
    [CATEGORIES.SHOPPING]: 0.25,
    [CATEGORIES.FOOD]: 0.15,
    [CATEGORIES.TRANSPORT]: 0.1,
    [CATEGORIES.GROCERIES]: 0.05,
    [CATEGORIES.BILLS]: 0.05,
    [CATEGORIES.HEALTH]: 0.05,
    [CATEGORIES.EDUCATION]: 0.05,
    [CATEGORIES.FUEL]: 0.05,
    [CATEGORIES.TRAVEL]: 0.2,
    [CATEGORIES.INCOME]: 0.0,
    [CATEGORIES.TRANSFER]: 0.1,
    [CATEGORIES.INVESTMENT]: 0.0,
    [CATEGORIES.INSURANCE]: 0.0,
  };

  return RISK_WEIGHTS[category] ?? 0.5;
};

/**
 * Get the icon name for a category (lucide-react-native compatible).
 */
export const getCategoryIcon = (category) => {
  const ICONS = {
    [CATEGORIES.FOOD]: 'Utensils',
    [CATEGORIES.SHOPPING]: 'ShoppingBag',
    [CATEGORIES.TRANSPORT]: 'Car',
    [CATEGORIES.GROCERIES]: 'ShoppingCart',
    [CATEGORIES.BILLS]: 'FileText',
    [CATEGORIES.ENTERTAINMENT]: 'Film',
    [CATEGORIES.HEALTH]: 'Heart',
    [CATEGORIES.EDUCATION]: 'BookOpen',
    [CATEGORIES.TRAVEL]: 'Plane',
    [CATEGORIES.FUEL]: 'Fuel',
    [CATEGORIES.INCOME]: 'TrendingUp',
    [CATEGORIES.TRANSFER]: 'ArrowLeftRight',
    [CATEGORIES.INVESTMENT]: 'BarChart2',
    [CATEGORIES.INSURANCE]: 'Shield',
    [CATEGORIES.GAMBLING]: 'AlertTriangle',
    [CATEGORIES.UNKNOWN]: 'HelpCircle',
  };

  return ICONS[category] || 'HelpCircle';
};

/**
 * Get the color for a category (design token compatible).
 */
export const getCategoryColor = (category) => {
  const COLORS = {
    [CATEGORIES.FOOD]: '#F59E0B',
    [CATEGORIES.SHOPPING]: '#8B5CF6',
    [CATEGORIES.TRANSPORT]: '#3B82F6',
    [CATEGORIES.GROCERIES]: '#10B981',
    [CATEGORIES.BILLS]: '#EF4444',
    [CATEGORIES.ENTERTAINMENT]: '#EC4899',
    [CATEGORIES.HEALTH]: '#14B8A6',
    [CATEGORIES.EDUCATION]: '#6366F1',
    [CATEGORIES.TRAVEL]: '#0EA5E9',
    [CATEGORIES.FUEL]: '#D97706',
    [CATEGORIES.INCOME]: '#16A34A',
    [CATEGORIES.TRANSFER]: '#64748B',
    [CATEGORIES.INVESTMENT]: '#1E6BD6',
    [CATEGORIES.INSURANCE]: '#059669',
    [CATEGORIES.GAMBLING]: '#DC2626',
    [CATEGORIES.UNKNOWN]: '#9CA3AF',
  };

  return COLORS[category] || '#9CA3AF';
};

export default {
  classifyTransaction,
  getCategoryRiskWeight,
  getCategoryIcon,
  getCategoryColor,
  CATEGORIES,
};

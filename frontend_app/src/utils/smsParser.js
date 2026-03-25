/**
 * SMS Parser — Deterministic Regex-Based Financial SMS Extraction Engine
 * 
 * Parses Indian bank/UPI/wallet SMS messages into structured transaction objects.
 * Works 100% offline — zero network dependency.
 * 
 * Supported formats: HDFC, SBI, ICICI, Axis, Kotak, Yes Bank, PNB,
 * Paytm, PhonePe, GPay, Amazon Pay, and generic debit/credit patterns.
 */

// ─── Amount Extraction Patterns ─────────────────────────────────────────────
// ORDER MATTERS: More specific patterns FIRST to avoid matching account numbers
const AMOUNT_PATTERNS = [
  // 1. "debited by 80.00" / "credited with Rs.500" — keyword BEFORE amount (SBI, PNB style)
  /(?:debited|credited|spent|paid|received|withdrawn|deposited|transferred|charged|deducted)\s+(?:by|with|for|of)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
  // 2. Explicit currency symbol before amount: Rs.80.00, INR 5,000, ₹1234
  /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
  // 3. "amount of Rs.500" / "amt: 1234"
  /(?:amount|amt)\s*(?:of|:)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
  // 4. Amount before keyword: "500 debited" / "1234.56 credited"
  /([\d,]+\.\d{1,2})\s*(?:debited|credited|spent|received|transferred|withdrawn|deposited)/i,
];

// ─── Transaction Type Detection ─────────────────────────────────────────────
const DEBIT_KEYWORDS = [
  'debited', 'debit', 'spent', 'paid', 'purchase', 'withdrawn',
  'transferred to', 'sent to', 'payment of', 'txn of', 'buying',
  'deducted', 'charged', 'auto-debit', 'emi', 'bill payment',
  'pos transaction', 'atm withdrawal', 'neft to', 'imps to', 'upi debit',
];

const CREDIT_KEYWORDS = [
  'credited', 'credit', 'received', 'deposited', 'refund',
  'cashback', 'salary', 'reversed', 'transferred from', 'received from',
  'upi credit', 'neft from', 'imps from', 'interest credit',
];

// ─── Merchant / Sender Extraction ───────────────────────────────────────────
const MERCHANT_PATTERNS = [
  /(?:at|to|from|@|via|towards|for)\s+([A-Za-z0-9][\w\s&.'*-]{1,40}?)(?:\s+on|\s+ref|\s+UPI|\s+Ref|\.|$)/i,
  /(?:VPA|UPI)\s*[:\-]?\s*([a-zA-Z0-9._-]+@[a-zA-Z]+)/i,
  /(?:to|from)\s+([A-Z][A-Za-z\s&.'*-]{2,30})/,
  /Info:\s*(.+?)(?:\s+Ref|\s+Avl|$)/i,
];

// ─── Month Name Map (for compact date parsing) ─────────────────────────────
const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// ─── Date Extraction Patterns ───────────────────────────────────────────────
const DATE_PATTERNS = [
  /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,                                        // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})/i,  // 24 Mar 2026
  /(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2,4})/i,        // 10Mar26 (compact, SBI style)
  /on\s+date\s+(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2,4})/i, // "on date 10Mar26"
  /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,                                          // YYYY-MM-DD
];

// ─── Account Type Detection ─────────────────────────────────────────────────
const ACCOUNT_TYPE_PATTERNS = {
  upi: /\b(?:UPI|VPA|upi)\b/i,
  card: /\b(?:card|visa|mastercard|rupay|credit\s*card|debit\s*card)\b/i,
  wallet: /\b(?:paytm|phonepe|freecharge|mobikwik|amazon\s*pay)\b/i,
  bank: /\b(?:A\/c|Ac|account|acct|saving|current|NEFT|IMPS|RTGS|a\/c\s*\w*\d+)\b/i,
  atm: /\b(?:ATM|atm\s*withdrawal)\b/i,
};

// ─── Account Number Extraction ──────────────────────────────────────────────
const ACCOUNT_NUMBER_PATTERNS = [
  /(?:A\/c|Ac|Acct|Account|a\/c)\s*(?:no\.?)?\s*[*xX]+(\d{3,6})/i,
  /(?:card|ending)\s*(?:no\.?)?\s*[*xX]+(\d{3,6})/i,
  /[*xX]+(\d{4})/,
];

// ─── Balance Extraction ─────────────────────────────────────────────────────
const BALANCE_PATTERNS = [
  /(?:Avl\.?\s*Bal|Available\s*Balance|Bal|Balance)\s*[:\-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
];

// ─── Reference Number Extraction ────────────────────────────────────────────
const REFERENCE_PATTERNS = [
  /(?:Ref\.?\s*(?:No\.?)?|Reference|Txn\s*(?:No\.?|ID)?|UPI\s*Ref)\s*[:\-]?\s*(\w{6,25})/i,
];

// ─── Non-Financial SMS Filter ───────────────────────────────────────────────
const NON_FINANCIAL_KEYWORDS = [
  'otp', 'one time password', 'verification code', 'login code',
  'promo', 'offer', 'cashback offer', 'deal of the day', 'download app',
  'subscribe', 'unsubscribe', 'missed call', 'voicemail',
  'delivery', 'shipped', 'out for delivery', 'delivered',
  'appointment', 'reminder', 'recharge done', 'data pack',
];

/**
 * Check if SMS is financial (not OTP, promo, delivery, etc.)
 */
const isFinancialSms = (text) => {
  const lower = text.toLowerCase();

  // Must contain at least one amount indicator
  const hasAmount = AMOUNT_PATTERNS.some(p => p.test(text));
  if (!hasAmount) return false;

  // Must contain at least one debit/credit keyword
  const hasTransactionKeyword =
    DEBIT_KEYWORDS.some(kw => lower.includes(kw)) ||
    CREDIT_KEYWORDS.some(kw => lower.includes(kw));
  if (!hasTransactionKeyword) return false;

  // Filter out non-financial
  const isNonFinancial = NON_FINANCIAL_KEYWORDS.some(kw => lower.includes(kw));
  if (isNonFinancial) {
    // Exception: if it's a refund/cashback credited, it IS financial
    const isActuallyFinancial = lower.includes('credited') || lower.includes('debited');
    if (!isActuallyFinancial) return false;
  }

  return true;
};

/**
 * Extract the transaction amount from SMS text.
 * Returns the first matched numeric amount, or null.
 */
const extractAmount = (text) => {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0 && amount < 10000000) { // Sanity cap at 1 crore
        return amount;
      }
    }
  }
  return null;
};

/**
 * Determine if the transaction is debit or credit.
 */
const extractTransactionType = (text) => {
  const lower = text.toLowerCase();

  // Score-based: whichever keyword appears first in the SMS wins
  let debitIndex = Infinity;
  let creditIndex = Infinity;

  for (const kw of DEBIT_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && idx < debitIndex) debitIndex = idx;
  }

  for (const kw of CREDIT_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && idx < creditIndex) creditIndex = idx;
  }

  if (debitIndex < creditIndex) return 'debit';
  if (creditIndex < debitIndex) return 'credit';
  return 'debit'; // Default to debit if ambiguous
};

/**
 * Extract merchant or sender name from SMS text.
 */
const extractMerchant = (text) => {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let merchant = match[1].trim();
      // Clean up trailing dots, dashes
      merchant = merchant.replace(/[.\-,]+$/, '').trim();
      // Skip if it's just a number or too short
      if (merchant.length >= 2 && !/^\d+$/.test(merchant)) {
        return merchant;
      }
    }
  }
  return 'Unknown Merchant';
};

/**
 * Safely construct a Date from parts.
 * Handles 2-digit years (26 → 2026) and month names.
 */
const buildDate = (day, monthInput, year) => {
  let y = parseInt(year, 10);
  let m;
  let d = parseInt(day, 10);

  // Handle 2-digit year
  if (y < 100) y += 2000;

  // Month can be a number or name
  if (typeof monthInput === 'string' && isNaN(parseInt(monthInput, 10))) {
    m = MONTH_MAP[monthInput.toLowerCase().substring(0, 3)];
    if (m === undefined) return null;
  } else {
    m = parseInt(monthInput, 10) - 1; // JS months are 0-indexed
  }

  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;

  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return null;
  return date;
};

/**
 * Extract transaction date from SMS text.
 * Falls back to current device time if no date found.
 */
const extractDate = (text) => {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    let date = null;

    // Check how many capture groups we have
    if (match[3]) {
      // 3 capture groups: (part1)(part2)(part3)
      const p1 = match[1], p2 = match[2], p3 = match[3];

      // If p1 is 4 digits → YYYY-MM-DD
      if (p1.length === 4 && !isNaN(parseInt(p1, 10))) {
        date = buildDate(p3, p2, p1);
      }
      // If p2 is a month name → DD Mon YY or DDMonYY
      else if (isNaN(parseInt(p2, 10))) {
        date = buildDate(p1, p2, p3);
      }
      // Otherwise DD/MM/YYYY
      else {
        date = buildDate(p1, p2, p3);
      }
    } else if (match[1]) {
      // Single capture group — try direct parse
      date = new Date(match[1]);
      if (isNaN(date.getTime())) date = null;
    }

    if (date) return date.toISOString();
  }
  return new Date().toISOString(); // Fallback: device time
};

/**
 * Detect account type (UPI, Card, Wallet, Bank, ATM).
 */
const extractAccountType = (text) => {
  for (const [type, pattern] of Object.entries(ACCOUNT_TYPE_PATTERNS)) {
    if (pattern.test(text)) return type;
  }
  return 'bank'; // Default
};

/**
 * Extract partial account number (last 4–6 digits).
 */
const extractAccountNumber = (text) => {
  for (const pattern of ACCOUNT_NUMBER_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return `****${match[1]}`;
    }
  }
  return null;
};

/**
 * Extract available balance after transaction.
 */
const extractBalance = (text) => {
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const balance = parseFloat(cleaned);
      if (!isNaN(balance)) return balance;
    }
  }
  return null;
};

/**
 * Extract reference/transaction ID.
 */
const extractReference = (text) => {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

/**
 * Generate a unique hash for SMS deduplication.
 * Uses a simple string hash — no crypto dependency needed.
 */
const generateSmsHash = (text) => {
  let hash = 0;
  const cleaned = text.replace(/\s+/g, '').toLowerCase();
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `sms_${Math.abs(hash).toString(36)}`;
};

/**
 * ──────────────────────────────────────────────────────────────────
 * MAIN PARSER FUNCTION
 * ──────────────────────────────────────────────────────────────────
 * 
 * Parses a raw SMS string into a structured transaction object.
 * Returns null for non-financial SMS.
 * 
 * @param {string} rawSms - The full SMS text
 * @param {string} [sender] - Optional sender ID (e.g., "AD-HDFCBK")
 * @returns {Object|null} Parsed transaction or null
 */
export const parseSms = (rawSms, sender = '') => {
  if (!rawSms || typeof rawSms !== 'string' || rawSms.length < 10) {
    return null;
  }

  // Step 1: Filter non-financial SMS
  if (!isFinancialSms(rawSms)) {
    return null;
  }

  // Step 2: Extract all fields
  const amount = extractAmount(rawSms);
  if (!amount) return null; // Cannot parse without amount

  const transactionType = extractTransactionType(rawSms);
  const merchant = extractMerchant(rawSms);
  const date = extractDate(rawSms);
  const accountType = extractAccountType(rawSms);
  const accountNumber = extractAccountNumber(rawSms);
  const balance = extractBalance(rawSms);
  const reference = extractReference(rawSms);
  const smsHash = generateSmsHash(rawSms);

  return {
    smsHash,
    rawSms,
    sender,
    transactionType,
    amount,
    merchant,
    date,
    accountType,
    accountNumber,
    balance,
    reference,
    category: null, // Filled by categoryClassifier.js
    riskScore: null, // Filled by riskEngine.js
    riskLevel: null,
    riskReasons: [],
    parsedAt: new Date().toISOString(),
  };
};

/**
 * Batch parse multiple SMS messages.
 * Filters out non-financial and duplicate SMS.
 * 
 * @param {Array<{body: string, sender?: string}>} smsList
 * @returns {Array<Object>} Array of parsed transactions
 */
export const batchParseSms = (smsList) => {
  if (!Array.isArray(smsList)) return [];

  const seen = new Set();
  const results = [];

  for (const sms of smsList) {
    const text = sms.body || sms.text || sms;
    const sender = sms.sender || sms.address || '';

    const parsed = parseSms(typeof text === 'string' ? text : String(text), sender);
    if (parsed && !seen.has(parsed.smsHash)) {
      seen.add(parsed.smsHash);
      results.push(parsed);
    }
  }

  return results;
};

export default {
  parseSms,
  batchParseSms,
  isFinancialSms,
  generateSmsHash,
};

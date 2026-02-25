/**
 * Tax Rules Configuration — India
 * Versioned by Financial Year. Add new keys for future years.
 * Rule-engine pattern: tax slabs, deduction limits, and mappings are data, not code.
 */

const TAX_RULES = {
    'FY2025-26': {
        label: 'FY 2025-26 (AY 2026-27)',
        standardDeduction: 75000,

        // ── Old Regime Slabs ──
        oldRegimeSlabs: [
            { min: 0, max: 250000, rate: 0 },
            { min: 250001, max: 500000, rate: 5 },
            { min: 500001, max: 1000000, rate: 20 },
            { min: 1000001, max: Infinity, rate: 30 },
        ],

        // ── New Regime Slabs (Budget 2025) ──
        newRegimeSlabs: [
            { min: 0, max: 400000, rate: 0 },
            { min: 400001, max: 800000, rate: 5 },
            { min: 800001, max: 1200000, rate: 10 },
            { min: 1200001, max: 1600000, rate: 15 },
            { min: 1600001, max: 2000000, rate: 20 },
            { min: 2000001, max: 2400000, rate: 25 },
            { min: 2400001, max: Infinity, rate: 30 },
        ],

        // ── Section 87A Rebate ──
        rebate87A: {
            oldRegime: { limit: 500000, maxRebate: 12500 },
            newRegime: { limit: 1200000, maxRebate: 60000 },
        },

        // Health & Education Cess
        cessRate: 4,

        // ── Deduction Sections (Old Regime eligible) ──
        sections: {
            '80C': {
                name: 'Section 80C',
                description: 'Investments in PPF, ELSS, LIC, NSC, Tax-Saving FDs, etc.',
                maxLimit: 150000,
                applicableTo: 'old',
            },
            '80CCD_1B': {
                name: 'Section 80CCD(1B)',
                description: 'Additional NPS contribution',
                maxLimit: 50000,
                applicableTo: 'both',
            },
            '80D_self': {
                name: 'Section 80D (Self & Family)',
                description: 'Health insurance premium for self, spouse, children',
                maxLimit: 25000,
                applicableTo: 'old',
            },
            '80D_parents': {
                name: 'Section 80D (Parents)',
                description: 'Health insurance premium for parents (60+ senior: ₹50,000)',
                maxLimit: 50000,
                applicableTo: 'old',
            },
            '80TTA': {
                name: 'Section 80TTA',
                description: 'Interest on savings account',
                maxLimit: 10000,
                applicableTo: 'old',
            },
            '24b': {
                name: 'Section 24(b)',
                description: 'Interest on home loan',
                maxLimit: 200000,
                applicableTo: 'old',
            },
            '80E': {
                name: 'Section 80E',
                description: 'Interest on education loan (no upper limit, full deductible)',
                maxLimit: Infinity,
                applicableTo: 'old',
            },
            '80G': {
                name: 'Section 80G',
                description: 'Donations to charitable institutions',
                maxLimit: Infinity,
                applicableTo: 'old',
            },
        },

        // ── Investment Type → Deduction Section Mapping ──
        investmentSectionMap: {
            'Mutual Fund': '80C',    // ELSS Mutual Funds qualify under 80C
            'FD': '80C',             // Tax-Saving FDs
            'Bond': '80C',           // Tax-free bonds / infrastructure bonds
            'Gold': null,            // No direct deduction
            'Stock': null,
            'ETF': null,
            'Crypto': null,
            'Real Estate': null,
        },

        // ── Expense Category → Deduction Section Mapping ──
        expenseSectionMap: {
            'Insurance': '80D_self',
            'Health Insurance': '80D_self',
            'Medical Insurance': '80D_self',
            'Education Loan': '80E',
            'Donation': '80G',
            'Charity': '80G',
        },

        // ── Recommendation Templates ──
        recommendations: [
            {
                section: '80C',
                instruments: [
                    {
                        name: 'ELSS Mutual Fund',
                        description: 'Equity Linked Saving Scheme — tax-saving mutual fund',
                        riskLevel: 'Moderate-High',
                        lockIn: '3 years',
                        expectedReturn: '10-14% p.a.',
                        wealthImpact: 'High growth potential with shortest lock-in among 80C options',
                    },
                    {
                        name: 'Public Provident Fund (PPF)',
                        description: 'Government-backed long-term savings instrument',
                        riskLevel: 'Very Low',
                        lockIn: '15 years',
                        expectedReturn: '7.1% p.a.',
                        wealthImpact: 'Safe compounding with tax-free returns',
                    },
                    {
                        name: 'Tax-Saving Fixed Deposit',
                        description: '5-year FD with tax benefit',
                        riskLevel: 'Low',
                        lockIn: '5 years',
                        expectedReturn: '6.5-7.5% p.a.',
                        wealthImpact: 'Capital protection with guaranteed returns',
                    },
                    {
                        name: 'National Savings Certificate (NSC)',
                        description: 'Government savings bond',
                        riskLevel: 'Very Low',
                        lockIn: '5 years',
                        expectedReturn: '7.7% p.a.',
                        wealthImpact: 'Safe investment with compounding interest',
                    },
                ],
            },
            {
                section: '80CCD_1B',
                instruments: [
                    {
                        name: 'National Pension System (NPS)',
                        description: 'Additional ₹50,000 deduction beyond 80C for NPS contributions',
                        riskLevel: 'Moderate',
                        lockIn: 'Until retirement (60)',
                        expectedReturn: '8-12% p.a.',
                        wealthImpact: 'Excellent for retirement planning + extra ₹50k deduction',
                    },
                ],
            },
            {
                section: '80D_self',
                instruments: [
                    {
                        name: 'Health Insurance (Self & Family)',
                        description: 'Mediclaim or comprehensive health insurance policy',
                        riskLevel: 'N/A',
                        lockIn: '1 year (renewable)',
                        expectedReturn: 'Risk coverage',
                        wealthImpact: 'Financial protection against medical emergencies',
                    },
                ],
            },
            {
                section: '80D_parents',
                instruments: [
                    {
                        name: 'Health Insurance (Parents)',
                        description: 'Health insurance for parents — higher limit for senior citizens',
                        riskLevel: 'N/A',
                        lockIn: '1 year (renewable)',
                        expectedReturn: 'Risk coverage',
                        wealthImpact: 'Protect parents + save up to ₹50,000 in taxes',
                    },
                ],
            },
        ],
    },
};

/**
 * Get tax rules for a given financial year.
 * @param {string} fy — e.g. 'FY2025-26'
 * @returns {object} Tax rules for the FY
 */
export const getTaxRules = (fy = 'FY2025-26') => {
    const rules = TAX_RULES[fy];
    if (!rules) {
        throw new Error(`Tax rules not found for ${fy}. Available: ${Object.keys(TAX_RULES).join(', ')}`);
    }
    return rules;
};

/**
 * Get the current financial year string based on date.
 * Indian FY runs April 1 – March 31.
 */
export const getCurrentFY = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    const year = now.getFullYear();
    // April (month 3) onwards → current year is start of FY
    if (month >= 3) {
        return `FY${year}-${String(year + 1).slice(2)}`;
    }
    return `FY${year - 1}-${String(year).slice(2)}`;
};

/**
 * Compute tax for a given taxable income using provided slabs.
 */
export const computeTaxFromSlabs = (taxableIncome, slabs) => {
    let tax = 0;
    for (const slab of slabs) {
        if (taxableIncome <= 0) break;
        const taxableInSlab = Math.min(taxableIncome, (slab.max === Infinity ? taxableIncome : slab.max) - slab.min + 1);
        if (taxableInSlab > 0) {
            tax += (taxableInSlab * slab.rate) / 100;
            taxableIncome -= taxableInSlab;
        }
    }
    return Math.round(tax * 100) / 100;
};

/**
 * Get the FY date boundaries (April 1 – March 31).
 */
export const getFYDateRange = (fy) => {
    // fy format: 'FY2025-26'
    const startYear = parseInt(fy.replace('FY', '').split('-')[0]);
    return {
        start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)),      // April 1
        end: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)), // March 31
    };
};

export default TAX_RULES;

/**
 * Tax Rules Configuration — India
 * Versioned by Financial Year. Add new keys for future years.
 * Rule-engine pattern: tax slabs, deduction limits, eligibility, and mappings are data, not code.
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

        // ── Deduction Sections (with eligibility rules) ──
        sections: {
            '80C': {
                name: 'Section 80C',
                description: 'Investments in PPF, ELSS, LIC, NSC, Tax-Saving FDs, EPF, Sukanya Samriddhi, Home Loan Principal',
                maxLimit: 150000,
                applicableTo: 'old',
                eligibleInvestmentTypes: ['Mutual Fund', 'FD', 'Bond'],
                eligibleExpenseCategories: ['LIC', 'Life Insurance', 'PPF', 'EPF', 'Sukanya Samriddhi', 'Home Loan Principal'],
                validationRules: {
                    mutualFundSubtype: 'ELSS', // Only ELSS mutual funds qualify
                    fdMinTenure: 5,            // Tax-saving FDs must be 5+ years
                },
            },
            '80CCD_1B': {
                name: 'Section 80CCD(1B)',
                description: 'Additional NPS contribution (over and above 80C)',
                maxLimit: 50000,
                applicableTo: 'both',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['NPS', 'National Pension System', 'NPS Contribution'],
                validationRules: {
                    requiresNPSAccount: true,
                },
            },
            '80D_self': {
                name: 'Section 80D (Self & Family)',
                description: 'Health insurance premium for self, spouse, children',
                maxLimit: 25000,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['Insurance', 'Health Insurance', 'Medical Insurance', 'Mediclaim'],
                validationRules: {
                    applicableTo: 'self_and_family',
                    seniorCitizenLimit: 50000, // If policyholder is 60+
                    preventiveHealthCheckup: 5000, // Included within limit
                },
            },
            '80D_parents': {
                name: 'Section 80D (Parents)',
                description: 'Health insurance premium for parents (60+ senior: ₹50,000)',
                maxLimit: 50000,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['Parent Insurance', 'Parent Health Insurance', 'Parent Medical Insurance'],
                validationRules: {
                    applicableTo: 'parents',
                    nonSeniorLimit: 25000,
                    seniorCitizenLimit: 50000,
                },
            },
            '80TTA': {
                name: 'Section 80TTA',
                description: 'Interest on savings account',
                maxLimit: 10000,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: [],
                validationRules: {
                    incomeType: 'savings_interest',
                },
            },
            '24b': {
                name: 'Section 24(b)',
                description: 'Interest on home loan (self-occupied property)',
                maxLimit: 200000,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['Home Loan', 'Home Loan Interest', 'Mortgage', 'Mortgage Interest', 'Housing Loan', 'Housing Loan Interest'],
                validationRules: {
                    loanType: 'home_loan',
                    propertyType: 'self_occupied',
                    letOutPropertyLimit: Infinity, // No limit for let-out property
                },
            },
            '80E': {
                name: 'Section 80E',
                description: 'Interest on education loan (no upper limit, full deductible for 8 years)',
                maxLimit: Infinity,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['Education Loan', 'Education Loan Interest', 'Student Loan'],
                validationRules: {
                    maxDeductionYears: 8,
                    loanType: 'education',
                    interestOnly: true,
                },
            },
            '80G': {
                name: 'Section 80G',
                description: 'Donations to charitable institutions (50% or 100% deductible)',
                maxLimit: Infinity,
                applicableTo: 'old',
                eligibleInvestmentTypes: [],
                eligibleExpenseCategories: ['Donation', 'Charity', 'Charitable Donation'],
                validationRules: {
                    requiresReceipt: true,
                    qualifyingPercentages: [50, 100], // Depends on institution
                },
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

        // ── Expense Category → Deduction Section Mapping (Expanded) ──
        expenseSectionMap: {
            // 80D — Health Insurance
            'Insurance': '80D_self',
            'Health Insurance': '80D_self',
            'Medical Insurance': '80D_self',
            'Mediclaim': '80D_self',
            'Health': '80D_self',
            'Medical': '80D_self',
            // 80D — Parents
            'Parent Insurance': '80D_parents',
            'Parent Health Insurance': '80D_parents',
            'Parent Medical Insurance': '80D_parents',
            // 80E — Education
            'Education Loan': '80E',
            'Education Loan Interest': '80E',
            'Student Loan': '80E',
            // 80G — Donations
            'Donation': '80G',
            'Charity': '80G',
            'Charitable Donation': '80G',
            // 24b — Home Loan
            'Home Loan': '24b',
            'Home Loan Interest': '24b',
            'Mortgage': '24b',
            'Mortgage Interest': '24b',
            'Housing Loan': '24b',
            'Housing Loan Interest': '24b',
            // 80C — Life Insurance / PPF / EPF
            'LIC': '80C',
            'Life Insurance': '80C',
            'PPF': '80C',
            'EPF': '80C',
            'Sukanya Samriddhi': '80C',
            'Home Loan Principal': '80C',
            // 80CCD(1B) — NPS
            'NPS': '80CCD_1B',
            'National Pension System': '80CCD_1B',
            'NPS Contribution': '80CCD_1B',
        },

        // ── Expense Pattern Detection Rules ──
        // Used to identify missed deduction opportunities from spending patterns
        expensePatternRules: [
            {
                id: 'medical_without_insurance',
                triggerCategories: ['Medical', 'Health', 'Hospital', 'Doctor', 'Pharmacy', 'Medicine', 'Healthcare'],
                checkMissing: '80D_self',
                threshold: 10000, // Trigger if medical spending > ₹10,000 without insurance
                recommendation: {
                    title: 'Health Insurance for Tax Savings',
                    description: 'You have significant medical expenses but no health insurance premium recorded. A health insurance policy would provide both risk coverage and up to ₹25,000 deduction under Section 80D.',
                    section: '80D_self',
                    priority: 'high',
                    implementationEase: 0.9,
                },
            },
            {
                id: 'education_without_loan',
                triggerCategories: ['Education', 'Tuition', 'School Fees', 'College Fees', 'Coaching', 'Course'],
                checkMissing: '80E',
                threshold: 50000,
                recommendation: {
                    title: 'Education Loan Deduction',
                    description: 'You have substantial education expenses. If financed through an education loan, the entire interest paid is deductible under Section 80E with no upper limit.',
                    section: '80E',
                    priority: 'medium',
                    implementationEase: 0.5,
                },
            },
            {
                id: 'housing_without_loan',
                triggerCategories: ['Rent', 'Housing', 'House Rent', 'EMI'],
                checkMissing: '24b',
                threshold: 100000,
                recommendation: {
                    title: 'Home Loan Interest Deduction',
                    description: 'You have significant housing expenses. If you own a home on loan, the interest component (up to ₹2,00,000) is deductible under Section 24(b).',
                    section: '24b',
                    priority: 'medium',
                    implementationEase: 0.4,
                },
            },
            {
                id: 'no_retirement_planning',
                triggerCategories: [],
                checkMissing: '80CCD_1B',
                threshold: 0, // Always trigger if NPS is not used
                recommendation: {
                    title: 'NPS for Retirement + Tax Saving',
                    description: 'You are not utilizing the additional ₹50,000 NPS deduction under Section 80CCD(1B). NPS provides retirement savings with an extra tax benefit beyond the ₹1.5L 80C limit.',
                    section: '80CCD_1B',
                    priority: 'medium',
                    implementationEase: 0.8,
                },
            },
        ],

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
                        implementationEase: 0.9,
                    },
                    {
                        name: 'Public Provident Fund (PPF)',
                        description: 'Government-backed long-term savings instrument',
                        riskLevel: 'Very Low',
                        lockIn: '15 years',
                        expectedReturn: '7.1% p.a.',
                        wealthImpact: 'Safe compounding with tax-free returns',
                        implementationEase: 0.85,
                    },
                    {
                        name: 'Tax-Saving Fixed Deposit',
                        description: '5-year FD with tax benefit',
                        riskLevel: 'Low',
                        lockIn: '5 years',
                        expectedReturn: '6.5-7.5% p.a.',
                        wealthImpact: 'Capital protection with guaranteed returns',
                        implementationEase: 0.95,
                    },
                    {
                        name: 'National Savings Certificate (NSC)',
                        description: 'Government savings bond',
                        riskLevel: 'Very Low',
                        lockIn: '5 years',
                        expectedReturn: '7.7% p.a.',
                        wealthImpact: 'Safe investment with compounding interest',
                        implementationEase: 0.9,
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
                        implementationEase: 0.8,
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
                        implementationEase: 0.95,
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
                        implementationEase: 0.9,
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

/**
 * Validate whether an investment qualifies for a specific deduction section.
 * @param {object} investment — the investment document
 * @param {string} sectionKey — e.g. '80C'
 * @param {object} rules — tax rules for the FY
 * @returns {{ eligible: boolean, reason: string }}
 */
export const validateInvestmentEligibility = (investment, sectionKey, rules) => {
    const section = rules.sections[sectionKey];
    if (!section) {
        return { eligible: false, reason: `Unknown section: ${sectionKey}` };
    }

    // Check if the investment type is in the eligible list
    if (section.eligibleInvestmentTypes.length > 0 &&
        !section.eligibleInvestmentTypes.includes(investment.assetType)) {
        return {
            eligible: false,
            reason: `${investment.assetType} is not eligible for ${section.name}. Eligible types: ${section.eligibleInvestmentTypes.join(', ')}`,
        };
    }

    // Section-specific validations
    if (sectionKey === '80C') {
        // Only ELSS mutual funds qualify, not all mutual funds
        if (investment.assetType === 'Mutual Fund') {
            // Check if notes/name contains ELSS indicator (best-effort)
            const nameAndNotes = `${investment.name || ''} ${investment.notes || ''}`.toLowerCase();
            const isELSS = nameAndNotes.includes('elss') ||
                nameAndNotes.includes('tax saver') ||
                nameAndNotes.includes('tax saving');
            if (!isELSS) {
                return {
                    eligible: false,
                    reason: 'Only ELSS (Equity Linked Saving Scheme) mutual funds qualify under Section 80C. This mutual fund does not appear to be an ELSS fund.',
                };
            }
        }
        // Tax-saving FDs must be 5+ year tenure
        if (investment.assetType === 'FD') {
            const nameAndNotes = `${investment.name || ''} ${investment.notes || ''}`.toLowerCase();
            const isTaxSaving = nameAndNotes.includes('tax') || nameAndNotes.includes('5 year') || nameAndNotes.includes('5-year');
            if (!isTaxSaving) {
                return {
                    eligible: false,
                    reason: 'Only tax-saving FDs with 5-year lock-in qualify under Section 80C.',
                };
            }
        }
    }

    if (sectionKey === '80CCD_1B') {
        // Must be NPS contribution
        const nameAndNotes = `${investment.name || ''} ${investment.notes || ''}`.toLowerCase();
        const isNPS = nameAndNotes.includes('nps') || nameAndNotes.includes('national pension');
        if (!isNPS) {
            return {
                eligible: false,
                reason: 'Only National Pension System (NPS) contributions qualify under Section 80CCD(1B).',
            };
        }
    }

    return { eligible: true, reason: 'Eligible' };
};

/**
 * Validate whether an expense qualifies for a specific deduction section.
 * @param {string} category — expense category
 * @param {string} sectionKey — e.g. '80D_self'
 * @param {object} rules — tax rules for the FY
 * @returns {{ eligible: boolean, reason: string }}
 */
export const validateExpenseEligibility = (category, sectionKey, rules) => {
    const section = rules.sections[sectionKey];
    if (!section) {
        return { eligible: false, reason: `Unknown section: ${sectionKey}` };
    }

    if (section.eligibleExpenseCategories.length > 0 &&
        !section.eligibleExpenseCategories.some(
            ec => ec.toLowerCase() === category.toLowerCase()
        )) {
        return {
            eligible: false,
            reason: `Expense category "${category}" does not qualify for ${section.name}.`,
        };
    }

    return { eligible: true, reason: 'Eligible' };
};

export default TAX_RULES;

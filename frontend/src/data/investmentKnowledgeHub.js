export const investmentKnowledge = {
    "Stocks": {
        description: "Stocks represent ownership in a company. When you buy a stock, you become a shareholder, meaning you own a small part of that company.",
        howItWorks: [
            "You buy shares via a broker (Zerodha, Groww, etc.).",
            "Stock prices fluctuate based on company performance and market demand.",
            "You earn money via price appreciation (selling higher) or dividends (profit sharing)."
        ],
        risk: "High",
        returns: "10-15% (Long Term)",
        horizon: "5+ Years",
        whoShouldInvest: "People who want high growth and can tolerate market ups and downs.",
        taxation: "LTCG (>1yr) @ 12.5% on profits > ₹1.25L. STCG (<1yr) @ 20%.",
        examples: ["Reliance", "TCS", "HDFC Bank", "Infosys"]
    },
    "Mutual Funds": {
        description: "A pool of money managed by professional fund managers who invest in stocks, bonds, or other assets.",
        howItWorks: [
            "You invest money in a specific scheme (SIP or Lumpsum).",
            "The fund manager invests it in a diversified portfolio.",
            "You get units based on the current NAV (Net Asset Value)."
        ],
        risk: "Moderate to High",
        returns: "8-12% (Equity Funds)",
        horizon: "3-5+ Years",
        whoShouldInvest: "Beginners or busy investors who want professional management.",
        taxation: "Equity Funds: Same as Stocks. Debt Funds: Taxed as per income slab.",
        examples: ["Index Funds", "Bluechip Funds", "ELSS (Tax Saving)"]
    },
    "Crypto": {
        description: "Digital or virtual currencies that use cryptography for security and operate on decentralized networks (Blockchain).",
        howItWorks: [
            "You buy coins/tokens on an exchange (Binance, CoinDCX).",
            "Store them in a wallet.",
            "Prices are driven purely by supply, demand, and sentiment."
        ],
        risk: "Very High",
        returns: "Unpredictable (High volatile)",
        horizon: "Variable",
        whoShouldInvest: "High-risk takers comfortable with losing 100% of capital.",
        taxation: "Flat 30% tax on profits + 1% TDS.",
        examples: ["Bitcoin (BTC)", "Ethereum (ETH)", "Solana (SOL)"]
    },
    "Gold": {
        description: "Precious metal acting as a hedge against inflation and economic uncertainty.",
        howItWorks: [
            "Physical Gold: Jewelry, Coins.",
            "Digital Gold: Sovereign Gold Bonds (SGB), Gold ETFs.",
            "SGBs pay 2.5% interest extra per year."
        ],
        risk: "Low to Moderate",
        returns: "6-8% (matches inflation)",
        horizon: "Long Term",
        whoShouldInvest: "Conservative investors looking for safety.",
        taxation: "SGB is tax-free if held till maturity (8 yrs). Physical gold taxed as capital gains.",
        examples: ["SGB", "Gold ETFs", "Physical Gold"]
    },
    "FD (Fixed Deposit)": {
        description: "A safe investment with banks offering guaranteed returns for a fixed tenure.",
        howItWorks: [
            "Deposit a lump sum for a fixed period (7 days to 10 years).",
            "Earn fixed interest.",
            "Penalty for premature withdrawal."
        ],
        risk: "Very Low",
        returns: "5-7.5%",
        horizon: "1-5 Years",
        whoShouldInvest: "Risk-averse people needing guaranteed capital protection.",
        taxation: "Interest taxed as per your income tax slab.",
        examples: ["Bank FD", "Post Office Time Deposit"]
    }
};

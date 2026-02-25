import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const getStockPrice = async (symbol) => {
    try {
        const quote = await yahooFinance.quote(symbol);

        return {
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            currency: quote.currency,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
        };
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error.message);
        return null;
    }
};

export const searchStockSymbol = async (query) => {
    try {
        const results = await yahooFinance.search(query);

        return results.quotes
            .filter(
                (q) =>
                    q.symbol &&
                    (q.quoteType === "EQUITY" || q.quoteType === "ETF") &&
                    (q.exchange === "NSI" || q.exchange === "BSE")
            )
            .map((q) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange,
                type: q.quoteType,
                score: q.score,
            }));
    } catch (error) {
        console.error(`Error searching stock symbol ${query}:`, error.message);
        return [];
    }
};

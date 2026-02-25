import axios from 'axios';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';

export const getCryptoPrice = async (coinId) => {
    try {
        // CoinId example: 'bitcoin', 'ethereum'
        const response = await axios.get(COINGECKO_URL, {
            params: {
                ids: coinId,
                vs_currencies: 'inr',
                include_24hr_change: 'true'
            }
        });

        if (response.data[coinId]) {
            return {
                id: coinId,
                price: response.data[coinId].inr,
                changePercent: response.data[coinId].inr_24h_change
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching crypto price for ${coinId}:`, error.message);
        return null;
    }
};

export const searchCrypto = async (query) => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/search', {
            params: { query }
        });

        return response.data.coins.slice(0, 10).map(coin => ({
            symbol: coin.id, // We use ID for fetching price
            name: coin.name,
            symbolDisplay: coin.symbol, // BTC, ETH
            thumb: coin.thumb,
            type: 'Crypto'
        }));
    } catch (error) {
        console.error(`Error searching crypto ${query}:`, error.message);
        return [];
    }
};

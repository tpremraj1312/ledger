import axios from 'axios';

const AMFI_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';

let amfiCache = {
    data: null,
    lastFetched: 0
};

const fetchAmfiData = async () => {
    // simple in-memory cache for the text file (1 hour)
    const now = Date.now();
    if (amfiCache.data && (now - amfiCache.lastFetched) < 3600000) {
        return amfiCache.data;
    }

    try {
        const response = await axios.get(AMFI_URL);
        amfiCache.data = response.data;
        amfiCache.lastFetched = now;
        return response.data;
    } catch (error) {
        console.error('Error fetching AMFI data:', error.message);
        return null;
    }
};

export const searchMutualFunds = async (query) => {
    const data = await fetchAmfiData();
    if (!data) return [];

    const lowerQuery = query.toLowerCase();
    const lines = data.split('\n');
    const results = [];

    // Limit to top 20 matches to avoid performance issues
    for (const line of lines) {
        if (results.length >= 20) break;
        const parts = line.split(';');
        if (parts.length >= 5) {
            const name = parts[3];
            if (name && name.toLowerCase().includes(lowerQuery)) {
                results.push({
                    symbol: parts[0], // Scheme Code
                    name: name,
                    type: 'Mutual Fund',
                    nav: parseFloat(parts[4])
                });
            }
        }
    }
    return results;
};

export const getMutualFundNAV = async (schemeCode) => {
    const data = await fetchAmfiData();
    if (!data) return null;

    const lines = data.split('\n');
    for (const line of lines) {
        if (line.startsWith(schemeCode)) {
            const parts = line.split(';');
            if (parts.length >= 5) {
                const nav = parseFloat(parts[4]);
                return {
                    schemeCode: parts[0],
                    name: parts[3],
                    nav: isNaN(nav) ? 0 : nav,
                    date: parts[5],
                    type: 'Mutual Fund'
                };
            }
        }
    }
    return null;
};

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log(`Testing Finnhub Quote with BSE:RELIANCE...`);
        const resQuote = await axios.get('https://finnhub.io/api/v1/quote', {
            params: { symbol: 'BSE:RELIANCE', token: process.env.FINNHUB_KEY }
        });
        console.log("Quote Response:", resQuote.data);
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
test();

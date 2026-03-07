import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PriceCache from './models/PriceCache.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await PriceCache.deleteMany({});
    console.log("Price cache cleared!");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

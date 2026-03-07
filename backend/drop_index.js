import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger';

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        try {
            await mongoose.connection.db.dropCollection('pricecaches');
            console.log('Successfully dropped pricecaches collection');
        } catch (e) {
            if (e.codeName === 'NamespaceNotFound') {
                console.log('Collection does not exist, nothing to drop.');
            } else {
                console.error('Error dropping collection:', e);
            }
        }

    } catch (error) {
        console.error('Connection error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();

import mongoose from 'mongoose';

/**
 * Wraps a function in a Mongoose transition session.
 * Ensures ACID compliance across multiple operations.
 * Implements exponential backoff retry logic for WriteConflict (code 112).
 */
export const withTransaction = async (fn, retries = 3) => {
    let lastError;

    for (let i = 0; i < retries; i++) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            lastError = error;

            // Handle retryable errors like WriteConflict (112) or TransientTransactionError
            const isRetryable = error.code === 112 || (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError'));

            if (isRetryable && i < retries - 1) {
                const delay = Math.pow(2, i) * 100 + Math.random() * 100;
                console.warn(`Retryable transaction error detected. Retrying in ${delay.toFixed(0)}ms (Attempt ${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error('Transaction aborted:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    throw lastError;
};

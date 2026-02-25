/**
 * Agent Rate Limiter — In-memory, per-user
 * 20 requests per 60-second window
 */
const userRequestMap = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

// Purge old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of userRequestMap) {
        if (now - data.windowStart > WINDOW_MS * 2) {
            userRequestMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

const agentRateLimit = (req, res, next) => {
    const userId = req.user?._id?.toString();
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const now = Date.now();
    let userData = userRequestMap.get(userId);

    if (!userData || now - userData.windowStart > WINDOW_MS) {
        userData = { windowStart: now, count: 1 };
        userRequestMap.set(userId, userData);
        return next();
    }

    userData.count += 1;

    if (userData.count > MAX_REQUESTS) {
        const retryAfter = Math.ceil((userData.windowStart + WINDOW_MS - now) / 1000);
        return res.status(429).json({
            message: 'Too many requests. Please wait before sending more messages.',
            retryAfterSeconds: retryAfter,
        });
    }

    return next();
};

export default agentRateLimit;

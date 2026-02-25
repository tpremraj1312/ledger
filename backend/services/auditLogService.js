import AuditLog from '../models/AuditLog.js';

/**
 * Log an action to the audit trail.
 * If a session is provided, the log participates in the transaction.
 */
export const logAction = async (groupId, userId, action, details = '', session = null) => {
    try {
        const entry = new AuditLog({
            groupId,
            userId,
            action,
            details,
        });

        const opts = session ? { session } : {};
        await entry.save(opts);
    } catch (error) {
        // Audit logging should never break the main flow
        console.error('Audit log error:', error.message);
    }
};

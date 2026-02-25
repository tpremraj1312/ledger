/**
 * RBAC Middleware Factory
 * Usage: requireRole('ADMIN', 'MEMBER') — allows only those roles.
 * Must be used AFTER requireFamily middleware (which sets req.familyRole).
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.familyRole) {
            return res.status(403).json({ message: 'Family membership not verified. Ensure requireFamily middleware runs first.' });
        }

        if (!allowedRoles.includes(req.familyRole)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.familyRole}`,
            });
        }

        next();
    };
};

export default requireRole;

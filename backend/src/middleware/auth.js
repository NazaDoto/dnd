const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Formato inválido. Usar: Bearer <token>' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) return res.status(403).json({ message: 'No autorizado' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'No tienes permisos para esta acción' });
        next();
    };
}

module.exports = authMiddleware;
module.exports.requireRoles = requireRoles;
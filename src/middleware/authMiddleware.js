const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "Token no proveído. Acceso Denegado." });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId: 1, email: "..." }
        next();
    } catch (err) {
        return res.status(403).json({ error: "Token inválido o expirado." });
    }
};

module.exports = authMiddleware;
